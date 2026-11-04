import { expect, it } from 'vitest';
import {
  P12F_ECONOMY_CONFIG,
  P13T_ECONOMY_CONFIG,
  P13T1_ECONOMY_CONFIG,
  P11_TRAITS,
  P13T1_TRAITS,
  matchCatalog,
} from '@tft/game-data';
import { type MatchState } from '@tft/shared';
import { createMatch, commandFor, applyMatchAction } from './engine';
import { grantItemInstances, applyItemCommand } from '../items/inventory';
import { matchTraits, scaledOwnedProfile } from './selectors';
import { validateMatchState } from './invariants';
function fixture(bank: number, stars: 1 | 2 | 3 = 1, bench = false, config = P13T1_ECONOMY_CONFIG) {
  const s = createMatch(71, { ...config, initialGold: bank });
  s.level = 7;
  s.xp = 0;
  s.units = [
    {
      id: 'peibol-test',
      definitionId: 'peibol',
      stars,
      location: bench ? { kind: 'bench', slot: 0 } : { kind: 'board', hex: { q: 0, r: 4 } },
    },
  ];
  s.pool.peibol! -= s.config.starCopies[stars - 1]!;
  return validateMatchState(s);
}
function action(s: MatchState, type: 'start_combat' | 'resolve_round' | 'next_round') {
  const command = type === 'start_combat' ? ({ type } as const) : { type, round: s.round };
  const r = applyMatchAction(s, commandFor(s, command));
  if (!r.ok) throw Error(r.error);
  return r.state;
}
it.each([1, 2, 3] as const)(
  'Jew %i★ uses exact P13S rates/caps, before closing income, plus normal interest',
  (stars) => {
    for (const bank of [0, 1, 5, 10, 19, 20, 39, 40, 71]) {
      const s = fixture(bank, stars),
        r = action(action(s, 'start_combat'), 'resolve_round');
      const j = r.lastReward!.jew!;
      expect(j.requested).toBe(
        Math.min(Math.floor(bank * [0.1, 0.15, 0.2][stars - 1]!), [2, 4, 8][stars - 1]!),
      );
      expect(j.bank).toBe(bank);
      expect(j.credited).toBe(j.requested);
      expect(r.gold).toBe(
        bank +
          r.lastReward!.receipt!.base +
          r.lastReward!.receipt!.interest +
          r.lastReward!.receipt!.victory +
          r.lastReward!.receipt!.streak +
          j.credited,
      );
      expect(r.lastReward!.interest).toBe(Math.min(5, Math.floor(bank / 10)));
      expect(r.ledger.filter((e) => e.reason === 'jew_interest')).toHaveLength(1);
    }
  },
);
it('Jew activates only for deployed Peibol, using existing active styling metadata', () => {
  expect(matchTraits(fixture(5)).find((r) => r.trait.id === 'jew')).toMatchObject({ count: 1 });
  const t = matchTraits(fixture(5)).find((r) => r.trait.id === 'jew')!;
  expect(t.thresholds).toHaveLength(1);
  expect(t.trait.planning?.effectState).toBe('implemented');
  const bench = fixture(71, 3, true);
  bench.units.push({
    id: 'dolea-board',
    definitionId: 'dolea',
    stars: 1,
    location: { kind: 'board', hex: { q: 0, r: 4 } },
  });
  bench.pool.dolea!--;
  expect(matchTraits(bench).find((r) => r.trait.id === 'jew')!.count).toBe(0);
  const r = action(action(bench, 'start_combat'), 'resolve_round');
  expect(r.lastReward!.jew).toMatchObject({ requested: 0, credited: 0, unitId: null, stars: null });
});
it('freezes the deployed highest star and reads eligible gold before all closing rewards', () => {
  let s = fixture(5, 3);
  s.units.push({
    id: 'bench-sale',
    definitionId: 'cosmin',
    stars: 1,
    location: { kind: 'bench', slot: 0 },
  });
  s.pool.cosmin!--;
  s = action(validateMatchState(s), 'start_combat');
  const sold = applyMatchAction(s, commandFor(s, { type: 'sell_unit', unitId: 'bench-sale' }));
  if (!sold.ok) throw Error(sold.error);
  s = sold.state;
  const r = action(s, 'resolve_round');
  expect(r.lastReward!.bank).toBe(5);
  expect(r.lastReward!.jew!.bank).toBe(6);
  expect(r.lastReward!.jew!.requested).toBe(1);
});
it('multiple Peibols count once, highest evolution, even if killed during combat', () => {
  const s = fixture(71, 1);
  s.units.push({
    id: 'higher',
    definitionId: 'peibol',
    stars: 3,
    location: { kind: 'board', hex: { q: 1, r: 4 } },
  });
  s.pool.peibol! -= 9;
  const r = action(action(validateMatchState(s), 'start_combat'), 'resolve_round');
  expect(r.lastReward!.jew).toMatchObject({ stars: 3, requested: 8, unitId: 'higher' });
});
it('round/action retries, receipt tampering and gold-cap overflow cannot duplicate interest', () => {
  const c = { ...P13T1_ECONOMY_CONFIG, goldCap: 75 },
    s = action(fixture(71, 3, false, c), 'start_combat');
  const cmd = commandFor(s, { type: 'resolve_round', round: s.round });
  const one = applyMatchAction(s, cmd);
  if (!one.ok) throw Error(one.error);
  const again = applyMatchAction(one.state, cmd);
  expect(again.ok).toBe(false);
  expect(again.state).toEqual(one.state);
  expect(one.state.gold).toBe(75);
  expect(one.state.lastReward!.jew!.credited).toBe(0);
  expect(one.state.lastReward!.jew!.requested).toBe(8);
  const corrupt = structuredClone(one.state);
  corrupt.lastReward!.jew!.requested++;
  expect(() => validateMatchState(corrupt)).toThrow(/Jew/);
  const duplicated = structuredClone(one.state);
  duplicated.ledger.push({ ...duplicated.ledger.at(-1)!, seq: duplicated.ledger.length });
  expect(() => validateMatchState(duplicated)).toThrow(/Duplicate Jew/);
});
it('old P12J/P13T Jew remains pending and old receipts never acquire new fields', () => {
  for (const cfg of [P12F_ECONOMY_CONFIG, P13T_ECONOMY_CONFIG]) {
    const r = action(action(fixture(71, 3, false, cfg), 'start_combat'), 'resolve_round');
    expect(r.lastReward).not.toHaveProperty('jew');
    expect(r.ledger.some((e) => e.reason === 'jew_interest')).toBe(false);
  }
  for (const t of P13T1_TRAITS)
    if (t.id !== 'jew') expect(t).toEqual(P11_TRAITS.find((x) => x.id === t.id));
  expect(matchCatalog(P13T1_ECONOMY_CONFIG).map((u) => u.id)).toEqual(
    matchCatalog(P13T_ECONOMY_CONFIG).map((u) => u.id),
  );
  expect(matchCatalog(P13T1_ECONOMY_CONFIG).find((u) => u.id === 'peibol')).toMatchObject({
    role: 'ranger',
    activeAbilityId: 'headshot-p13t',
  });
  expect(matchCatalog(P13T_ECONOMY_CONFIG).find((u) => u.id === 'peibol')!.provisional).toBe(true);
});

