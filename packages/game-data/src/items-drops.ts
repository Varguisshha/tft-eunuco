import { EXECUTABLE_ITEM_CATALOG } from './items-executable';
import type { ItemCatalog } from '@tft/shared';
/** New rules identity, identical components, recipes and execution semantics. */
export const DROP_ITEM_CATALOG: ItemCatalog = { ...EXECUTABLE_ITEM_CATALOG, version: 'f0p8d-1' };
export const ITEM_DROP_POLICY = {
  version: 'f0p8d-1',
  everyRounds: 3,
  quantityWeights: [50, 50],
  components: ['ad', 'attack_speed', 'ap', 'mana', 'armor', 'magic_resist', 'health', 'critical'],
  rng: 'derived-mulberry32-v1',
  terminalRound: 'skip',
  eligibility: 'alive-after-settlement',
} as const;
