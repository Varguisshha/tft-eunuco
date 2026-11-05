import type { CombatProfile } from '@tft/shared';
import { ChampionAbilitySchema, CombatProfileSchema, EconomyConfigSchema } from '@tft/shared';
import { SANCHEZ_ABILITY, SANCHEZ_COMBAT_PROFILES, SANCHEZ_ECONOMY_CONFIG } from './sanchez';
import { EDU_ABILITY } from './edu';
const ap = (ratio: number) => ({ version: 1 as const, adRatioMilli: 0, apRatioMilli: ratio });
export const EDU_AP_ABILITY = ChampionAbilitySchema.parse({
  ...EDU_ABILITY,
  description:
    'Support AP a distancia: su autoestima da escudos y sus recomendaciones curan. Todo el apoyo escala con AP, nunca con AD.',
  passive: {
    name: '¡Qué guapo soy!',
    description:
      'Se coloca atrás para que todos puedan admirarlo. Al comenzar el combate, todo el equipo recibe un escudo de 40 / 60 / 90 +50 % AP de Edu durante 6 s. La modestia no escala; su escudo sí.',
    rules: [
      {
        id: 'confianza-arcana',
        trigger: { kind: 'combat_start' },
        conditions: [],
        maxActivations: 1,
        cooldownTicks: 0,
        effects: [
          {
            kind: 'shield',
            target: 'allies',
            radius: 14,
            amount: 40,
            amountByStars: [40, 60, 90],
            powerScaling: ap(500),
            duration: 60,
            stacking: 'refresh',
            key: 'edu-ap-confidence',
          },
        ],
      },
    ],
  },
  active: {
    ...EDU_ABILITY.active!,
    description:
      'Ni desde la otra punta te libras de Sanderson. 80 maná: cura 80 / 120 / 200 +100 % AP al aliado con menos vida, le da un escudo de 180 / 270 / 420 +200 % AP y +25 / 35 / 50 % de velocidad de ataque durante 4 s. Sin límite de alcance. Si está solo, se ayuda a sí mismo. Preparación de 0,8 s. Ahora sobrevivirás para leer la saga.',
    effects: [
      {
        kind: 'heal',
        target: 'target',
        radius: 0,
        amount: 80,
        amountByStars: [80, 120, 200],
        powerScaling: ap(1000),
      },
      {
        kind: 'shield',
        target: 'target',
        radius: 0,
        amount: 180,
        amountByStars: [180, 270, 420],
        powerScaling: ap(2000),
        duration: 40,
        stacking: 'refresh',
        key: 'edu-cosmere-shield',
      },
      EDU_ABILITY.active!.effects[2],
    ],
  },
});
export const SANCHEZ_AP_ABILITY = ChampionAbilitySchema.parse({
  ...SANCHEZ_ABILITY,
  description:
    'Mago de alcance 4. Mantiene el ritmo con notas mágicas y acumula AP para potenciar su redoble.',
  passive: {
    name: 'Ausencia de Sangre',
    description:
      'No tiene sangre, pero lleva el compás. Cada básico que impacta añade daño mágico igual al 30 % de su AP. Cada 4 impactos gana +8 / 12 / 18 AP hasta el final del combate, hasta 5 veces (+40 / 60 / 90 AP). Él no se viene arriba; sus notas sí.',
    rules: [
      {
        id: 'notas-en-calma',
        trigger: { kind: 'attack_hit', every: 1 },
        conditions: [],
        maxActivations: 450,
        cooldownTicks: 0,
        effects: [
          {
            kind: 'damage',
            target: 'target',
            radius: 0,
            amount: 0,
            powerScaling: ap(300),
            damageType: 'magic',
            canCrit: false,
          },
        ],
      },
      {
        ...SANCHEZ_ABILITY.passive!.rules[0],
        effects: [
          {
            kind: 'modifier',
            target: 'self',
            radius: 0,
            stat: 'abilityPower',
            mode: 'flat',
            amount: 8,
            amountByStars: [8, 12, 18],
            duration: null,
            stacking: 'stack',
            key: 'ausencia-de-sangre-ap',
          },
        ],
      },
    ],
  },
  active: {
    ...SANCHEZ_ABILITY.active!,
    description:
      'Él no levanta la voz; la batería se encarga. 70 maná. Tras 0,6 s lanza una nota al enemigo actual: 130 / 195 / 290 de daño mágico +200 % AP y aturdimiento de 0,8 s al impactar.',
    effects: [
      {
        kind: 'damage',
        target: 'target',
        radius: 0,
        amount: 130,
        amountByStars: [130, 195, 290],
        powerScaling: ap(2000),
        damageType: 'magic',
        canCrit: false,
      },
      SANCHEZ_ABILITY.active!.effects[1],
    ],
  },
});
export const RANGED_AP_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...SANCHEZ_ECONOMY_CONFIG,
  rangedApPolicy: 'ranged-ap-1',
});
export const RANGED_AP_COMBAT_PROFILES: Readonly<Record<string, CombatProfile>> = {
  ...SANCHEZ_COMBAT_PROFILES,
  edu: CombatProfileSchema.parse({
    ...SANCHEZ_COMBAT_PROFILES.edu,
    stats: { ...SANCHEZ_COMBAT_PROFILES.edu!.stats, attack: 10, abilityPower: 60 },
    championAbility: EDU_AP_ABILITY,
  }),
  sanchez: CombatProfileSchema.parse({
    ...SANCHEZ_COMBAT_PROFILES.sanchez,
    stats: { ...SANCHEZ_COMBAT_PROFILES.sanchez!.stats, attack: 15, abilityPower: 60 },
    championAbility: SANCHEZ_AP_ABILITY,
  }),
};
