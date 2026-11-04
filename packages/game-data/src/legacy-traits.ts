import { TraitDefinitionSchema, type TraitDefinition } from '@tft/shared';
// Historical imports keep the same definition and serialized contract.
export { DOLEA_ABILITY } from './champions/dolea';

export const TRAIT_DEFINITIONS: readonly TraitDefinition[] = [
  TraitDefinitionSchema.parse({
    id: 'hortaleza',
    name: 'HORTALEZA',
    description: 'La fortaleza del barrio. Sus miembros aguantan juntos la primera línea.',
    icon: 'hortaleza',
    version: 1,
    visual: { tone: 'jade', provisional: true },
    recipients: 'members',
    stacking: 'highest',
    thresholds: [
      {
        count: 2,
        description: '+100 de vida máxima para Hortaleza.',
        bonuses: [{ stat: 'maxHp', mode: 'flat', amount: 100 }],
        effects: [],
      },
      {
        count: 3,
        description: '+220 de vida máxima y +15 de armadura para Hortaleza.',
        bonuses: [
          { stat: 'maxHp', mode: 'flat', amount: 220 },
          { stat: 'armor', mode: 'flat', amount: 15 },
        ],
        effects: [],
      },
    ],
  }),
  TraitDefinitionSchema.parse({
    id: 'llama-de-padel',
    name: 'LLAMA DE PÁDEL',
    description: 'Cada intercambio enciende el siguiente golpe. Sus miembros atacan con más ritmo.',
    icon: 'llama-de-padel',
    version: 1,
    visual: { tone: 'amber', provisional: true },
    recipients: 'members',
    stacking: 'highest',
    thresholds: [
      {
        count: 2,
        description: '+12 % de velocidad de ataque para Llama de Pádel.',
        bonuses: [{ stat: 'attackSpeedMilli', mode: 'percent_milli', amount: 120 }],
        effects: [],
      },
      {
        count: 3,
        description: '+25 % de velocidad de ataque para Llama de Pádel.',
        bonuses: [{ stat: 'attackSpeedMilli', mode: 'percent_milli', amount: 250 }],
        effects: [],
      },
    ],
  }),
];
