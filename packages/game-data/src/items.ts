import {
  ItemCatalogSchema,
  ItemDropDesignSchema,
  ItemCategorySchema,
  type ItemCatalog,
  type ItemRecipe,
  type ItemBonus,
} from '@tft/shared';
export const componentId = (category: string) => `component-${category}`;
export function recipeKey(a: string, b: string) {
  return [a, b]
    .sort()
    .map((s) => s.replace('component-', ''))
    .join('+');
}
export function validateItemCatalog(value: unknown): ItemCatalog {
  const catalog = ItemCatalogSchema.parse(value);
  const ids = new Set<string>();
  for (const d of catalog.definitions) {
    if (ids.has(d.id)) throw Error('Duplicate item definition');
    ids.add(d.id);
  }
  const components = catalog.definitions.filter((d) => d.kind === 'component');
  if (components.length !== 8 || new Set(components.map((c) => c.category)).size !== 8)
    throw Error('Eight component categories required');
  const keys = new Set<string>();
  for (const recipe of catalog.recipes) {
    const [a, b] = recipe.components;
    if (!components.some((c) => c.id === a) || !components.some((c) => c.id === b))
      throw Error('Unknown recipe component');
    const key = recipeKey(a, b);
    if (keys.has(key) || recipe.id !== key || a > b)
      throw Error('Duplicate or noncanonical recipe');
    keys.add(key);
    if (recipe.resultId) {
      const result = catalog.definitions.find((d) => d.id === recipe.resultId);
      if (result?.kind !== 'completed' || recipeKey(...result.recipe) !== key)
        throw Error('Recipe result mismatch');
    }
  }
  for (const d of catalog.definitions)
    if (
      d.kind === 'completed' &&
      !catalog.recipes.some((r) => r.resultId === d.id && r.id === recipeKey(...d.recipe))
    )
      throw Error('Unregistered item recipe');
  return catalog;
}
const categories = ItemCategorySchema.options;
const components = categories.map((category) => ({
  id: componentId(category),
  kind: 'component' as const,
  category,
  version: 1 as const,
  icon: `item-${category}`,
  availability: 'available' as const,
  scope: 'competitive' as const,
  bonuses: [],
}));
const recipes: ItemRecipe[] = components.flatMap((a, i) =>
  components.slice(i).map((b) => ({
    id: recipeKey(a.id, b.id),
    components: [a.id, b.id].sort() as [string, string],
    resultId: null,
  })),
);
export const ITEM_CATALOG = validateItemCatalog({
  version: 'f0p8a-1',
  definitions: components,
  recipes,
  policy: {
    componentCapacity: 16,
    completedCapacity: 16,
    slots: 3,
    unequip: 'forbidden',
    componentEquipment: 'auto-combine',
  },
});
export const ITEM_DROP_DESIGN = ItemDropDesignSchema.parse({
  version: 1,
  enabled: false,
  everyRounds: 3,
  quantity: [
    { count: 2, weight: 50 },
    { count: 3, weight: 50 },
  ],
  quantityScope: 'round-alive-players',
  typesScope: 'independent-per-player',
  authority: 'server',
  delivery: 'inventory',
  rng: 'seeded',
  deduplication: 'match-round-player',
});
const statNames: Record<string, string> = {
  attack: 'AD',
  attackSpeedMilli: 'velocidad de ataque',
  abilityPower: 'AP',
  armor: 'armadura',
  magicResist: 'resistencia mágica',
  maxHp: 'vida',
  critChanceMilli: 'probabilidad de crítico',
  critMultiplierMilli: 'daño crítico',
};
export function itemBonusDescription(bonuses: readonly ItemBonus[]) {
  return bonuses.length
    ? bonuses
        .map((b) => {
          const probability = ['critChanceMilli', 'critMultiplierMilli'].includes(b.stat);
          const value =
            b.mode === 'percent_milli' || probability
              ? b.amount / 10
              : b.stat === 'attackSpeedMilli'
                ? b.amount / 1000
                : b.amount;
          const suffix =
            b.mode === 'percent_milli' || probability
              ? ' %'
              : b.stat === 'attackSpeedMilli'
                ? ' ataques/s'
                : '';
          return `+${value}${suffix} ${statNames[b.stat]}`;
        })
        .join(' · ')
    : 'Valores estadísticos pendientes de balance.';
}
