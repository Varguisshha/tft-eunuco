import { BOARD_HEXES } from '@tft/game-core';
import { hexCorners, type Projection } from './projection';

/** Include sprite heads and tile extrusion, not only cell centers. All sizes are render pixels. */
export function fitBoardView(width: number, height: number, projection: Projection) {
  const points = BOARD_HEXES.flatMap((hex) => hexCorners(hex, projection));
  const left = Math.min(...points.map((p) => p.x)) - 16;
  const right = Math.max(...points.map((p) => p.x)) + 16;
  const top = Math.min(...points.map((p) => p.y)) - 84;
  const bottom = Math.max(...points.map((p) => p.y)) + 26;
  return {
    x: (left + right) / 2,
    y: (top + bottom) / 2,
    zoom: Math.min(width / (right - left), height / (bottom - top)),
  };
}
export function canvasSize(width: number, height: number, pixelRatio: number) {
  const density = Math.max(1, Math.min(2, pixelRatio || 1));
  return {
    width: Math.max(1, Math.round(width * density)),
    height: Math.max(1, Math.round(height * density)),
    density,
  };
}
