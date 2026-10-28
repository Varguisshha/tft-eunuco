import { ChampionAbilitySchema, CombatProfileSchema, TraitDefinitionSchema } from '@tft/shared';
/** Authored TXT values plus explicitly provisional tuning. Frozen by florin-1. */
export const FLORIN_TUNING = {
  version: 'florin-1',
  cost: 3,
  stats: {
    maxHp: 620,
    attack: 55,
    armor: 25,
    magicResist: 25,
    attackSpeedMilli: 700,
    range: 1,
    abilityPower: 0,
    critChanceMilli: 100,
    critMultiplierMilli: 1500,
    maxMana: 80,
    startingMana: 0,
    moveTicks: 3,
    attackWindupTicks: 3,
  },
  active: {
    adRatioMilli: [1800, 2600, 4000],
    secondaryRatioMilli: [900, 1560, 3000],
    radius: [1, 2, 3],
    stunTicks: [10, 15, 20],
    attackSpeedMilli: [0, 100, 200],
    durationTicks: [1, 30, 40],
  },
  passive: {
    afterAttacks: [5, 4, 3],
    bonusAdMilli: [500, 600, 750],
    slowMoveMilli: [0, 0, 200],
    slowTicks: 10,
  },
  recovery: {
    healMaxHpMilliPerSecond: 80,
    thresholds: [600, 300],
    attackSpeedMilli: 250,
    moveSpeedMilli: 150,
  },
  ruman: { attackSpeedMilli: [100, 200], ap: [10, 20], shieldMaxHpMilli: 120, shieldTicks: 50 },
  perdidos: { maxHpMilli: [100, 180], thresholdMilli: 400, healMaxHpMilli: 80 },
} as const;
const modifier = (stat: 'attackSpeedMilli' | 'moveSpeedMilli', amount: number, key: string) => ({
  kind: 'modifier' as const,
  target: 'self' as const,
  radius: 0,
  stat,
  amount,
  mode: 'percent_milli' as const,
  duration: null,
  key,
  stacking: 'refresh' as const,
});
export const FLORIN_ABILITY = ChampionAbilitySchema.parse({
  id: 'pisoton-carmesi',
  name: 'Pisotón Carmesí',
  icon: 'pisoton-carmesi',
  version: 1,
  type: 'mixed',
  description: 'Sus zapatos rojos marcan el ritmo: Suela reforzada y un pisotón físico de área.',
  passive: {
    name: 'Suela reforzada',
    description:
      'Después de 5 / 4 / 3 ataques básicos, el siguiente añade 50 / 60 / 75 % de AD. A 3★ ralentiza el movimiento un 20 % durante 1 s. El contador reinicia después del golpe reforzado.',
    rules: [],
    attackCycle: FLORIN_TUNING.passive,
  },
  active: {
    name: 'Pisotón Carmesí',
    namesByStars: ['Pisotón Carmesí', 'Pisotón Demoledor', '¡A Picar Piedra!'],
    description:
      'Inflige 180 / 260 / 400 % AD al objetivo y lo aturde 1 / 1,5 / 2 s. Los secundarios en radio 1 / 2 / 3 reciben 50 / 60 / 75 % del daño principal. A 2★ / 3★ gana 10 / 20 % de velocidad de ataque durante 3 / 4 s. Maná 80 y radios provisionales.',
    manaCost: 80,
    initialMana: 0,
    castTicks: 4,
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
        powerScaling: {
          version: 1,
          adRatioMilli: FLORIN_TUNING.active.adRatioMilli,
          apRatioMilli: 0,
        },
      },
      {
        kind: 'damage',
        target: 'enemies',
        center: 'target',
        radius: 1,
        radiusByStars: FLORIN_TUNING.active.radius,
        excludePrimary: true,
        amount: 0,
        damageType: 'physical',
        powerScaling: {
          version: 1,
          adRatioMilli: FLORIN_TUNING.active.secondaryRatioMilli,
          apRatioMilli: 0,
        },
      },
      {
        kind: 'stun',
        target: 'target',
        radius: 0,
        duration: 10,
        durationByStars: FLORIN_TUNING.active.stunTicks,
      },
      {
        ...modifier('attackSpeedMilli', 0, 'pisoton-ritmo'),
        duration: 1,
        amountByStars: FLORIN_TUNING.active.attackSpeedMilli,
        durationByStars: FLORIN_TUNING.active.durationTicks,
      },
    ],
  },
});
export const RUMAN_TRINITY = TraitDefinitionSchema.parse({
  id: 'ruman_trinity',
  name: 'Ruman Trinity',
  icon: 'ruman_trinity',
  version: 1,
  description:
    'Ritmo compartido. Solo cuentan personajes distintos desplegados. Valores provisionales.',
  visual: { tone: 'amber', provisional: true },
  recipients: 'members',
  stacking: 'highest',
  thresholds: [
    {
      count: 2,
      description: '+10 % velocidad de ataque y +10 AP.',
      bonuses: [
        {
          stat: 'attackSpeedMilli',
          mode: 'percent_milli',
          amount: FLORIN_TUNING.ruman.attackSpeedMilli[0],
        },
        { stat: 'abilityPower', mode: 'flat', amount: FLORIN_TUNING.ruman.ap[0] },
      ],
      effects: [],
    },
    {
      count: 3,
      description:
        '+20 % velocidad de ataque, +20 AP y escudo inicial del 12 % de vida máxima durante 5 s.',
      bonuses: [
        {
          stat: 'attackSpeedMilli',
          mode: 'percent_milli',
          amount: FLORIN_TUNING.ruman.attackSpeedMilli[1],
        },
        { stat: 'abilityPower', mode: 'flat', amount: FLORIN_TUNING.ruman.ap[1] },
      ],
      effects: [
        {
          kind: 'shield',
          target: 'self',
          radius: 0,
          amount: 0,
          scaling: {
            stat: 'maxHp',
            basis: 'source',
            ratioMilli: FLORIN_TUNING.ruman.shieldMaxHpMilli,
          },
          duration: FLORIN_TUNING.ruman.shieldTicks,
        },
      ],
    },
  ],
});
export const PERDIDOS_POR_EL_MUNDO = TraitDefinitionSchema.parse({
  id: 'perdidos_por_el_mundo',
  name: 'Perdidos por el Mundo',
  icon: 'perdidos_por_el_mundo',
  version: 1,
  description:
    'Resistencia para seguir. Solo cuentan personajes distintos desplegados. Valores provisionales.',
  visual: { tone: 'jade', provisional: true },
  recipients: 'members',
  stacking: 'highest',
  thresholds: [
    {
      count: 2,
      description: '+10 % de vida máxima.',
      bonuses: [
        { stat: 'maxHp', mode: 'percent_milli', amount: FLORIN_TUNING.perdidos.maxHpMilli[0] },
      ],
      effects: [],
    },
    {
      count: 3,
      description:
        '+18 % de vida máxima. Una vez por combate, al bajar del 40 %, recupera el 8 % de vida máxima efectiva.',
      bonuses: [
        { stat: 'maxHp', mode: 'percent_milli', amount: FLORIN_TUNING.perdidos.maxHpMilli[1] },
      ],
      effects: [],
    },
  ],
  progress: {
    version: 1,
    scope: 'unit',
    rules: [
      {
        id: 'perdidos-respiro',
        memberThreshold: 3,
        trigger: { kind: 'hp_crossed', thresholdMilli: FLORIN_TUNING.perdidos.thresholdMilli },
        conditions: [],
        maxActivations: 1,
        cooldownTicks: 0,
        effects: [
          {
            kind: 'heal',
            target: 'self',
            radius: 0,
            amount: 0,
            scaling: {
              stat: 'maxHp',
              basis: 'source',
              ratioMilli: FLORIN_TUNING.perdidos.healMaxHpMilli,
            },
          },
        ],
      },
    ],
  },
});
export const MANO_DE_OBRA = TraitDefinitionSchema.parse({
  id: 'mano_de_obra',
  name: 'Mano de Obra',
  icon: 'mano_de_obra',
  version: 1,
  description:
    'A 60 % y 30 % de vida sale a hacer secundarias. Fuera del tablero no ataca ni recibe daño; recupera 8 % de vida máxima por segundo (provisional). Vuelve al curarse o al quedarse sin compañeros vivos. Primera vuelta: +25 % velocidad de ataque y +15 % movimiento; segunda: sus básicos hacen daño verdadero. Cada salida una vez por combate.',
  visual: { tone: 'amber', provisional: false },
  recipients: 'members',
  stacking: 'highest',
  thresholds: [
    {
      count: 1,
      description: 'Dos salidas únicas por combate; beneficios al regresar.',
      bonuses: [],
      effects: [],
    },
  ],
  progress: {
    version: 1,
    scope: 'unit',
    rules: [
      {
        id: 'secundarias-primera',
        memberThreshold: 1,
        trigger: { kind: 'hp_crossed', thresholdMilli: 600 },
        conditions: [{ kind: 'recovery_stage', completed: 0 }],
        maxActivations: 1,
        cooldownTicks: 0,
        effects: [
          {
            kind: 'recovery',
            target: 'self',
            radius: 0,
            stage: 1,
            healMaxHpMilliPerSecond: FLORIN_TUNING.recovery.healMaxHpMilliPerSecond,
            onReturn: [
              modifier('attackSpeedMilli', FLORIN_TUNING.recovery.attackSpeedMilli, 'mano-ritmo'),
              modifier('moveSpeedMilli', FLORIN_TUNING.recovery.moveSpeedMilli, 'mano-paso'),
            ],
          },
        ],
      },
      {
        id: 'secundarias-segunda',
        memberThreshold: 1,
        trigger: { kind: 'damage_received' },
        conditions: [
          { kind: 'recovery_stage', completed: 1 },
          { kind: 'hp_below', ratioMilli: 300 },
        ],
        maxActivations: 1,
        cooldownTicks: 0,
        effects: [
          {
            kind: 'recovery',
            target: 'self',
            radius: 0,
            stage: 2,
            healMaxHpMilliPerSecond: FLORIN_TUNING.recovery.healMaxHpMilliPerSecond,
            onReturn: [],
            basicDamageTypeOnReturn: 'true',
          },
        ],
      },
    ],
  },
});
export const FLORIN_TRAITS = [RUMAN_TRINITY, PERDIDOS_POR_EL_MUNDO, MANO_DE_OBRA];
export const FLORIN_PROFILE = CombatProfileSchema.parse({
  starLevel: 1,
  stats: FLORIN_TUNING.stats,
  ability: null,
  passive: null,
  championAbility: FLORIN_ABILITY,
  traits: ['ruman_trinity', 'perdidos_por_el_mundo', 'mano_de_obra'],
});
