import { P11H_ITEM_CATALOG } from './items-p11h';
import { TFT185_ITEM_CATALOG } from './items-tft185';
import { DROP_ITEM_CATALOG } from './items-drops';
import { EXECUTABLE_ITEM_CATALOG } from './items-executable';
import type { ItemCatalog } from '@tft/shared';
import { ITEM_CATALOG } from './items';
import { DIAGNOSTIC_ITEM_CATALOG } from './items-diagnostic';
import { STANDARD_ITEM_CATALOG, STANDARD_LAB_ITEM_CATALOG } from './items-standard';
const registry: Readonly<Record<string, ItemCatalog>> = {
  [P11H_ITEM_CATALOG.version]: P11H_ITEM_CATALOG,
  [TFT185_ITEM_CATALOG.version]: TFT185_ITEM_CATALOG,
  [DROP_ITEM_CATALOG.version]: DROP_ITEM_CATALOG,
  [ITEM_CATALOG.version]: ITEM_CATALOG,
  [EXECUTABLE_ITEM_CATALOG.version]: EXECUTABLE_ITEM_CATALOG,
  [DIAGNOSTIC_ITEM_CATALOG.version]: DIAGNOSTIC_ITEM_CATALOG,
  [STANDARD_ITEM_CATALOG.version]: STANDARD_ITEM_CATALOG,
  [STANDARD_LAB_ITEM_CATALOG.version]: STANDARD_LAB_ITEM_CATALOG,
};
export function resolveItemCatalog(version: string): ItemCatalog {
  const catalog = Object.hasOwn(registry, version) ? registry[version] : undefined;
  if (!catalog) throw Error('Unknown item catalog version');
  return catalog;
}
export function itemCatalogFamily(version: string) {
  resolveItemCatalog(version);
  if (version === P11H_ITEM_CATALOG.version || version === TFT185_ITEM_CATALOG.version)
    return version;
  if (version === DROP_ITEM_CATALOG.version || version === EXECUTABLE_ITEM_CATALOG.version)
    return version;
  return version.startsWith('f0p8a-') ? ITEM_CATALOG.version : STANDARD_ITEM_CATALOG.version;
}
