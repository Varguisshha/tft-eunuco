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
export const getTraitDefinition = (id: string) => TRAIT_DEFINITIONS.find((t) => t.id === id);

/** Legacy display bridge. New characters author ChampionAbility directly. */
export function abilityPresentation(profile: import('@tft/shared').CombatProfile) {
  if (profile.championAbility) return profile.championAbility;
  if (!profile.ability && !profile.passive) return null;
  const powerText = (e: import('@tft/shared').CombatEffect) => {
    if (!('amount' in e)) return '';
    const star = (profile.starLevel ?? 1) - 1;
    const base = 'amountByStars' in e && e.amountByStars ? e.amountByStars[star]! : e.amount;
    if (!('powerScaling' in e) || !e.powerScaling) return String(base);
    const coefficient = (v: number | [number, number, number]) =>
      typeof v === 'number' ? v : v[star]!;
    const ad = coefficient(e.powerScaling.adRatioMilli),
      ap = coefficient(e.powerScaling.apRatioMilli);
    return [
      String(base),
      ...(ad ? [`${ad / 10}% AD`] : []),
      ...(ap ? [`${ap / 10}% AP`] : []),
    ].join(' + ');
  };
  const describe = (effects: import('@tft/shared').CombatEffect[]) =>
    effects
      .map((e) => {
        switch (e.kind) {
          case 'damage':
            return `Inflige ${powerText(e)} de daño ${e.damageType === 'physical' ? 'físico' : e.damageType === 'magic' ? 'mágico' : 'verdadero'}.`;
          case 'heal':
            return `Restaura ${powerText(e)} de vida.`;
          case 'shield':
            return `Otorga ${powerText(e)} de escudo durante ${e.duration / 10} s.`;
          case 'stun':
            return `Aturde durante ${e.duration / 10} s.`;
          case 'modifier':
            return `Modifica ${{ maxHp: 'vida máxima', attack: 'ataque', armor: 'armadura', magicResist: 'resistencia mágica', attackSpeedMilli: 'velocidad de ataque', abilityPower: 'AP', critChanceMilli: 'probabilidad crítica', critMultiplierMilli: 'multiplicador crítico' }[e.stat]} en ${e.mode === 'percent_milli' ? `${e.amount / 10}% de la base` : e.amount} durante ${e.duration === null ? 'todo el combate' : `${e.duration / 10} s`}.`;
        }
      })
      .join(' ');
  const active = profile.ability
    ? {
        ...profile.ability,
        name: profile.ability.name,
        description: describe(profile.ability.effects),
      }
    : null;
  const passive = profile.passive
    ? {
        name: 'Pasiva de prueba',
        description: `Al comenzar el combate: ${describe(profile.passive.effects)}`,
      }
    : null;
  return {
    id: profile.ability?.id ?? profile.passive!.id,
    name: profile.ability?.name ?? 'Habilidad de prueba',
    icon: 'ability-placeholder',
    type: active && passive ? 'mixed' : active ? 'active' : 'passive',
    description: 'Habilidad provisional de la unidad de referencia.',
    active,
    passive,
  };
}
