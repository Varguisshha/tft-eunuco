import type { CombatProfile } from '@tft/shared';
import {
  ChampionAbilitySchema,
  CombatProfileSchema,
  EconomyConfigSchema,
  UnitDefinitionSchema,
} from '@tft/shared';
import { P13U_ECONOMY_CONFIG } from './p13u';
import { P13U_ROSTER } from './p13u-roster';
import { P13T_COMBAT_PROFILES } from './p13t';
export const EDU_ABILITY = ChampionAbilitySchema.parse({
  version: 1,
  id: 'inspiracion-cosmere-edu',
  name: 'Tienes que leer a Sanderson',
  type: 'mixed',
  icon: 'cosmere',
  description:
    'Su autoestima protege al equipo; sus recomendaciones literarias le dan fuerzas para seguir.',
  passive: {
    name: '¡Qué guapo soy!',
    description:
      'Se coloca en la última fila: desde ahí también se le ve guapo. Al comenzar el combate, todo su equipo, incluido Edu, obtiene +10 / 15 / 20 % de velocidad de ataque durante 6 s. La autoestima no tiene límite de alcance.',
    rules: [
      {
        id: 'confianza-contagiosa',
        trigger: { kind: 'combat_start' },
        conditions: [],
        maxActivations: 1,
        cooldownTicks: 0,
        effects: [
          {
            kind: 'modifier',
            target: 'allies',
            radius: 14,
            stat: 'attackSpeedMilli',
            mode: 'percent_milli',
            amount: 100,
            amountByStars: [100, 150, 200],
            duration: 60,
            stacking: 'refresh',
            key: 'edu-confidence-speed',
          },
        ],
      },
    ],
  },
  active: {
    name: 'Tienes que leer a Sanderson',
    description:
      'Ni desde la otra punta del tablero te libras de la recomendación. 80 maná. Cura 100 / 150 / 250 de vida al aliado con menos vida actual, le da un escudo de 300 / 450 / 700 y +25 / 35 / 50 % de velocidad de ataque durante 4 s, sin límite de alcance. Sobrevivirás para leer el siguiente. Si está solo, se protege a sí mismo. Preparación de 0,8 s.',
    manaCost: 80,
    initialMana: 0,
    castTicks: 8,
    targeting: 'lowest_health_ally',
    conditions: [],
    animation: 'ability',
    manaConsumption: 'on_start',
    priority: 'before_attack',
    interrupts: 'stun_or_death',
    effects: [
      { kind: 'heal', target: 'target', radius: 0, amount: 100, amountByStars: [100, 150, 250] },
      {
        kind: 'shield',
        target: 'target',
        radius: 0,
        amount: 300,
        amountByStars: [300, 450, 700],
        duration: 40,
        stacking: 'refresh',
        key: 'edu-cosmere-shield',
      },
      {
        kind: 'modifier',
        target: 'target',
        radius: 0,
        stat: 'attackSpeedMilli',
        mode: 'percent_milli',
        amount: 250,
        amountByStars: [250, 350, 500],
        duration: 40,
        stacking: 'refresh',
        key: 'edu-cosmere-speed',
      },
    ],
  },
});
/** New matches opt in; published P13U profiles and fingerprints stay unchanged. */
export const EDU_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...P13U_ECONOMY_CONFIG,
  eduPolicy: 'edu-support-1',
});
export const EDU_ROSTER = P13U_ROSTER.map((unit) =>
  unit.id === 'edu'
    ? UnitDefinitionSchema.parse({
        ...unit,
        role: 'support',
        spriteId: 'edu',
        activeAbilityId: EDU_ABILITY.id,
        passiveAbilityId: EDU_ABILITY.id,
      })
    : structuredClone(unit),
);
export const EDU_COMBAT_PROFILES: Readonly<Record<string, CombatProfile>> = {
  ...P13T_COMBAT_PROFILES,
  edu: CombatProfileSchema.parse({
    ...P13T_COMBAT_PROFILES.edu,
    stats: { ...P13T_COMBAT_PROFILES.edu!.stats, range: 4, maxMana: 80, startingMana: 0 },
    championAbility: EDU_ABILITY,
  }),
};
