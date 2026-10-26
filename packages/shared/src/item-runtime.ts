import { z } from 'zod';
export const EXECUTABLE_ITEM_VERSION = 'f0p8c-1' as const;
const id = z.string().min(1).max(100);
const nat = z.number().int().nonnegative();
export const ItemSourceSchema = z.strictObject({
  unitId: id,
  instanceId: id,
  definitionId: id,
  effectId: id,
  causalId: id,
  trigger: id,
  parentEvent: z.strictObject({ tick: nat, order: nat }).nullable(),
  tick: nat,
  damageClass: z.enum(['root', 'secondary', 'periodic']),
});
export type ItemSource = z.infer<typeof ItemSourceSchema>;
export const ItemLoadoutSchema = z.strictObject({
  version: z.literal(EXECUTABLE_ITEM_VERSION),
  round: nat,
  seed: z.number().int().min(0).max(0xffffffff),
  instances: z.array(z.strictObject({ instanceId: id, definitionId: id })).max(3),
});
export const ItemRuntimeEntrySchema = z.strictObject({
  unitId: id,
  instanceId: id,
  definitionId: id,
  counts: z.record(z.string(), nat),
  last: z.record(z.string(), z.number().int()),
  chosen: z.array(id),
  front: z.boolean(),
});
export type ItemRuntimeEntry = z.infer<typeof ItemRuntimeEntrySchema>;
export const ItemCombatRuntimeSchema = z.strictObject({
  version: z.literal(1),
  entries: z.array(ItemRuntimeEntrySchema).max(168),
  sequence: nat,
  contributors: z.record(id, z.array(id)),
  settled: z.array(id),
});
