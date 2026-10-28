import { isFlorinRules } from './mechanics';
import { ItemLoadoutSchema, ItemCombatRuntimeSchema, ItemSourceSchema } from './item-runtime';
import { ItemModifierBonusSchema } from './items';
import { z } from 'zod';
import {
  MECHANICS_RULES,
  CHARACTER_RULES,
  COMPOSITE_RULES,
  FLORIN_RULES,
  INTEGRATED_RULES,
  P11_RULES,
  P11B_RULES,
  P11C_RULES,
  P11H_RULES,
  ROSTER_RULES,
  ProfileMechanicsSchema,
  UnitMechanicsSchema,
  MechanicsStateSchema,
  ChainContextSchema,
  KillAttributionSchema,
} from './mechanics';
import {
  ADVANCED_COMBAT_RULES,
  ModifierModeSchema,
  ModifierOriginSchema,
  STAT_LIMITS,
} from './advanced-stats';
import {
  EffectSchema,
  CoreEffectSchema,
  isMechanicEffect,
  ChampionAbilitySchema,
  ModifiableStatSchema,
  TraitDefinitionSchema,
  DamageTypeSchema,
} from './abilities';
export { EffectSchema, DamageTypeSchema } from './abilities';
export type { CombatEffect, DamageType } from './abilities';
import {
  BoardStateSchema,
  CombatSeedSchema,
  HexCoordSchema,
  SideSchema,
  UnitInstanceSchema,
} from './board-contracts';
export const COMBAT_PROTOCOL = 3 as const;
export const COMBAT_RULES = 'f0p3.1-1' as const;
export const CURRENT_COMBAT_RULES = 'f0p6a-1' as const;
const RulesSchema = z.enum([
  COMBAT_RULES,
  CURRENT_COMBAT_RULES,
  ADVANCED_COMBAT_RULES,
  MECHANICS_RULES,
  CHARACTER_RULES,
  COMPOSITE_RULES,
  FLORIN_RULES,
  INTEGRATED_RULES,
  P11_RULES,
  P11B_RULES,
  P11C_RULES,
  P11H_RULES,
  ROSTER_RULES,
]);
export const MAX_COMBAT_TICKS = 450;
export const OVERTIME_START_TICK = 300;
const increase = z
  .tuple([z.number().int().min(1000).max(4000), z.number().int().min(1000).max(4000)])
  .refine(([a, b]) => b >= a, 'Overtime bonus must increase');
const decrease = z
  .tuple([z.number().int().min(0).max(1000), z.number().int().min(0).max(1000)])
  .refine(([a, b]) => b <= a, 'Overtime support must decrease');
export const OvertimeConfigSchema = z.strictObject({
  damageMilli: increase,
  attackSpeedMilli: increase,
  healMilli: decrease,
  shieldMilli: decrease,
});
export type OvertimeConfig = z.infer<typeof OvertimeConfigSchema>;
export const DEFAULT_OVERTIME: OvertimeConfig = {
  damageMilli: [1250, 2000],
  attackSpeedMilli: [1200, 1750],
  healMilli: [800, 400],
  shieldMilli: [800, 400],
};
const id = z.string().min(1).max(80);
const natural = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const amount = z.number().int().min(0).max(1_000_000);
const duration = z.number().int().min(1).max(450);
export const CombatStatsSchema = z
  .strictObject({
    maxHp: amount.min(1),
    attack: amount,
    abilityPower: amount.optional(),
    critChanceMilli: z.number().int().min(0).max(STAT_LIMITS.critChanceMilli).optional(),
    critMultiplierMilli: z.number().int().min(1000).max(STAT_LIMITS.critMultiplierMilli).optional(),
    armor: z.number().int().min(-1_000_000).max(1_000_000),
    magicResist: z.number().int().min(-1_000_000).max(1_000_000),
    moveSpeedMilli: z.number().int().min(1).max(5000).optional(),
    attackSpeedMilli: z.number().int().min(1).max(5000),
    range: z.number().int().min(1).max(14),
    maxMana: amount,
    startingMana: amount,
    manaRegenMilli: amount.optional(),
    moveTicks: duration.max(20),
    attackWindupTicks: duration.max(20),
  })
  .refine((s) => s.startingMana <= s.maxMana, 'Starting mana exceeds capacity');
