import {
  P11B_ECONOMY_CONFIG,
  P11C_ECONOMY_CONFIG,
  P11G_ECONOMY_CONFIG,
  P11H_ECONOMY_CONFIG,
  P11K_ECONOMY_CONFIG,
  P12B_ECONOMY_CONFIG,
  P11H_ITEM_CATALOG,
  P11H_ITEM_POLICY,
  P11G_ECONOMY_POLICY,
  TFT185_SHOP_REFERENCE,
  P11C_ECONOMY_POLICY,
  TFT185_ITEM_CATALOG,
  TFT185_REFERENCE,
  TFT185_PENDING,
  TFT185_EXECUTION_POLICY,
} from '@tft/game-data';
import { DropJournalSchema } from '../item-drops';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import {
  P11_ECONOMY_CONFIG,
  P11_COMBAT_PROFILES,
  P11_PROVISIONAL,
  TFT_POOL_ECONOMY_CONFIG,
  INTEGRATED_ECONOMY_CONFIG,
  ROSTER_ECONOMY_CONFIG,
  ROSTER_COMBAT_PROFILES,
  ROSTER_SOURCE,
  CHARACTER_REGISTRY,
  FLORIN_ECONOMY_CONFIG,
  FLORIN_COMBAT_PROFILES,
  FLORIN_TUNING,
  traitsFor,
  DROP_ITEMS_ECONOMY_CONFIG,
  DROP_ITEM_CATALOG,
  ITEM_DROP_POLICY,
  VARGAS_ECONOMY_CONFIG,
  ITEMS_ECONOMY_CONFIG,
  STANDARD_ITEMS_ECONOMY_CONFIG,
  EFFECT_ITEMS_ECONOMY_CONFIG,
  EXECUTABLE_ITEM_CATALOG,
  ITEM_EXECUTION_POLICY,
  STANDARD_ITEM_CATALOG,
  ITEM_CATALOG,
  ITEM_DROP_DESIGN,
  JARAMILLO_ECONOMY_CONFIG,
  matchCatalog,
  combatRulesFor,
} from '@tft/game-data';
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
export const COMPOSITE_CATALOG = createHash('sha256')
  .update(JSON.stringify([JARAMILLO_ECONOMY_CONFIG, matchCatalog(JARAMILLO_ECONOMY_CONFIG)]))
  .digest('hex');
export const ITEM_CATALOG_HASH = createHash('sha256')
  .update(
    JSON.stringify([
      ITEMS_ECONOMY_CONFIG,
      matchCatalog(ITEMS_ECONOMY_CONFIG),
      ITEM_CATALOG,
      ITEM_DROP_DESIGN,
    ]),
  )
  .digest('hex');
export const STANDARD_ITEM_CATALOG_HASH = createHash('sha256')
  .update(
    JSON.stringify([
      STANDARD_ITEMS_ECONOMY_CONFIG,
      matchCatalog(STANDARD_ITEMS_ECONOMY_CONFIG),
      STANDARD_ITEM_CATALOG,
      ITEM_DROP_DESIGN,
    ]),
  )
  .digest('hex');
export const EFFECT_ITEM_CATALOG_HASH = createHash('sha256')
  .update(
    JSON.stringify([
      EFFECT_ITEMS_ECONOMY_CONFIG,
      matchCatalog(EFFECT_ITEMS_ECONOMY_CONFIG),
      EXECUTABLE_ITEM_CATALOG,
      ITEM_EXECUTION_POLICY,
      ITEM_DROP_DESIGN,
    ]),
  )
  .digest('hex');
export const DROP_ITEM_CATALOG_HASH = createHash('sha256')
  .update(
    JSON.stringify([
      DROP_ITEMS_ECONOMY_CONFIG,
      matchCatalog(DROP_ITEMS_ECONOMY_CONFIG),
      DROP_ITEM_CATALOG,
      ITEM_EXECUTION_POLICY,
      ITEM_DROP_POLICY,
    ]),
  )
  .digest('hex');
