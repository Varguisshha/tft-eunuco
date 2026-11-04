import { p13tFixture } from './p13tFixture';
import { P13T1_ECONOMY_CONFIG } from '@tft/game-data';
import { validateMatchState } from '@tft/game-core';
export function p13t1Fixture(stars: 1 | 2 | 3 = 1) {
  const state = p13tFixture(stars);
  state.config = { ...P13T1_ECONOMY_CONFIG, initialGold: 50 };
  return validateMatchState(state);
}