export type CombatStats = z.infer<typeof CombatStatsSchema>;
export const AbilitySchema = z.strictObject({
  id,
  name: id,
  manaCost: amount.min(1),
  castTicks: duration.max(30),
  effects: z.array(EffectSchema).min(1).max(8),
});
export type CombatAbility = z.infer<typeof AbilitySchema>;
export const PassiveSchema = z.strictObject({
  id,
  trigger: z.literal('combat_start'),
  effects: z.array(EffectSchema).min(1).max(8),
});
export const CombatProfileSchema = z
  .strictObject({
    stats: CombatStatsSchema,
    itemRole: z
      .enum(['tank', 'fighter', 'assassin', 'marksman', 'caster', 'specialist'])
      .optional(),
    itemLoadout: ItemLoadoutSchema.optional(),
    initialItemModifiers: z
      .array(
        ItemModifierBonusSchema.extend({
          id: z.string().min(1).max(100),
          sourceId: z.string().min(1).max(80),
        }),
      )
      .max(48)
      .optional(),
    mechanics: ProfileMechanicsSchema.optional(),
    starLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    ability: AbilitySchema.nullable(),
    passive: PassiveSchema.nullable(),
    championAbility: ChampionAbilitySchema.optional(),
    traits: z
      .array(id)
      .refine((ids) => new Set(ids).size === ids.length, 'Duplicate membership')
      .optional(),
  })
  .refine(
    (p) => !p.ability || p.ability.manaCost <= p.stats.maxMana,
    'Ability cost exceeds capacity',
  )
  .refine(
    (p) =>
      !p.championAbility ||
      (!p.ability &&
        !p.passive &&
        p.stats.maxMana === (p.championAbility.active?.manaCost ?? 0) &&
        p.stats.startingMana === (p.championAbility.active?.initialMana ?? 0)),
    'Principal ability owns mana and excludes legacy components',
  );
export type CombatProfile = z.infer<typeof CombatProfileSchema>;
export const CombatantSpecSchema = UnitInstanceSchema.extend({ profile: CombatProfileSchema });
const advancedStat = (stat: string) =>
  ['abilityPower', 'critChanceMilli', 'critMultiplierMilli'].includes(stat);
const advancedEffect = (e: import('./abilities').CombatEffect) =>
  ('powerScaling' in e && e.powerScaling !== undefined) ||
  ('amountByStars' in e && e.amountByStars !== undefined) ||
  ('canCrit' in e && e.canCrit !== undefined) ||
  isMechanicEffect(e) ||
  (e.kind === 'modifier' && (e.mode !== undefined || e.duration === null || advancedStat(e.stat)));
