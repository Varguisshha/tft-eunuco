import { ChampionAbilitySchema, TraitDefinitionSchema, type CombatEffect } from '@tft/shared';
export const KILOMETRES = {
  version: 1 as const,
  id: 'kilometros',
  name: 'Kilómetros',
  trigger: 'competitive_win' as const,
  maximum: 8,
  adPercentMilli: 30,
  fusion: 'maximum' as const,
  reset: 'match_end' as const,
};
export const JARAMILLO_ABILITY = ChampionAbilitySchema.parse({
  version: 1,
  id: 'cortina-de-humo',
  name: 'Cortina de Humo',
  type: 'mixed',
  icon: 'fumon',
  description:
    'Tirador de apoyo que gana experiencia con cada victoria y debilita las defensas con humo.',
  passive: {
    name: 'Trotamundos',
    description:
      'Cada victoria competitiva desplegado concede 1 Kilómetro: +3 % AD, hasta 8 (+24 %). No cuentan empates, derrotas, banquillo ni victorias contra fantasmas. Al fusionar se conserva el máximo.',
    rules: [],
    matchProgress: KILOMETRES,
  },
  active: {
    name: 'Cortina de Humo',
    description:
      'Lanza un cigarro que inflige 160 / 240 / 400 % AD de daño físico, sin crítico, y reduce la armadura 15 / 20 / 30 % durante 4 s. El humo más fuerte prevalece; no se suman reducciones.',
    manaCost: 70,
    initialMana: 0,
    castTicks: 3,
    delivery: 'projectile',
    targeting: 'current_enemy',
    conditions: [],
    animation: 'ability',
    manaConsumption: 'on_start',
    priority: 'before_attack',
    interrupts: 'stun_or_death',
    effects: [
      {
        kind: 'damage',
        target: 'target',
        radius: 0,
        amount: 0,
        damageType: 'physical',
        canCrit: false,
        powerScaling: { version: 1, adRatioMilli: [1600, 2400, 4000], apRatioMilli: 0 },
      },
      {
        kind: 'armor_reduction',
        target: 'target',
        radius: 0,
        amount: 150,
        amountByStars: [150, 200, 300],
        duration: 40,
        timing: 'after_damage',
      },
    ],
  },
});
const smoke = (amount: number): CombatEffect => ({
  kind: 'armor_reduction',
  target: 'target',
  radius: 0,
  amount,
  duration: 30,
});
export const FUMON_TRAIT = TraitDefinitionSchema.parse({
  version: 1,
  id: 'fumon',
  name: 'FUMÓN',
  icon: 'fumon',
  description:
    'Los básicos de miembros FUMÓN aplican Humo. Solo cuenta cada personaje distinto desplegado. El debilitamiento más fuerte prevalece.',
  visual: { tone: 'jade', provisional: true },
  recipients: 'members',
  stacking: 'highest',
  thresholds: [
    {
      count: 2,
      description: 'Los básicos reducen 8 % la armadura durante 3 s.',
      bonuses: [],
      effects: [],
    },
    {
      count: 3,
      description:
        '15 % de reducción. La primera aplicación a cada enemigo inflige además 60 % AD físico una vez por combate.',
      bonuses: [],
      effects: [],
    },
  ],
  progress: {
    version: 1,
    scope: 'unit',
    rules: [
      {
        id: 'smoke-two',
        memberThreshold: 2,
        trigger: { kind: 'attack_hit', every: 1 },
        conditions: [],
        effects: [smoke(80)],
        maxActivations: 450,
        cooldownTicks: 0,
      },
      {
        id: 'smoke-three',
        memberThreshold: 3,
        trigger: { kind: 'attack_hit', every: 1 },
        conditions: [],
        effects: [
          smoke(150),
          {
            kind: 'damage',
            target: 'target',
            radius: 0,
            amount: 0,
            damageType: 'physical',
            canCrit: false,
            oncePerTarget: 'fumon-first-smoke',
            powerScaling: { version: 1, adRatioMilli: 600, apRatioMilli: 0 },
          },
        ],
        maxActivations: 450,
        cooldownTicks: 0,
      },
    ],
  },
});
