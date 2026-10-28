import { z } from 'zod';
const total = z.number().int().safe().nonnegative();
export const CombatUnitStatisticsSchema = z.strictObject({
  unitId: z.string().min(1).max(160),
  definitionId: z.string().min(1).max(100),
  owner: z.enum(['south', 'north']),
  stars: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  dealt: total,
  received: total,
  healing: total,
  shieldAbsorbed: total,
  shieldDamage: total,
  mitigated: total,
  overheal: total,
  healingPrevented: total,
  defenseAmplification: total,
  itemDamage: total,
  periodicDamage: total,
});
export const CombatStatisticsSchema = z.strictObject({
  version: z.literal('f0p11c-1'),
  combatId: z.string().min(1).max(160),
  round: total,
  observedTick: total.max(450),
  complete: z.boolean(),
  coverage: z.strictObject({ mitigation: z.boolean(), overheal: z.boolean() }),
  unattributedDamage: total,
  units: z.array(CombatUnitStatisticsSchema).max(56),
});
export type CombatStatistics = z.infer<typeof CombatStatisticsSchema>;
export type CombatUnitStatistics = z.infer<typeof CombatUnitStatisticsSchema>;
