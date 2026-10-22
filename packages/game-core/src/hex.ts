import { BOARD_COLUMNS, BOARD_ROWS, HALF_ROWS, type HexCoord, type Side } from '@tft/shared';
export type Point = Readonly<{ x: number; y: number }>;
export const HEX_DIRECTIONS: readonly HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];
export function hexKey(hex: HexCoord): string {
  return `${hex.q},${hex.r}`;
}
export function sameHex(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}
export function offsetToAxial(column: number, row: number): HexCoord {
  return { q: column - Math.floor(row / 2), r: row };
}
export function axialToOffset(hex: HexCoord): { column: number; row: number } {
  return { column: hex.q + Math.floor(hex.r / 2), row: hex.r };
}
export function isInBounds(hex: HexCoord): boolean {
  const { column, row } = axialToOffset(hex);
  return (
    Number.isSafeInteger(hex.q) &&
    Number.isSafeInteger(hex.r) &&
    column >= 0 &&
    column < BOARD_COLUMNS &&
    row >= 0 &&
    row < BOARD_ROWS
  );
}
export function isInHalf(hex: HexCoord, side: Side): boolean {
  return isInBounds(hex) && (side === 'south' ? hex.r >= HALF_ROWS : hex.r < HALF_ROWS);
}
export function hexDistance(a: HexCoord, b: HexCoord): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}
export function hexNeighbors(hex: HexCoord): HexCoord[] {
  return HEX_DIRECTIONS.map((d) => ({ q: hex.q + d.q, r: hex.r + d.r }));
}
export function boardNeighbors(hex: HexCoord): HexCoord[] {
  return hexNeighbors(hex).filter(isInBounds);
}
export const BOARD_HEXES: readonly HexCoord[] = Array.from(
  { length: BOARD_COLUMNS * BOARD_ROWS },
  (_, i) => offsetToAxial(i % BOARD_COLUMNS, Math.floor(i / BOARD_COLUMNS)),
);
/** Pointy-top hexes in unit-radius Cartesian space. No pixels, camera or viewport. */
export function axialToCartesian(hex: HexCoord): Point {
  return { x: Math.sqrt(3) * (hex.q + hex.r / 2), y: 1.5 * hex.r };
}
export function roundAxial(q: number, r: number): HexCoord {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq === 0 ? 0 : rq, r: rr === 0 ? 0 : rr };
}
export function cartesianToAxial(point: Point): HexCoord {
  return roundAxial(point.x / Math.sqrt(3) - point.y / 3, (point.y * 2) / 3);
}
