import { describe, it, expect } from 'vitest';
import {
  EconomyConfigSchema,
  type MatchState,
  type MatchCommand,
  type OwnedUnit,
} from '@tft/shared';
import { ECONOMY_CONFIG, UNIT_DEFINITIONS } from '@tft/game-data';
import { applyMatchAction, commandFor, createMatch, replayMatch } from './engine';
import { validateMatchState } from './invariants';
import { copiesOf, deployedCount, interestFor, sellValue, scaledProfile } from './selectors';
import { offsetToAxial } from '../hex';
import { randomUint32 } from '../combat/math';
function act(s: MatchState, c: MatchCommand): MatchState {
  const result = applyMatchAction(s, commandFor(s, c));
  if (!result.ok) throw new Error(result.error);
  return result.state;
}
function failed(s: MatchState, c: MatchCommand, error: string) {
  const before = JSON.stringify(s);
  const r = applyMatchAction(s, commandFor(s, c));
  expect(r).toEqual({ ok: false, state: s, error });
  expect(JSON.stringify(s)).toBe(before);
}
const rich = () => createMatch(42, { ...ECONOMY_CONFIG, initialGold: 500 });
// Conserved fixtures: return existing offers first, then reserve exact test offers/owned copies.
function offers(s: MatchState, ids: string[]): MatchState {
  s = structuredClone(s);
  for (const o of s.shop) if (o) s.pool[o.definitionId]!++;
  s.shop = Array(5).fill(null);
  ids.forEach((definitionId, i) => {
    s.pool[definitionId]!--;
    s.shop[i] = { id: `fixture-${s.nextEntity++}`, definitionId };
  });
  return validateMatchState(s);
}
function owns(s: MatchState, units: OwnedUnit[]): MatchState {
  s = offers(s, []);
  for (const u of units) s.pool[u.definitionId]! -= copiesOf(u, s.config);
  s.units = units;
  return validateMatchState(s);
}
const unit = (
  id: string,
  definitionId = 'test-k01',
  stars: 1 | 2 | 3 = 1,
  slot = 0,
): OwnedUnit => ({ id, definitionId, stars, location: { kind: 'bench', slot } });
const buy = (s: MatchState, i = 0) => act(s, { type: 'buy_unit', offerId: s.shop[i]!.id });
function resultRound(s: MatchState, outcome: 'win' | 'loss' | 'draw'): MatchState {
  s = act(s, { type: 'start_combat' });
  s = structuredClone(s);
  const input = s.combat!.input;
  input.maxTicks = 1;
  for (const u of input.units) {
    u.profile.stats.attack = 0;
    u.profile.ability = null;
    u.profile.passive = null;
  }
  if (outcome !== 'draw')
    input.units = input.units.filter((u) => u.owner === (outcome === 'win' ? 'south' : 'north'));
  return act(s, { type: 'resolve_round', round: s.round });
}
const deployed = () =>
  owns(rich(), [{ ...unit('a'), location: { kind: 'board', hex: offsetToAxial(2, 4) } }]);
