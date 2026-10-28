import { TraitDefinitionSchema, type TraitDefinition } from '@tft/shared';
import { TRAIT_DEFINITIONS } from './legacy-traits';
import { FUMON_TRAIT } from './jaramillo';
import { UPM_TRAIT, PREDATOR_TRAIT } from './vargas';
import { RUMAN_TRINITY, PERDIDOS_POR_EL_MUNDO, MANO_DE_OBRA } from './florin';
import { ROSTER_SOURCE, PLAYABLE_ROSTER_IDS } from './roster-source';
/** User-proposed progressions, explicitly separate from the spreadsheet matrix. */
export const ROSTER_THRESHOLDS: Readonly<Record<string, readonly number[]>> = {
  fumon: [2, 4, 6, 8, 10],
  gym: [2, 4, 6, 8],
  ruman_trinity: [2, 3],
  upm: [2, 4, 6, 8, 10],
  pardillo: [2, 4, 6, 8],
  hortaleza: [2, 4, 6, 8, 10],
  rata: [2, 4, 6],
  fantasy: [2, 4, 6, 8],
  perdidos_por_el_mundo: [2, 4, 6, 8],
  pancho: [2, 4, 6, 8],
  valo: [2, 4, 6, 8, 10],
  blackhaus: [2, 4, 6],
  shisheros: [2, 4, 6, 8],
  mus: [2, 4],
  psoe: [2, 4, 6],
  lenceria: [2],
};
const old: Readonly<Record<string, TraitDefinition>> = {
  fumon: FUMON_TRAIT,
  upm: UPM_TRAIT,
  hortaleza: TRAIT_DEFINITIONS.find((t) => t.id === 'hortaleza')!,
  ruman_trinity: RUMAN_TRINITY,
  perdidos_por_el_mundo: PERDIDOS_POR_EL_MUNDO,
  'el-depredador': PREDATOR_TRAIT,
  mano_de_obra: MANO_DE_OBRA,
};
/** Explicit value-preserving migration. No reward is moved by array index. */
export const ROSTER_EFFECT_MIGRATIONS: Readonly<Record<string, Readonly<Record<number, number>>>> =
  {
    fumon: { 2: 2, 4: 3 },
    hortaleza: { 2: 2, 4: 3 },
    perdidos_por_el_mundo: { 2: 2, 4: 3 },
    upm: { 2: 2, 4: 4, 6: 6 },
    ruman_trinity: { 2: 2, 3: 3 },
    'el-depredador': { 1: 1 },
    mano_de_obra: { 1: 1 },
  };
function buildTrait(
  id: string,
  name: string,
  members: string[],
  kind: 'collective' | 'unique',
): TraitDefinition {
  const original = old[id];
  const counts = kind === 'unique' ? [1] : ROSTER_THRESHOLDS[id]!;
  const map = ROSTER_EFFECT_MIGRATIONS[id] ?? {};
  const playable = members.filter((m) =>
    (PLAYABLE_ROSTER_IDS as readonly string[]).includes(m),
  ).length;
  const thresholds = counts.map((count) => {
    const from = map[count],
      reward = original?.thresholds.find((t) => t.count === from);
    const reservation =
      count > 7
        ? 'Reservado: capacidad máxima de equipo 7.'
        : count > members.length
          ? 'Reservado: no hay suficientes miembros asignados.'
          : count > playable
            ? 'Reservado: requiere personajes que todavía están en borrador.'
            : '';
    return {
      count,
      effectState: reward ? 'implemented' : 'pending_effects',
      availability: reservation ? 'reserved' : 'available',
      ...(reservation ? { reservation } : {}),
      ...(reward && from !== count ? { migratedFrom: from } : {}),
      description: reward
        ? reward.description
        : 'Efecto pendiente de diseño. Alcanzar este escalón no concede una recompensa nueva.',
      bonuses: structuredClone(reward?.bonuses ?? []),
      effects: structuredClone(reward?.effects ?? []),
    };
  });
  const rules = original?.progress?.rules.map((rule) => {
    const next = Number(Object.keys(map).find((key) => map[Number(key)] === rule.memberThreshold));
    if (!next) throw Error(`Missing explicit reward mapping ${id}:${rule.memberThreshold}`);
    return {
      ...structuredClone(rule),
      memberThreshold: next,
      ...(id === 'fumon' && next === 2 ? { maximumMembers: 3 } : {}),
    };
  });
  return TraitDefinitionSchema.parse({
    version: 1,
    id,
    name,
    icon: original?.icon ?? id,
    description:
      (
        {
          fumon:
            'Los básicos de sus miembros aplican Humo. Con 2: reduce 8 % la armadura; con 4: reduce 15 % y la primera aplicación causa daño adicional. Escalones superiores pendientes.',
          hortaleza:
            'Sus miembros ganan vida máxima con 2; con 4 también ganan armadura. Escalones superiores pendientes.',
          perdidos_por_el_mundo:
            'Sus miembros ganan vida máxima con 2; con 4 también se curan una vez al bajar del 40 % de vida. Escalones superiores pendientes.',
        } as Record<string, string>
      )[id] ??
      original?.description ??
      `${name}: sin bonificaciones ni mecánicas hasta que se diseñen sus efectos.`,
    visual: original?.visual ?? { tone: kind === 'unique' ? 'amber' : 'jade', provisional: true },
    recipients: 'members',
    stacking: original?.stacking ?? 'highest',
    thresholds,
    ...(original?.progress ? { progress: { ...structuredClone(original.progress), rules } } : {}),
    planning: {
      kind,
      members,
      effectState: !original
        ? 'pending_effects'
        : thresholds.some((t) => t.effectState === 'pending_effects')
          ? 'mixed'
          : 'implemented',
      sourceVersion: ROSTER_SOURCE.version,
    },
  });
}
export const ROSTER_TRAITS: readonly TraitDefinition[] = [
  ...ROSTER_SOURCE.collectives.map((t) => buildTrait(t.id, t.name, t.members, 'collective')),
  ...ROSTER_SOURCE.uniques.map((t) => buildTrait(t.id, t.name, [t.ownerId], 'unique')),
];
