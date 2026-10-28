import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { it, expect, vi } from 'vitest';
import type { Room } from '@colyseus/sdk';
import { P11H_ECONOMY_CONFIG, P11_ROSTER } from '@tft/game-data';
import { matchTraits } from '@tft/game-core';
import { AuthoritativeMatch } from '../../../server/src/AuthoritativeMatch';
import { equip, fixtureUsers } from '../../../server/src/multi-fixture';
import { RemoteCoordinator } from '../network/RemoteCoordinator';
import { LocalSession } from './LocalSession';
import { TraitRail } from './hud/TraitRail';
import { sortTraitRows } from './hud/traitOrder';
import { UnitInspector } from './UnitInspector';
import { Shop } from './Shop';
import { createP11HReference } from '../development/p11hReference';
vi.mock('../game/GameCanvas', () => ({ GameCanvas: () => null }));
const renderOrder = (s: LocalSession) => {
  const html = renderToStaticMarkup(createElement(TraitRail, { state: s.getMatch() }));
  return [...html.matchAll(/data-trait-id="([^"]+)"/g)].map((m) => m[1]!);
};
function socket(sessionId: string) {
  const handlers = new Map<string, (v: unknown) => void>(),
    send = vi.fn();
  const room = {
    roomId: 'p11i-view',
    sessionId,
    reconnection: { enabled: true },
    onMessage: (k: string, cb: (v: unknown) => void) => handlers.set(k, cb),
    onLeave: vi.fn(),
    send,
    leave: vi.fn(),
  } as unknown as Room;
  const remote = new RemoteCoordinator(room);
  return { remote, send, deliver: (k: string, v: unknown) => handlers.get(k)!(v) };
}
it('reorders only after confirmed formation state, then reconstructs the same order on authenticated recovery', () => {
  const match = new AuthoritativeMatch(
    'p11i-view',
    { now: () => 0 },
    () => 42,
    2,
    P11H_ECONOMY_CONFIG,
  );
  for (let i = 0; i < 2; i++)
    match.join(`socket-${i}`, { userId: fixtureUsers[i]!, name: `Player ${i}` });
  match.start('socket-0');
  equip(match);
  const f = socket('socket-0');
  f.deliver('state_snapshot', match.roundSnapshot('socket-0'));
  const s = new LocalSession(f.remote.getMatch(), undefined, undefined, f.remote),
    before = renderOrder(s),
    id = match.players[0]!.state.units.find((u) => u.definitionId === 'vargas')!.id;
  expect(before).toContain('el-depredador');
  expect(s.bench(0, id)).toBe(true);
  expect(renderOrder(s)).toEqual(before);
  const command = f.send.mock.calls.find((c) => c[0] === 'command')![1],
    receipt = match.submit('socket-0', command);
  expect(receipt.accepted).toBe(true);
  f.deliver('action_receipt', receipt);
  expect(renderOrder(s)).toEqual(before);
  f.deliver('state_snapshot', match.roundSnapshot('socket-0'));
  const confirmed = renderOrder(s);
  expect(confirmed).not.toContain('el-depredador');
  expect(confirmed).toEqual(
    sortTraitRows(matchTraits(match.players[0]!.state).filter((r) => r.count > 0)).map(
      (r) => r.trait.id,
    ),
  );
  expect(confirmed).not.toEqual(before);
  const restored = AuthoritativeMatch.restore(match.exportState(), { now: () => 0 });
  restored.resume('recovered', fixtureUsers[0]!);
  const second = socket('recovered');
  second.deliver('state_snapshot', restored.roundSnapshot('recovered'));
  const resumed = new LocalSession(second.remote.getMatch(), undefined, undefined, second.remote);
  expect(renderOrder(resumed)).toEqual(confirmed);
  expect(s.getMatch().items).toEqual(resumed.getMatch().items);
  restored.assertConservation();
  f.remote.dispose();
  second.remote.dispose();
});
it('shows all affinities beyond eight and preserves pending/unique semantics in accessible tooltips', () => {
  const c = createP11HReference(),
    s = new LocalSession(c.coordinator.getMatch(), undefined, c.coordinator);
  const html = renderToStaticMarkup(createElement(TraitRail, { state: s.getMatch() }));
  expect(renderOrder(s).length).toBeGreaterThan(8);
  expect(html).toContain('Atributo único');
  expect(html).toContain('Efectos pendientes');
  expect(html).toContain('aria-describedby');
  expect(html).toContain('miembros distintos desplegados');
  c.dispose();
});
it.each(['preparation', 'combat'] as const)(
  '%s normal inspector removes progress but retains abilities, passive state, equipment and statistics input',
  (phase) => {
    const c = createP11HReference();
    if (phase === 'combat') c.coordinator.debugAdvance();
    const s = new LocalSession(c.coordinator.getMatch(), undefined, c.coordinator);
    s.select(s.getMatch().units.find((u) => u.definitionId === 'vargas')!.id);
    const before = structuredClone(c.exportSnapshot());
    const html = renderToStaticMarkup(
      createElement(UnitInspector, { session: s, view: s.getSnapshot() }),
    );
    expect(html).not.toContain('Progreso de combate');
    expect(html).not.toContain('mechanics-status');
    expect(html).toContain('Resaca Controlada');
    expect(html).toContain('Blackhaus RPP');
    expect(html).toContain('Objetos equipados');
    expect(html).toContain('Rol de combate: Asesino');
    expect(html).toContain('Daño principal: Físico');
    expect(c.exportSnapshot()).toEqual(before);
    if (phase === 'combat') expect(s.combatStatistics()).toBeTruthy();
    c.dispose();
  },
);
it('five shop cards keep names/prices/affinities and expose compact role plus damage without claiming provisional specialties', () => {
  const c = createP11HReference(),
    s = new LocalSession(c.coordinator.getMatch(), undefined, c.coordinator);
  const html = renderToStaticMarkup(createElement(Shop, { session: s }));
  expect(html.match(/class="offer-role"/g)).toHaveLength(5);
  expect(html).toContain('Luchador duelista');
  expect(html).toContain('Físico y verdadero');
  expect(html).toContain('Tirador de apoyo');
  expect(html).toContain('Especialización pendiente');
  expect(html.match(/class="offer-footer"/g)).toHaveLength(5);
  expect(P11_ROSTER).toHaveLength(34);
  c.dispose();
});
