import { expect, it } from 'vitest';
import { createMatch, validateMatchState, copiesOf } from '@tft/game-core';
import { ECONOMY_CONFIG } from '@tft/game-data';
import type { OwnedUnit } from '@tft/shared';
import { purchaseAvailability } from './purchaseAvailability';

it('full bench disables an impossible purchase but permits the core fusion exception, without mutation', () => {
  const state = createMatch(42, { ...ECONOMY_CONFIG, initialGold: 500 });
  for (const offer of state.shop) if (offer) state.pool[offer.definitionId]!++;
  state.shop = ['test-k01', 'test-m04', null, null, null].map((definitionId, i) => {
    if (!definitionId) return null;
    state.pool[definitionId]!--;
    return { id: `offer-${i}`, definitionId };
  });
  state.units = Array.from(
    { length: 9 },
    (_, i): OwnedUnit => ({
      id: `owned-${i}`,
      definitionId: i < 2 ? 'test-k01' : i < 6 ? 'test-v02' : 'test-r03',
      stars: i < 2 || i % 4 < 2 ? 1 : 2,
      location: { kind: 'bench', slot: i },
    }),
  );
  for (const unit of state.units) state.pool[unit.definitionId]! -= copiesOf(unit, state.config);
  validateMatchState(state);
  const before = JSON.stringify(state);
  expect(purchaseAvailability(state)).toEqual([
    null,
    'Banquillo lleno',
    'Sin oferta',
    'Sin oferta',
    'Sin oferta',
  ]);
  expect(JSON.stringify(state)).toBe(before);
});
it('purchase previews use core affordability and never spend gold or reserve RNG', () => {
  const state = createMatch(42, { ...ECONOMY_CONFIG, initialGold: 0 });
  const before = JSON.stringify(state);
  expect(purchaseAvailability(state).every((error) => error === 'Falta oro')).toBe(true);
  expect(JSON.stringify(state)).toBe(before);
});
