import { CharacterRecordSchema, type CharacterRecord, type UnitDefinition } from '@tft/shared';
import { FLORIN_ROSTER } from './legacy-rosters';
import { FLORIN_COMBAT_PROFILES } from './combat';
import { ROSTER_SOURCE, PLAYABLE_ROSTER_IDS } from './roster-source';
/** The competitive catalog contains only complete, existing original characters. */
export const ROSTER_PLAYABLE: readonly UnitDefinition[] = ROSTER_SOURCE.characters.flatMap(
  (record) => {
    if (!(PLAYABLE_ROSTER_IDS as readonly string[]).includes(record.id)) return [];
    const old = FLORIN_ROSTER.find((d) => d.id === record.id)!;
    return [{ ...old, name: record.name, synergies: [...record.synergies] }];
  },
);
export const CHARACTER_REGISTRY: readonly CharacterRecord[] = ROSTER_SOURCE.characters.map(
  (record) => {
    const playable = ROSTER_PLAYABLE.find((d) => d.id === record.id);
    const profile = FLORIN_COMBAT_PROFILES[record.id];
    return CharacterRecordSchema.parse(
      playable
        ? {
            ...record,
            status: 'playable',
            cost: playable.cost,
            role: playable.role,
            range: profile!.stats.range,
            stats: profile!.stats,
            activeAbilityId: playable.activeAbilityId,
            passiveAbilityId: playable.passiveAbilityId,
            spriteId: playable.spriteId,
          }
        : {
            ...record,
            status: 'draft',
            cost: null,
            role: null,
            range: null,
            stats: null,
            activeAbilityId: null,
            passiveAbilityId: null,
            spriteId: null,
            splashArt: null,
          },
    );
  },
);
export const characterRecord = (id: string) => CHARACTER_REGISTRY.find((c) => c.id === id);
