import { axialToCartesian, cartesianToAxial, BOARD_HEXES, type Point } from '@tft/game-core';
import type { HexCoord } from '@tft/shared';
export const WORLD = { width: 1000, height: 650 } as const;
const ANGLE = Math.PI / 6;
const C = Math.cos(ANGLE);
const S = Math.sin(ANGLE);
export interface Projection {
  radius: number;
  squash: number;
  origin: Point;
}
export function projectPoint(point: Point, projection: Projection): Point {
  return {
    x: projection.origin.x + projection.radius * (point.x * C - point.y * S),
    y: projection.origin.y + projection.radius * projection.squash * (point.x * S + point.y * C),
  };
}
export function unprojectPoint(point: Point, projection: Projection): Point {
  const x = (point.x - projection.origin.x) / projection.radius;
  const y = (point.y - projection.origin.y) / (projection.radius * projection.squash);
  return { x: x * C + y * S, y: -x * S + y * C };
}
export function hexToWorld(hex: HexCoord, projection: Projection): Point {
  return projectPoint(axialToCartesian(hex), projection);
}
export function worldToHex(point: Point, projection: Projection): HexCoord {
  return cartesianToAxial(unprojectPoint(point, projection));
}
export function hexCorners(hex: HexCoord, projection: Projection, inset = 1): Point[] {
  const center = axialToCartesian(hex);
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return projectPoint(
      { x: center.x + Math.cos(angle) * inset, y: center.y + Math.sin(angle) * inset },
      projection,
    );
  });
}
export function createProjection(): Projection {
  const base = { radius: 45, squash: 0.64, origin: { x: 0, y: 0 } };
  const points = BOARD_HEXES.flatMap((h) => hexCorners(h, base));
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  return {
    ...base,
    origin: { x: (WORLD.width - maxX - minX) / 2, y: (WORLD.height - maxY - minY) / 2 + 5 },
  };
}
