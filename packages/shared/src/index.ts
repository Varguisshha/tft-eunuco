import { z } from 'zod';

export const TICK_MS = 100 as const;
export const BOARD_COLUMNS = 7 as const;
export const BOARD_ROWS = 8 as const;
export const HALF_ROWS = 4 as const;
const id = z.string().min(1).max(80);
const integer = z.number().int().safe();
export const HexCoordSchema = z.strictObject({ q: integer, r: integer });
export type HexCoord = z.infer<typeof HexCoordSchema>;
export const SideSchema = z.enum(['north', 'south']);
export type Side = z.infer<typeof SideSchema>;
export const CombatSeedSchema = z.number().int().min(0).max(0xffffffff);
export type CombatSeed = z.infer<typeof CombatSeedSchema>;
export const UnitDefinitionSchema = z.strictObject({
  id,
  name: z.string().min(1),
  role: z.enum(['vanguard', 'striker', 'ranger', 'support']),
  cost: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  synergies: z.tuple([id], id).refine((items) => items.length <= 2, 'One or two synergies'),
  activeAbilityId: id.nullable(),
  passiveAbilityId: id.nullable(),
  spriteId: id,
});
export type UnitDefinition = z.infer<typeof UnitDefinitionSchema>;
export const UnitInstanceSchema = z.strictObject({
  id,
  definitionId: id,
  owner: SideSchema,
  position: HexCoordSchema,
});
export type UnitInstance = z.infer<typeof UnitInstanceSchema>;
export const BoardStateSchema = z
  .strictObject({ units: z.array(UnitInstanceSchema).max(56) })
  .superRefine((board, ctx) => {
    const ids = new Set<string>();
    const cells = new Set<string>();
    board.units.forEach((unit, index) => {
      const { q, r } = unit.position;
      const col = q + Math.floor(r / 2);
      if (r < 0 || r >= BOARD_ROWS || col < 0 || col >= BOARD_COLUMNS) {
        ctx.addIssue({
          code: 'custom',
          message: 'Out of bounds',
          path: ['units', index, 'position'],
        });
      }
      const key = `${q},${r}`;
      if (ids.has(unit.id) || cells.has(key))
        ctx.addIssue({
          code: 'custom',
          message: 'Duplicate unit or occupied cell',
          path: ['units', index],
        });
      ids.add(unit.id);
      cells.add(key);
    });
  });
export type BoardState = z.infer<typeof BoardStateSchema>;
export const GameStateSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    phase: z.enum(['preparation', 'combat', 'finished']),
    tick: integer.nonnegative(),
    seed: CombatSeedSchema,
    board: BoardStateSchema,
  })
  .superRefine((state, ctx) => {
    if (state.phase !== 'preparation') return;
    state.board.units.forEach((unit, index) => {
      if ((unit.owner === 'south') !== unit.position.r >= HALF_ROWS) {
        ctx.addIssue({
          code: 'custom',
          message: 'Wrong deployment half',
          path: ['board', 'units', index, 'position'],
        });
      }
    });
  });
export type GameState = z.infer<typeof GameStateSchema>;
const eventBase = { tick: integer.nonnegative(), sequence: integer.nonnegative(), unitId: id };
export const CombatEventSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...eventBase,
    type: z.literal('move'),
    from: HexCoordSchema,
    to: HexCoordSchema,
  }),
  z.strictObject({ ...eventBase, type: z.literal('attack'), targetId: id }),
  z.strictObject({
    ...eventBase,
    type: z.literal('ability'),
    abilityId: id,
    targetIds: z.array(id),
  }),
  z.strictObject({
    ...eventBase,
    type: z.literal('damage'),
    targetId: id,
    amount: integer.nonnegative(),
  }),
  z.strictObject({ ...eventBase, type: z.literal('death') }),
]);
export type CombatEvent = z.infer<typeof CombatEventSchema>;
export function serializeGameState(state: GameState): string {
  return JSON.stringify(GameStateSchema.parse(state));
}
export function deserializeGameState(json: string): GameState {
  return GameStateSchema.parse(JSON.parse(json));
}
