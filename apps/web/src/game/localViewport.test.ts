import { describe, it, expect } from 'vitest';
import { BOARD_HEXES } from '@tft/game-core';
import { createProjection, hexCorners } from './projection';
import { fitLocalBoardView } from './viewport';
describe('local HUD safe camera area', () => {
  for (const [width, height] of [
    [1248, 390],
    [1334, 438],
    [1408, 570],
    [1872, 696],
    [2512, 1056],
  ]) {
    for (const dpr of [1, 2])
      it(`keeps corners, heads and feet clear of the rail at ${width}×${height}, DPR ${dpr}`, () => {
        const p = createProjection(0.32);
        const w = width! * dpr,
          h = height! * dpr;
        const fit = fitLocalBoardView(w, h, p, dpr);
        for (const hex of BOARD_HEXES)
          for (const point of hexCorners(hex, p)) {
            const x = (point.x - fit.x) * fit.zoom + w / 2;
            const y = (point.y - fit.y) * fit.zoom + h / 2;
            expect(x).toBeGreaterThanOrEqual(172 * dpr);
            expect(x).toBeLessThanOrEqual(w - 16 * dpr);
            expect(y - 84 * fit.zoom).toBeGreaterThanOrEqual(16 * dpr - 1e-8);
            expect(y + 26 * fit.zoom).toBeLessThanOrEqual(h - 28 * dpr + 1e-8);
          }
      });
  }
});
