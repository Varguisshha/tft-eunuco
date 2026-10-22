import { expect, it } from 'vitest';
import { BOARD_HEXES } from '@tft/game-core';
import {
  createProjection,
  hexToWorld,
  projectPoint,
  unprojectPoint,
  worldToHex,
} from './projection';
it('projects known basis vectors at 30 degrees with a compressed vertical axis', () => {
  const projection = { radius: 10, squash: 0.5, origin: { x: 100, y: 100 } };
  const east = projectPoint({ x: 1, y: 0 }, projection);
  expect(east.x).toBeCloseTo(108.6602540378);
  expect(east.y).toBeCloseTo(102.5);
  const south = projectPoint({ x: 0, y: 1 }, projection);
  expect(south.x).toBeCloseTo(95);
  expect(south.y).toBeCloseTo(104.3301270189222);
  expect(unprojectPoint({ x: 100, y: 100 }, projection)).toEqual({ x: 0, y: 0 });
});
it('supports all cells under changes of scale, squash and origin', () => {
  for (const projection of [
    createProjection(),
    { radius: 17, squash: 0.3, origin: { x: -120, y: 74 } },
  ]) {
    for (const hex of BOARD_HEXES)
      expect(worldToHex(hexToWorld(hex, projection), projection)).toEqual(hex);
  }
});
