import { ItemActionSchema } from './items';
import { z } from 'zod';
import { MatchActionSchema, MatchStateSchema, OwnedUnitSchema } from './match';
import { CombatBatchSchema } from './combat';
import { PhaseSnapshotSchema, ReplaySchema } from './match-clock';
export const NETWORK_VERSION = 'f0p7b1-1' as const;
const id = z.string().min(1).max(160);
const nat = z.number().int().safe().nonnegative();
export const PlayerIntentSchema = z.discriminatedUnion('type', [
  MatchActionSchema.options[0],
  MatchActionSchema.options[1],
  MatchActionSchema.options[2],
  MatchActionSchema.options[3],
  MatchActionSchema.options[4],
  MatchActionSchema.options[5],
  MatchActionSchema.options[6],
  ...ItemActionSchema.options.map((option) => option.extend({ seq: nat, expectedRevision: nat })),
]);
export const NetworkCommandSchema = z.strictObject({
  version: z.literal(NETWORK_VERSION),
  sessionId: id,
  requestId: id,
  sequence: nat,
  matchId: id,
  phaseId: id,
  action: PlayerIntentSchema,
});
export type NetworkCommand = z.infer<typeof NetworkCommandSchema>;
export const PublicPlayerSchema = z.strictObject({
  id,
  name: z.string().min(1).max(32),
  side: z.enum(['south', 'north']),
  connected: z.boolean(),
  hp: nat,
  level: z.number().int().min(2).max(7),
  formation: z.array(OwnedUnitSchema).max(7),
});
/** No RNG, pool, opponent economy, hidden bench, or history on the wire. */
export const PrivatePlayerSchema = MatchStateSchema.pick({
  items: true,
  rulesVersion: true,
  config: true,
  revision: true,
  nextActionSeq: true,
  phase: true,
  round: true,
  gold: true,
  health: true,
  healthLedger: true,
  level: true,
  xp: true,
  totalXp: true,
  streak: true,
  units: true,
  shop: true,
  shopLocked: true,
  ledger: true,
  lastReward: true,
  lastUpgrades: true,
});
export const NetworkSnapshotSchema = z.strictObject({
  version: z.literal(NETWORK_VERSION),
  matchId: id,
  revision: nat,
  serverTime: z.number().nonnegative(),
  playerId: id,
  players: z.array(PublicPlayerSchema).max(2),
  clock: PhaseSnapshotSchema,
  own: PrivatePlayerSchema,
  purchaseErrors: z.array(z.string().nullable()).length(5),
  combatId: id.nullable(),
  settlementId: id.nullable(),
});
export type NetworkSnapshot = z.infer<typeof NetworkSnapshotSchema>;
export const NetworkCombatSchema = z.strictObject({
  version: z.literal(NETWORK_VERSION),
  matchId: id,
  combatId: id,
  startedAt: z.number().nonnegative(),
  replay: ReplaySchema.superRefine((r, ctx) => {
    const batch = CombatBatchSchema.safeParse({
      protocolVersion: r.input.protocolVersion,
      rulesVersion: r.input.rulesVersion,
      fromTick: 0,
      toTick: r.result.tick,
      events: r.events,
      snapshots: r.snapshots,
    });
    if (
      !batch.success ||
      r.snapshots.length !== r.result.tick + 1 ||
      r.snapshots.some((s, i) => s.tick !== i) ||
      JSON.stringify(r.snapshots.at(-1)?.result) !== JSON.stringify(r.result) ||
      r.events.filter((e) => e.type === 'combat_end').length !== 1
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid combat trace' });
  }),
});
export const ActionReceiptSchema = z.strictObject({
  requestId: id,
  sequence: nat,
  accepted: z.boolean(),
  reason: z.string().max(100),
  revision: nat,
});
export type ActionReceipt = z.infer<typeof ActionReceiptSchema>;
