import { z } from 'zod';
import {
  BoardStateSchema,
  CombatSeedSchema,
  HexCoordSchema,
  SideSchema,
  UnitInstanceSchema,
} from './board-contracts';
export const COMBAT_PROTOCOL = 2 as const;
export const COMBAT_RULES = 'f0p2-1' as const;
export const MAX_COMBAT_TICKS = 300;
const id = z.string().min(1).max(80);
const natural = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const amount = z.number().int().min(0).max(1_000_000);
const duration = z.number().int().min(1).max(300);
export const DamageTypeSchema = z.enum(['physical', 'magic', 'true']);
export type DamageType = z.infer<typeof DamageTypeSchema>;
export const CombatStatsSchema = z
  .strictObject({
    maxHp: amount.min(1),
    attack: amount,
    armor: z.number().int().min(-1_000_000).max(1_000_000),
    magicResist: z.number().int().min(-1_000_000).max(1_000_000),
    attackSpeedMilli: z.number().int().min(1).max(5000),
    range: z.number().int().min(1).max(14),
    maxMana: amount.min(1),
    startingMana: amount,
    moveTicks: duration.max(20),
    attackWindupTicks: duration.max(20),
  })
  .refine((s) => s.startingMana <= s.maxMana, 'Starting mana exceeds capacity');
export type CombatStats = z.infer<typeof CombatStatsSchema>;
const effectBase = {
  target: z.enum(['self', 'target', 'allies', 'enemies']),
  radius: z.number().int().min(0).max(14),
};
export const EffectSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    ...effectBase,
    kind: z.literal('damage'),
    amount,
    damageType: DamageTypeSchema,
  }),
  z.strictObject({ ...effectBase, kind: z.literal('heal'), amount }),
  z.strictObject({ ...effectBase, kind: z.literal('shield'), amount, duration }),
  z.strictObject({
    ...effectBase,
    kind: z.literal('modifier'),
    stat: z.enum(['attack', 'armor', 'magicResist', 'attackSpeedMilli']),
    amount: z.number().int().min(-10000).max(10000),
    duration,
  }),
  z.strictObject({ ...effectBase, kind: z.literal('stun'), duration }),
]);
export type CombatEffect = z.infer<typeof EffectSchema>;
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
    ability: AbilitySchema.nullable(),
    passive: PassiveSchema.nullable(),
  })
  .refine(
    (p) => !p.ability || p.ability.manaCost <= p.stats.maxMana,
    'Ability cost exceeds capacity',
  );
export type CombatProfile = z.infer<typeof CombatProfileSchema>;
export const CombatantSpecSchema = UnitInstanceSchema.extend({ profile: CombatProfileSchema });
export const CombatInputSchema = z
  .strictObject({
    protocolVersion: z.literal(COMBAT_PROTOCOL),
    rulesVersion: z.literal(COMBAT_RULES),
    seed: CombatSeedSchema,
    maxTicks: duration.default(MAX_COMBAT_TICKS),
    units: z.array(CombatantSpecSchema).max(56),
    obstacles: z.array(HexCoordSchema).max(56).default([]),
  })
  .superRefine((input, ctx) => {
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
  stat: z.enum(['attack', 'armor', 'magicResist', 'attackSpeedMilli']).nullable(),
  amount: z.number().int().min(-1_000_000).max(1_000_000),
  expiresTick: natural,
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
  }),
  z.strictObject({
    kind: z.literal('cast'),
    startTick: natural,
    endTick: natural,
    targetId: id,
    abilityId: id,
  }),
]);
export type CombatAction = z.infer<typeof CombatActionSchema>;
export const CombatUnitSchema = CombatantSpecSchema.extend({
  hp: amount,
  mana: amount,
  attackCharge: z.number().int().min(0).max(14999),
  statuses: z.array(CombatStatusSchema),
  action: CombatActionSchema.nullable(),
  targetId: id.nullable(),
  deathTick: natural.nullable(),
});
export type CombatUnit = z.infer<typeof CombatUnitSchema>;
export const ProjectileSchema = z.strictObject({
  id,
  sourceId: id,
  targetId: id,
  launchTick: natural,
  impactTick: natural,
  from: HexCoordSchema,
  to: HexCoordSchema,
  rawDamage: amount,
  damageType: DamageTypeSchema,
});
export type CombatProjectile = z.infer<typeof ProjectileSchema>;
export const CombatResultSchema = z.strictObject({
  winner: SideSchema.nullable(),
  reason: z.enum(['elimination', 'empty', 'timeout']),
  tick: natural,
});
export type CombatResult = z.infer<typeof CombatResultSchema>;
export const CombatStateSchema = z.strictObject({
  protocolVersion: z.literal(COMBAT_PROTOCOL),
  rulesVersion: z.literal(COMBAT_RULES),
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
export const CombatEventV2Schema = z.discriminatedUnion('type', [
  event(
    'combat_start',
    z.strictObject({
      rulesVersion: z.literal(COMBAT_RULES),
      seed: CombatSeedSchema,
      maxTicks: duration,
      units: z.array(CombatUnitSchema),
      obstacles: z.array(HexCoordSchema),
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
    'damage',
    z.strictObject({
      sourceId: id,
      targetId: id,
      amount,
      absorbed: amount,
      hpAfter: amount,
      shieldAfter: amount,
      damageType: DamageTypeSchema,
      cause: z.enum(['attack', 'ability']),
      impact: HexCoordSchema,
    }),
  ),
  event('heal', z.strictObject({ sourceId: id, targetId: id, amount, hpAfter: amount })),
  event(
    'shield_apply',
    z.strictObject({ unitId: id, status: CombatStatusSchema, shieldAfter: amount }),
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
    }),
  ),
  event('status_apply', z.strictObject({ unitId: id, status: CombatStatusSchema })),
  event(
    'status_expire',
    z.strictObject({ unitId: id, statusId: id, reason: z.enum(['duration', 'consumed', 'death']) }),
  ),
  event(
    'action_cancel',
    z.strictObject({
      unitId: id,
      action: z.enum(['move', 'attack', 'cast']),
      reason: z.enum(['stun', 'death', 'invalid-target', 'combat-end']),
    }),
  ),
  event('unit_death', z.strictObject({ unitId: id, position: HexCoordSchema })),
  event('combat_end', CombatResultSchema),
]);
export type CombatEventV2 = z.infer<typeof CombatEventV2Schema>;
export const CombatBatchSchema = z
  .strictObject({
    protocolVersion: z.literal(COMBAT_PROTOCOL),
    rulesVersion: z.literal(COMBAT_RULES),
    fromTick: natural,
    toTick: natural,
    events: z.array(CombatEventV2Schema),
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
  events: CombatEventV2[];
  snapshots: CombatState[];
  result: CombatResult;
}
