import { createMatch, validateMatchState } from '@tft/game-core';
import { P13T_ECONOMY_CONFIG, getUnitDefinition } from '@tft/game-data';
/** Authored, conserved LOCAL formation for screenshots and replay sampling. */
export function p13tFixture(stars: 1 | 2 | 3 = 1) {
  const state = createMatch(42, { ...P13T_ECONOMY_CONFIG, initialGold: 50 });
  state.level = 7;
  state.xp = 0;
  const ids = ['jaramillo', 'peibol', 'vargas', 'dolea', 'florin'];
  state.units = ids.map((definitionId, i) => ({
    id: `p13t-${i}`,
    definitionId,
    stars: definitionId === 'vargas' || definitionId === 'dolea' ? 1 : stars,
    location: { kind: 'board', hex: { q: i - 2, r: 4 } },
  }));
  for (const u of state.units) state.pool[u.definitionId]! -= state.config.starCopies[u.stars - 1]!;
  for (const offer of state.shop) if (offer) state.pool[offer.definitionId]!++;
  state.shop = ids.map((definitionId, i) => {
    state.pool[definitionId]!--;
    return { id: `p13t-offer-${i}`, definitionId };
  });
  state.shopRolls = ids.map((id) => ({ cost: getUnitDefinition(id)!.cost, outcome: 'offered' }));
  return validateMatchState(state);
}
