import { it, expect } from 'vitest';
import { VARGAS_ECONOMY_CONFIG, MECHANICS_ECONOMY_CONFIG } from '@tft/game-data';
import { createMatch, applyMatchAction, commandFor, replayMatch } from './engine';
import { validateMatchState } from './invariants';
import type { MatchCommand, MatchState } from '@tft/shared';
const apply = (state: MatchState, command: MatchCommand) => {
  const next = applyMatchAction(state, commandFor(state, command));
  expect(next.ok).toBe(true);
  return next.state;
};
it('buys XP, samples VARGAS at unchanged cost3 odds, buys for3 and sells through ordinary commands', () => {
  let s = createMatch(42, { ...VARGAS_ECONOMY_CONFIG, initialGold: 500 });
  while (s.level < 7) s = apply(s, { type: 'buy_xp' });
  for (let i = 0; i < 30 && !s.shop.some((o) => o?.definitionId === 'vargas'); i++)
    s = apply(s, { type: 'reroll_shop' });
  const offer = s.shop.find((o) => o?.definitionId === 'vargas')!;
  expect(offer).toBeDefined();
  const gold = s.gold;
  s = apply(s, { type: 'buy_unit', offerId: offer.id });
  expect(s.gold).toBe(gold - 3);
  expect(s.units[0]).toMatchObject({
    definitionId: 'vargas',
    stars: 1,
    location: { kind: 'bench' },
  });
  s = apply(s, {
    type: 'move_unit',
    unitId: s.units[0]!.id,
    to: { kind: 'board', hex: { q: 0, r: 4 } },
  });
  s = apply(s, { type: 'sell_unit', unitId: s.units[0]!.id });
  expect(s.gold).toBe(gold);
  expect(s.pool.vargas! + s.shop.filter((o) => o?.definitionId === 'vargas').length).toBe(18);
  expect(replayMatch(s.seed, s.history, s.config)).toEqual(s);
});
it('fuses nine ordinary VARGAS purchases, preserves deployed survivor, saves and sells nine copies', () => {
  let s = createMatch(5, { ...VARGAS_ECONOMY_CONFIG, initialGold: 500 });
  for (const offer of s.shop) if (offer) s.pool[offer.definitionId]!++;
  s.shop.fill(null);
  let survivor = '';
  for (let i = 0; i < 9; i++) {
    s = structuredClone(s);
    s.pool.vargas!--;
    s.shop[0] = { id: `fixture-${i}`, definitionId: 'vargas' };
    validateMatchState(s);
    s = apply(s, { type: 'buy_unit', offerId: s.shop[0]!.id });
    if (i === 0) {
      survivor = s.units[0]!.id;
      s = apply(s, {
        type: 'move_unit',
        unitId: survivor,
        to: { kind: 'board', hex: { q: 0, r: 4 } },
      });
    }
    if (i === 2 || i === 8)
      expect(s.units.find((u) => u.id === survivor)).toMatchObject({
        stars: i === 2 ? 2 : 3,
        location: { kind: 'board' },
      });
  }
  expect(s.units).toHaveLength(1);
  expect(validateMatchState(JSON.parse(JSON.stringify(s)))).toEqual(s);
  s = apply(s, { type: 'sell_unit', unitId: survivor });
  expect(s.pool.vargas).toBe(18);
  expect(s.gold).toBe(500);
});
it('old B2 catalog never contains VARGAS in its shop or pool', () => {
  for (let seed = 0; seed < 20; seed++) {
    const s = createMatch(seed, MECHANICS_ECONOMY_CONFIG);
    expect(s.pool.vargas).toBeUndefined();
    expect(s.shop.some((o) => o?.definitionId === 'vargas')).toBe(false);
  }
});
