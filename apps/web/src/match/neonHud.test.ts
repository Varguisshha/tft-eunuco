import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { commandFor, applyMatchAction, validateMatchState, opponentUnits } from '@tft/game-core';
import { createNeonReference } from '../development/neonReference';
import { LocalSession } from './LocalSession';
import { LocalGame } from './LocalGame';
import { GameButton } from './hud/GameButton';
vi.mock('../game/GameCanvas', () => ({ GameCanvas: () => null }));
const html = (v: ReturnType<typeof createElement>) => renderToStaticMarkup(v);
describe('Neon integration keeps live authority beneath the approved composition', () => {
  it('creates a conserved isolated 4v4 fixture with five offers and the reference economics', () => {
    const c = createNeonReference(),
      s = c.coordinator.getMatch();
    expect(validateMatchState(s)).toEqual(s);
    expect(s.development?.tainted).toBe(true);
    expect(s.round).toBe(3);
    expect(s.gold).toBe(52);
    expect(s.level).toBe(4);
    expect(s.xp).toBe(4);
    expect(s.health).toEqual({ south: 100, north: 88 });
    expect(s.units).toHaveLength(7);
    expect(opponentUnits(s).map((u) => u.definitionId)).toEqual([
      'dolea',
      'test-r03',
      'test-k01',
      'vargas',
    ]);
    expect(s.shop.map((o) => o!.definitionId)).toEqual([
      'vargas',
      'dolea',
      'test-k01',
      'test-r03',
      'dolea',
    ]);
    expect(c.coordinator.getClock().remainingMs).toBe(18400);
    expect(c.coordinator.getClock().clockState).toBe('running');
    c.dispose();
  });
  it('renders live cards, economy and a contextual inspector, including the real mixed ability', () => {
    const c = createNeonReference(),
      session = new LocalSession(c.coordinator.getMatch(), undefined, c.coordinator);
    const render = () =>
      html(createElement(LocalGame, { session, onNew: () => {}, onReplace: () => {} }));
    const closed = render();
    expect(closed).not.toContain('class="local-inspector');
    expect(closed.match(/class="shop-offer cost-/g)).toHaveLength(5);
    expect(closed.match(/data-bench-slot=/g)).toHaveLength(9);
    const own = session.getMatch().units.find((u) => u.definitionId === 'vargas')!;
    session.select(own.id);
    const open = render();
    expect(open).toContain('Copita Perhaps');
    expect(open).toContain('Blackhaus RPP');
    expect(open).toContain('Prob. crítico');
    expect(open).toContain('inspector-scroll');
    const before = JSON.stringify(session.getMatch());
    session.cancel();
    expect(render()).not.toContain('class="local-inspector');
    expect(JSON.stringify(session.getMatch())).toBe(before);
    c.dispose();
  });
  it('keeps purchases, lock and reroll transactional in the comparison fixture', () => {
    const c = createNeonReference(),
      session = new LocalSession(c.coordinator.getMatch(), undefined, c.coordinator);
    const offer = session.getMatch().shop[0]!;
    expect(session.dispatch({ type: 'lock_shop', locked: true })).toBe(true);
    expect(session.dispatch({ type: 'buy_unit', offerId: offer.id })).toBe(true);
    expect(session.getMatch().gold).toBe(49);
    expect(session.getMatch().shopLocked).toBe(true);
    expect(session.dispatch({ type: 'reroll_shop' })).toBe(true);
    expect(session.getMatch().gold).toBe(47);
    expect(validateMatchState(session.getMatch())).toEqual(session.getMatch());
    c.dispose();
  });
  it('does not disguise disabled or active semantics when shortening a physical label', () => {
    const output = html(
      createElement(GameButton, {
        label: 'Bloquear tienda',
        displayLabel: 'Bloquear',
        icon: 'lock',
        active: true,
        disabled: true,
        onAction: () => true,
      }),
    );
    expect(output).toContain('aria-label="Bloquear tienda"');
    expect(output).toContain('aria-pressed="true"');
    expect(output).toContain('disabled=""');
    expect(output).toContain('viewBox="0 0 230 70"');
  });
  it('rejects regular commands in combat without altering the fixture ledger or game rules', () => {
    const c = createNeonReference();
    c.coordinator.debugAdvance();
    const s = c.coordinator.getMatch();
    const out = applyMatchAction(s, commandFor(s, { type: 'buy_xp' }));
    expect(out.ok).toBe(false);
    expect(c.coordinator.getMatch()).toBe(s);
    c.dispose();
  });
});
