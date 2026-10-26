import {
  ITEM_CATALOG,
  resolveItemCatalog,
  itemCatalogFamily,
  recipeKey,
  itemDescription,
} from '@tft/game-data';
import {
  PlayerItemStateSchema,
  ItemPresentationSchema,
  type ItemCatalog,
  type ItemInstance,
  type MatchState,
  type OwnedUnit,
  type ItemCommand,
  type PlayerItemState,
} from '@tft/shared';
export type ItemError =
  | 'items-disabled'
  | 'missing-item'
  | 'item-owner'
  | 'item-capacity'
  | 'item-unavailable'
  | 'recipe-unavailable'
  | 'invalid-recipe'
  | 'item-slots-full'
  | 'unequip-forbidden'
  | 'item-restricted'
  | 'item-request-conflict'
  | 'invalid-item-location';
export class ItemRuleError extends Error {
  constructor(readonly code: ItemError) {
    super(code);
  }
}
function fail(code: ItemError): never {
  throw new ItemRuleError(code);
}
export function localItemOwner(seed: number) {
  return `00000000-0000-4000-8000-${seed.toString(16).padStart(12, '0')}`;
}
export function createItemInventory(
  ownerId: string,
  catalogVersion: ItemCatalog['version'] = ITEM_CATALOG.version,
): PlayerItemState {
  return PlayerItemStateSchema.parse({
    version: 1,
    catalogVersion,
    ownerId,
    nextInstance: 0,
    components: [],
    completed: [],
    pending: [],
    retired: [],
    grants: [],
    crafts: [],
    distributions: [],
  });
}
export function itemCatalogFor(state: MatchState): ItemCatalog {
  if (!state.config.itemCatalog || !state.items) return fail('items-disabled');
  if (itemCatalogFamily(state.items.catalogVersion) !== state.config.itemCatalog)
    return fail('item-unavailable');
  const catalog = resolveItemCatalog(state.items.catalogVersion);
  if (catalog.version !== state.config.itemCatalog && !state.development)
    return fail('item-unavailable');
  return catalog;
}
export function itemDefinition(state: MatchState, id: string) {
  const d = itemCatalogFor(state).definitions.find((d) => d.id === id);
  if (!d || d.availability !== 'available' || (d.scope === 'diagnostic' && !state.development))
    return fail('item-unavailable');
  return d;
}
export function allItemInstances(state: MatchState) {
  return [
    ...(state.items?.components ?? []),
    ...(state.items?.completed ?? []),
    ...(state.items?.pending ?? []),
    ...state.units.flatMap((u) => u.equipment ?? []),
  ];
}
/** Semantic boundary, invoked on loads and before/after every authority command. */
export function validateItemState(state: MatchState) {
  if (!state.items) {
    if (state.config.itemCatalog || state.units.some((u) => u.equipment !== undefined))
      throw Error('Missing versioned item inventory');
    return;
  }
  if (!state.config.itemCatalog) throw Error('Item inventory in historical match');
  const catalog = itemCatalogFor(state),
    inv = state.items,
    seen = new Set<string>();
  if (
    inv.components.length > catalog.policy.componentCapacity ||
    inv.completed.length > catalog.policy.completedCapacity
  )
    throw Error('Item bag capacity');
  const instances = allItemInstances(state);
  if (inv.distributions.length) throw Error('Automatic item drops are disabled in P8A');
  if (
    instances.length > 4096 ||
    new Set(inv.grants.map((g) => g.id)).size !== inv.grants.length ||
    new Set(inv.distributions.map((g) => g.id)).size !== inv.distributions.length
  )
    throw Error('Item storage or ledger capacity');
  const issued = new Map<string, ItemInstance>(),
    consumed = new Set<string>();
  for (const grant of inv.grants) {
    if (JSON.stringify(grant.instances.map((i) => i.definitionId)) !== grant.fingerprint)
      throw Error('Item grant fingerprint');
    for (const item of grant.instances) {
      if (item.origin.kind !== 'grant' || item.origin.grantId !== grant.id || issued.has(item.id))
        throw Error('Item grant journal');
      issued.set(item.id, item);
    }
  }
  for (const item of inv.crafts) {
    if (item.origin.kind !== 'recipe' || issued.has(item.id) || item.kind !== 'completed')
      throw Error('Item craft journal');
    const origin = item.origin;
    const recipe = catalog.recipes.find((r) => r.id === origin.recipeId);
    const sources = item.origin.consumed.map((id) => issued.get(id));
    if (
      !recipe ||
      recipe.resultId !== item.definitionId ||
      sources.some((i) => !i || i.kind !== 'component') ||
      recipeKey(sources[0]!.definitionId, sources[1]!.definitionId) !== recipe.id
    )
      throw Error('Item craft lineage');
    for (const id of item.origin.consumed) {
      if (consumed.has(id)) throw Error('Component consumed twice');
      consumed.add(id);
    }
    issued.set(item.id, item);
  }
  for (const id of inv.retired) {
    if (!state.development || !issued.has(id) || consumed.has(id))
      throw Error('Invalid retired item');
    consumed.add(id);
  }
  for (const item of issued.values()) {
    const d = itemDefinition(state, item.definitionId),
      prefix = `${inv.ownerId}/item/`,
      sequence = Number(item.id.slice(prefix.length));
    if (
      item.ownerId !== inv.ownerId ||
      d.kind !== item.kind ||
      d.version !== item.definitionVersion ||
      !item.id.startsWith(prefix) ||
      !Number.isSafeInteger(sequence) ||
      sequence < 0 ||
      String(sequence) !== item.id.slice(prefix.length) ||
      sequence >= inv.nextInstance
    )
      throw Error('Item identity, owner or sequence');
  }
  if (issued.size !== inv.nextInstance) throw Error('Item issuance conservation');
  for (const item of instances) {
    if (
      seen.has(item.id) ||
      consumed.has(item.id) ||
      JSON.stringify(issued.get(item.id)) !== JSON.stringify(item)
    )
      throw Error('Item location or duplication');
    seen.add(item.id);
  }
  if (instances.length !== issued.size - consumed.size) throw Error('Item conservation');
  if (
    inv.components.some((i) => i.kind !== 'component') ||
    inv.completed.some((i) => i.kind !== 'completed')
  )
    throw Error('Wrong inventory partition');
  for (const unit of state.units) {
    const equipment = unit.equipment ?? [];
    if (
      equipmentSlots(state, equipment) > 3 ||
      equipment.filter((i) => i.kind === 'component').length > 1
    )
      throw Error('Equipment slots');
    for (const item of equipment)
      if (
        !canEquipDefinition(
          state,
          unit,
          item,
          equipment.filter((i) => i !== item),
        )
      )
        throw Error('Equipment restriction');
  }
}
function equipmentSlots(state: MatchState, items: ItemInstance[]) {
  return items.reduce(
    (n, i) => n + (itemDefinition(state, i.definitionId).content?.slotCost ?? 1),
    0,
  );
}
function canEquipDefinition(
  state: MatchState,
  unit: OwnedUnit,
  item: ItemInstance,
  other: ItemInstance[],
) {
  const def = itemDefinition(state, item.definitionId);
  if (equipmentSlots(state, other) + (def.content?.slotCost ?? 1) > 3) return false;
  return (
    def.kind === 'component' ||
    (unit.stars >= def.restrictions.minimumStars &&
      !def.restrictions.excludedDefinitions.includes(unit.definitionId) &&
      (def.stacking !== 'unique' || !other.some((i) => i.definitionId === def.id)))
  );
}
function newInstance(
  state: MatchState,
  definitionId: string,
  origin: ItemInstance['origin'],
): ItemInstance {
  const inv = state.items!,
    d = itemDefinition(state, definitionId);
  return {
    id: `${inv.ownerId}/item/${inv.nextInstance++}`,
    ownerId: inv.ownerId,
    definitionId: d.id,
    definitionVersion: d.version,
    kind: d.kind,
    origin,
  };
}
function bag(inv: PlayerItemState, item: ItemInstance) {
  return item.kind === 'component' ? inv.components : inv.completed;
}
function capacity(catalog: ItemCatalog, item: ItemInstance) {
  return item.kind === 'component'
    ? catalog.policy.componentCapacity
    : catalog.policy.completedCapacity;
}
export function returnItem(state: MatchState, item: ItemInstance) {
  const inv = state.items!,
    target = bag(inv, item);
  if (target.length < capacity(itemCatalogFor(state), item)) target.push(item);
  else inv.pending.push(item);
}
/** Authority/DEV capability only; there is deliberately no network grant command. */
export function grantItemInstances(
  state: MatchState,
  grantId: string,
  definitionIds: readonly string[],
) {
  if (!state.items) return fail('items-disabled');
  if (!grantId || grantId.length > 80 || !definitionIds.length || definitionIds.length > 32)
    return fail('item-unavailable');
  const fingerprint = JSON.stringify(definitionIds),
    prior = state.items.grants.find((g) => g.id === grantId);
  if (prior) {
    if (prior.fingerprint !== fingerprint) fail('item-request-conflict');
    return;
  }
  if (
    state.items.grants.length >= 2048 ||
    allItemInstances(state).length + definitionIds.length > 4096
  )
    return fail('item-capacity');
  for (const id of definitionIds) itemDefinition(state, id);
  const instances = definitionIds.map((id) => newInstance(state, id, { kind: 'grant', grantId }));
  state.items.grants.push({ id: grantId, fingerprint, instances: structuredClone(instances) });
  for (const item of instances) returnItem(state, item);
}
export function returnUnitItems(state: MatchState, unit: OwnedUnit) {
  if (!unit.equipment) return;
  const items = unit.equipment;
  delete unit.equipment;
  for (const item of items) returnItem(state, item);
}
/** Existing survivor order is authoritative; overflow and uniqueness conflicts return to owner. */
export function mergeEquipment(state: MatchState, survivor: OwnedUnit, candidates: OwnedUnit[]) {
  if (!state.items) return;
  const items = candidates.flatMap((u) => u.equipment ?? []);
  for (const unit of candidates) delete unit.equipment;
  const kept: ItemInstance[] = [];
  for (const item of items) {
    if (
      kept.length < 3 &&
      !(item.kind === 'component' && kept.some((i) => i.kind === 'component')) &&
      canEquipDefinition(state, survivor, item, kept)
    )
      kept.push(item);
    else returnItem(state, item);
  }
  if (kept.length) survivor.equipment = kept;
}
function craft(state: MatchState, a: ItemInstance, b: ItemInstance) {
  if (a.id === b.id || a.kind !== 'component' || b.kind !== 'component')
    return fail('invalid-recipe');
  const recipe = itemCatalogFor(state).recipes.find(
    (r) => r.id === recipeKey(a.definitionId, b.definitionId),
  );
  if (!recipe?.resultId) return fail('recipe-unavailable');
  if (state.items!.crafts.length >= 4096) return fail('item-capacity');
  const result = newInstance(state, recipe.resultId, {
    kind: 'recipe',
    recipeId: recipe.id,
    consumed: [a.id, b.id].sort() as [string, string],
  });
  state.items!.crafts.push(structuredClone(result));
  return result;
}
export function inspectItem(state: MatchState, itemId: string) {
  const item = allItemInstances(state).find((i) => i.id === itemId);
  if (!item) return fail('missing-item');
  if (item.ownerId !== state.items?.ownerId) return fail('item-owner');
  const d = itemDefinition(state, item.definitionId),
    recipe = itemCatalogFor(state).recipes.find((r) => r.resultId === d.id) ?? null;
  return ItemPresentationSchema.parse({
    instance: item,
    icon: d.icon,
    description: itemDescription(d),
    bonuses: d.bonuses,
    recipe,
    location: state.items.pending.some((i) => i.id === itemId)
      ? 'pending'
      : state.units.some((u) => u.equipment?.some((i) => i.id === itemId))
        ? 'equipped'
        : 'inventory',
  });
}
/** Mutates only the private candidate already cloned by applyMatchAction. */
export function applyItemCommand(state: MatchState, action: ItemCommand) {
  const catalog = itemCatalogFor(state),
    inv = state.items!;
  if (action.type === 'inspect_item') {
    inspectItem(state, action.itemId);
    return;
  }
  if (action.type === 'combine_components') {
    const a = inv.components.find((i) => i.id === action.firstId),
      b = inv.components.find((i) => i.id === action.secondId);
    if (!a || !b) return fail('missing-item');
    const result = craft(state, a, b);
    inv.components = inv.components.filter((i) => i.id !== a.id && i.id !== b.id);
    returnItem(state, result);
    return;
  }
  if (action.type === 'move_item') {
    const pending = inv.pending.find((i) => i.id === action.itemId);
    const item =
      pending ?? [...inv.components, ...inv.completed].find((i) => i.id === action.itemId);
    if (!item) return fail('missing-item');
    const target = bag(inv, item),
      index = target.findIndex((i) => i.id === item.id);
    if (action.toIndex > target.length - (index >= 0 ? 1 : 0)) return fail('invalid-item-location');
    if (pending) {
      if (target.length >= capacity(catalog, item)) return fail('item-capacity');
      inv.pending = inv.pending.filter((i) => i.id !== item.id);
    } else target.splice(index, 1);
    target.splice(action.toIndex, 0, item);
    return;
  }
  const unit = state.units.find((u) => u.id === action.unitId);
  if (!unit) return fail('item-owner');
  if (action.type === 'unequip_item') {
    if (catalog.policy.unequip !== 'allowed') return fail('unequip-forbidden');
    const item = unit.equipment?.find((i) => i.id === action.itemId);
    if (!item) return fail('missing-item');
    unit.equipment = unit.equipment!.filter((i) => i.id !== item.id);
    returnItem(state, item);
    return;
  }
  const item = [...inv.components, ...inv.completed].find((i) => i.id === action.itemId);
  if (!item) return fail('missing-item');
  if (item.ownerId !== inv.ownerId) return fail('item-owner');
  const equipment = unit.equipment ?? [];
  const component =
    item.kind === 'component' ? equipment.find((i) => i.kind === 'component') : undefined;
  const equipped = component ? craft(state, component, item) : item;
  const remaining = equipment.filter((i) => i !== component);
  if (equipmentSlots(state, remaining) + equipmentSlots(state, [equipped]) > catalog.policy.slots)
    return fail('item-slots-full');
  if (!canEquipDefinition(state, unit, equipped, remaining)) return fail('item-restricted');
  const source = bag(inv, item);
  source.splice(
    source.findIndex((i) => i.id === item.id),
    1,
  );
  unit.equipment = component
    ? equipment.map((i) => (i === component ? equipped : i))
    : [...remaining, equipped];
}