export const CombatInputSchema = z
  .strictObject({
    protocolVersion: z.literal(COMBAT_PROTOCOL),
    rulesVersion: RulesSchema,
    combatId: id.optional(),
    ghost: z
      .strictObject({
        version: z.literal('f0p12b-1'),
        side: z.enum(['south', 'north']),
        sourcePlayerId: id,
        realPlayerId: id,
        damageMultiplierMilli: z.literal(800),
        units: z.array(z.strictObject({ unitId: id, sourceUnitId: id })).max(28),
      })
      .optional(),
    seed: CombatSeedSchema,
    maxTicks: duration.default(MAX_COMBAT_TICKS),
    overtime: OvertimeConfigSchema.default(DEFAULT_OVERTIME),
    units: z.array(CombatantSpecSchema).max(56),
    traits: z.array(TraitDefinitionSchema).max(100).optional(),
    obstacles: z.array(HexCoordSchema).max(56).default([]),
  })
  .superRefine((input, ctx) => {
    if (input.ghost) {
      const g = input.ghost,
        units = input.units.filter((u) => u.owner === g.side);
      if (
        input.rulesVersion !== 'f0p11h-1' ||
        g.sourcePlayerId === g.realPlayerId ||
        units.length !== g.units.length ||
        new Set(g.units.map((u) => u.unitId)).size !== g.units.length ||
        new Set(g.units.map((u) => u.sourceUnitId)).size !== g.units.length ||
        g.units.some((u) => u.unitId === u.sourceUnitId || !units.some((x) => x.id === u.unitId)) ||
        input.units.some((u) => g.units.some((x) => x.sourceUnitId === u.id))
      )
        ctx.addIssue({ code: 'custom', message: 'Invalid P12B ghost provenance' });
    }

    if (
      input.rulesVersion === COMBAT_RULES &&
      (input.traits || input.units.some((u) => u.profile.championAbility || u.profile.traits))
    )
      ctx.addIssue({ code: 'custom', message: 'Extended abilities require f0p6a rules' });
    if (new Set(input.traits?.map((t) => t.id)).size !== (input.traits?.length ?? 0))
      ctx.addIssue({ code: 'custom', message: 'Duplicate traits' });
    for (const u of input.units)
      if (u.profile.traits?.some((id) => !input.traits?.some((t) => t.id === id)))
        ctx.addIssue({ code: 'custom', message: 'Unknown trait membership' });
    if (
      input.rulesVersion === COMBAT_RULES &&
      input.units.some((u) =>
        [u.profile.ability, u.profile.passive].some((a) =>
          a?.effects.some(
            (e) =>
              ('center' in e && e.center) ||
              ('scaling' in e && e.scaling) ||
              ('starScaling' in e && e.starScaling) ||
              ('stacking' in e && e.stacking) ||
              ('key' in e && e.key) ||
              (e.kind === 'modifier' && e.stat === 'maxHp'),
          ),
        ),
      )
    )
      ctx.addIssue({ code: 'custom', message: 'Extended effects require f0p6a rules' });
    if (
      input.rulesVersion !== COMPOSITE_RULES &&
      !isFlorinRules(input.rulesVersion) &&
      input.units.some((u) => u.profile.initialItemModifiers || u.profile.itemLoadout)
    )
      ctx.addIssue({ code: 'custom', message: 'Item preparation requires P6C combat inputs' });
    const mechanics =
      input.rulesVersion === MECHANICS_RULES ||
      input.rulesVersion === CHARACTER_RULES ||
      input.rulesVersion === COMPOSITE_RULES ||
      isFlorinRules(input.rulesVersion);
    const advanced = input.rulesVersion === ADVANCED_COMBAT_RULES || mechanics;
    if (mechanics && !input.combatId)
      ctx.addIssue({ code: 'custom', message: 'Mechanics rules require combatId' });
    if (
      !mechanics &&
      (input.combatId ||
        input.units.some((u) => u.profile.mechanics) ||
        input.traits?.some((t) => t.progress))
    )
      ctx.addIssue({ code: 'custom', message: 'Mechanics metadata requires f0p6b2-1' });
    for (const unit of input.units) {
      const p = unit.profile;
      const fields = [p.stats.abilityPower, p.stats.critChanceMilli, p.stats.critMultiplierMilli];
      if (advanced && (fields.some((v) => v === undefined) || p.starLevel === undefined))
        ctx.addIssue({
          code: 'custom',
          message: 'Advanced rules require explicit stats and star level',
        });
      if (!advanced && (fields.some((v) => v !== undefined) || p.starLevel !== undefined))
        ctx.addIssue({ code: 'custom', message: 'Advanced stats require f0p6b1-1' });
      const effects = [
        ...(p.ability?.effects ?? []),
        ...(p.passive?.effects ?? []),
        ...(p.championAbility?.active?.effects ?? []),
        ...(p.championAbility?.passive?.rules.flatMap((r) => r.effects) ?? []),
      ];
      if (
        !mechanics &&
        (effects.some(isMechanicEffect) ||
          p.championAbility?.passive?.rules.some(
            (r) =>
              ['attack_hit', 'damage_dealt'].includes(r.trigger.kind) ||
              (r.trigger.kind === 'ability_cast' && r.trigger.every !== undefined),
          ))
      )
        ctx.addIssue({
          code: 'custom',
          message: 'New operations and triggers require mechanics rules',
        });
      if (advanced && effects.some((e) => 'stacking' in e && e.stacking === 'refresh' && !e.key))
        ctx.addIssue({ code: 'custom', message: 'Advanced refresh requires a stable source key' });
      if (!advanced && effects.some(advancedEffect))
        ctx.addIssue({ code: 'custom', message: 'Advanced effects require f0p6b1-1' });
    }
    if (
      !advanced &&
      input.traits?.some((t) =>
        t.thresholds.some(
          (r) => r.bonuses.some((b) => advancedStat(b.stat)) || r.effects.some(advancedEffect),
        ),
      )
    )
      ctx.addIssue({ code: 'custom', message: 'Advanced traits require f0p6b1-1' });
    if (
      advanced &&
      input.traits?.some((t) =>
        t.thresholds.some((r) =>
          r.effects.some((e) => 'stacking' in e && e.stacking === 'refresh' && !e.key),
        ),
      )
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Advanced trait refresh requires a stable source key',
      });
    if (
      input.rulesVersion !== COMPOSITE_RULES &&
      !isFlorinRules(input.rulesVersion) &&
      input.units.some(
        (u) =>
          u.profile.championAbility?.active?.delivery ||
          u.profile.championAbility?.passive?.matchProgress,
      )
    )
      ctx.addIssue({ code: 'custom', message: 'Composite character contract requires f0p6c-1' });
    if (
      !isFlorinRules(input.rulesVersion) &&
      input.units.some(
        (u) =>
          u.profile.stats.moveSpeedMilli !== undefined ||
          u.profile.championAbility?.passive?.attackCycle ||
          (u.profile.traits?.length ?? 0) > 2,
      )
    )
      ctx.addIssue({ code: 'custom', message: 'Attack cycles and three traits require florin-1' });
    if (
      input.rulesVersion !== ROSTER_RULES &&
      input.rulesVersion !== P11_RULES &&
      input.rulesVersion !== P11B_RULES &&
      input.rulesVersion !== P11C_RULES &&
      input.rulesVersion !== P11H_RULES &&
      (input.units.some((u) => (u.profile.traits?.length ?? 0) > 3) ||
        input.traits?.some(
          (t) =>
            t.planning ||
            t.thresholds.some((th) => th.effectState) ||
            t.progress?.rules.some((r) => r.maximumMembers !== undefined),
        ))
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Roster planning and extended affiliations require f0p10a-1',
      });
    const allEffects = input.units
      .flatMap((u) => [
        ...(u.profile.ability?.effects ?? []),
        ...(u.profile.passive?.effects ?? []),
        ...(u.profile.championAbility?.active?.effects ?? []),
        ...(u.profile.championAbility?.passive?.rules.flatMap((r) => r.effects) ?? []),
        ...(u.profile.mechanics?.stacks.flatMap((d) => d.thresholds.flatMap((t) => t.effects)) ??
          []),
      ])
      .concat(
        input.traits?.flatMap((t) => [
          ...t.thresholds.flatMap((r) => r.effects),
          ...(t.progress?.rules.flatMap((r) => r.effects) ?? []),
        ]) ?? [],
      )
      .flatMap<import('./abilities').CombatEffect>((e) =>
        'extraEffects' in e ? [e, ...e.extraEffects] : [e],
      );
    if (
      input.rulesVersion !== CHARACTER_RULES &&
      input.rulesVersion !== COMPOSITE_RULES &&
      !isFlorinRules(input.rulesVersion) &&
      (allEffects.some(
        (e) =>
          ('timing' in e && e.timing !== undefined) ||
          ('healFromDamageMilli' in e && e.healFromDamageMilli !== undefined) ||
          ('durationByStars' in e && e.durationByStars !== undefined) ||
          (e.kind === 'modifier' && e.amountByStars !== undefined),
      ) ||
        input.units.some(
          (u) =>
            u.profile.mechanics?.stacks.some(
              (s) =>
                s.automatic !== undefined || s.conditions.some((c) => c.kind === 'stack_count'),
            ) ||
            u.profile.championAbility?.active?.conditions.some((c) => c.kind === 'stack_count') ||
            u.profile.championAbility?.passive?.rules.some((r) =>
              r.conditions.some((c) => c.kind === 'stack_count'),
            ),
        ) ||
        input.traits?.some((t) =>
          t.progress?.rules.some((r) => r.conditions.some((c) => c.kind === 'stack_count')),
        ))
    )
      ctx.addIssue({ code: 'custom', message: 'Character extensions require f0p6b3-1' });
    if (
      input.rulesVersion !== COMPOSITE_RULES &&
      !isFlorinRules(input.rulesVersion) &&
      allEffects.some(
        (e) => e.kind === 'armor_reduction' || ('oncePerTarget' in e && e.oncePerTarget),
      )
    )
      ctx.addIssue({ code: 'custom', message: 'Composite effects require f0p6c-1' });
    if (
      !isFlorinRules(input.rulesVersion) &&
      allEffects.some(
        (e) =>
          e.kind === 'recovery' ||
          ('radiusByStars' in e && e.radiusByStars) ||
          ('excludePrimary' in e && e.excludePrimary) ||
          (e.kind === 'stun' && e.durationByStars) ||
          (e.kind === 'modifier' && e.stat === 'moveSpeedMilli'),
      )
    )
      ctx.addIssue({ code: 'custom', message: 'Recovery and area extensions require florin-1' });
    if (!mechanics && allEffects.some(isMechanicEffect))
      ctx.addIssue({
        code: 'custom',
        message: 'Mechanic operations require f0p6b2-1, including traits',
      });
    if (advanced && allEffects.some((e) => 'stacking' in e && e.stacking === 'refresh' && !e.key))
      ctx.addIssue({ code: 'custom', message: 'Refresh operations require a stable key' });
    if (mechanics) {
      for (const t of input.traits ?? [])
        if (
          t.progress &&
          (new Set(t.progress.rules.map((r) => r.id)).size !== t.progress.rules.length ||
            t.progress.rules.some(
              (r) => !t.thresholds.some((th) => th.count === r.memberThreshold),
            ))
        )
          ctx.addIssue({
            code: 'custom',
            message: 'Progress rule IDs must be unique and reference declared member thresholds',
          });
      for (const e of allEffects)
        if (
          (e.kind === 'stack_gain' || e.kind === 'stack_consume') &&
          !input.units.some((u) => u.profile.mechanics?.stacks.some((d) => d.id === e.stackId)) &&
          !(
            (input.rulesVersion === CHARACTER_RULES ||
              input.rulesVersion === COMPOSITE_RULES ||
              isFlorinRules(input.rulesVersion)) &&
            input.traits?.some(
              (t) =>
                t.progress?.rules.some((r) => r.effects.includes(e)) &&
                !input.units.some((u) => u.profile.traits?.includes(t.id)),
            )
          )
        )
          ctx.addIssue({ code: 'custom', message: 'Unknown stack definition' });
      if (
        input.units.some((u) =>
          u.profile.championAbility?.passive?.rules.some((r) => r.id.startsWith('@')),
        )
      )
        ctx.addIssue({
          code: 'custom',
          message: 'Rule IDs beginning with @ are reserved for compiled operations',
        });
    }
    const board = BoardStateSchema.safeParse({
      units: input.units.map(({ id, definitionId, owner, position }) => ({
        id,
        definitionId,
        owner,
        position,
      })),
    });
    if (!board.success)
      ctx.addIssue({ code: 'custom', message: 'Invalid combat board: bounds, IDs or occupancy' });
    const cells = new Set(input.units.map((u) => `${u.position.q},${u.position.r}`));
    for (const hex of input.obstacles) {
      const col = hex.q + Math.floor(hex.r / 2);
      const key = `${hex.q},${hex.r}`;
      if (col < 0 || col >= 7 || hex.r < 0 || hex.r >= 8 || cells.has(key))
        ctx.addIssue({ code: 'custom', message: 'Invalid or overlapping obstacle' });
      cells.add(key);
    }
  });