export const FLORIN_CATALOG_HASH = createHash('sha256')
  .update(
    JSON.stringify([
      FLORIN_ECONOMY_CONFIG,
      matchCatalog(FLORIN_ECONOMY_CONFIG),
      FLORIN_COMBAT_PROFILES,
      traitsFor('florin-1'),
      FLORIN_TUNING,
      EXECUTABLE_ITEM_CATALOG,
      ITEM_EXECUTION_POLICY,
    ]),
  )
  .digest('hex');
export const INTEGRATED_CATALOG_HASH = createHash('sha256')
  .update(
    JSON.stringify([
      INTEGRATED_ECONOMY_CONFIG,
      matchCatalog(INTEGRATED_ECONOMY_CONFIG),
      FLORIN_COMBAT_PROFILES,
      traitsFor('f0p8d-florin-1'),
      FLORIN_TUNING,
      DROP_ITEM_CATALOG,
      ITEM_EXECUTION_POLICY,
      ITEM_DROP_POLICY,
    ]),
  )
  .digest('hex');
export const TFT_POOL_CATALOG_HASH = createHash('sha256')
  .update(JSON.stringify([INTEGRATED_CATALOG_HASH, TFT_POOL_ECONOMY_CONFIG]))
  .digest('hex');
export const ROSTER_CATALOG_HASH = createHash('sha256')
  .update(
    JSON.stringify([
      ROSTER_ECONOMY_CONFIG,
      matchCatalog(ROSTER_ECONOMY_CONFIG),
      ROSTER_COMBAT_PROFILES,
      traitsFor('f0p10a-1'),
      ROSTER_SOURCE,
      CHARACTER_REGISTRY,
      DROP_ITEM_CATALOG,
      ITEM_EXECUTION_POLICY,
      ITEM_DROP_POLICY,
    ]),
  )
  .digest('hex');
export const P11_CATALOG_HASH = createHash('sha256')
  .update(
    JSON.stringify([
      P11_ECONOMY_CONFIG,
      matchCatalog(P11_ECONOMY_CONFIG),
      P11_COMBAT_PROFILES,
      traitsFor('f0p11a-1'),
      P11_PROVISIONAL,
      ROSTER_SOURCE,
      DROP_ITEM_CATALOG,
      ITEM_EXECUTION_POLICY,
      ITEM_DROP_POLICY,
    ]),
  )
  .digest('hex');
export const P11B_CATALOG_HASH = createHash('sha256')
  .update(
    JSON.stringify([
      P11_CATALOG_HASH,
      P11B_ECONOMY_CONFIG,
      TFT185_ITEM_CATALOG,
      TFT185_REFERENCE,
      TFT185_PENDING,
      TFT185_EXECUTION_POLICY,
    ]),
  )
  .digest('hex');
export const P11C_CATALOG_HASH = createHash('sha256')
  .update(JSON.stringify([P11B_CATALOG_HASH, P11C_ECONOMY_CONFIG, P11C_ECONOMY_POLICY]))
  .digest('hex');
export const P11G_CATALOG_HASH = createHash('sha256')
  .update(
    JSON.stringify([
      P11C_CATALOG_HASH,
      P11G_ECONOMY_CONFIG,
      P11G_ECONOMY_POLICY,
      TFT185_SHOP_REFERENCE,
    ]),
  )
  .digest('hex');
export const P11H_CATALOG_HASH = createHash('sha256')
  .update(
    JSON.stringify([P11G_CATALOG_HASH, P11H_ECONOMY_CONFIG, P11H_ITEM_CATALOG, P11H_ITEM_POLICY]),
  )
  .digest('hex');
export const P11K_CATALOG_HASH = createHash('sha256')
  .update(JSON.stringify([P11H_CATALOG_HASH, P11K_ECONOMY_CONFIG]))
  .digest('hex');
export const P12B_CATALOG_HASH = createHash('sha256')
  .update(JSON.stringify([P11K_CATALOG_HASH, P12B_ECONOMY_CONFIG]))
  .digest('hex');
