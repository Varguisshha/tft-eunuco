import { z } from 'zod';
import { CombatResultSchema, CombatInputSchema } from './combat';
import { AvatarSchema } from './auth';
import {
  NetworkCombatSchema,
  NetworkSnapshotSchema,
  PrivatePlayerSchema,
  PublicPlayerSchema,
} from './network';
export const PAIRING_VERSION = 'f0p7c1-1' as const;
const id = z.string().min(1).max(160);
const round = z.number().int().positive();
const base = { id, round, combatId: id, southPlayerId: id, northPlayerId: id };
export const PairingSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({
      ...base,
      kind: z.literal('human'),
      ghostOwnerId: z.null(),
      ghostFacingId: z.null(),
    }),
    z.strictObject({ ...base, kind: z.literal('ghost'), ghostOwnerId: id, ghostFacingId: id }),
  ])
  .superRefine((p, ctx) => {
    if (
      p.southPlayerId === p.northPlayerId ||
      (p.kind === 'ghost' &&
        (p.ghostOwnerId !== p.northPlayerId || p.ghostFacingId !== p.southPlayerId))
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid pairing participants' });
  });
export type Pairing = z.infer<typeof PairingSchema>;
export const PairingPlanSchema = z
  .strictObject({
    version: z.literal(PAIRING_VERSION),
    round,
    pairings: z.array(PairingSchema).min(1).max(2),
    decision: z.strictObject({
      policy: z.literal('balanced-history-v1'),
      score: z.array(z.number().int().nonnegative()),
      tieBreak: z.number().int().nonnegative(),
    }),
  })
  .superRefine((p, ctx) => {
    const humans = p.pairings.filter((d) => d.kind === 'human').length;
    if ((p.pairings.length === 1 && humans !== 1) || (p.pairings.length === 2 && humans < 1))
      ctx.addIssue({ code: 'custom', message: 'A ghost requires an independent human duel' });
    const assigned = p.pairings.flatMap((d) =>
      d.kind === 'human' ? [d.southPlayerId, d.northPlayerId] : [d.southPlayerId],
    );
    if (
      new Set(assigned).size !== assigned.length ||
      new Set(p.pairings.map((d) => d.combatId)).size !== p.pairings.length ||
      p.pairings.some(
        (d) => d.round !== p.round || (d.kind === 'ghost' && !assigned.includes(d.ghostOwnerId)),
      )
    )
      ctx.addIssue({ code: 'custom', message: 'Duplicate or inconsistent round assignments' });
  });
export type PairingPlan = z.infer<typeof PairingPlanSchema>;
export const DuelRecordSchema = z
  .strictObject({
    version: z.literal(PAIRING_VERSION),
    pairing: PairingSchema,
    rulesVersion: CombatInputSchema.shape.rulesVersion,
    seed: z.number().int().min(0).max(0xffffffff),
    result: CombatResultSchema,
    finalTick: z.number().int().min(0).max(450),
    settlement: z.enum(['pending', 'settled']),
  })
  .refine((d) => d.finalTick === d.result.tick, 'Inconsistent final tick');
export const PlayerSettlementSchema = z.strictObject({
  id,
  playerId: id,
  round,
  combatId: id,
  outcome: z.enum(['win', 'loss', 'double_loss']),
  damage: z.number().int().nonnegative(),
  gold: z.number().int().nonnegative(),
  xp: z.number().int().nonnegative(),
});
export type PlayerSettlement = z.infer<typeof PlayerSettlementSchema>;
/** Pairing metadata is public; master seed and other duels' traces are not. */
export const RoundSnapshotSchema = z.strictObject({
  ...NetworkSnapshotSchema.omit({ version: true, players: true, own: true }).shape,
  version: z.literal(PAIRING_VERSION),
  own: PrivatePlayerSchema.omit({ health: true, healthLedger: true }).extend({
    hp: z.number().int().nonnegative(),
    healthLedger: PrivatePlayerSchema.shape.healthLedger,
  }),
  players: z
    .array(
      PublicPlayerSchema.omit({ side: true }).extend({
        userId: z.string().uuid(),
        avatarId: AvatarSchema,
        eliminated: z.literal(false),
        opponentId: id.nullable(),
        status: z.enum(['waiting', 'fighting', 'awaiting_round', 'resolved']),
        provisionalPosition: z.number().int().min(1).max(4),
        lastOutcome: z.enum(['win', 'loss', 'double_loss']).nullable(),
      }),
    )
    .max(4),
  pairings: z.array(PairingSchema).max(2),
  results: z.array(z.strictObject({ combatId: id, result: CombatResultSchema })).max(2),
  ownSettlement: PlayerSettlementSchema.nullable(),
});
export type RoundSnapshot = z.infer<typeof RoundSnapshotSchema>;
export const DuelMessageSchema = z
  .strictObject({
    ...NetworkCombatSchema.omit({ version: true }).shape,
    version: z.literal(PAIRING_VERSION),
    pairing: PairingSchema,
    side: z.enum(['south', 'north']),
  })
  .superRefine((d, ctx) => {
    if (
      d.combatId !== d.pairing.combatId ||
      d.combatId !== d.replay.input.combatId ||
      (d.pairing.kind === 'ghost' && d.side !== 'south')
    )
      ctx.addIssue({ code: 'custom', message: 'Mismatched duel trace' });
  });
