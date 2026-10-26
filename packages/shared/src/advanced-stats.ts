import { z } from 'zod';
/** Defaults and caps belong to f0p6b1-1. Historical records are never default-filled. */
export const ADVANCED_COMBAT_RULES = 'f0p6b1-1' as const;
export const ADVANCED_STATS_DEFAULTS = Object.freeze({
  abilityPower: 0,
  critChanceMilli: 0,
  critMultiplierMilli: 1500,
});
export const STAT_LIMITS = Object.freeze({
  amount: 1_000_000,
  defense: 10000,
  attackSpeedMilli: 5000,
  critChanceMilli: 1000,
  critMultiplierMilli: 5000,
  ratioMilli: 10000,
});
const coefficient = z.number().int().min(0).max(STAT_LIMITS.ratioMilli);
export const StarCoefficientSchema = z.union([
  coefficient,
  z.tuple([coefficient, coefficient, coefficient]),
]);
export const PowerScalingSchema = z.strictObject({
  version: z.literal(1),
  adRatioMilli: StarCoefficientSchema,
  apRatioMilli: StarCoefficientSchema,
});
export type PowerScaling = z.infer<typeof PowerScalingSchema>;
export const ModifierModeSchema = z.enum(['flat', 'percent_milli']);
export const ModifierOriginSchema = z.enum(['trait', 'active', 'passive', 'item']);
