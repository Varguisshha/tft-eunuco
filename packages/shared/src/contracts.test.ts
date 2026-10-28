import { describe, expect, it } from 'vitest';
import {
  BoardStateSchema,
  CombatEventSchema,
  CombatSeedSchema,
  deserializeGameState,
  GameStateSchema,
  serializeGameState,
  TICK_MS,
  UnitDefinitionSchema,
  type GameState,
} from './index';
const state: GameState = {
  schemaVersion: 1,
  phase: 'preparation',
  tick: 0,
  seed: 42,
  board: {
    units: [{ id: 'u1', definitionId: 'test-k01', owner: 'south', position: { q: -3, r: 7 } }],
  },
};
describe('versioned JSON contracts', () => {
  it('round trips plain JSON and preserves negative coordinates', () => {
    expect(deserializeGameState(serializeGameState(state))).toEqual(state);
    expect(TICK_MS).toBe(100);
  });
  it('rejects wrong versions, malformed JSON, fractional ticks and unknown fields', () => {
    expect(() => deserializeGameState('{broken')).toThrow();
    expect(GameStateSchema.safeParse({ ...state, schemaVersion: 2 }).success).toBe(false);
    expect(GameStateSchema.safeParse({ ...state, tick: 1.5 }).success).toBe(false);
    expect(GameStateSchema.safeParse({ ...state, extra: 1 }).success).toBe(false);
  });
  it('rejects duplicate units and occupied coordinates', () => {
    const u = state.board.units[0]!;
    expect(BoardStateSchema.safeParse({ units: [u, u] }).success).toBe(false);
    expect(BoardStateSchema.safeParse({ units: [u, { ...u, id: 'u2' }] }).success).toBe(false);
    expect(
      BoardStateSchema.safeParse({ units: [{ ...u, position: { q: 6, r: 7 } }] }).success,
    ).toBe(false);
  });
  it('enforces halves in preparation but permits cross-half positions in future combat', () => {
    const board = { units: [{ ...state.board.units[0]!, position: { q: 0, r: 0 } }] };
    expect(GameStateSchema.safeParse({ ...state, board }).success).toBe(false);
    expect(GameStateSchema.safeParse({ ...state, board, phase: 'combat' }).success).toBe(true);
  });
  it('accepts only uint32 seeds', () => {
    for (const seed of [-1, 1.1, 2 ** 32, Infinity])
      expect(CombatSeedSchema.safeParse(seed).success).toBe(false);
    expect(CombatSeedSchema.parse(0xffffffff)).toBe(0xffffffff);
  });
  it('validates event sequence and exact event payload', () => {
    const event = {
      type: 'damage',
      tick: 7,
      sequence: 2,
      unitId: 'u1',
      targetId: 'u2',
      amount: 10,
    };
    expect(CombatEventSchema.parse(JSON.parse(JSON.stringify(event)))).toEqual(event);
    expect(CombatEventSchema.safeParse({ ...event, amount: -1 }).success).toBe(false);
    expect(CombatEventSchema.safeParse({ ...event, sequence: -1 }).success).toBe(false);
    expect(CombatEventSchema.safeParse({ ...event, type: 'heal' }).success).toBe(false);
  });
  it('requires distinct affinities without a structural cap and explicit pending abilities', () => {
    const def = {
      id: 'test',
      name: 'Test',
      role: 'support',
      cost: 3,
      synergies: ['a'],
      activeAbilityId: null,
      passiveAbilityId: null,
      spriteId: 'test',
    };
    expect(UnitDefinitionSchema.safeParse(def).success).toBe(true);
    expect(
      UnitDefinitionSchema.parse({
        ...def,
        synergies: Array.from({ length: 32 }, (_, i) => `affinity-${i}`),
      }).synergies,
    ).toHaveLength(32);
    for (const synergies of [[], ['a', 'a']])
      expect(UnitDefinitionSchema.safeParse({ ...def, synergies }).success).toBe(false);
  });
});
