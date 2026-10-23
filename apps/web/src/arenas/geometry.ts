import { BOARD_HEXES, axialToCartesian, type Point } from '@tft/game-core';
export type Matrix3 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
export type Quad = readonly [Point, Point, Point, Point];
export function transform(p: Point, m: Matrix3): Point {
  const w = m[6] * p.x + m[7] * p.y + m[8];
  if (Math.abs(w) < 1e-10) throw new Error('Projection horizon');
  return { x: (m[0] * p.x + m[1] * p.y + m[2]) / w, y: (m[3] * p.x + m[4] * p.y + m[5]) / w };
}
export function inverse(m: Matrix3): Matrix3 {
  const [a, b, c, d, e, f, g, h, i] = m;
  const cofactors = [
    e * i - f * h,
    c * h - b * i,
    b * f - c * e,
    f * g - d * i,
    a * i - c * g,
    c * d - a * f,
    d * h - e * g,
    b * g - a * h,
    a * e - b * d,
  ];
  const det = a * cofactors[0]! + b * cofactors[3]! + c * cofactors[6]!;
  if (Math.abs(det) < 1e-10) throw new Error('Singular projection');
  return cofactors.map((v) => v / det) as unknown as Matrix3;
}
/** Four exact correspondences, solved once when calibration changes, never per frame. */
export function homography(from: Quad, to: Quad): Matrix3 {
  const rows: number[][] = [];
  from.forEach((p, i) => {
    const q = to[i]!;
    rows.push([p.x, p.y, 1, 0, 0, 0, -q.x * p.x, -q.x * p.y, q.x]);
    rows.push([0, 0, 0, p.x, p.y, 1, -q.y * p.x, -q.y * p.y, q.y]);
  });
  for (let c = 0; c < 8; c++) {
    let pivot = c;
    for (let r = c + 1; r < 8; r++)
      if (Math.abs(rows[r]![c]!) > Math.abs(rows[pivot]![c]!)) pivot = r;
    [rows[c], rows[pivot]] = [rows[pivot]!, rows[c]!];
    const divisor = rows[c]![c]!;
    if (Math.abs(divisor) < 1e-10) throw new Error('Degenerate calibration');
    rows[c] = rows[c]!.map((v) => v / divisor);
    for (let r = 0; r < 8; r++)
      if (r !== c) {
        const factor = rows[r]![c]!;
        rows[r] = rows[r]!.map((v, j) => v - factor * rows[c]![j]!);
      }
  }
  return [...rows.map((r) => r[8]!), 1] as unknown as Matrix3;
}
export function logicalBounds(): Quad {
  const points = BOARD_HEXES.flatMap((hex) => {
    const c = axialToCartesian(hex);
    return Array.from({ length: 6 }, (_, i) => ({
      x: c.x + Math.cos(((60 * i - 30) * Math.PI) / 180),
      y: c.y + Math.sin(((60 * i - 30) * Math.PI) / 180),
    }));
  });
  const x0 = Math.min(...points.map((p) => p.x)),
    x1 = Math.max(...points.map((p) => p.x));
  const y0 = Math.min(...points.map((p) => p.y)),
    y1 = Math.max(...points.map((p) => p.y));
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}
export function insideConvex(p: Point, polygon: readonly Point[], epsilon = 1e-7): boolean {
  let sign = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!,
      b = polygon[(i + 1) % polygon.length]!;
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (Math.abs(cross) <= epsilon) continue;
    if (sign && Math.sign(cross) !== sign) return false;
    sign = Math.sign(cross);
  }
  return true;
}
export function convexQuad(quad: Quad): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = quad[i]!,
      b = quad[(i + 1) % 4]!,
      c = quad[(i + 2) % 4]!;
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 100 || (sign && Math.sign(cross) !== sign)) return false;
    sign = Math.sign(cross);
  }
  return sign > 0;
}
