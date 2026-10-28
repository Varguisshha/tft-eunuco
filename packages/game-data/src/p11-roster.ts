import {
  CombatProfileSchema,
  UnitDefinitionSchema,
  type CombatProfile,
  type UnitDefinition,
} from '@tft/shared';
import { ROSTER_SOURCE } from './roster-source';
import { FLORIN_ROSTER } from './legacy-rosters';
import { ROSTER_COMBAT_PROFILES } from './combat';
import provisional from './p11-provisional.json';
export const P11_PROVISIONAL = provisional;
export const P11_ROSTER: readonly UnitDefinition[] = ROSTER_SOURCE.characters.map((record) => {
  const original = FLORIN_ROSTER.find((u) => u.id === record.id);
  const temporary = provisional.characters.find((u) => u.id === record.id);
  if (!original && !temporary)
    throw Error(`Missing individual provisional parameters: ${record.id}`);
  return UnitDefinitionSchema.parse(
    original
      ? { ...original, name: record.name, synergies: record.synergies }
      : {
          id: record.id,
          name: record.name,
          synergies: record.synergies,
          cost: temporary!.cost,
          role: temporary!.role,
          activeAbilityId: null,
          passiveAbilityId: null,
          spriteId: `provisional-${record.id}`,
          provisional: true,
        },
  );
});
export const P11_COMBAT_PROFILES: Readonly<Record<string, CombatProfile>> = Object.fromEntries(
  P11_ROSTER.map((unit) => {
    const original = ROSTER_COMBAT_PROFILES[unit.id];
    const temporary = provisional.characters.find((u) => u.id === unit.id);
    return [
      unit.id,
      CombatProfileSchema.parse(
        original ?? {
          stats: temporary!.stats,
          traits: unit.synergies,
          ability: null,
          passive: null,
        },
      ),
    ];
  }),
);