describe('economy and configuration', () => {
  it('starts with ten gold, level two, empty nine-slot bench and five reserved offers', () => {
    const s = createMatch();
    expect(s.gold).toBe(10);
    expect(s.level).toBe(2);
    expect(s.units).toEqual([]);
    expect(s.config.benchSize).toBe(9);
    expect(s.shop.filter(Boolean)).toHaveLength(5);
    expect(s.ledger[0]?.delta).toBe(10);
  });
  it('validates every probability row and progression', () => {
    expect(EconomyConfigSchema.safeParse(ECONOMY_CONFIG).success).toBe(true);
    const bad = structuredClone(ECONOMY_CONFIG);
    bad.levels[0]!.odds = [81, 20, 0];
    expect(EconomyConfigSchema.safeParse(bad).success).toBe(false);
  });
  it.each([
    [0, 0],
    [9, 0],
    [10, 1],
    [49, 4],
    [50, 5],
    [999, 5],
  ])('interest at %i is %i', (gold, want) => expect(interestFor(gold, ECONOMY_CONFIG)).toBe(want));
  it('settles base progression and snapshots interest before rewards', () => {
    let s = deployed();
    for (const base of [2, 3, 4, 5, 5]) {
      const bank = s.gold;
      s = resultRound(s, 'win');
      expect(s.lastReward).toMatchObject({ bank, base, interest: 5, victory: 1 });
      expect(s.gold).toBe(bank + s.lastReward!.total);
      s = act(s, { type: 'next_round', round: s.round });
    }
  });
  it('pays both streak types with explicit breakpoints and resets on draw', () => {
    let s = deployed();
    for (const [i, gold] of [0, 1, 1, 2, 2, 3].entries()) {
      s = resultRound(s, 'loss');
      expect(s.streak).toBe(-(i + 1));
      expect(s.lastReward?.streak).toBe(gold);
      s = act(s, { type: 'next_round', round: s.round });
    }
    s = resultRound(s, 'draw');
    expect(s.streak).toBe(0);
    expect(s.lastReward).toMatchObject({ victory: 0, streak: 0 });
    s = act(s, { type: 'next_round', round: s.round });
    s = resultRound(s, 'win');
    expect(s.streak).toBe(1);
  });
  it('records cap overflow and conserves credited gold in the ledger', () => {
    let s = owns(createMatch(1, { ...ECONOMY_CONFIG, initialGold: 999 }), [
      { ...unit('a'), location: { kind: 'board', hex: offsetToAxial(2, 4) } },
    ]);
    s = resultRound(s, 'win');
    expect(s.gold).toBe(999);
    expect(s.lastReward?.credited).toBe(0);
    expect(s.lastReward?.overflow).toBe(s.lastReward?.total);
    expect(validateMatchState(s)).toEqual(s);
  });
});
describe('shop and pool transactions', () => {
  it('draws byte-identical shops from equal state/seed', () => {
    let a = rich(),
      b = rich();
    for (let i = 0; i < 20; i++) {
      a = act(a, { type: 'reroll_shop' });
      b = act(b, { type: 'reroll_shop' });
      expect(a).toEqual(b);
    }
  });
  it('uses different seeds and never changes combat RNG for rerolls', () => {
    const a = rich();
    expect(createMatch(1).shop).not.toEqual(createMatch(2).shop);
    expect(act(a, { type: 'reroll_shop' }).combatRng).toBe(a.combatRng);
  });
  it('buys exactly once with one charge and preserves input', () => {
    const s = createMatch();
    const before = JSON.stringify(s);
    const offer = s.shop[0]!;
    const action = commandFor(s, { type: 'buy_unit', offerId: offer.id });
    const r = applyMatchAction(s, action);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.gold).toBe(10 - UNIT_DEFINITIONS.find((d) => d.id === offer.definitionId)!.cost);
    expect(r.state.shop[0]).toBeNull();
    expect(r.state.units).toHaveLength(1);
    expect(JSON.stringify(s)).toBe(before);
    expect(applyMatchAction(r.state, action)).toMatchObject({ ok: false, error: 'stale-action' });
    failed(r.state, { type: 'buy_unit', offerId: offer.id }, 'missing-offer');
  });
  it('rejects insufficient money for buying, XP and reroll atomically', () => {
    const s = createMatch(0, { ...ECONOMY_CONFIG, initialGold: 0 });
    failed(s, { type: 'buy_unit', offerId: s.shop[0]!.id }, 'insufficient-gold');
    failed(s, { type: 'buy_xp' }, 'insufficient-gold');
    failed(s, { type: 'reroll_shop' }, 'insufficient-gold');
  });
  it('rerolls for two and releases old reservations', () => {
    const s = createMatch();
    const r = act(s, { type: 'reroll_shop' });
    expect(r.gold).toBe(8);
    expect(r.shop.some((o) => s.shop.some((p) => p?.id === o?.id))).toBe(false);
    expect(validateMatchState(r)).toEqual(r);
  });
  it('honors persistent lock including purchased holes; manual reroll remains explicit', () => {
    let s = deployed();
    s = offers(s, ['test-k01', 'test-v02']);
    s = act(s, { type: 'lock_shop', locked: true });
    s = buy(s);
    const shop = s.shop;
    s = resultRound(s, 'draw');
    s = act(s, { type: 'next_round', round: s.round });
    expect(s.shop).toEqual(shop);
    expect(s.shopLocked).toBe(true);
    const r = act(s, { type: 'reroll_shop' });
    expect(r.shop).not.toEqual(shop);
    expect(r.shopLocked).toBe(true);
    s = act(s, { type: 'lock_shop', locked: false });
    s = resultRound(s, 'draw');
    s = act(s, { type: 'next_round', round: s.round });
    expect(s.shop).not.toEqual(shop);
  });
  it('returns empty slots when every eligible category is exhausted', () => {
    const config = { ...ECONOMY_CONFIG, copiesByCost: [0, 0, 9] as [number, number, number] };
    const s = createMatch(0, config);
    expect(s.shop).toEqual([null, null, null, null, null]);
    expect(Object.values(s.pool)).toEqual([0, 0, 0, 9]);
  });
  it('redistributes category weight among available positive categories', () => {
    const s = createMatch(5, { ...ECONOMY_CONFIG, copiesByCost: [0, 5, 5] });
    expect(s.shop.every((o) => o && ['test-v02', 'test-r03'].includes(o.definitionId))).toBe(true);
  });
  it('rejects unknown offers, malformed actions and corrupt state', () => {
    const s = createMatch();
    failed(s, { type: 'buy_unit', offerId: 'unknown' }, 'missing-offer');
    expect(applyMatchAction(s, { type: 'buy_unit' })).toMatchObject({
      ok: false,
      error: 'invalid-action',
    });
    const bad = { ...s, pool: { ...s.pool, 'test-k01': 1000 } };
    expect(applyMatchAction(bad, commandFor(bad, { type: 'reroll_shop' }))).toMatchObject({
      ok: false,
      error: 'invalid-state',
    });
  });
  it('rejects a full bench without losing gold, offer or RNG', () => {
    let s = owns(
      rich(),
      Array.from({ length: 9 }, (_, i) =>
        unit(
          `owned-${i}`,
          i < 4 ? 'test-k01' : i < 8 ? 'test-v02' : 'test-r03',
          i % 4 < 2 ? 1 : 2,
          i,
        ),
      ),
    );
    s = offers(s, ['test-m04']);
    failed(s, { type: 'buy_unit', offerId: s.shop[0]!.id }, 'bench-full');
  });
  it('allows a full-bench purchase when immediate combination frees space', () => {
    const units = Array.from({ length: 9 }, (_, i) =>
      unit(
        `owned-${i}`,
        i < 2 ? 'test-k01' : i < 6 ? 'test-v02' : 'test-r03',
        i < 2 || i % 4 < 2 ? 1 : 2,
        i,
      ),
    );
    let s = owns(rich(), units);
    s = offers(s, ['test-k01']);
    s = buy(s);
    expect(s.units.length).toBeLessThan(9);
    expect(s.units.find((u) => u.definitionId === 'test-k01')?.stars).toBe(2);
    expect(validateMatchState(s)).toEqual(s);
  });
});
describe('stars and ownership', () => {
  it('fuses three singles and nine singles with exact copy equivalence', () => {
    let s = rich();
    for (let i = 0; i < 9; i++) {
      s = offers(s, ['test-k01']);
      s = buy(s);
      expect(validateMatchState(s)).toEqual(s);
      if (i === 2) expect(s.units).toHaveLength(1);
    }
    expect(s.units).toHaveLength(1);
    expect(s.units[0]?.stars).toBe(3);
    expect(copiesOf(s.units[0]!, s.config)).toBe(9);
  });
  it('keeps a deployed copy instead of bench copies, with stable ID tie-breaking', () => {
    let s = owns(rich(), [
      { ...unit('z'), location: { kind: 'board', hex: offsetToAxial(2, 4) } },
      unit('a', 'test-k01', 1, 0),
    ]);
    s = offers(s, ['test-k01']);
    s = buy(s);
    expect(s.units[0]).toMatchObject({
      id: 'z',
      stars: 2,
      location: { kind: 'board', hex: offsetToAxial(2, 4) },
    });
  });
  it.each([1, 2, 3] as const)(
    'sells a %i-star unit for configured value and returns every copy',
    (stars) => {
      let s = owns(rich(), [unit('a', 'test-r03', stars)]);
      const before = s.pool['test-r03']!;
      const value = sellValue(s.units[0]!, s.config);
      s = act(s, { type: 'sell_unit', unitId: 'a' });
      expect(s.gold).toBe(500 + value);
      expect(s.pool['test-r03']).toBe(before + 3 ** (stars - 1));
      expect(s.units).toEqual([]);
      failed(s, { type: 'sell_unit', unitId: 'a' }, 'missing-unit');
    },
  );
  it('scales HP, attack and spell amounts without mutating base data', () => {
    const a = scaledProfile('test-m04', 1, ECONOMY_CONFIG),
      b = scaledProfile('test-m04', 3, ECONOMY_CONFIG);
    expect(b.stats.maxHp).toBe(842);
    expect(b.stats.attack).toBe(97);
    expect(a.stats.maxHp).toBe(260);
    expect(b.stats.range).toBe(a.stats.range);
  });
});
describe('placement and levels', () => {
  it('moves bench to board, reorders and swaps in both directions', () => {
    let s = owns(rich(), [unit('a'), unit('b', 'test-r03', 1, 1)]);
    s = act(s, { type: 'move_unit', unitId: 'a', to: { kind: 'board', hex: offsetToAxial(2, 4) } });
    s = act(s, { type: 'move_unit', unitId: 'b', to: { kind: 'board', hex: offsetToAxial(2, 4) } });
    expect(s.units.find((u) => u.id === 'a')?.location).toEqual({ kind: 'bench', slot: 1 });
    s = act(s, { type: 'move_unit', unitId: 'a', to: { kind: 'bench', slot: 8 } });
    s = act(s, { type: 'swap_units', unitId: 'a', otherId: 'b' });
    expect(s.units.find((u) => u.id === 'b')?.location).toEqual({ kind: 'bench', slot: 8 });
  });
  it('rejects opponent half, out of bounds, invalid slots and level overflow', () => {
    let s = owns(rich(), [unit('a'), unit('b', 'test-r03', 1, 1), unit('c', 'test-v02', 1, 2)]);
    failed(
      s,
      { type: 'move_unit', unitId: 'a', to: { kind: 'board', hex: { q: 0, r: 1 } } },
      'invalid-location',
    );
    failed(
      s,
      { type: 'move_unit', unitId: 'a', to: { kind: 'board', hex: { q: 99, r: 4 } } },
      'invalid-location',
    );
    failed(s, { type: 'move_unit', unitId: 'a', to: { kind: 'bench', slot: 9 } }, 'invalid-action');
    for (const [i, id] of ['a', 'b'].entries())
      s = act(s, {
        type: 'move_unit',
        unitId: id,
        to: { kind: 'board', hex: offsetToAxial(i, 4) },
      });
    failed(
      s,
      { type: 'move_unit', unitId: 'c', to: { kind: 'board', hex: offsetToAxial(2, 4) } },
      'deployment-limit',
    );
  });
  it('blocks combat on excess deployment but allows safe withdrawal', () => {
    let s = owns(
      rich(),
      ['a', 'b', 'c'].map((id, i) => ({
        ...unit(id),
        location: { kind: 'board' as const, hex: offsetToAxial(i, 4) },
      })),
    );
    failed(s, { type: 'start_combat' }, 'deployment-limit');
    s = act(s, { type: 'move_unit', unitId: 'a', to: { kind: 'bench', slot: 0 } });
    expect(deployedCount(s)).toBe(2);
    expect(act(s, { type: 'start_combat' }).phase).toBe('combat');
  });
  it('buys four XP for four gold, carries overflow and updates odds', () => {
    const s = act(createMatch(), { type: 'buy_xp' });
    expect(s).toMatchObject({ gold: 6, level: 3, xp: 2, totalXp: 4 });
    expect(s.config.levels[s.level - 2]?.odds).toEqual([60, 35, 5]);
  });
  it('reaches maximum seven, zeroes excess XP and refuses more purchases', () => {
    let s = rich();
    while (s.level < 7) s = act(s, { type: 'buy_xp' });
    expect(s.xp).toBe(0);
    failed(s, { type: 'buy_xp' }, 'max-level');
  });
});
describe('round authority and reproducibility', () => {
  it('requires deployment and blocks preparation actions during combat and resolution', () => {
    failed(createMatch(), { type: 'start_combat' }, 'empty-board');
    let s = act(deployed(), { type: 'start_combat' });
    for (const c of [
      { type: 'reroll_shop' },
      { type: 'buy_xp' },
      { type: 'lock_shop', locked: true },
      { type: 'sell_unit', unitId: 'a' },
    ] as MatchCommand[])
      failed(s, c, 'wrong-phase');
    s = act(s, { type: 'resolve_round', round: 1 });
    failed(s, { type: 'reroll_shop' }, 'wrong-phase');
  });
  it('rejects duplicate settlement and wrong round; preserves owned formation after combat', () => {
    let s = act(deployed(), { type: 'start_combat' });
    const units = s.units;
    failed(s, { type: 'resolve_round', round: 2 }, 'wrong-round');
    const action = commandFor(s, { type: 'resolve_round', round: 1 });
    const result = applyMatchAction(s, action);
    if (!result.ok) throw new Error(result.error);
    s = result.state;
    expect(s.units).toEqual(units);
    expect(s.level).toBe(3);
    expect(s.combat?.result).not.toBeNull();
    expect(applyMatchAction(s, action)).toMatchObject({ ok: false, error: 'stale-action' });
    failed(s, { type: 'resolve_round', round: 1 }, 'wrong-phase');
    s = act(s, { type: 'next_round', round: 1 });
    expect(s).toMatchObject({ phase: 'preparation', round: 2, combat: null });
    failed(s, { type: 'next_round', round: 1 }, 'wrong-phase');
  });
  it('replays accepted action history across several real combats exactly', () => {
    let s = createMatch(42);
    s = buy(s);
    s = act(s, {
      type: 'move_unit',
      unitId: s.units[0]!.id,
      to: { kind: 'board', hex: offsetToAxial(2, 4) },
    });
    for (let i = 0; i < 4; i++) {
      s = act(s, { type: 'start_combat' });
      s = act(s, { type: 'resolve_round', round: s.round });
      s = act(s, { type: 'next_round', round: s.round });
      s = act(s, { type: 'reroll_shop' });
    }
    expect(replayMatch(42, JSON.parse(JSON.stringify(s.history)))).toEqual(s);
  });
  it('conserves pool and gold through 500 deterministic buy/sell/merge/reroll actions', () => {
    let s = rich(),
      rng = 37;
    for (let i = 0; i < 500; i++) {
      const r = randomUint32(rng);
      rng = r.state;
      const pick = r.value % 4;
      const offer = s.shop.find(Boolean);
      let command: MatchCommand;
      if (pick === 0 && s.units.length)
        command = { type: 'sell_unit', unitId: s.units[r.value % s.units.length]!.id };
      else if (pick <= 2 && offer) command = { type: 'buy_unit', offerId: offer.id };
      else command = { type: 'reroll_shop' };
      const result = applyMatchAction(s, commandFor(s, command));
      if (result.ok) s = result.state;
      expect(() => validateMatchState(s)).not.toThrow();
      expect(s.gold).toBe(s.ledger.reduce((n, e) => n + e.delta, 0));
    }
    expect(replayMatch(s.seed, s.history, s.config)).toEqual(s);
  });
});

it('does not let victory gold cross an interest threshold in the same settlement', () => {
  let s = owns(createMatch(42, { ...ECONOMY_CONFIG, initialGold: 9 }), [
    { ...unit('a'), location: { kind: 'board', hex: offsetToAxial(2, 4) } },
  ]);
  s = resultRound(s, 'win');
  expect(s.lastReward).toMatchObject({ bank: 9, interest: 0, total: 3 });
  expect(s.gold).toBe(12);
  s = act(s, { type: 'next_round', round: 1 });
  s = resultRound(s, 'win');
  expect(s.lastReward).toMatchObject({ bank: 12, interest: 1, total: 6 });
  expect(s.gold).toBe(18);
});
