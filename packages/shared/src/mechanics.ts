import { z } from 'zod';
import { ModifierModeSchema } from './advanced-stats';
import {
  ModifiableStatSchema,
  EffectSchema,
  PassiveTriggerSchema,
  AbilityConditionSchema,
} from './abilities';
export const MECHANICS_RULES = 'f0p6b2-1' as const;
export const CHARACTER_RULES = 'f0p6b3-1' as const;
export const MECHANICS_LIMITS = Object.freeze({
  chainDepth: 8,
  effectsPerTick: 4096,
  signalsPerTick: 1024,
  pendingActions: 64,
  stackMaximum: 100,
});
const id = z.string().min(1).max(80),
  nat = z.number().int().safe().min(0);
export const EventRefSchema = z.strictObject({ tick: nat, order: nat });
export const ChainContextSchema = z.strictObject({
  causalId: id,
  remaining: z.number().int().min(0).max(8),
  depth: z.number().int().min(0).max(8),
  additional: z.boolean(),
  allowSourceProcs: z.boolean(),
  grantMana: z.boolean(),
  countAsCast: z.boolean(),
  allowKillChain: z.boolean(),
  trigger: id.optional(),
  conditions: z.array(AbilityConditionSchema).max(8).optional(),
});
export type ChainContext = z.infer<typeof ChainContextSchema>;
export const StackDefinitionSchema = z
  .strictObject({
    version: z.literal(1),
    id,
    name: id,
    trigger: PassiveTriggerSchema,
    automatic: z.boolean().optional(),
    conditions: z.array(AbilityConditionSchema).max(8),
    maxStacks: z.number().int().min(1).max(100),
    durationTicks: z.number().int().min(1).max(450).nullable(),
    refresh: z.enum(['on_gain', 'keep']),
    consumption: z.enum(['manual', 'threshold', 'none']),
    reset: z.literal('combat'),
    modifiers: z
      .array(
        z.strictObject({
          stat: ModifiableStatSchema,
          mode: ModifierModeSchema,
          amount: z.number().int().min(-10000).max(10000),
        }),
      )
      .max(8),
    thresholds: z
      .array(
        z.strictObject({
          id,
          count: z.number().int().min(1).max(100),
          consume: z.number().int().min(0).max(100),
          repeatable: z.boolean(),
          effects: z.array(EffectSchema).min(1).max(8),
        }),
      )
      .max(8),
  })
  .superRefine((d, ctx) => {
    if (
      d.thresholds.some(
        (t) =>
          t.count > d.maxStacks ||
          t.consume > t.count ||
          (d.consumption !== 'threshold' && t.consume > 0),
      )
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid stack threshold or consumption' });
    if (new Set(d.thresholds.map((t) => t.id)).size !== d.thresholds.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate stack threshold' });
    if (d.modifiers.some((m) => m.mode === 'percent_milli' && m.amount < -1000))
      ctx.addIssue({ code: 'custom', message: 'Invalid percent stack modifier' });
  });
export type StackDefinition = z.infer<typeof StackDefinitionSchema>;
export const ProfileMechanicsSchema = z
  .strictObject({ version: z.literal(1), stacks: z.array(StackDefinitionSchema).max(8) })
  .refine(
    (m) => new Set(m.stacks.map((s) => s.id)).size === m.stacks.length,
    'Duplicate stack definitions',
  );
export const RuleRuntimeSchema = z.strictObject({
  count: nat,
  seen: nat,
  lastTick: z.number().int().min(-450).max(450),
});
export type RuleRuntime = z.infer<typeof RuleRuntimeSchema>;
export const StackStateSchema = z.strictObject({
  id,
  definitionId: id,
  sourceId: id,
  ownerId: id,
  targetId: id,
  trigger: id,
  count: z.number().int().min(0).max(100),
  maxStacks: z.number().int().min(1).max(100),
  expiresTick: nat.nullable(),
  firedThresholds: z.array(id),
});
export type StackState = z.infer<typeof StackStateSchema>;
export const UnitMechanicsSchema = z.strictObject({
  version: z.literal(1),
  casts: nat,
  kills: nat,
  stacks: z.array(StackStateSchema).max(8),
  periodics: z
    .array(
      z.strictObject({
        id,
        sourceId: id,
        responsibleId: id.nullable(),
        amount: z.number().int().min(0).max(1000000),
        damageType: z.enum(['physical', 'magic', 'true']),
        intervalTicks: nat.positive().max(450),
        nextTick: nat,
        expiresTick: nat,
        context: ChainContextSchema,
      }),
    )
    .max(256),
});
export type UnitMechanics = z.infer<typeof UnitMechanicsSchema>;
export const TraitProgressSchema = z.strictObject({
  traitId: id,
  side: z.enum(['north', 'south']),
  scope: z.enum(['unit', 'team']),
  unitId: id.nullable(),
  casts: nat,
  kills: nat,
  runtime: z.record(id, RuleRuntimeSchema),
});
export type TraitProgress = z.infer<typeof TraitProgressSchema>;
export const SpecialActionRecordSchema = z.strictObject({
  id,
  sourceId: id,
  targetId: id.nullable(),
  trigger: id,
  conditions: z.array(AbilityConditionSchema).max(8),
  priority: z.literal('after_impacts'),
  kind: z.enum(['repeat', 'jump']),
  state: z.enum(['scheduled', 'resolved', 'cancelled']),
  context: ChainContextSchema,
});
export type SpecialActionRecord = z.infer<typeof SpecialActionRecordSchema>;
export const KillAttributionSchema = z.strictObject({
  combatId: id,
  victimId: id,
  killerId: id.nullable(),
  sourceId: id.nullable(),
  damageType: z.enum(['physical', 'magic', 'true']),
  cause: z.enum(['attack', 'ability', 'periodic', 'environment']),
  damageEvent: EventRefSchema,
  causalId: id,
});
export type KillAttribution = z.infer<typeof KillAttributionSchema>;
export const MechanicsStateSchema = z.strictObject({
  version: z.literal(1),
  combatId: id,
  traits: z.array(TraitProgressSchema).max(5600),
  attributions: z.array(KillAttributionSchema).max(56),
  actions: z.array(SpecialActionRecordSchema).max(64),
  pendingRepeats: z
    .array(
      z.strictObject({
        id,
        sourceId: id,
        targetId: id,
        executeTick: nat,
        targetPolicy: z.enum(['same_only', 'same_or_nearest', 'nearest']),
        powerMilli: z.number().int().min(0).max(4000),
        extraEffects: z.array(EffectSchema).max(8),
        parentCastId: id,
        context: ChainContextSchema,
      }),
    )
    .max(64),
});
