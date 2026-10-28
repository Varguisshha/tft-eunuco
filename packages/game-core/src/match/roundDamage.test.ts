import { describe, expect, it } from 'vitest';
import { type MatchCommand, type MatchState, type CombatResult } from '@tft/shared';
import { ECONOMY_CONFIG } from '@tft/game-data';
import { calculateRoundDamage } from './roundDamage';
import { applyMatchAction, commandFor, createMatch, replayMatch } from './engine';
import { validateMatchState } from './invariants';
import { BOARD_HEXES } from '../hex';
const config = ECONOMY_CONFIG.roundDamage;
const double: CombatResult = { outcome: 'double_loss', winner: null, reason: 'timeout', tick: 450 };
function act(state: MatchState, command: MatchCommand) {
  const r = applyMatchAction(state, commandFor(state, command));
  if (!r.ok) throw new Error(r.error);
  return r.state;
}
function ready() {
  let s = createMatch(42);
  s = act(s, { type: 'buy_unit', offerId: s.shop[0]!.id });
  return act(s, {
    type: 'move_unit',
    unitId: s.units[0]!.id,
    to: { kind: 'board', hex: { q: 0, r: 4 } },
  });
}
function blocked(streak: number, initialHp = 100) {
  let s = ready();
  s.config.roundDamage.initialHp = initialHp;
  s.health = { north: initialHp, south: initialHp };
  s.streak = streak;
  s = act(s, { type: 'start_combat' });
  // Fixture uses legal impassable row; no fabricated result is accepted by resolve_round.
  s.combat!.input.obstacles = BOARD_HEXES.filter((h) => h.r === 3);
  return s;
}
describe('configured player damage', () => {
  it.each([
    [1, 2],
    [3, 2],
    [4, 3],
    [6, 3],
    [7, 4],
    [10, 5],
    [13, 6],
    [200, 6],
  ])('uses round %i base %i', (round, base) => {
    const damage = calculateRoundDamage(round, double, [], config);
    expect(damage.north).toEqual({ outcome: 'loss', base, survivors: 0, requested: base });
    expect(damage.south).toEqual(damage.north);
  });
  it('adds only opposing surviving stars and both participants lose on timeout', () => {
    const damage = calculateRoundDamage(
      4,
      double,
      [
        { side: 'south', stars: 3 },
        { side: 'south', stars: 1 },
        { side: 'north', stars: 2 },
      ],
      config,
    );
    expect(damage.south).toEqual({ outcome: 'loss', base: 3, survivors: 2, requested: 5 });
    expect(damage.north.requested).toBe(7);
  });
  it('mutual elimination charges the explicit stage base, and a winner takes zero', () => {
    expect(
      calculateRoundDamage(1, { ...double, reason: 'elimination' }, [], config).south.requested,
    ).toBe(2);
    const damage = calculateRoundDamage(
      1,
      { outcome: 'win', winner: 'south', reason: 'elimination', tick: 90 },
      [{ side: 'south', stars: 2 }],
      config,
    );
    expect(damage.south).toEqual({ outcome: 'win', base: 0, survivors: 0, requested: 0 });
    expect(damage.north.requested).toBe(4);
  });
  it('is configurable, pure and rejects malformed numbers', () => {
    const c = {
      ...config,
      baseByStage: [7],
      survivorByStars: [2, 4, 6] as [number, number, number],
    };
    const before = JSON.stringify(c);
    expect(calculateRoundDamage(1, double, [{ side: 'north', stars: 2 }], c).south.requested).toBe(
      11,
    );
    expect(JSON.stringify(c)).toBe(before);
    expect(() => calculateRoundDamage(NaN, double, [], c)).toThrow();
    expect(() => calculateRoundDamage(1, double, [], { ...c, roundsPerStage: 0 })).toThrow();
  });
});
describe('double-loss settlement', () => {
  it.each([6, -6, 0])(
    'resets streak %i to zero, pays no victory/streak bonus and damages both once',
    (streak) => {
      const combat = blocked(streak);
      const before = JSON.stringify(combat);
      const pool = combat.pool,
        bank = combat.gold;
      const payload = commandFor(combat, { type: 'resolve_round', round: 1 });
      const result = applyMatchAction(combat, payload);
      if (!result.ok) throw new Error(result.error);
      const s = result.state;
      expect(JSON.stringify(combat)).toBe(before);
      expect(s.combat!.result).toEqual(double);
      expect(s.streak).toBe(0);
      expect(s.lastReward).toMatchObject({
        outcome: 'double_loss',
        bank,
        base: 2,
        interest: 0,
        victory: 0,
        streak: 0,
        xp: 2,
      });
      expect(s.gold).toBe(bank + 2);
      expect(s.totalXp).toBe(2);
      expect(s.health).toEqual({ north: 97, south: 97 });
      expect(s.healthLedger).toHaveLength(2);
      expect(s.healthLedger.every((e) => e.outcome === 'loss')).toBe(true);
      expect(s.pool).toEqual(pool);
      expect(applyMatchAction(s, payload)).toMatchObject({
        ok: false,
        error: 'stale-action',
        state: s,
      });
      expect(applyMatchAction(s, commandFor(s, { type: 'resolve_round', round: 1 }))).toMatchObject(
        { ok: false, error: 'wrong-phase', state: s },
      );
      const next = act(s, { type: 'next_round', round: 1 });
      expect(next.phase).toBe('preparation');
      expect(next.health).toEqual(s.health);
      expect(next.gold).toBe(s.gold);
      expect(() => validateMatchState(next)).not.toThrow();
    },
  );
  it('caps applied damage at remaining health, records requested damage, and permits continuing at zero', () => {
    const s = act(blocked(-3, 1), { type: 'resolve_round', round: 1 });
    expect(s.health).toEqual({ north: 0, south: 0 });
    expect(s.healthLedger[0]).toMatchObject({ requested: 3, applied: 1, hpBefore: 1, hpAfter: 0 });
    const next = act(s, { type: 'next_round', round: 1 });
    expect(act(next, { type: 'start_combat' }).phase).toBe('combat');
    const corrupt = structuredClone(s);
    corrupt.health.south = 1;
    expect(() => validateMatchState(corrupt)).toThrow();
  });
  it('replays real multi-round health and economic ledgers exactly', () => {
    let s = ready();
    for (let i = 0; i < 3; i++) {
      s = act(s, { type: 'start_combat' });
      s = act(s, { type: 'resolve_round', round: s.round });
      s = act(s, { type: 'next_round', round: s.round });
    }
    expect(replayMatch(s.seed, s.history, s.config)).toEqual(s);
    expect(s.healthLedger).toHaveLength(6);
  });
});
it('settles mutual elimination as two losses with stage-only damage', () => {
  const combat = blocked(4);
  combat.combat!.input.obstacles = [];
  combat.combat!.input.units.forEach((u, i) => {
    u.position = { q: 0, r: i === 0 ? 4 : 3 };
    u.profile.ability = null;
    u.profile.passive = null;
    Object.assign(u.profile.stats, {
      maxHp: 10,
      attack: 100,
      armor: 0,
      magicResist: 0,
      attackSpeedMilli: 1000,
      attackWindupTicks: 2,
    });
  });
  const s = act(combat, { type: 'resolve_round', round: 1 });
  expect(s.combat?.result).toEqual({
    outcome: 'double_loss',
    winner: null,
    reason: 'elimination',
    tick: 3,
  });
  expect(s.health).toEqual({ north: 98, south: 98 });
  expect(s.streak).toBe(0);
  expect(s.lastReward?.streak).toBe(0);
});