export type CombatInput = z.infer<typeof CombatInputSchema>;
export const CombatStatusSchema = z.strictObject({
  id,
  sourceId: id,
  kind: z.enum(['shield', 'modifier', 'stun']),
  stat: ModifiableStatSchema.nullable(),
  key: id.optional(),
  mode: ModifierModeSchema.optional(),
  origin: ModifierOriginSchema.optional(),
  amount: z.number().int().min(-1_000_000).max(1_000_000),
  expiresTick: natural.nullable(),
  group: z
    .enum([
      'armor-reduction',
      'magic-reduction',
      'item-amp',
      'item-reduction',
      'item-attack-reduction',
      'item-wound',
      'item-burn',
      'item-untargetable',
      'item-cc',
      'item-mana-multiplier',
      'item-power-multiplier',
      'item-health-multiplier',
    ])
    .optional(),
  itemSource: ItemSourceSchema.optional(),
  nextTick: natural.optional(),
});
export type CombatStatus = z.infer<typeof CombatStatusSchema>;
export const CombatActionSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('move'),
    startTick: natural,
    endTick: natural,
    from: HexCoordSchema,
    to: HexCoordSchema,
  }),
  z.strictObject({
    kind: z.literal('attack'),
    startTick: natural,
    endTick: natural,
    targetId: id,
    rawDamage: amount,
    ranged: z.boolean(),
    critical: z.boolean().optional(),
    attackId: id.optional(),
    context: ChainContextSchema.optional(),
  }),
  z.strictObject({
    kind: z.literal('cast'),
    startTick: natural,
    endTick: natural,
    targetId: id,
    abilityId: id,
    castId: id.optional(),
    context: ChainContextSchema.optional(),
    empower: z
      .strictObject({
        powerMilli: z.number().int().min(0).max(4000),
        extraEffects: z.array(CoreEffectSchema).max(8),
      })
      .optional(),
  }),
  z.strictObject({
    kind: z.literal('jump'),
    id,
    startTick: natural,
    endTick: natural,
    from: HexCoordSchema,
    to: HexCoordSchema,
    targetId: id,
    immediateAttack: z.boolean(),
    retarget: z.enum(['cancel', 'adjacent']),
    context: ChainContextSchema,
  }),
]);
export type CombatAction = z.infer<typeof CombatActionSchema>;
export const CombatUnitSchema = CombatantSpecSchema.extend({
  receivedEffects: z.array(id).max(64).optional(),
  mechanics: UnitMechanicsSchema.optional(),
  passiveState: z
    .record(
      id,
      z.strictObject({
        count: natural,
        seen: natural,
        lastTick: z.number().int().min(-450).max(450),
      }),
    )
    .optional(),
  hp: amount,
  mana: amount,
  attackCharge: z.number().int().min(0).max(29999),
  statuses: z.array(CombatStatusSchema),
  action: CombatActionSchema.nullable(),
  targetId: id.nullable(),
  deathTick: natural.nullable(),
});
export type CombatUnit = z.infer<typeof CombatUnitSchema>;
export const ProjectileSchema = z.strictObject({
  itemSource: ItemSourceSchema.optional(),
  cause: z.literal('ability').optional(),
  effects: z.array(CoreEffectSchema).max(8).optional(),
  id,
  sourceId: id,
  targetId: id,
  launchTick: natural,
  impactTick: natural,
  from: HexCoordSchema,
  to: HexCoordSchema,
  rawDamage: amount,
  damageType: DamageTypeSchema,
  critical: z.boolean().optional(),
  attackId: id.optional(),
  context: ChainContextSchema.optional(),
});
export type CombatProjectile = z.infer<typeof ProjectileSchema>;
export const CombatResultSchema = z
  .strictObject({
    outcome: z.enum(['win', 'double_loss']),
    winner: SideSchema.nullable(),
    reason: z.enum(['elimination', 'empty', 'timeout']),
    tick: natural,
  })
  .refine(
    (r) =>
      (r.outcome === 'win') === (r.winner !== null) &&
      (r.outcome !== 'win' || r.reason === 'elimination'),
    'Inconsistent combat outcome',
  );
