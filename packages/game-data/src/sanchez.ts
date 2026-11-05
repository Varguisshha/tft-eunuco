import type { CombatProfile } from '@tft/shared';
import {
  ChampionAbilitySchema,
  CombatProfileSchema,
  EconomyConfigSchema,
  UnitDefinitionSchema,
} from '@tft/shared';
import { EDU_ECONOMY_CONFIG, EDU_ROSTER, EDU_COMBAT_PROFILES } from './edu';
/** Initial, provisional balance for a cost-one ranged AP drummer. */
export const SANCHEZ_ABILITY = ChampionAbilitySchema.parse({
  version: 1,
  id: 'redoble-del-silencio',
  name: 'Redoble del Silencio',
  type: 'mixed',
  icon: 'sanchez-drums',
  description:
    'Atacante AP a distancia. Su calma aumenta su AP al encadenar impactos y sus redobles lanzan notas mágicas.',
  passive: {
    name: 'Ausencia de Sangre',
    description:
      'No tiene sangre, pero lleva el compás. Cada 4 ataques básicos que impactan obtiene +6 / 9 / 12 AP hasta el final del combate. Se acumula hasta 5 veces: +30 / 45 / 60 AP. Él sigue igual de tranquilo; sus notas, cada vez menos.',
    rules: [
      {
        id: 'pulso-imperturbable',
        trigger: { kind: 'attack_hit', every: 4 },
        conditions: [],
        maxActivations: 5,
        cooldownTicks: 0,
        effects: [
          {
            kind: 'modifier',
            target: 'self',
            radius: 0,
            stat: 'abilityPower',
            mode: 'flat',
            amount: 6,
            amountByStars: [6, 9, 12],
            duration: null,
            stacking: 'stack',
            key: 'ausencia-de-sangre-ap',
          },
        ],
      },
    ],
  },
  active: {
    name: 'Redoble del Silencio',
    description:
      'Él no levanta la voz; la batería se encarga. 70 maná. Tras 0,6 s de redoble lanza una nota al enemigo actual: 140 / 210 / 315 de daño mágico +150 % AP y aturdimiento de 0,8 s al impactar.',
    manaCost: 70,
    initialMana: 0,
    castTicks: 6,
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
        amount: 140,
        amountByStars: [140, 210, 315],
        damageType: 'magic',
        canCrit: false,
        powerScaling: { version: 1, adRatioMilli: 0, apRatioMilli: 1500 },
      },
      { kind: 'stun', target: 'target', radius: 0, duration: 8 },
    ],
  },
});
export const SANCHEZ_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...EDU_ECONOMY_CONFIG,
  sanchezPolicy: 'sanchez-ap-1',
});
export const SANCHEZ_ROSTER = EDU_ROSTER.map((unit) => {
  if (unit.id !== 'sanchez') return structuredClone(unit);
  return UnitDefinitionSchema.parse({
    ...unit,
    role: 'support',
    spriteId: 'sanchez',
    activeAbilityId: SANCHEZ_ABILITY.id,
    passiveAbilityId: SANCHEZ_ABILITY.id,
  });
});
export const SANCHEZ_COMBAT_PROFILES: Readonly<Record<string, CombatProfile>> = {
  ...EDU_COMBAT_PROFILES,
  sanchez: CombatProfileSchema.parse({
    ...EDU_COMBAT_PROFILES.sanchez,
    stats: {
      ...EDU_COMBAT_PROFILES.sanchez!.stats,
      abilityPower: 30,
      range: 4,
      maxMana: 70,
      startingMana: 0,
    },
    championAbility: SANCHEZ_ABILITY,
  }),
};
