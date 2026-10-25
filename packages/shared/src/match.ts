import { z } from 'zod';
import { CombatSeedSchema, HexCoordSchema } from './board-contracts';
import { CombatInputSchema, CombatResultSchema } from './combat';
export const MATCH_RULES = 'f0p3.1-1' as const;
const nat = z.number().int().safe().nonnegative();
const id = z.string().min(1).max(80);
export const StarsSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export const UnitLocationSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('bench'), slot: z.number().int().min(0).max(8) }),
  z.strictObject({ kind: z.literal('board'), hex: HexCoordSchema }),
]);
export type UnitLocation = z.infer<typeof UnitLocationSchema>;
export const MatchUnitProgressSchema = z
  .strictObject({
    version: z.literal(1),
    stacks: z
      .array(
        z.strictObject({
          id,
          count: z.number().int().min(0).max(100),
          lastRound: z.number().int().positive(),
        }),
      )
      .max(8),
  })
  .refine(
    (p) => new Set(p.stacks.map((s) => s.id)).size === p.stacks.length,
    'Duplicate match stack',
  );
export const OwnedUnitSchema = z.strictObject({
  progress: MatchUnitProgressSchema.optional(),
  id,
  definitionId: id,
  stars: StarsSchema,
  location: UnitLocationSchema,
});
export type OwnedUnit = z.infer<typeof OwnedUnitSchema>;
export const ShopOfferSchema = z.strictObject({ id, definitionId: id });
export const RoundDamageConfigSchema = z.strictObject({
  initialHp: nat.positive().max(10000),
  roundsPerStage: nat.positive().max(100),
  baseByStage: z.array(nat.max(10000)).min(1).max(100),
  survivorByStars: z.tuple([nat.max(10000), nat.max(10000), nat.max(10000)]),
});
export type RoundDamageConfig = z.infer<typeof RoundDamageConfigSchema>;
export const HealthEntrySchema = z.strictObject({
  round: nat.positive(),
  side: z.enum(['north', 'south']),
  outcome: z.enum(['win', 'loss']),
  base: nat,
  survivors: nat,
  requested: nat,
  applied: nat,
  hpBefore: nat,
  hpAfter: nat,
});
export type HealthEntry = z.infer<typeof HealthEntrySchema>;
export const EconomyConfigSchema = z
  .strictObject({
    version: z.literal(MATCH_RULES),
    catalog: z.enum(['f0p4.1', 'f0p6a', 'f0p6b1', 'f0p6b2', 'f0p6b3', 'f0p6c']).optional(),
    initialGold: nat,
    roundDamage: RoundDamageConfigSchema,
    goldCap: nat.positive(),
    initialLevel: z.literal(2),
    maxLevel: z.literal(7),
    benchSize: z.literal(9),
    shopSize: z.literal(5),
    rerollCost: nat.positive(),
    xpCost: nat.positive(),
    xpPurchase: nat.positive(),
    passiveXp: nat,
    baseIncome: z.array(nat).min(1),
    victoryGold: nat,
    interestDivisor: nat.positive(),
    interestCap: nat,
    streaks: z.array(z.strictObject({ from: nat.positive(), gold: nat })).min(1),
    levels: z
      .array(
        z.strictObject({
          level: z.number().int().min(2).max(7),
          xpToNext: nat,
          odds: z.tuple([nat, nat, nat]),
        }),
      )
      .length(6),
    copiesByCost: z.tuple([nat.max(10000), nat.max(10000), nat.max(10000)]),
    starCopies: z.tuple([z.literal(1), z.literal(3), z.literal(9)]),
    statScaleMilli: z.tuple([
      nat.min(1000).max(10000),
      nat.min(1000).max(10000),
      nat.min(1000).max(10000),
    ]),
    sellCopyMultipliers: z.tuple([nat, nat, nat]),
    opponents: z
      .array(
        z.strictObject({
          fromRound: nat.positive(),
          definitions: z.array(id).min(1).max(7),
          stars: StarsSchema,
        }),
      )
      .min(1),
  })
  .superRefine((c, ctx) => {
    if (c.sellCopyMultipliers.some((n, i) => n > c.starCopies[i]!))
      ctx.addIssue({ code: 'custom', message: 'Sale cannot exceed invested copies' });
    if (c.initialGold > c.goldCap)
      ctx.addIssue({ code: 'custom', message: 'Initial gold exceeds cap' });
    c.levels.forEach((row, i) => {
      if (
        row.level !== i + 2 ||
        row.odds.reduce((a, b) => a + b, 0) !== 100 ||
        (i === 5) !== (row.xpToNext === 0)
      )
        ctx.addIssue({ code: 'custom', message: 'Invalid levels/odds' });
    });
    for (const rows of [c.streaks.map((r) => r.from), c.opponents.map((r) => r.fromRound)])
      if (rows[0] !== 1 || rows.some((n, i) => i > 0 && n <= rows[i - 1]!))
        ctx.addIssue({ code: 'custom', message: 'Unsorted progression' });
  });