export type CombatResult = z.infer<typeof CombatResultSchema>;
export const CombatStateSchema = z.strictObject({
  items: ItemCombatRuntimeSchema.optional(),
  protocolVersion: z.literal(COMBAT_PROTOCOL),
  rulesVersion: RulesSchema,
  mechanics: MechanicsStateSchema.optional(),
  tick: natural,
  rngState: CombatSeedSchema,
  effectCounter: natural,
  units: z.array(CombatUnitSchema),
  projectiles: z.array(ProjectileSchema),
  result: CombatResultSchema.nullable(),
});
export type CombatState = z.infer<typeof CombatStateSchema>;
const eventBase = { protocolVersion: z.literal(COMBAT_PROTOCOL), tick: natural, order: natural };
const event = <T extends string, S extends z.ZodType>(type: T, payload: S) =>
  z.strictObject({ ...eventBase, type: z.literal(type), payload });
export const CombatEventV3Schema = z
  .discriminatedUnion('type', [
    event(
      'combat_start',
      z.strictObject({
        rulesVersion: RulesSchema,
        seed: CombatSeedSchema,
        maxTicks: duration,
        overtime: OvertimeConfigSchema,
        units: z.array(CombatUnitSchema),
        obstacles: z.array(HexCoordSchema),
      }),
    ),
    event(
      'overtime_start',
      z.strictObject({
        rulesVersion: RulesSchema,
        startTick: z.literal(OVERTIME_START_TICK),
        endTick: z.literal(MAX_COMBAT_TICKS),
        modifiers: OvertimeConfigSchema,
      }),
    ),
    event(
      'move_start',
      z.strictObject({ unitId: id, from: HexCoordSchema, to: HexCoordSchema, endTick: natural }),
    ),
    event('move_end', z.strictObject({ unitId: id, from: HexCoordSchema, to: HexCoordSchema })),
    event(
      'attack_start',
      z.strictObject({ unitId: id, targetId: id, releaseTick: natural, ranged: z.boolean() }),
    ),
    event('projectile_launch', ProjectileSchema),
    event(
      'item_signal',
      z.strictObject({ unitId: id, targetId: id, signal: z.literal('attack_release') }),
    ),
    event(
      'item_effect',
      z.strictObject({ source: ItemSourceSchema, operation: z.string(), targetId: id }),
    ),
    event(
      'damage',
      z.strictObject({
        sourceId: id,
        targetId: id,
        amount,
        projectileId: id.optional(),
        itemSource: ItemSourceSchema.optional(),
        accounting: z
          .strictObject({
            version: z.literal(1),
            requested: z.number().int().min(0).max(4_000_000),
            mitigated: z.number().int().min(0).max(4_000_000),
            defenseAmplification: z.number().int().min(0).max(4_000_000),
            overkill: z.number().int().min(0).max(4_000_000),
          })
          .optional(),
        absorbed: amount,
        hpAfter: amount,
        shieldAfter: amount,
        damageType: DamageTypeSchema,
        cause: z.enum(['attack', 'ability']),
        critical: z.boolean().optional(),
        attackId: id.optional(),
        responsibleId: id.nullable().optional(),
        origin: z.enum(['periodic', 'environment']).optional(),
        causalId: id.optional(),
        impact: HexCoordSchema,
      }),
    ),
    event(
      'heal',
      z.strictObject({
        sourceId: id,
        targetId: id,
        amount,
        hpAfter: amount,
        accounting: z
          .strictObject({
            version: z.literal(1),
            requested: amount,
            prevented: amount,
            overheal: amount,
          })
          .optional(),
        itemSource: ItemSourceSchema.optional(),
      }),
    ),
    event(
      'shield_apply',
      z.strictObject({ unitId: id, status: CombatStatusSchema, shieldAfter: amount }),
    ),
    event(
      'passive_trigger',
      z.strictObject({ unitId: id, abilityId: id, ruleId: id, trigger: id, activation: natural }),
    ),
    event(
      'trait_activate',
      z.strictObject({
        side: SideSchema,
        traitId: id,
        count: natural,
        threshold: natural,
        unitIds: z.array(id),
      }),
    ),
    event('mana_gain', z.strictObject({ unitId: id, amount, manaAfter: amount })),
    event(
      'ability_cast',
      z.strictObject({
        unitId: id,
        targetId: id,
        abilityId: id,
        stage: z.enum(['start', 'resolve']),
        endTick: natural,
        manaAfter: amount,
        center: HexCoordSchema,
        castId: id.optional(),
        additional: z.boolean().optional(),
        parentCastId: id.optional(),
      }),
    ),
    event(
      'unit_presence',
      z.strictObject({
        unitId: id,
        away: z.boolean(),
        stage: z.number().int().min(1).max(8),
        position: HexCoordSchema,
        reason: z.enum(['threshold', 'healed', 'last_ally']),
      }),
    ),
    event('status_apply', z.strictObject({ unitId: id, status: CombatStatusSchema })),
    event(
      'status_expire',
      z.strictObject({
        unitId: id,
        statusId: id,
        reason: z.enum(['duration', 'consumed', 'death']),
      }),
    ),
    event(
      'action_cancel',
      z.strictObject({
        unitId: id,
        action: z.enum(['move', 'attack', 'cast', 'jump']),
        reason: z.enum(['stun', 'death', 'invalid-target', 'combat-end']),
      }),
    ),
    event(
      'stack_gain',
      z.strictObject({
        unitId: id,
        sourceId: id,
        stackId: id,
        name: id,
        amount: natural,
        count: natural,
        maxStacks: natural,
        expiresTick: natural.nullable(),
        causalId: id,
      }),
    ),
    event(
      'stack_consume',
      z.strictObject({
        unitId: id,
        sourceId: id,
        stackId: id,
        amount: natural,
        count: natural,
        reason: z.enum(['manual', 'threshold', 'duration', 'death']),
        causalId: id,
      }),
    ),
    event(
      'stack_threshold',
      z.strictObject({
        unitId: id,
        sourceId: id,
        stackId: id,
        thresholdId: id,
        count: natural,
        causalId: id,
      }),
    ),
    event(
      'attack_confirmed',
      z.strictObject({
        unitId: id,
        targetId: id,
        attackId: id,
        damageEvent: z.strictObject({ tick: natural, order: natural }),
        causalId: id,
      }),
    ),
    event('kill_attributed', KillAttributionSchema),
    event(
      'ability_empowered',
      z.strictObject({
        unitId: id,
        castId: id,
        powerMilli: natural,
        extraEffects: natural,
        causalId: id,
      }),
    ),
    event(
      'ability_repeat',
      z.strictObject({
        unitId: id,
        targetId: id,
        actionId: id,
        parentCastId: id,
        stage: z.enum(['scheduled', 'resolve', 'cancel']),
        causalId: id,
      }),
    ),
    event(
      'jump_start',
      z.strictObject({
        unitId: id,
        targetId: id,
        actionId: id,
        from: HexCoordSchema,
        to: HexCoordSchema,
        endTick: natural,
        causalId: id,
      }),
    ),
    event(
      'jump_end',
      z.strictObject({
        unitId: id,
        targetId: id,
        actionId: id,
        position: HexCoordSchema,
        outcome: z.enum(['landed', 'cancelled']),
        causalId: id,
      }),
    ),
    event('chain_attack', z.strictObject({ unitId: id, targetId: id, attackId: id, causalId: id })),
    event(
      'periodic_apply',
      z.strictObject({
        unitId: id,
        sourceId: id,
        statusId: id,
        expiresTick: natural,
        amount: natural,
        responsibleId: id.nullable(),
        causalId: id,
      }),
    ),
    event(
      'mechanics_limit',
      z.strictObject({
        unitId: id.nullable(),
        reason: z.enum(['tick_budget', 'chain_budget', 'pending_limit']),
        causalId: id,
      }),
    ),
    event('unit_death', z.strictObject({ unitId: id, position: HexCoordSchema })),
    event('combat_end', CombatResultSchema),
  ])
  .superRefine((event, ctx) => {
    if (
      event.type === 'overtime_start' &&
      (event.tick !== OVERTIME_START_TICK || event.order !== 0)
    )
      ctx.addIssue({ code: 'custom', message: 'Overtime starts at tick 300, order 0' });
    if (event.type === 'combat_end' && event.payload.tick !== event.tick)
      ctx.addIssue({ code: 'custom', message: 'Combat result tick mismatch' });
  });
