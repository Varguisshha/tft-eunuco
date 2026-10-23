import { BOARD_HEXES, type Point } from '@tft/game-core';
import { hexCorners, type Projection } from '../game/projection';
import {
  convexQuad,
  homography,
  insideConvex,
  inverse,
  logicalBounds,
  type Quad,
} from './geometry';
export interface ArenaDefinition {
  contractVersion: 1;
  id: string;
  name: string;
  image: {
    url: string;
    key: string;
    width: number;
    height: number;
    source: string;
    sha256: string;
  };
  playableArea: Quad;
  projection: { kind: 'homography'; controls: Quad };
  camera: {
    framing?: 'cover' | 'contain';
    focus: Point;
    landmarks?: readonly Point[];
    topMargin: number;
    bottomMargin: number;
    leftHud: number;
    rightMargin: number;
    headroom: number;
    zoomMin: number;
    zoomMax: number;
  };
  grid: { mode: 'interaction'; north: number; south: number; invalid: number };
  characters: { scale: number; farScale: number; nearScale: number; farY: number; nearY: number };
}
export function arenaProjection(
  arena: ArenaDefinition,
  controls = arena.projection.controls,
): Projection {
  const matrix = homography(logicalBounds(), controls);
  return { radius: 1, squash: 1, origin: { x: 0, y: 0 }, matrix, inverseMatrix: inverse(matrix) };
}
export function calibrationErrors(
  arena: ArenaDefinition,
  controls = arena.projection.controls,
): string[] {
  if (!convexQuad(controls)) return ['Los puntos deben formar un cuadrilátero convexo, en orden.'];
  if (controls.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y)))
    return ['Coordenadas no finitas.'];
  try {
    const projection = arenaProjection(arena, controls);
    const outside = BOARD_HEXES.filter((hex) =>
      hexCorners(hex, projection).some((p) => !insideConvex(p, arena.playableArea)),
    );
    if (outside.length) return [`${outside.length} casillas fuera del pavimento seguro.`];
    // No projective pole may cross the logical rectangle.
    const m = projection.matrix!;
    if (logicalBounds().some((p) => m[6] * p.x + m[7] * p.y + 1 <= 0.01))
      return ['Perspectiva inestable.'];
    return [];
  } catch {
    return ['Calibración degenerada.'];
  }
}
export function validateArena(arena: ArenaDefinition): void {
  if (
    arena.contractVersion !== 1 ||
    !arena.id ||
    !arena.name ||
    arena.projection.kind !== 'homography' ||
    arena.grid.mode !== 'interaction'
  )
    throw new Error('Unsupported arena contract');
  const { width, height } = arena.image;
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    !arena.image.url ||
    !arena.image.key ||
    !convexQuad(arena.playableArea)
  )
    throw new Error('Invalid arena image or perimeter');
  if (arena.playableArea.some((p) => p.x < 0 || p.x > width || p.y < 0 || p.y > height))
    throw new Error('Perimeter outside image');
  const c = arena.characters;
  if (
    [c.scale, c.farScale, c.nearScale].some((v) => !Number.isFinite(v) || v <= 0) ||
    c.nearY <= c.farY
  )
    throw new Error('Invalid character scale');
  if (
    Object.values(arena.camera).some(
      (v) => typeof v === 'number' && (!Number.isFinite(v) || v < 0),
    ) ||
    arena.camera.zoomMin > arena.camera.zoomMax
  )
    throw new Error('Invalid camera');
  if (
    arena.camera.landmarks?.some(
      (p) =>
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.y) ||
        p.x < 0 ||
        p.x > width ||
        p.y < 0 ||
        p.y > height,
    )
  )
    throw new Error('Camera landmark outside image');
  const errors = calibrationErrors(arena);
  if (errors.length) throw new Error(errors.join(' '));
}
export function characterScale(arena: ArenaDefinition, y: number): number {
  const c = arena.characters,
    t = Math.max(0, Math.min(1, (y - c.farY) / (c.nearY - c.farY)));
  return c.scale * (c.farScale + (c.nearScale - c.farScale) * t);
}
export const characterDepth = (y: number) => 1000 + y;
export function showArenaGrid(
  editable: boolean,
  selectedId: string | null,
  dragging: boolean,
  calibrating: boolean,
): boolean {
  return calibrating || (editable && (!!selectedId || dragging));
}
