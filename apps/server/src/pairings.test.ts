import { describe, it, expect } from 'vitest';
import { pairRound, deriveSeed, type PairingHistory } from './pairings';
import { PairingPlanSchema, PairingSchema } from '@tft/shared';
const ids = ['alpha', 'beta', 'gamma', 'delta'];
function cycle(count: number, rounds: number, seed = 42) {
  const history: PairingHistory[] = [];
  const plans = [];
  for (let round = 1; round <= rounds; round++) {
    const plan = pairRound(ids.slice(0, count), round, history, seed, 'test');
    history.push({ round, pairings: plan.pairings });
    plans.push(plan);
  }
  return plans;
}
describe('deterministic history-aware pairings', () => {
  it.each([2, 3, 4])('assigns every one of %i humans exactly once per round', (n) => {
    for (const plan of cycle(n, 30)) {
      expect(PairingPlanSchema.safeParse(plan).success).toBe(true);
      const assigned = plan.pairings.flatMap((p) =>
        p.kind === 'human' ? [p.southPlayerId, p.northPlayerId] : [p.southPlayerId],
      );
      expect(assigned.sort()).toEqual(ids.slice(0, n).sort());
      expect(new Set(plan.pairings.map((p) => p.combatId)).size).toBe(plan.pairings.length);
    }
  });
  it.each([0, 1, 42, 999, 0xffffffff])(
    'four players complete all rivals in first three rounds, seed %i',
    (seed) => {
      const plans = cycle(4, 12, seed);
      for (let start = 0; start < 12; start += 3) {
        for (const id of ids) {
          const rivals = plans
            .slice(start, start + 3)
            .flatMap((p) => p.pairings)
            .filter((p) => [p.southPlayerId, p.northPlayerId].includes(id))
            .map((p) => (p.southPlayerId === id ? p.northPlayerId : p.southPlayerId));
          expect(new Set(rivals).size).toBe(3);
        }
      }
    },
  );
  it('rotates ghost recipient and owner fairly and never copies self', () => {
    const ghosts = cycle(3, 60)
      .flatMap((p) => p.pairings)
      .filter((p) => p.kind === 'ghost');
    for (const id of ids.slice(0, 3)) {
      expect(ghosts.filter((p) => p.ghostFacingId === id)).toHaveLength(20);
      expect(ghosts.filter((p) => p.ghostOwnerId === id)).toHaveLength(20);
    }
    expect(ghosts.every((p) => p.ghostOwnerId !== p.ghostFacingId)).toBe(true);
    for (let i = 0; i < 60; i += 3)
      expect(new Set(ghosts.slice(i, i + 3).map((p) => p.ghostFacingId)).size).toBe(3);
  });
  it('is reproducible independent of connection ordering and history ordering', () => {
    const history = cycle(4, 4).map((p) => ({ round: p.round, pairings: p.pairings }));
    const a = pairRound(ids, 5, history, 42, 'test');
    expect(pairRound([...ids].reverse(), 5, [...history].reverse(), 42, 'test')).toEqual(a);
    expect(cycle(3, 8)).toEqual(cycle(3, 8));
    expect(deriveSeed(42, 'round-1')).not.toBe(deriveSeed(42, 'round-2'));
  });
  it('uses seed for ties, and history outranks the tie breaker', () => {
    const first = cycle(4, 1)[0]!;
    const next = pairRound(ids, 2, [{ round: 1, pairings: first.pairings }], 42, 'test');
    expect(next.pairings.map((p) => p.northPlayerId)).not.toEqual(
      first.pairings.map((p) => p.northPlayerId),
    );
    const choices = new Set(
      Array.from(
        { length: 50 },
        (_, seed) => pairRound(ids, 1, [], seed, 'm').pairings[0]!.northPlayerId,
      ),
    );
    expect(choices.size).toBe(3);
  });
  it('rejects invalid cardinalities, duplicate IDs and future histories', () => {
    for (const roster of [[], ['a'], ['a', 'a'], [...ids, 'extra']])
      expect(() => pairRound(roster, 1, [], 42, 'm')).toThrow();
    expect(() => pairRound(ids, 1, [{ round: 1, pairings: [] }], 42, 'm')).toThrow();
    expect(() => pairRound(ids, 0, [], 42, 'm')).toThrow();
    expect(() => pairRound(ids, 1, [], 42, 'm', { recentWindow: 0 })).toThrow();
  });
  it('rejects self ghosts and multiple assignments in contracts', () => {
    const plan = cycle(3, 1)[0]!;
    const ghost = plan.pairings.find((p) => p.kind === 'ghost')!;
    expect(PairingSchema.safeParse({ ...ghost, ghostOwnerId: ghost.southPlayerId }).success).toBe(
      false,
    );
    expect(PairingPlanSchema.safeParse({ ...plan, pairings: [ghost, ghost] }).success).toBe(false);
  });
});
