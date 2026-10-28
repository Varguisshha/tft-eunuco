import {
  ChampionAbilitySchema,
  TraitDefinitionSchema,
  ProfileMechanicsSchema,
  type CombatEffect,
  type PassiveRule,
} from '@tft/shared';
const heal = (ratioMilli: number): CombatEffect => ({
  kind: 'heal',
  target: 'self',
  radius: 0,
  amount: 0,
  scaling: { stat: 'maxHp', basis: 'source', ratioMilli },
});
const speed = (amount: number, duration: number, key: string): CombatEffect => ({
  kind: 'modifier',
  target: 'self',
  radius: 0,
  stat: 'attackSpeedMilli',
  mode: 'percent_milli',
  amount,
  duration,
  key,
  stacking: 'refresh',
});
const rule = (
  id: string,
  trigger: PassiveRule['trigger'],
  effects: CombatEffect[],
  conditions: PassiveRule['conditions'] = [],
): PassiveRule => ({ id, trigger, effects, conditions, maxActivations: 450, cooldownTicks: 0 });
export const VARGAS_ABILITY = ChampionAbilitySchema.parse({
  version: 1,
  id: 'copita-perhaps',
  name: 'Copita Perhaps',
  type: 'mixed',
  icon: 'copita-perhaps',
  description:
    'Un carry físico de ritmo creciente. Cada golpe alimenta la Resaca; Blackhaus convierte AD en daño y recuperación.',
  passive: {
    name: 'Resaca Controlada',
    description:
      'Cada básico confirmado suma Resaca (0/5): +4 % de velocidad por acumulación. Al llegar a cinco las consume, cura 5 % de vida máxima y gana +20 % de velocidad durante 3 s. Puede iniciar otro ciclo mientras dura el aumento.',
    rules: [
      rule('resaca-hit', { kind: 'attack_hit', every: 1 }, [
        { kind: 'stack_gain', target: 'self', radius: 0, stackId: 'resaca', amount: 1 },
      ]),
    ],
  },
  active: {
    name: 'Blackhaus RPP',
    description:
      'Maná 0/70. Golpe físico de 280 / 420 / 700 % AD (1★ / 2★ / 3★), sin crítico. Cura 15 / 20 / 30 % del daño aplicado a vida, excluyendo escudos y exceso. Después gana +25 / 35 / 50 % de velocidad durante 3 / 4 / 5 s.',
    manaCost: 70,
    initialMana: 0,
    castTicks: 3,
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
        powerScaling: { version: 1, adRatioMilli: [2800, 4200, 7000], apRatioMilli: 0 },
        healFromDamageMilli: [150, 200, 300],
      },
      {
        ...speed(250, 30, 'blackhaus-speed'),
        amountByStars: [250, 350, 500],
        durationByStars: [30, 40, 50],
        timing: 'after_damage',
      },
    ],
  },
});
export const VARGAS_MECHANICS = ProfileMechanicsSchema.parse({
  version: 1,
  stacks: [
    {
      version: 1,
      id: 'resaca',
      name: 'Resaca Controlada',
      trigger: { kind: 'attack_hit', every: 1 },
      automatic: false,
      conditions: [],
      maxStacks: 5,
      durationTicks: null,
      refresh: 'keep',
      consumption: 'threshold',
      reset: 'combat',
      modifiers: [{ stat: 'attackSpeedMilli', mode: 'percent_milli', amount: 40 }],
      thresholds: [
        {
          id: 'resaca-cycle',
          count: 5,
          consume: 5,
          repeatable: true,
          effects: [heal(50), speed(200, 30, 'resaca-speed')],
        },
      ],
    },
    {
      version: 1,
      id: 'depredador',
      name: 'Depredador',
      trigger: { kind: 'kill' },
      automatic: false,
      conditions: [],
      maxStacks: 100,
      durationTicks: null,
      refresh: 'keep',
      consumption: 'none',
      reset: 'combat',
      modifiers: [{ stat: 'attack', mode: 'flat', amount: 5 }],
      thresholds: [
        {
          id: 'depredador-four',
          count: 4,
          consume: 0,
          repeatable: false,
          effects: [
            {
              kind: 'modifier',
              target: 'self',
              radius: 0,
              stat: 'attack',
              mode: 'flat',
              amount: 15,
              duration: null,
              key: 'depredador-four',
              stacking: 'refresh',
            },
          ],
        },
      ],
    },
  ],
});
export const UPM_TRAIT = TraitDefinitionSchema.parse({
  version: 1,
  id: 'upm',
  name: 'UPM — Supervivientes de la Politécnica',
  description:
    'Créditos = lanzamientos naturales de cada unidad durante este combate. Los miembros distintos desplegados activan 2/4/6; los Créditos nunca cambian esa membresía.',
  icon: 'upm',
  visual: { tone: 'jade', provisional: true },
  recipients: 'members',
  stacking: 'cumulative',
  thresholds: [
    {
      count: 2,
      description: '+100 de vida máxima y +20 AP para miembros UPM.',
      bonuses: [
        { stat: 'maxHp', mode: 'flat', amount: 100 },
        { stat: 'abilityPower', mode: 'flat', amount: 20 },
      ],
      effects: [],
    },
    {
      count: 4,
      description: 'Además, cada lanzamiento natural cura 4 % de vida máxima.',
      bonuses: [],
      effects: [],
    },
    {
      count: 6,
      description:
        'Además, cada tercer lanzamiento natural tiene 150 % de potencia y una repetición gratuita al 50 %. La repetición no concede maná, procs ni Créditos.',
      bonuses: [],
      effects: [],
    },
  ],
  progress: {
    version: 1,
    scope: 'unit',
    rules: [
      {
        ...rule('upm-cast-heal', { kind: 'ability_cast', every: 1 }, [heal(40)]),
        memberThreshold: 4,
      },
      {
        ...rule('upm-third', { kind: 'ability_cast', every: 3 }, [
          {
            kind: 'ability_empower',
            target: 'self',
            radius: 0,
            powerMilli: 1500,
            extraEffects: [],
          },
          {
            kind: 'ability_repeat',
            target: 'self',
            radius: 0,
            maxChain: 4,
            allowSourceProcs: false,
            grantMana: false,
            countAsCast: false,
            delayTicks: 1,
            targetPolicy: 'same_or_nearest',
            powerMilli: 500,
            extraEffects: [],
          },
        ]),
        memberThreshold: 6,
      },
    ],
  },
});
export const PREDATOR_TRAIT = TraitDefinitionSchema.parse({
  version: 1,
  id: 'el-depredador',
  name: 'EL DEPREDADOR',
  description:
    'Única de VARGAS. Los miembros y las eliminaciones se cuentan por separado. Solo se activa desplegado (1/1).',
  icon: 'el-depredador',
  visual: { tone: 'amber', provisional: true },
  recipients: 'members',
  stacking: 'highest',
  thresholds: [
    {
      count: 1,
      description:
        'Por eliminación: +5 AD y cura 5 % de vida máxima. Desde la tercera cura otro 5 %. A cuatro marcas: +15 AD una vez. Desde la séptima: salto y básico inmediato, con presupuesto de cadena.',
      bonuses: [],
      effects: [],
    },
  ],
  progress: {
    version: 1,
    scope: 'unit',
    rules: [
      {
        ...rule('predator-kill', { kind: 'kill' }, [
          { kind: 'stack_gain', target: 'self', radius: 0, stackId: 'depredador', amount: 1 },
          heal(50),
        ]),
        memberThreshold: 1,
      },
      {
        ...rule(
          'predator-extra-heal',
          { kind: 'kill' },
          [heal(50)],
          [{ kind: 'stack_count', stackId: 'depredador', minimum: 2 }],
        ),
        memberThreshold: 1,
      },
      {
        ...rule(
          'predator-jump',
          { kind: 'kill' },
          [
            {
              kind: 'jump',
              target: 'self',
              radius: 0,
              maxChain: 8,
              allowSourceProcs: true,
              grantMana: false,
              duration: 3,
              immediateAttack: true,
              allowKillChain: true,
              retarget: 'cancel',
            },
          ],
          [{ kind: 'stack_count', stackId: 'depredador', minimum: 6 }],
        ),
        memberThreshold: 1,
      },
    ],
  },
});
