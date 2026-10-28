import {
  PlannedItemEffectSchema,
  ItemContentSchema,
  STANDARD_ITEM_VERSION,
  STANDARD_LAB_VERSION,
} from './item-design';
import { z } from 'zod';
import {
  EXECUTABLE_ITEM_VERSION,
  TFT185_ITEM_VERSION,
  TFT185_REVISED_ITEM_VERSION,
} from './item-runtime';
import { ModifiableStatSchema, CoreEffectSchema, AbilityConditionSchema } from './abilities';
import { ModifierModeSchema } from './advanced-stats';
const id = z.string().min(1).max(80);
const nat = z.number().int().safe().nonnegative();
export const ITEM_CATALOG_VERSION = 'f0p8a-1' as const;
export const ItemCategorySchema = z.enum([
  'ad',
  'attack_speed',
  'ap',
  'mana',
  'armor',
  'magic_resist',
  'health',
  'critical',
]);
export type ItemCategory = z.infer<typeof ItemCategorySchema>;
export const ItemModifierBonusSchema = z.strictObject({
  stat: ModifiableStatSchema,
  mode: ModifierModeSchema,
  amount: z.number().int().min(0).max(100000),
});
export type ItemModifierBonus = z.infer<typeof ItemModifierBonusSchema>;
export const ItemBonusSchema = z
  .strictObject({
    stat: z.enum([...ModifiableStatSchema.options, 'startingMana']),
    mode: ModifierModeSchema,
    amount: z.number().int().min(0).max(100000),
  })
  .refine((b) => b.stat !== 'startingMana' || b.mode === 'flat', 'Starting mana must be flat');
export type ItemBonus = z.infer<typeof ItemBonusSchema>;
/** Describes reserved mechanics; no special item effects execute in P8A. */
export const LegacyItemEffectSchema = z
  .strictObject({
    id,
    implementation: z.literal('reserved'),
    trigger: z.enum([
      'combat_start',
      'attack_hit',
      'ability_cast',
      'periodic',
      'aura',
      'conditional',
    ]),
    effects: z.array(CoreEffectSchema).min(1).max(8),
    intervalTicks: z.number().int().min(1).max(450).optional(),
    conditions: z.array(AbilityConditionSchema).max(8).optional(),
  })
  .refine(
    (e) => e.trigger !== 'periodic' || e.intervalTicks !== undefined,
    'Periodic schedule required',
  )
  .refine(
    (e) => e.trigger !== 'conditional' || !!e.conditions?.length,
    'Conditional predicates required',
  );
export const ItemEffectSchema = z.union([LegacyItemEffectSchema, PlannedItemEffectSchema]);
const metadata = {
  content: ItemContentSchema.optional(),
  id,
  version: z.literal(1),
  icon: id,
  availability: z.enum(['available', 'planned', 'disabled']),
  scope: z.enum(['competitive', 'diagnostic']),
  bonuses: z.array(ItemBonusSchema).max(16),
};
export const ComponentDefinitionSchema = z.strictObject({
  ...metadata,
  kind: z.literal('component'),
  category: ItemCategorySchema,
});
export const CompleteItemDefinitionSchema = z
  .strictObject({
    ...metadata,
    kind: z.literal('completed'),
    recipe: z.tuple([id, id]),
    effects: z.array(ItemEffectSchema).max(8),
    restrictions: z.strictObject({
      minimumStars: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      excludedDefinitions: z.array(id).max(100),
    }),
    stacking: z.enum(['stack', 'unique']),
    visual: z.strictObject({
      tone: z.enum(['neutral', 'jade', 'amber', 'violet']),
      rarity: z.enum(['technical', 'standard']),
    }),
  })
  .refine(
    (d) =>
      d.availability !== 'available' ||
      d.effects.every((e) => e.implementation === 'executable-v1'),
    'Special item effects are reserved',
  );