export function snapshotConfig(rules: string, catalog: string) {
  if (rules === 'f0p11h-1' && catalog === P12B_CATALOG_HASH) return P12B_ECONOMY_CONFIG;
  if (rules === 'f0p11h-1' && catalog === P11K_CATALOG_HASH) return P11K_ECONOMY_CONFIG;
  if (rules === 'f0p11h-1' && catalog === P11H_CATALOG_HASH) return P11H_ECONOMY_CONFIG;
  if (rules === 'f0p11c-1' && catalog === P11G_CATALOG_HASH) return P11G_ECONOMY_CONFIG;
  if (rules === 'f0p11c-1' && catalog === P11C_CATALOG_HASH) return P11C_ECONOMY_CONFIG;
  if (rules === 'f0p11b-1' && catalog === P11B_CATALOG_HASH) return P11B_ECONOMY_CONFIG;
  if (rules === 'f0p11a-1' && catalog === P11_CATALOG_HASH) return P11_ECONOMY_CONFIG;
  if (rules === 'f0p8d-florin-1' && catalog === TFT_POOL_CATALOG_HASH)
    return TFT_POOL_ECONOMY_CONFIG;
  if (rules === 'f0p10a-1' && catalog === ROSTER_CATALOG_HASH) return ROSTER_ECONOMY_CONFIG;
  if (rules === 'f0p8d-florin-1' && catalog === INTEGRATED_CATALOG_HASH)
    return INTEGRATED_ECONOMY_CONFIG;
  if (rules === 'florin-1' && catalog === FLORIN_CATALOG_HASH) return FLORIN_ECONOMY_CONFIG;
  if (rules === RULESET && catalog === CATALOG) return VARGAS_ECONOMY_CONFIG;
  if (rules === combatRulesFor(JARAMILLO_ECONOMY_CONFIG.catalog) && catalog === COMPOSITE_CATALOG)
    return JARAMILLO_ECONOMY_CONFIG;
  if (rules === combatRulesFor(ITEMS_ECONOMY_CONFIG.catalog) && catalog === ITEM_CATALOG_HASH)
    return ITEMS_ECONOMY_CONFIG;
  if (
    rules === combatRulesFor(STANDARD_ITEMS_ECONOMY_CONFIG.catalog) &&
    catalog === STANDARD_ITEM_CATALOG_HASH
  )
    return STANDARD_ITEMS_ECONOMY_CONFIG;
  if (
    rules === combatRulesFor(EFFECT_ITEMS_ECONOMY_CONFIG.catalog) &&
    catalog === EFFECT_ITEM_CATALOG_HASH
  )
    return EFFECT_ITEMS_ECONOMY_CONFIG;
  if (
    rules === combatRulesFor(DROP_ITEMS_ECONOMY_CONFIG.catalog) &&
    catalog === DROP_ITEM_CATALOG_HASH
  )
    return DROP_ITEMS_ECONOMY_CONFIG;
  throw new Error('Incompatible authority catalog/rules');
}
const nat = z.number().int().safe().nonnegative();
const id = z.string().min(1).max(160);
export const AuthoritySnapshotSchema = z.strictObject({
  schema: z.literal(1),
  rules: z.enum([
    RULESET,
    'f0p6c-1',
    'florin-1',
    'f0p8d-florin-1',
    'f0p10a-1',
    'f0p11a-1',
    'f0p11b-1',
    'f0p11c-1',
    'f0p11h-1',
  ]),
  catalog: z.union([
    z.literal(TFT_POOL_CATALOG_HASH),
    z.literal(P11_CATALOG_HASH),
    z.literal(P11B_CATALOG_HASH),
    z.literal(P11C_CATALOG_HASH),
    z.literal(P11G_CATALOG_HASH),
    z.literal(P11H_CATALOG_HASH),
    z.literal(P11K_CATALOG_HASH),
    z.literal(P12B_CATALOG_HASH),
    z.literal(ROSTER_CATALOG_HASH),
    z.literal(INTEGRATED_CATALOG_HASH),
    z.literal(FLORIN_CATALOG_HASH),
    z.literal(CATALOG),
    z.literal(COMPOSITE_CATALOG),
    z.literal(ITEM_CATALOG_HASH),
    z.literal(STANDARD_ITEM_CATALOG_HASH),
    z.literal(EFFECT_ITEM_CATALOG_HASH),
    z.literal(DROP_ITEM_CATALOG_HASH),
  ]),
  id,
  capacity: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  revision: nat,
  rng: nat.max(0xffffffff),
  itemDrops: DropJournalSchema.optional(),
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
