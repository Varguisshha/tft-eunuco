import type { ItemCatalog } from '@tft/shared';
import { ITEM_CATALOG } from './items';
import { DIAGNOSTIC_ITEM_CATALOG } from './items-diagnostic';
import { STANDARD_ITEM_CATALOG, STANDARD_LAB_ITEM_CATALOG } from './items-standard';
const registry: Readonly<Record<string, ItemCatalog>> = {
  [ITEM_CATALOG.version]: ITEM_CATALOG,
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
  return version.startsWith('f0p8a-') ? ITEM_CATALOG.version : STANDARD_ITEM_CATALOG.version;
}
