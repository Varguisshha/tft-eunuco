import { z } from 'zod';
import { createHash } from 'node:crypto';
import { VARGAS_ECONOMY_CONFIG, matchCatalog, combatRulesFor } from '@tft/game-data';
import {
  MatchStateSchema,
  PhaseSnapshotSchema,
  PairingSchema,
  PairingPlanSchema,
  PlayerSettlementSchema,
  FinalResultsSchema,
  ActionReceiptSchema,
  NetworkCombatSchema,
  LobbySnapshotSchema,
} from '@tft/shared';
export const RULESET = combatRulesFor(VARGAS_ECONOMY_CONFIG.catalog);
export const CATALOG = createHash('sha256')
  .update(JSON.stringify([VARGAS_ECONOMY_CONFIG, matchCatalog(VARGAS_ECONOMY_CONFIG)]))
  .digest('hex');
const nat = z.number().int().safe().nonnegative();
const id = z.string().min(1).max(160);
export const AuthoritySnapshotSchema = z.strictObject({
  schema: z.literal(1),
  rules: z.literal(RULESET),
  catalog: z.literal(CATALOG),
  id,
  capacity: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  revision: nat,
  rng: nat.max(0xffffffff),
  pool: z.record(z.string(), nat),
  clock: PhaseSnapshotSchema.omit({ phaseStart: true, phaseDeadline: true }),
  players: z
    .array(
      z.strictObject({
        id: z.uuid(),
        sessionId: id,
        generation: nat,
        name: z.string().min(1).max(32),
        connected: z.boolean(),
        avatarId: z.enum(['jade', 'pulse', 'spark']),
        eliminated: z.boolean(),
        eliminatedRound: nat.nullable(),
        finalPosition: nat.nullable(),
        hpBeforeElimination: nat.nullable(),
        eliminationDamage: nat.nullable(),
        poolReleased: z.boolean(),
        spectating: z.boolean(),
        spectatingDuelId: id.nullable(),
        spectateSequence: z.number().int().min(-1),
        opponents: z.array(z.strictObject({ round: nat, opponentId: id, ghost: z.boolean() })),
        state: MatchStateSchema,
        sequence: nat,
        receipts: z
          .array(
            z.tuple([id, z.strictObject({ payload: z.string(), receipt: ActionReceiptSchema })]),
          )
          .max(128),
      }),
    )
    .max(4),
  duels: z
    .array(
      z.strictObject({
        pairing: PairingSchema,
        replay: NetworkCombatSchema.shape.replay,
        settlement: z.enum(['pending', 'settled']),
      }),
    )
    .max(2),
  pairingHistory: z.array(z.strictObject({ round: nat, pairings: z.array(PairingSchema) })),
  settlements: z.array(z.tuple([id, PlayerSettlementSchema])),
  plan: PairingPlanSchema.nullable(),
  pairingSeed: nat.nullable(),
  finalResult: FinalResultsSchema.nullable(),
  completedDuels: z.array(id),
  settlementId: id.nullable(),
  simulations: nat,
});
export type AuthoritySnapshot = z.infer<typeof AuthoritySnapshotSchema>;
export const StoredMatchSchema = z.strictObject({
  id: z.uuid(),
  revision: nat,
  commitId: z.uuid(),
  expiresAt: z.number().int(),
  status: z.enum(['active', 'finished', 'closed']),
  lobby: LobbySnapshotSchema,
  authority: AuthoritySnapshotSchema,
});
export type StoredMatch = z.infer<typeof StoredMatchSchema>;