export const ItemDefinitionSchema = z.discriminatedUnion('kind', [
  ComponentDefinitionSchema,
  CompleteItemDefinitionSchema,
]);
export type ItemDefinition = z.infer<typeof ItemDefinitionSchema>;
export const ItemRecipeSchema = z.strictObject({
  id,
  components: z.tuple([id, id]),
  resultId: id.nullable(),
});
export type ItemRecipe = z.infer<typeof ItemRecipeSchema>;
export const ItemCatalogSchema = z.strictObject({
  version: z.enum([
    ITEM_CATALOG_VERSION,
    'f0p8a-diagnostic-1',
    STANDARD_ITEM_VERSION,
    STANDARD_LAB_VERSION,
    EXECUTABLE_ITEM_VERSION,
    TFT185_ITEM_VERSION,
    TFT185_REVISED_ITEM_VERSION,
    'f0p8d-1',
  ]),
  definitions: z.array(ItemDefinitionSchema).max(100),
  recipes: z.array(ItemRecipeSchema).length(36),
  policy: z.strictObject({
    componentCapacity: z.number().int().min(1).max(64),
    completedCapacity: z.number().int().min(1).max(64),
    slots: z.literal(3),
    unequip: z.enum(['forbidden', 'allowed']),
    componentEquipment: z.literal('auto-combine'),
  }),
});
export type ItemCatalog = z.infer<typeof ItemCatalogSchema>;
export const ItemInstanceSchema = z.strictObject({
  id,
  ownerId: z.uuid(),
  definitionId: id,
  definitionVersion: z.literal(1),
  kind: z.enum(['component', 'completed']),
  origin: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('grant'), grantId: id }),
    z
      .strictObject({ kind: z.literal('recipe'), recipeId: id, consumed: z.tuple([id, id]) })
      .refine((o) => o.consumed[0] !== o.consumed[1], 'Two distinct component instances required'),
  ]),
});
export type ItemInstance = z.infer<typeof ItemInstanceSchema>;
/** Optional on historical matches. No defaults create phantom inventories on load. */
export const ITEM_PENDING_LIMIT = 4096;
export const PlayerItemStateSchema = z.strictObject({
  version: z.literal(1),
  catalogVersion: ItemCatalogSchema.shape.version,
  ownerId: z.uuid(),
  nextInstance: nat,
  components: z.array(ItemInstanceSchema).max(64),
  completed: z.array(ItemInstanceSchema).max(64),
  pending: z.array(ItemInstanceSchema).max(ITEM_PENDING_LIMIT),
  retired: z.array(id).max(4096),
  grants: z
    .array(
      z.strictObject({
        id,
        fingerprint: z.string().max(4000),
        instances: z.array(ItemInstanceSchema).min(1).max(32),
      }),
    )
    .max(2048),
  crafts: z.array(ItemInstanceSchema).max(4096),
  distributions: z
    .array(
      z.strictObject({
        id,
        round: nat.positive(),
        quantity: z.union([z.literal(2), z.literal(3)]),
        seed: nat.max(0xffffffff),
        instanceIds: z.array(id).min(2).max(3),
        removerIds: z.array(id).length(1).optional(),
      }),
    )
    .max(1000),
  removers: z
    .strictObject({
      issued: z.array(z.strictObject({ id, grantId: id })).max(1024),
      consumed: z
        .array(z.strictObject({ id, unitId: id, returnedIds: z.array(id).min(1).max(3) }))
        .max(1024),
    })
    .optional(),
});
export type PlayerItemState = z.infer<typeof PlayerItemStateSchema>;
/** IDs only: neither quantities, owner, stats nor whole inventories come from the browser. */
export const ItemActionSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('remove_unit_items'), removerId: id, unitId: id }),
  z.strictObject({ type: z.literal('equip_item'), itemId: id, unitId: id }),
  z.strictObject({ type: z.literal('unequip_item'), itemId: id, unitId: id }),
  z.strictObject({ type: z.literal('combine_components'), firstId: id, secondId: id }),
  z.strictObject({ type: z.literal('move_item'), itemId: id, toIndex: nat.max(63) }),
  z.strictObject({ type: z.literal('inspect_item'), itemId: id }),
]);
export type ItemCommand = z.infer<typeof ItemActionSchema>;
export const ItemDropDesignSchema = z.strictObject({
  version: z.literal(1),
  enabled: z.literal(false),
  everyRounds: z.literal(3),
  quantity: z.tuple([
    z.strictObject({ count: z.literal(2), weight: z.literal(50) }),
    z.strictObject({ count: z.literal(3), weight: z.literal(50) }),
  ]),
  quantityScope: z.literal('round-alive-players'),
  typesScope: z.literal('independent-per-player'),
  authority: z.literal('server'),
  delivery: z.literal('inventory'),
  rng: z.literal('seeded'),
  deduplication: z.literal('match-round-player'),
});
/** Presentation data only, ready for a later HUD; no new controls in P8A. */
export const ItemPresentationSchema = z.strictObject({
  instance: ItemInstanceSchema,
  icon: id,
  description: z.string(),
  recipe: ItemRecipeSchema.nullable(),
  bonuses: z.array(ItemBonusSchema),
  location: z.enum(['inventory', 'pending', 'equipped']),
});
