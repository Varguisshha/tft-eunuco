import { expect, it } from 'vitest';
import { P12D_ECONOMY_CONFIG, P12B_ECONOMY_CONFIG } from '@tft/game-data';
import { createMatch, applyMatchAction, commandFor } from './engine';
import { validateMatchState } from './invariants';
import type { MatchState, MatchCommand } from '@tft/shared';
function act(s: MatchState, c: MatchCommand) {
  const r = applyMatchAction(s, commandFor(s, c));
  if (!r.ok) throw Error(r.error);
  return r.state;
}
function next(s: MatchState) {
  s = act(s, { type: 'start_combat_auto' });
  s = act(s, { type: 'resolve_round', round: s.round });
  return act(s, { type: 'next_round', round: s.round });
}
it.each(['full', 'partial', 'empty'] as const)(
  'consumes one lock at the automatic refresh, preserving %s offers and persisting the consumed state',
  (kind) => {
    let s = createMatch(42, P12D_ECONOMY_CONFIG);
    if (kind !== 'full')
      for (const o of [...s.shop].slice(0, kind === 'empty' ? 5 : 1))
        if (o) s = act(s, { type: 'buy_unit', offerId: o.id });
    s = act(s, { type: 'lock_shop', locked: true });
    const offers = structuredClone(s.shop),
      rng = s.shopRng;
    s = next(s);
    expect(s.shop).toEqual(offers);
    expect(s.shopRng).toBe(rng);
    expect(s.shopLocked).toBe(false);
    s = validateMatchState(JSON.parse(JSON.stringify(s)));
    s = next(s);
    expect(s.shopRng).not.toBe(rng);
    expect(s.shopLocked).toBe(false);
  },
);
it('manual refresh does not consume a pending lock; a repeated reservation retains one further round; historical B stays locked', () => {
  let s = createMatch(42, P12D_ECONOMY_CONFIG);
  s = act(s, { type: 'lock_shop', locked: true });
  s = act(s, { type: 'reroll_shop' });
  expect(s.shopLocked).toBe(true);
  s = next(s);
  s = act(s, { type: 'lock_shop', locked: true });
  const offers = structuredClone(s.shop);
  s = next(s);
  expect(s.shop).toEqual(offers);
  expect(s.shopLocked).toBe(false);
  let old = createMatch(42, P12B_ECONOMY_CONFIG);
  old = act(old, { type: 'lock_shop', locked: true });
  old = next(old);
  expect(old.shopLocked).toBe(true);
});
