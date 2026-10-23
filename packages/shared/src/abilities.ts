import { z } from 'zod';
import { PowerScalingSchema, ModifierModeSchema } from './advanced-stats';
const id = z.string().min(1).max(80);
const amount = z.number().int().min(0).max(1_000_000);
const ticks = z.number().int().min(1).max(450);
export const DamageTypeSchema = z.enum(['physical', 'magic', 'true']);
export type DamageType = z.infer<typeof DamageTypeSchema>;
export const ModifiableStatSchema = z.enum([
  'maxHp',
  'attack',
  'armor',
  'magicResist',
  'attackSpeedMilli',
  'abilityPower',
  'critChanceMilli',
  'critMultiplierMilli',
]);
const effectBase = {
  target: z.enum(['self', 'target', 'allies', 'enemies']),
  radius: z.number().int().min(0).max(14),
  center: z.enum(['source', 'target']).optional(),
  scaling: z
    .strictObject({
      stat: z.enum(['maxHp', 'attack']),
      basis: z.enum(['source', 'target']),
      ratioMilli: z.number().int().min(0).max(10000),
    })
    .optional(),
  starScaling: z.enum(['flat', 'stat']).optional(),
  stacking: z.enum(['stack', 'refresh']).optional(),
  key: id.optional(),
};
export const CoreEffectSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({
      ...effectBase,
      kind: z.literal('damage'),
      amount,
      damageType: DamageTypeSchema,
      canCrit: z.boolean().optional(),
      powerScaling: PowerScalingSchema.optional(),
      amountByStars: z.tuple([amount, amount, amount]).optional(),
    }),
    z.strictObject({
      ...effectBase,
      kind: z.literal('heal'),
      amount,
      powerScaling: PowerScalingSchema.optional(),
      amountByStars: z.tuple([amount, amount, amount]).optional(),
    }),
    z.strictObject({
      ...effectBase,
      kind: z.literal('shield'),
      amount,
      duration: ticks,
      powerScaling: PowerScalingSchema.optional(),
      amountByStars: z.tuple([amount, amount, amount]).optional(),
    }),
    z
      .strictObject({
        ...effectBase,
        kind: z.literal('modifier'),
        stat: ModifiableStatSchema,
        amount: z.number().int().min(-10000).max(10000),
        duration: ticks.nullable(),
        mode: ModifierModeSchema.optional(),
      })
      .refine(
        (e) => e.mode !== 'percent_milli' || e.amount >= -1000,
        'Percent modifier below -100%',
      ),
    z.strictObject({ ...effectBase, kind: z.literal('stun'), duration: ticks }),
  ])
  .superRefine((e, ctx) => {
    if ('powerScaling' in e && e.powerScaling && e.scaling)
      ctx.addIssue({ code: 'custom', message: 'Use a single scaling contract' });
    if ('amountByStars' in e && e.amountByStars && e.starScaling === 'stat')
      ctx.addIssue({
        code: 'custom',
        message: 'Explicit star amounts cannot also multiply by star stats',
      });
  });
const specialBase = {
  target: z.enum(['self', 'target', 'allies', 'enemies']),
  radius: z.number().int().min(0).max(14),
};
const power = z.number().int().min(0).max(4000);
const chainPolicy = {
  maxChain: z.number().int().min(1).max(8),
  allowSourceProcs: z.boolean(),
  grantMana: z.boolean(),
};
export const MechanicEffectSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    ...specialBase,
    kind: z.literal('stack_gain'),
    stackId: id,
    amount: z.number().int().min(1).max(100),
  }),
  z.strictObject({
    ...specialBase,
    kind: z.literal('stack_consume'),
    stackId: id,
    amount: z.number().int().min(1).max(100),
  }),
  z.strictObject({
    ...specialBase,
    kind: z.literal('cooldown'),
    ruleId: id,
    abilityId: id.optional(),
    mode: z.enum(['reset', 'reduce']),
    ticks: z.number().int().min(0).max(450),
  }),
  z.strictObject({
    ...specialBase,
    kind: z.literal('ability_empower'),
    powerMilli: power,
    extraEffects: z.array(CoreEffectSchema).max(8),
  }),
  z.strictObject({
    ...specialBase,
    ...chainPolicy,
    kind: z.literal('ability_repeat'),
    delayTicks: z.number().int().min(1).max(30),
    targetPolicy: z.enum(['same_only', 'same_or_nearest', 'nearest']),
    countAsCast: z.boolean(),
    powerMilli: power,
    extraEffects: z.array(CoreEffectSchema).max(8),
  }),
  z.strictObject({
    ...specialBase,
    ...chainPolicy,
    kind: z.literal('jump'),
    duration: z.number().int().min(1).max(20),
    immediateAttack: z.boolean(),
    allowKillChain: z.boolean(),
    retarget: z.enum(['cancel', 'adjacent']),
  }),
  z.strictObject({
    ...specialBase,
    kind: z.literal('periodic'),
    amount,
    damageType: DamageTypeSchema,
    powerScaling: PowerScalingSchema.optional(),
    intervalTicks: ticks,
    duration: ticks,
    responsible: z.enum(['source', 'none']),
  }),
]);
export const EffectSchema = z.union([CoreEffectSchema, MechanicEffectSchema]);
export type CombatEffect = z.infer<typeof EffectSchema>;
export type MechanicEffect = z.infer<typeof MechanicEffectSchema>;
export const isMechanicEffect = (effect: CombatEffect): effect is MechanicEffect =>
  [
    'stack_gain',
    'stack_consume',
    'cooldown',
    'ability_empower',
    'ability_repeat',
    'jump',
    'periodic',
  ].includes(effect.kind);