export type CombatEventV3 = z.infer<typeof CombatEventV3Schema>;
export const CombatBatchSchema = z
  .strictObject({
    protocolVersion: z.literal(COMBAT_PROTOCOL),
    rulesVersion: RulesSchema,
    fromTick: natural,
    toTick: natural,
    events: z.array(CombatEventV3Schema),
    snapshots: z.array(CombatStateSchema),
  })
  .superRefine((batch, ctx) => {
    if (batch.fromTick > batch.toTick)
      ctx.addIssue({ code: 'custom', message: 'Reversed tick range' });
    let lastTick = -1;
    let lastOrder = -1;
    for (const e of batch.events) {
      if (
        e.tick < batch.fromTick ||
        e.tick > batch.toTick ||
        e.tick < lastTick ||
        (e.tick === lastTick && e.order <= lastOrder)
      )
        ctx.addIssue({ code: 'custom', message: 'Out-of-order or out-of-range event' });
      lastTick = e.tick;
      lastOrder = e.order;
    }
    let previous = -1;
    for (const s of batch.snapshots) {
      if (s.tick < batch.fromTick || s.tick > batch.toTick || s.tick <= previous)
        ctx.addIssue({ code: 'custom', message: 'Out-of-order snapshot' });
      previous = s.tick;
    }
  });
export type CombatBatch = z.infer<typeof CombatBatchSchema>;
export interface CombatReplay {
  input: CombatInput;
  events: CombatEventV3[];
  snapshots: CombatState[];
  result: CombatResult;
}