export type EconomyConfig = z.infer<typeof EconomyConfigSchema>;
export const RewardSchema = z.strictObject({
  round: nat.positive(),
  outcome: z.enum(['win', 'loss', 'double_loss']),
  bank: nat,
  base: nat,
  interest: nat,
  victory: nat,
  streak: nat,
  total: nat,
  credited: nat,
  overflow: nat,
  xp: nat,
});
export type RoundReward = z.infer<typeof RewardSchema>;
export const LedgerEntrySchema = z.strictObject({
  seq: nat,
  round: nat,
  reason: z.enum([
    'initial',
    'buy',
    'sell',
    'reroll',
    'xp',
    'base',
    'interest',
    'victory',
    'streak',
    'development',
  ]),
  requested: z.number().int().safe(),
  delta: z.number().int().safe(),
  balance: nat,
  reference: id,
});
const baseAction = { seq: nat, expectedRevision: nat };
export const MatchActionSchema = z.discriminatedUnion('type', [
  z.strictObject({ ...baseAction, type: z.literal('buy_unit'), offerId: id }),
  z.strictObject({ ...baseAction, type: z.literal('sell_unit'), unitId: id }),
  z.strictObject({ ...baseAction, type: z.literal('reroll_shop') }),
  z.strictObject({ ...baseAction, type: z.literal('lock_shop'), locked: z.boolean() }),
  z.strictObject({ ...baseAction, type: z.literal('buy_xp') }),
  z.strictObject({
    ...baseAction,
    type: z.literal('move_unit'),
    unitId: id,
    to: UnitLocationSchema,
  }),
  z.strictObject({ ...baseAction, type: z.literal('swap_units'), unitId: id, otherId: id }),
  z.strictObject({ ...baseAction, type: z.literal('start_combat') }),
  z.strictObject({ ...baseAction, type: z.literal('start_combat_auto') }),
  z.strictObject({ ...baseAction, type: z.literal('resolve_round'), round: nat.positive() }),
  z.strictObject({ ...baseAction, type: z.literal('next_round'), round: nat.positive() }),
]);
export type MatchAction = z.infer<typeof MatchActionSchema>;
export type MatchCommand = MatchAction extends infer A
  ? A extends MatchAction
    ? Omit<A, 'seq' | 'expectedRevision'>
    : never
  : never;
export const MatchStateSchema = z.strictObject({
  development: z
    .strictObject({
      tainted: z.literal(true),
      version: z.literal(1),
      healthAdjustments: z.array(
        z.strictObject({
          index: nat,
          side: z.enum(['north', 'south']),
          before: nat,
          after: z.number().int().min(1).max(100),
        }),
      ),
    })
    .optional(),
  rulesVersion: z.literal(MATCH_RULES),
  config: EconomyConfigSchema,
  seed: CombatSeedSchema,
  shopRng: CombatSeedSchema,
  combatRng: CombatSeedSchema,
  revision: nat,
  nextActionSeq: nat,
  nextEntity: nat,
  phase: z.enum(['preparation', 'combat', 'resolution', 'finished']),
  round: nat.positive(),
  gold: nat,
  health: z.strictObject({ north: nat, south: nat }),
  healthLedger: z.array(HealthEntrySchema),
  level: z.number().int().min(2).max(7),
  xp: nat,
  totalXp: nat,
  streak: z.number().int().safe(),
  units: z.array(OwnedUnitSchema),
  shop: z.array(ShopOfferSchema.nullable()).length(5),
  shopLocked: z.boolean(),
  pool: z.record(id, nat),
  ledger: z.array(LedgerEntrySchema),
  history: z.array(MatchActionSchema),
  combat: z
    .strictObject({
      round: nat.positive(),
      bank: nat,
      input: CombatInputSchema,
      result: CombatResultSchema.nullable(),
    })
    .nullable(),
  lastReward: RewardSchema.nullable(),
  lastUpgrades: z.array(z.strictObject({ id, stars: StarsSchema })),
});
export type MatchState = z.infer<typeof MatchStateSchema>;
