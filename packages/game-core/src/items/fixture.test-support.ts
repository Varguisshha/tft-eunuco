import { ITEMS_ECONOMY_CONFIG } from '@tft/game-data';
import { type MatchCommand, type MatchState, type OwnedUnit } from '@tft/shared';
import { createMatch, commandFor, applyMatchAction } from '../match/engine';
import { applyDevelopmentItems } from '../development/items';
import { validateMatchState } from '../match/invariants';
export function fixture(diagnostic = true) {
  let state = createMatch(42, { ...ITEMS_ECONOMY_CONFIG, initialGold: 500 });
  if (diagnostic) {
    state.development = { version: 1, tainted: true, healthAdjustments: [] };
    state = applyDevelopmentItems(state, { type: 'diagnostic_item_catalog' });
  }
  return state;
}
export function unit(
  state: MatchState,
  id = 'unit-a',
  stars: 1 | 2 | 3 = 1,
  slot = 0,
  definitionId = 'jaramillo',
) {
  state.pool[definitionId]! -= state.config.starCopies[stars - 1]!;
  const owned: OwnedUnit = { id, definitionId, stars, location: { kind: 'bench', slot } };
  state.units.push(owned);
  validateMatchState(state);
  return owned;
}
export function grant(
  state: MatchState,
  definitions: string[],
  id = `grant-${state.items!.grants.length}`,
) {
  return applyDevelopmentItems(state, {
    type: 'grant_items',
    grantId: id,
    definitionIds: definitions,
  });
}
export function act(state: MatchState, command: MatchCommand) {
  const out = applyMatchAction(state, commandFor(state, command));
  if (!out.ok) throw Error(out.error);
  return out.state;
}