export const AbilityConditionSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('hp_below'), ratioMilli: z.number().int().min(1).max(1000) }),
  z.strictObject({
    kind: z.literal('enemies_nearby'),
    radius: z.number().int().min(1).max(14),
    minimum: z.number().int().min(1).max(56),
  }),
  z.strictObject({ kind: z.literal('not_stunned') }),
]);
export const PassiveTriggerSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('combat_start') }),
  z.strictObject({ kind: z.literal('attack'), every: z.number().int().min(1).max(100) }),
  z.strictObject({ kind: z.literal('damage_received') }),
  z.strictObject({ kind: z.literal('damage_dealt') }),
  z.strictObject({ kind: z.literal('attack_hit'), every: z.number().int().min(1).max(100) }),
  z.strictObject({
    kind: z.literal('hp_crossed'),
    thresholdMilli: z.number().int().min(1).max(999),
  }),
  z.strictObject({
    kind: z.literal('ability_cast'),
    every: z.number().int().min(1).max(100).optional(),
  }),
  z.strictObject({ kind: z.literal('kill') }),
  z.strictObject({ kind: z.literal('effect_expired'), key: id.optional() }),
]);
export const PassiveRuleSchema = z.strictObject({
  id,
  trigger: PassiveTriggerSchema,
  conditions: z.array(AbilityConditionSchema).max(8),
  effects: z.array(EffectSchema).min(1).max(8),
  maxActivations: z.number().int().min(1).max(450),
  cooldownTicks: z.number().int().min(0).max(450),
});
const component = { name: id, description: z.string().min(1).max(2000) };
export const PassiveComponentSchema = z
  .strictObject({ ...component, rules: z.array(PassiveRuleSchema).min(1).max(8) })
  .refine(
    (p) => new Set(p.rules.map((r) => r.id)).size === p.rules.length,
    'Duplicate passive rule IDs',
  );
export const ActiveComponentSchema = z
  .strictObject({
    ...component,
    manaCost: amount.min(1),
    initialMana: amount,
    castTicks: ticks.max(30),
    targeting: z.enum(['current_enemy', 'adjacent_enemies', 'self']),
    conditions: z.array(AbilityConditionSchema).max(8),
    effects: z.array(EffectSchema).min(1).max(8),
    animation: z.literal('ability'),
    manaConsumption: z.literal('on_start'),
    priority: z.literal('before_attack'),
    interrupts: z.literal('stun_or_death'),
  })
  .refine((a) => a.initialMana <= a.manaCost, 'Initial mana exceeds capacity');
const identity = {
  id,
  name: id,
  description: z.string().min(1).max(2000),
  icon: id,
  version: z.literal(1),
};
export const ChampionAbilitySchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...identity,
    type: z.literal('active'),
    active: ActiveComponentSchema,
    passive: z.null().optional(),
  }),
  z.strictObject({
    ...identity,
    type: z.literal('passive'),
    passive: PassiveComponentSchema,
    active: z.null().optional(),
  }),
  z.strictObject({
    ...identity,
    type: z.literal('mixed'),
    active: ActiveComponentSchema,
    passive: PassiveComponentSchema,
  }),
]);
export type ChampionAbility = z.infer<typeof ChampionAbilitySchema>;
export type AbilityCondition = z.infer<typeof AbilityConditionSchema>;
export type PassiveTrigger = z.infer<typeof PassiveTriggerSchema>;
export type PassiveRule = z.infer<typeof PassiveRuleSchema>;
export const TraitDefinitionSchema = z
  .strictObject({
    ...identity,
    visual: z.strictObject({ tone: z.enum(['jade', 'amber']), provisional: z.boolean() }),
    stacking: z.enum(['highest', 'cumulative']),
    recipients: z.enum(['members', 'team']),
    progress: z
      .strictObject({
        version: z.literal(1),
        scope: z.enum(['unit', 'team']),
        rules: z
          .array(PassiveRuleSchema.extend({ memberThreshold: z.number().int().min(1).max(56) }))
          .min(1)
          .max(8),
      })
      .optional(),
    thresholds: z
      .array(
        z.strictObject({
          count: z.number().int().min(1).max(56),
          description: z.string().min(1).max(1000),
          bonuses: z
            .array(
              z.strictObject({
                stat: ModifiableStatSchema,
                mode: z.enum(['flat', 'percent_milli']),
                amount: z.number().int().min(0).max(10000),
              }),
            )
            .max(8),
          effects: z.array(EffectSchema).max(8),
        }),
      )
      .min(1)
      .max(8),
  })
  .refine(
    (t) => t.thresholds.every((v, i) => i === 0 || v.count > t.thresholds[i - 1]!.count),
    'Thresholds must strictly increase',
  );
export type TraitDefinition = z.infer<typeof TraitDefinitionSchema>;
