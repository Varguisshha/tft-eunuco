import { isP11Catalog } from '@tft/shared';
import { FLORIN_TRAITS } from './florin';
import { FUMON_TRAIT } from './jaramillo';
import { UPM_TRAIT, PREDATOR_TRAIT } from './vargas';
import { TRAIT_DEFINITIONS } from './legacy-traits';
import { P11_TRAITS } from './p11-traits';
import { ROSTER_TRAITS } from './roster-traits';
export { DOLEA_ABILITY, TRAIT_DEFINITIONS } from './legacy-traits';
export const VARGAS_TRAITS = [...TRAIT_DEFINITIONS, UPM_TRAIT, PREDATOR_TRAIT];
export const JARAMILLO_TRAITS = [...VARGAS_TRAITS, FUMON_TRAIT];
export const traitsFor = (catalog: string | undefined) =>
  isP11Catalog(catalog)
    ? P11_TRAITS
    : catalog === 'f0p10a-1'
      ? ROSTER_TRAITS
      : catalog === 'florin-1' || catalog === 'f0p8d-florin-1'
        ? [...JARAMILLO_TRAITS, ...FLORIN_TRAITS]
        : catalog === 'f0p6c'
          ? JARAMILLO_TRAITS
          : catalog === 'f0p6b3'
            ? VARGAS_TRAITS
            : TRAIT_DEFINITIONS;
export const getTraitDefinition = (id: string, catalog?: string) =>
  (isP11Catalog(catalog)
    ? P11_TRAITS
    : catalog === 'f0p10a-1'
      ? ROSTER_TRAITS
      : [...JARAMILLO_TRAITS, ...FLORIN_TRAITS]
  ).find((t) => t.id === id);

/** Legacy display bridge. New characters author ChampionAbility directly. */
export function abilityPresentation(profile: import('@tft/shared').CombatProfile) {
  if (profile.championAbility) {
    const ability = profile.championAbility;
    const name = ability.active?.namesByStars?.[(profile.starLevel ?? 1) - 1];
    return name ? { ...ability, name, active: { ...ability.active!, name } } : ability;
  }
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
            return `Modifica ${{ maxHp: 'vida máxima', attack: 'ataque', armor: 'armadura', magicResist: 'resistencia mágica', attackSpeedMilli: 'velocidad de ataque', abilityPower: 'AP', critChanceMilli: 'probabilidad crítica', critMultiplierMilli: 'multiplicador crítico', moveSpeedMilli: 'velocidad de movimiento', manaRegenMilli: 'regeneración de maná (milésimas/s)' }[e.stat]} en ${e.mode === 'percent_milli' ? `${e.amount / 10}% de la base` : e.amount} durante ${e.duration === null ? 'todo el combate' : `${e.duration / 10} s`}.`;
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
