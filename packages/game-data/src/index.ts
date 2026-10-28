export * from './character-presentation';
import { isP11Catalog } from '@tft/shared';
import type { UnitDefinition } from '@tft/shared';
import {
  UNIT_DEFINITIONS,
  CATALOG_F0P41,
  CHARACTER_ROSTER,
  VARGAS_ROSTER,
  JARAMILLO_ROSTER,
  FLORIN_ROSTER,
} from './legacy-rosters';
import { P11_ROSTER } from './p11-roster';
export * from './p11-roster';
export * from './p11-traits';
import { ROSTER_PLAYABLE } from './roster';
export * from './legacy-rosters';
export * from './roster';
export * from './roster-traits';
export * from './roster-source';
export function matchCatalog(config: {
  catalog?:
    | 'f0p4.1'
    | 'f0p6a'
    | 'f0p6b1'
    | 'f0p6b2'
    | 'f0p6b3'
    | 'f0p6c'
    | 'florin-1'
    | 'f0p8d-florin-1'
    | 'f0p11a-1'
    | 'f0p11b-1'
    | 'f0p11c-1'
    | 'f0p11g-1'
    | 'f0p11h-1'
    | 'f0p10a-1'
    | undefined;
}): readonly UnitDefinition[] {
  if (isP11Catalog(config.catalog)) return P11_ROSTER;
  if (config.catalog === 'f0p10a-1') return ROSTER_PLAYABLE;
  if (config.catalog === 'florin-1' || config.catalog === 'f0p8d-florin-1') return FLORIN_ROSTER;
  if (config.catalog === 'f0p6c') return JARAMILLO_ROSTER;
  if (config.catalog === 'f0p6b3') return VARGAS_ROSTER;
  if (config.catalog === 'f0p6a' || config.catalog === 'f0p6b1' || config.catalog === 'f0p6b2')
    return CHARACTER_ROSTER;
  return config.catalog === 'f0p4.1' ? CATALOG_F0P41 : UNIT_DEFINITIONS;
}
export function getUnitDefinition(id: string): UnitDefinition | undefined {
  return FLORIN_ROSTER.find((unit) => unit.id === id) ?? P11_ROSTER.find((unit) => unit.id === id);
}
export * from './combat';
export * from './economy';

export * from './combatScenarios';

export * from './abilities';
export * from './statsScenarios';
export * from './mechanicsScenarios';

export * from './vargas';
export * from './vargasScenarios';

export * from './jaramillo';
export * from './items';
export { DIAGNOSTIC_ITEM_CATALOG } from './items-diagnostic';

export * from './items-standard';
export * from './item-catalogs';

export * from './item-description';

export * from './items-executable';

export * from './items-drops';

export * from './florin';

export * from './items-tft185';

export * from './shop-odds';

export * from './items-p11h';

export * from './item-presentation';
