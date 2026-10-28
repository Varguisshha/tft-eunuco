import { it, expect } from 'vitest';
import { JARAMILLO_ECONOMY_CONFIG } from '@tft/game-data';
import { createMatch, applyMatchAction, commandFor, replayMatch } from './engine';
import { validateMatchState } from './invariants';
import { scaledOwnedProfile } from './selectors';
import type { MatchCommand, MatchState } from '@tft/shared';
const apply = (state: MatchState, command: MatchCommand) => {
  const next = applyMatchAction(state, commandFor(state, command));
  expect(next.ok).toBe(true);
  return next.state;
};
it('JARAMILLO ordinary purchase, deployment and sale preserve cost, pool and action replay', () => {
  let s = createMatch(42, JARAMILLO_ECONOMY_CONFIG);
  const offer = s.shop.find((o) => o?.definitionId === 'jaramillo')!;
  expect(offer).toBeDefined();
  const gold = s.gold;
  s = apply(s, { type: 'buy_unit', offerId: offer.id });
  expect(s.gold).toBe(gold - 2);
  s = apply(s, {
    type: 'move_unit',
    unitId: s.units[0]!.id,
    to: { kind: 'board', hex: { q: 0, r: 4 } },
  });
  s = apply(s, { type: 'sell_unit', unitId: s.units[0]!.id });
  expect(s.gold).toBe(gold);
  expect(s.pool.jaramillo! + s.shop.filter((o) => o?.definitionId === 'jaramillo').length).toBe(22);
  expect(replayMatch(s.seed, s.history, s.config)).toEqual(s);
});
it('ordinary purchase fusion retains maximum Kilómetros and deployed identity through save and sale', () => {
  let s = createMatch(42, JARAMILLO_ECONOMY_CONFIG);
  for (const offer of s.shop) if (offer) s.pool[offer.definitionId]!++;
  s.shop.fill(null);
  let survivor = '';
  for (let i = 0; i < 3; i++) {
    s.pool.jaramillo!--;
    s.shop[0] = { id: `jaramillo-offer-${i}`, definitionId: 'jaramillo' };
    s = apply(s, { type: 'buy_unit', offerId: s.shop[0]!.id });
    if (i === 0) {
      survivor = s.units[0]!.id;
      s = apply(s, {
        type: 'move_unit',
        unitId: survivor,
        to: { kind: 'board', hex: { q: 0, r: 4 } },
      });
      s.units[0]!.progress = { version: 1, stacks: [{ id: 'kilometros', count: 2, lastRound: 1 }] };
    } else if (i === 1)
      s.units.find((u) => u.id !== survivor)!.progress = {
        version: 1,
        stacks: [{ id: 'kilometros', count: 7, lastRound: 1 }],
      };
  }
  expect(s.units).toHaveLength(1);
  expect(s.units[0]).toMatchObject({
    id: survivor,
    stars: 2,
    progress: { stacks: [{ count: 7 }] },
  });
  const before = scaledOwnedProfile(s.units[0]!, s.config).stats.attack;
  s = validateMatchState(JSON.parse(JSON.stringify(s)));
  expect(scaledOwnedProfile(s.units[0]!, s.config).stats.attack).toBe(before);
  s = apply(s, { type: 'sell_unit', unitId: survivor });
  expect(s.pool.jaramillo).toBe(22);
});
