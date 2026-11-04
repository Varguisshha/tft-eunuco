import { z } from 'zod';
export const SYNERGY_RULES = 'f0p13s-1' as const;
export const PredictionKindSchema = z.enum([
  'survival',
  'comeback',
  'underdog',
  'untouchable',
  'double-kill',
  'overtime',
  'wall',
  'individual-comeback',
]);
export type PredictionKind = z.infer<typeof PredictionKindSchema>;
const nat = z.number().int().safe().nonnegative();
const id = z.string().min(1).max(160);
export const SynergyJournalSchema = z.strictObject({
  version: z.literal(SYNERGY_RULES),
  rng: nat.max(0xffffffff),
  markets: z.array(
    z.strictObject({
      round: nat.positive(),
      offers: z.array(PredictionKindSchema).length(3),
      locked: z.boolean(),
      bets: z
        .array(
          z.strictObject({
            kind: PredictionKindSchema,
            unitId: id.optional(),
            paid: z.literal(1),
            status: z.enum(['selected', 'won', 'lost', 'void']),
            credited: nat,
          }),
        )
        .max(3),
    }),
  ),
  receipts: z.array(
    z.strictObject({
      id,
      round: nat.positive(),
      kind: z.enum(['roulette', 'interest', 'predictions']),
      rngBefore: nat,
      rngAfter: nat,
      characterId: id.optional(),
      stars: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
      outcome: z.string().max(80),
      gold: z.number().int().safe(),
      details: z.array(z.string().max(240)),
      applied: z.literal(true),
    }),
  ),
  health: z.array(
    z.strictObject({ index: nat, before: nat.positive(), after: nat.positive(), receiptId: id }),
  ),
  pendingChampions: z.array(z.strictObject({ id, definitionId: id })).max(1000),
  discardedItems: z.array(id),
});
export type SynergyJournal = z.infer<typeof SynergyJournalSchema>;
export const UpmStateSchema = z.strictObject({
  version: z.literal(SYNERGY_RULES),
  teams: z
    .array(
      z.strictObject({
        side: z.enum(['north', 'south']),
        memberIds: z.array(id),
        scaling: z.strictObject({ maxHp: nat, attack: nat, armor: nat, magicResist: nat }),
        activationTick: nat.nullable(),
        starSum: nat,
        count: nat.positive(),
        baseHp: nat.positive(),
        lostHp: nat,
        thresholdMilli: nat,
        level: z.number().int().min(1).max(4),
        triggered: z.boolean(),
        blocked: z.enum(['missing-carrasco-base-profile', 'provisional-profile']),
      }),
    )
    .max(2),
});
