import type { CombatProfile } from '@tft/shared';
import {
  ChampionAbilitySchema,
  CombatProfileSchema,
  EconomyConfigSchema,
  ProfileMechanicsSchema,
} from '@tft/shared';
import { P12F_ECONOMY_CONFIG } from './economy';
import { P11_COMBAT_PROFILES } from './p11-roster';

export const P13T_CHARACTER_POLICY = 'f0p13t-1' as const;
export const P13T_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...P12F_ECONOMY_CONFIG,
  characterPolicy: P13T_CHARACTER_POLICY,
});
export const P13T_ITEM_ROLES = { peibol: 'marksman' } as const;
export const P13T_BALANCE = {
  itemRoles: P13T_ITEM_ROLES,
  version: P13T_CHARACTER_POLICY,
  peibolRange: 3,
  rangeRationale:
    'Precision ranged physical attacker, calibrated to the existing JARAMILLO range of 3 hexes. The supplied ability document does not define a range; this explicit P13T decision changes no historic profile.',
  inheritedJaramilloMana: 70,
  inheritedCastTicks: 3,
  targetCounters:
    'JARAMILLO Bars persist independently on each enemy until consumed or combat ends; PEIBOL Ego resets when the authoritative current target changes.',
} as const;
const damage = (ratios: [number, number, number]) => ({
  kind: 'damage' as const,
  target: 'target' as const,
  radius: 0,
  amount: 0,
  damageType: 'physical' as const,
  powerScaling: { version: 1 as const, adRatioMilli: ratios, apRatioMilli: 0 },
});
const gain = (stackId: string) => ({
  kind: 'stack_gain' as const,
  target: 'self' as const,
  radius: 0,
  stackId,
  amount: 1,
});
const ruleBase = { conditions: [], maxActivations: 450, cooldownTicks: 0 };
export const P13T_JARAMILLO_ABILITY = ChampionAbilitySchema.parse({
  version: 1,
  id: 'te-dejo-en-bragas-p13t',
  name: 'Te dejo en bragas',
  type: 'mixed',
  icon: 'fumon',
  description: 'Tirador físico: aplica Barras a cada enemigo y reduce armadura con su proyectil.',
  passive: {
    name: 'Barras que duelen',
    description:
      'Cada básico confirmado aplica una Barra al enemigo. A las 4, las consume y causa 40 / 60 / 80 % AD de daño físico adicional. Las Barras son independientes por objetivo y se reinician al terminar el combate; esta versión no concede Kilómetros por victorias.',
    rules: [
      {
        ...ruleBase,
        id: 'aplicar-barra',
        trigger: { kind: 'attack_hit', every: 1 },
        effects: [gain('barras-p13t')],
      },
    ],
  },
  active: {
    name: 'Te dejo en bragas',
    description:
      'Proyectil al primer enemigo objetivo: 100 / 125 / 150 % AD físico y reduce su armadura 15 / 20 / 25 % durante 4 s. Mantiene 70 de maná y 0,3 s de preparación del perfil anterior.',
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
      damage([1000, 1250, 1500]),
      {
        kind: 'armor_reduction',
        target: 'target',
        radius: 0,
        amount: 150,
        amountByStars: [150, 200, 250],
        duration: 40,
        timing: 'after_damage',
      },
    ],
  },
});
export const P13T_PEIBOL_ABILITY = ChampionAbilitySchema.parse({
  version: 1,
  id: 'headshot-p13t',
  name: 'AAAAAH, ¡QUÉ HEADSHOT!',
  type: 'mixed',
  icon: 'jew',
  description:
    'Tirador AD con velocidad acumulada sobre su objetivo y disparos físicos de precisión.',
  passive: {
    name: 'PLATITA LOW ELO',
    description:
      'Cada básico confirmado al mismo enemigo concede Ego de Challenger: +4 % de velocidad de ataque por carga, hasta 5 (+20 %). Cambiar de objetivo pierde las cargas. Eliminar a ese objetivo con 5 cargas concede Modo Smurf: +20 % AD durante 4 s.',
    rules: [
      {
        ...ruleBase,
        id: 'ego-hit',
        trigger: { kind: 'attack_hit', every: 1 },
        effects: [gain('ego-p13t')],
      },
      {
        ...ruleBase,
        id: 'modo-smurf',
        trigger: { kind: 'kill' },
        conditions: [
          { kind: 'stack_count', stackId: 'ego-p13t', minimum: 5, matchesSignalTarget: true },
        ],
        effects: [
          {
            kind: 'modifier',
            target: 'self',
            radius: 0,
            stat: 'attack',
            mode: 'percent_milli',
            amount: 200,
            duration: 40,
            key: 'modo-smurf-p13t',
            stacking: 'refresh',
          },
        ],
      },
    ],
  },
  active: {
    name: 'AAAAAH, ¡QUÉ HEADSHOT!',
    description:
      '70 maná. Dispara al objetivo actual: 220 / 330 / 500 % AD físico. Si al impacto está por debajo de 35 % de vida, inflige +25 % de daño. Si este disparo lo elimina, recupera 25 maná. Preparación de 0,3 s.',
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
        ...damage([2200, 3300, 5000]),
        bonusBelowHp: { ratioMilli: 350, multiplierMilli: 1250 },
        manaOnKill: 25,
      },
    ],
  },
});
const stackBase = {
  version: 1,
  trigger: { kind: 'attack_hit', every: 1 },
  automatic: false,
  conditions: [],
  durationTicks: null,
  refresh: 'keep',
  reset: 'combat',
};
export const P13T_JARAMILLO_MECHANICS = ProfileMechanicsSchema.parse({
  version: 1,
  stacks: [
    {
      ...stackBase,
      id: 'barras-p13t',
      name: 'Barras',
      scope: 'per_enemy',
      maxStacks: 4,
      consumption: 'threshold',
      modifiers: [],
      thresholds: [
        {
          id: 'cuatro-barras',
          count: 4,
          consume: 4,
          repeatable: true,
          effects: [damage([400, 600, 800])],
        },
      ],
    },
  ],
});
export const P13T_PEIBOL_MECHANICS = ProfileMechanicsSchema.parse({
  version: 1,
  stacks: [
    {
      ...stackBase,
      id: 'ego-p13t',
      name: 'Ego de Challenger',
      scope: 'current_enemy',
      maxStacks: 5,
      consumption: 'none',
      modifiers: [{ stat: 'attackSpeedMilli', mode: 'percent_milli', amount: 40 }],
      thresholds: [],
    },
  ],
});
export const P13T_COMBAT_PROFILES: Readonly<Record<string, CombatProfile>> = {
  ...P11_COMBAT_PROFILES,
  jaramillo: CombatProfileSchema.parse({
    ...P11_COMBAT_PROFILES.jaramillo,
    championAbility: P13T_JARAMILLO_ABILITY,
    mechanics: P13T_JARAMILLO_MECHANICS,
  }),
  peibol: CombatProfileSchema.parse({
    ...P11_COMBAT_PROFILES.peibol,
    stats: { ...P11_COMBAT_PROFILES.peibol!.stats, range: 3, maxMana: 70, startingMana: 0 },
    championAbility: P13T_PEIBOL_ABILITY,
    mechanics: P13T_PEIBOL_MECHANICS,
  }),
};
/** Visible names are intentionally outside the historical simulation catalogs and hashes. */
export const TRAIT_PRESENTATION_NAMES: Readonly<Record<string, string>> = {
  mano_de_obra: '¡Me Fuí!',
};
export const traitDisplayName = (trait: { id: string; name: string }) =>
  TRAIT_PRESENTATION_NAMES[trait.id] ?? trait.name;
