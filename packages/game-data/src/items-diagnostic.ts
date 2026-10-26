/** Technical fixtures, never returned by ITEM_CATALOG and never usable in normal matches. */
import { ITEM_CATALOG, recipeKey, validateItemCatalog } from './items';
const items = [
  {
    id: 'diagnostic-double-ad',
    recipe: ['component-ad', 'component-ad'],
    bonuses: [{ stat: 'attack', mode: 'flat', amount: 20 }],
    stacking: 'stack',
  },
  {
    id: 'diagnostic-ad-speed',
    recipe: ['component-ad', 'component-attack_speed'],
    bonuses: [
      { stat: 'attack', mode: 'flat', amount: 12 },
      { stat: 'attackSpeedMilli', mode: 'percent_milli', amount: 150 },
    ],
    stacking: 'unique',
  },
].map((d) => ({
  ...d,
  kind: 'completed',
  version: 1,
  icon: 'item-technical',
  availability: 'available',
  scope: 'diagnostic',
  effects: [],
  restrictions: { minimumStars: 1, excludedDefinitions: [] },
  visual: { tone: 'violet', rarity: 'technical' },
}));
export const DIAGNOSTIC_ITEM_CATALOG = validateItemCatalog({
  ...ITEM_CATALOG,
  version: 'f0p8a-diagnostic-1',
  definitions: [...ITEM_CATALOG.definitions, ...items],
  recipes: ITEM_CATALOG.recipes.map((r) => ({
    ...r,
    resultId: items.find((d) => recipeKey(...(d.recipe as [string, string])) === r.id)?.id ?? null,
  })),
  policy: { ...ITEM_CATALOG.policy, unequip: 'allowed' },
});
