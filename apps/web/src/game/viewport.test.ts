import { describe, expect, it } from 'vitest';
import { BOARD_HEXES } from '@tft/game-core';
import { canvasSize, fitBoardView } from './viewport';
import { createProjection, hexCorners, hexToWorld, worldToHex } from './projection';

describe('viewport fit keeps board and input in world coordinates', () => {
  for (const [width, height] of [
    [888, 266],
    [974, 314],
    [998, 380],
    [1402, 570],
    [2042, 930],
  ]) {
    it(`fits all cells, heads and extrusion inside ${width}×${height}`, () => {
      const projection = createProjection(0.38);
      const fit = fitBoardView(width!, height!, projection);
      for (const hex of BOARD_HEXES) {
        for (const corner of hexCorners(hex, projection)) {
          const x = (corner.x - fit.x) * fit.zoom + width! / 2;
          const y = (corner.y - fit.y) * fit.zoom + height! / 2;
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(width!);
          expect(y - 84 * fit.zoom).toBeGreaterThanOrEqual(-1e-8);
          expect(y + 26 * fit.zoom).toBeLessThanOrEqual(height! + 1e-8);
        }
      }
    });
  }
  for (const dpr of [1, 1.25, 2]) {
    it(`CSS pointer maps back to every cell at DPR ${dpr} and all user zooms`, () => {
      const size = canvasSize(888, 266, dpr),
        projection = createProjection(0.38);
      const fit = fitBoardView(size.width, size.height, projection);
      for (const userZoom of [0.85, 1, 1.15])
        for (const hex of BOARD_HEXES) {
          const point = hexToWorld(hex, projection),
            zoom = fit.zoom * userZoom;
          const cssX = (((point.x - fit.x) * zoom + size.width / 2) / size.width) * 888;
          const cssY = (((point.y - fit.y) * zoom + size.height / 2) / size.height) * 266;
          const world = {
            x: ((cssX / 888) * size.width - size.width / 2) / zoom + fit.x,
            y: ((cssY / 266) * size.height - size.height / 2) / zoom + fit.y,
          };
          expect(worldToHex(world, projection)).toEqual(hex);
        }
    });
  }
  it('caps render density without a zero-sized canvas', () => {
    expect(canvasSize(0, 0, 4)).toEqual({ width: 1, height: 1, density: 2 });
    expect(canvasSize(800, 400, 0)).toEqual({ width: 800, height: 400, density: 1 });
  });
});
