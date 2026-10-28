import { it, expect, vi } from 'vitest';
import { createFlorinItemReference } from './neonReference';
import { BoardSession } from '../game/session';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { UnitInspector } from '../match/UnitInspector';
import { LocalSession } from '../match/LocalSession';
it.each([1, 2, 3] as const)(
  'creates a private Florin %i star fixture with three real items and readable inspector',
  (stars) => {
    const c = createFlorinItemReference(stars),
      s = c.coordinator.getMatch(),
      f = s.units.find((u) => u.definitionId === 'florin')!;
    expect(s.development?.tainted).toBe(true);
    expect(f.stars).toBe(stars);
    expect(f.equipment).toHaveLength(3);
    const session = new LocalSession(s, undefined, c.coordinator);
    session.select(f.id);
    const html = renderToStaticMarkup(
      createElement(UnitInspector, { session, view: session.getSnapshot() }),
    );
    expect(html).toContain('Objetos · 3/3');
    const r = c.execute({
      id: 'combat',
      origin: 'diagnostic',
      expectedRevision: c.revision,
      command: { type: 'advance' },
    });
    expect(r.ok).toBe(true);
    c.dispose();
  },
);
it('exposes collective membership fixtures only through the local DEV capability', () => {
  vi.stubGlobal('__DEVTOOLS__', true);
  const s = new BoardSession();
  for (const trait of ['ruman_trinity', 'perdidos_por_el_mundo'] as const)
    for (const n of [1, 2, 3] as const) {
      s.loadFlorinTraitScenario(trait, n);
      expect(s.traitInput()!.units.filter((u) => u.owner === 'south')).toHaveLength(n);
      expect(
        s
          .traitInput()!
          .units.filter((u) => u.owner === 'south')
          .every((u) => u.profile.traits?.includes(trait)),
      ).toBe(true);
    }
  vi.stubGlobal('__DEVTOOLS__', false);
  const before = s.getSnapshot();
  s.loadFlorinTraitScenario('ruman_trinity', 1);
  expect(s.getSnapshot()).toBe(before);
  vi.unstubAllGlobals();
});

it('reads a repeatable attack cycle as available rather than consumed', async () => {
  const { scaledProfile, runCombat } = await import('@tft/game-core');
  const { FLORIN_ECONOMY_CONFIG, createFlorinCombatInput } = await import('@tft/game-data');
  const { passiveReadout } = await import('../game/combatFeedback');
  const profile = scaledProfile('florin', 1, FLORIN_ECONOMY_CONFIG);
  const input = createFlorinCombatInput(
    {
      units: [
        { id: 'florin', definitionId: 'florin', owner: 'south', position: { q: 1, r: 4 } },
        { id: 'dolea', definitionId: 'dolea', owner: 'north', position: { q: 1, r: 3 } },
      ],
    },
    42,
    'dev-florin-readout',
  );
  const replay = runCombat(input),
    unit = replay.snapshots[0]!.units.find((u) => u.id === 'florin')!;
  expect(passiveReadout(profile, unit, 0)).toMatchObject({
    state: 'available',
    label: 'Disponible',
  });
  unit.mechanics!.basicAttacks = 5;
  expect(passiveReadout(profile, unit, 0).detail).toContain('Siguiente básico reforzado');
  unit.mechanics!.basicAttacks = 6;
  expect(passiveReadout(profile, unit, 0).state).toBe('available');
});