it('real purchase, fusion, deployment and equipment keep the new character/trait contract', () => {
  let s = createMatch(42, { ...P13T1_ECONOMY_CONFIG, initialGold: 50 });
  s.level = 7;
  s.xp = 0;
  for (const offer of s.shop) if (offer) s.pool[offer.definitionId]!++;
  s.shop = Array.from({ length: 5 }, (_, i) =>
    i < 3 ? { id: `buy-${i}`, definitionId: 'peibol' } : null,
  );
  s.pool.peibol! -= 3;
  s.shopRolls = Array.from({ length: 5 }, (_, i) =>
    i < 3 ? { cost: 1, outcome: 'offered' } : { cost: 4, outcome: 'no-catalog' },
  );
  for (let n = 0; n < 3; n++) {
    const result = applyMatchAction(s, commandFor(s, { type: 'buy_unit', offerId: `buy-${n}` }));
    if (!result.ok) throw Error(result.error);
    s = result.state;
  }
  expect(s.units).toHaveLength(1);
  expect(s.units[0]!.stars).toBe(2);
  expect(matchTraits(s).find((t) => t.trait.id === 'jew')!.count).toBe(0);
  const moved = applyMatchAction(
    s,
    commandFor(s, {
      type: 'move_unit',
      unitId: s.units[0]!.id,
      to: { kind: 'board', hex: { q: 0, r: 4 } },
    }),
  );
  if (!moved.ok) throw Error(moved.error);
  s = moved.state;
  grantItemInstances(s, 'p13t1-equipment', ['component-ad']);
  applyItemCommand(s, {
    type: 'equip_item',
    itemId: s.items!.components[0]!.id,
    unitId: s.units[0]!.id,
  });
  validateMatchState(s);
  expect(matchTraits(s).find((t) => t.trait.id === 'jew')!.thresholds).toHaveLength(1);
  const p = scaledOwnedProfile(s.units[0]!, s.config, s.items);
  expect(p.itemRole).toBe('marksman');
  expect(p.stats.range).toBe(3);
  expect(p.championAbility!.active!.manaCost).toBe(70);
  expect(p.initialItemModifiers!.some((m) => m.stat === 'attack')).toBe(true);
});
