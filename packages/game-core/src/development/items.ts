import { DevelopmentItemCommandSchema } from '@tft/shared/development';
import { DIAGNOSTIC_ITEM_CATALOG } from '@tft/game-data';
import type { MatchState } from '@tft/shared';
import { grantItemInstances, allItemInstances } from '../items/inventory';
import { validateMatchState } from '../match/invariants';
/** No UI and no transport registration: test/DEV callers receive a validated fresh candidate. */
export function applyDevelopmentItems(original: MatchState, raw: unknown): MatchState {
  if (!original.development || !original.items || original.phase !== 'preparation')
    throw Error('Isolated DEV preparation required');
  const command = DevelopmentItemCommandSchema.parse(raw),
    state = structuredClone(original);
  if (command.type === 'diagnostic_item_catalog')
    state.items!.catalogVersion = DIAGNOSTIC_ITEM_CATALOG.version;
  if (command.type === 'grant_items')
    grantItemInstances(state, command.grantId, command.definitionIds);
  if (command.type === 'clear_items') {
    state.items!.retired.push(...allItemInstances(state).map((i) => i.id));
    state.items!.components = [];
    state.items!.completed = [];
    state.items!.pending = [];
    for (const unit of state.units) delete unit.equipment;
  }
  return validateMatchState(state);
}
