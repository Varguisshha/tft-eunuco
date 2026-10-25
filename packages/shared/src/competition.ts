import { z } from 'zod';
import { RoundSnapshotSchema } from './pairings';
import { CombatStateSchema, CombatEventV3Schema } from './combat';
export const COMPETITIVE_VERSION = 'f0p7c3-1' as const;
const id = z.string().min(1).max(160);
const natural = z.number().int().safe().nonnegative();
export const CompetitivePlayerSchema = RoundSnapshotSchema.shape.players.element.extend({
  userId: id,
  eliminated: z.boolean(),
  competitiveState: z.enum(['alive', 'eliminated']),
  eliminatedRound: natural.nullable(),
  finalPosition: z.number().int().min(1).max(4).nullable(),
  hpBeforeElimination: natural.nullable(),
  eliminationDamage: natural.nullable(),
  spectating: z.boolean(),
});
export const FinalResultsSchema = z.strictObject({
  version: z.literal(COMPETITIVE_VERSION),
  matchId: id,
  completionId: id,
  round: natural,
  sequence: natural,
  winnerIds: z.array(id).min(1).max(4),
  sharedFirst: z.boolean(),
  standings: z.array(CompetitivePlayerSchema).min(2).max(4),
});
export type FinalResults = z.infer<typeof FinalResultsSchema>;
export const CompetitiveSnapshotSchema = RoundSnapshotSchema.extend({
  version: z.literal(COMPETITIVE_VERSION),
  players: z.array(CompetitivePlayerSchema).min(1).max(4),
  spectatingDuelId: id.nullable(),
  finalResults: FinalResultsSchema.nullable(),
});
export type CompetitiveSnapshot = z.infer<typeof CompetitiveSnapshotSchema>;
export const SpectateRequestSchema = z.strictObject({
  version: z.literal(COMPETITIVE_VERSION),
  matchId: id,
  phaseId: id,
  sequence: natural,
  duelId: id.nullable(),
});
/** A sampled frame, never a future replay or the simulation RNG. */
export const SpectateFrameSchema = z.strictObject({
  version: z.literal(COMPETITIVE_VERSION),
  matchId: id,
  playerId: id,
  combatId: id,
  round: natural,
  sequence: natural,
  selectionSequence: natural,
  startedAt: z.number().nonnegative(),
  observedThroughMs: z.number().nonnegative(),
  southPlayerId: id,
  northPlayerId: id,
  state: CombatStateSchema.omit({ rngState: true }),
  events: z
    .array(CombatEventV3Schema)
    .refine((es) => es.every((e) => e.type !== 'combat_start'), 'Seed is private'),
});
export type SpectateFrame = z.infer<typeof SpectateFrameSchema>;
