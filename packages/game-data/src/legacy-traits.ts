import { ChampionAbilitySchema, TraitDefinitionSchema, type TraitDefinition } from '@tft/shared';
export const DOLEA_ABILITY = ChampionAbilitySchema.parse({
  id: 'volumen-sucio',
  name: 'VOLUMEN SUCIO',
  icon: 'volumen-sucio',
  type: 'mixed',
  version: 1,
  description: 'Aguante y fuerza: un escudo de emergencia y un golpe que refuerza su defensa.',
  passive: {
    name: 'Volumen eterno',
    description:
      'La primera vez que DOLEA baja del 50 % de vida durante el combate, obtiene un escudo equivalente al 12 % de su vida máxima. Dura hasta el final del combate.',
    rules: [
      {
        id: 'volumen-eterno',
        trigger: { kind: 'hp_crossed', thresholdMilli: 500 },
        conditions: [],
        maxActivations: 1,
        cooldownTicks: 0,
        effects: [
          {
            kind: 'shield',
            target: 'self',
            radius: 0,
            amount: 0,
            scaling: { stat: 'maxHp', basis: 'source', ratioMilli: 120 },
            starScaling: 'flat',
            duration: 450,
          },
        ],
      },
    ],
  },
  active: {
    name: 'Press de banca',
    description:
      'Con 70 de maná, inflige 100 / 180 / 324 de daño físico (1★ / 2★ / 3★) a los enemigos adyacentes. Gana +20 de armadura durante 4 s; se renueva sin acumularse.',
    manaCost: 70,
    initialMana: 0,
    castTicks: 3,
    targeting: 'adjacent_enemies',
    conditions: [],
    animation: 'ability',
    manaConsumption: 'on_start',
    priority: 'before_attack',
    interrupts: 'stun_or_death',
    effects: [
      {
        kind: 'damage',
        target: 'enemies',
        center: 'source',
        radius: 1,
        amount: 100,
        damageType: 'physical',
        starScaling: 'stat',
      },
      {
        kind: 'modifier',
        target: 'self',
        radius: 0,
        stat: 'armor',
        amount: 20,
        duration: 40,
        starScaling: 'flat',
        stacking: 'refresh',
        key: 'press-armor',
      },
    ],
  },
});
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
