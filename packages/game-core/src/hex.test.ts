import { describe, expect, it } from 'vitest';
import {
  axialToCartesian,
  axialToOffset,
  BOARD_HEXES,
  boardNeighbors,
  cartesianToAxial,
  hexDistance,
  hexNeighbors,
  isInBounds,
  isInHalf,
  offsetToAxial,
} from './hex';
describe('axial geometry with independent reference positions', () => {
  it('uses the odd-r rectangle, including negative q on the left edge', () => {
    expect(offsetToAxial(0, 0)).toEqual({ q: 0, r: 0 });
    expect(offsetToAxial(0, 1)).toEqual({ q: 0, r: 1 });
    expect(offsetToAxial(0, 2)).toEqual({ q: -1, r: 2 });
    expect(offsetToAxial(6, 7)).toEqual({ q: 3, r: 7 });
    expect(axialToOffset({ q: -3, r: 7 })).toEqual({ column: 0, row: 7 });
  });
  it('matches known pointy hex centers, independent of inverse conversion', () => {
    expect(axialToCartesian({ q: 0, r: 0 })).toEqual({ x: 0, y: 0 });
    expect(axialToCartesian({ q: 1, r: 0 }).x).toBeCloseTo(1.7320508075688772);
    expect(axialToCartesian({ q: 0, r: 1 })).toEqual({ x: Math.sqrt(3) / 2, y: 1.5 });
    expect(axialToCartesian({ q: -1, r: 2 })).toEqual({ x: 0, y: 3 });
    expect(cartesianToAxial({ x: 0, y: 3 })).toEqual({ q: -1, r: 2 });
    expect(cartesianToAxial({ x: 1.72, y: 0.02 })).toEqual({ q: 1, r: 0 });
  });
  it('hits the correct side of a shared edge', () => {
    expect(cartesianToAxial({ x: 0.85, y: 0 })).toEqual({ q: 0, r: 0 });
    expect(cartesianToAxial({ x: 0.88, y: 0 })).toEqual({ q: 1, r: 0 });
  });
  it('round trips all 56 cells and interior samples', () => {
    expect(BOARD_HEXES).toHaveLength(56);
    expect(new Set(BOARD_HEXES.map((h) => `${h.q},${h.r}`)).size).toBe(56);
    for (const hex of BOARD_HEXES) {
      const p = axialToCartesian(hex);
      expect(cartesianToAxial(p)).toEqual(hex);
      expect(cartesianToAxial({ x: p.x + 0.1, y: p.y - 0.1 })).toEqual(hex);
    }
  });
  it('checks rectangular bounds, not an axial parallelogram', () => {
    expect(isInBounds({ q: -3, r: 7 })).toBe(true);
    expect(isInBounds({ q: 3, r: 7 })).toBe(true);
    for (const hex of [
      { q: -4, r: 7 },
      { q: 4, r: 7 },
      { q: 7, r: 0 },
      { q: 0, r: -1 },
      { q: 0, r: 8 },
      { q: 0.5, r: 0 },
      { q: NaN, r: 0 },
    ])
      expect(isInBounds(hex)).toBe(false);
    expect(BOARD_HEXES.filter((h) => isInHalf(h, 'south'))).toHaveLength(28);
    expect(BOARD_HEXES.filter((h) => isInHalf(h, 'north'))).toHaveLength(28);
    expect(isInHalf({ q: 0, r: 3 }, 'south')).toBe(false);
    expect(isInHalf({ q: 0, r: 4 }, 'south')).toBe(true);
  });
  it('has the six canonical neighbors and reciprocal adjacency', () => {
    expect(hexNeighbors({ q: 0, r: 0 })).toEqual([
      { q: 1, r: 0 },
      { q: 1, r: -1 },
      { q: 0, r: -1 },
      { q: -1, r: 0 },
      { q: -1, r: 1 },
      { q: 0, r: 1 },
    ]);
    expect(boardNeighbors({ q: 0, r: 0 })).toEqual([
      { q: 1, r: 0 },
      { q: 0, r: 1 },
    ]);
    for (const cell of BOARD_HEXES)
      for (const neighbor of boardNeighbors(cell))
        expect(boardNeighbors(neighbor)).toContainEqual(cell);
  });
  it('matches independently counted distances and triangle inequality', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: 3 })).toBe(5);
    expect(hexDistance({ q: -3, r: 7 }, { q: 3, r: 7 })).toBe(6);
    expect(hexDistance({ q: 0, r: 0 }, { q: -3, r: 7 })).toBe(7);
    for (const a of BOARD_HEXES) {
      expect(hexDistance(a, a)).toBe(0);
      for (const b of hexNeighbors(a)) expect(hexDistance(a, b)).toBe(1);
      for (const b of BOARD_HEXES) {
        expect(hexDistance(a, b)).toBe(hexDistance(b, a));
        expect(hexDistance(a, b)).toBeLessThanOrEqual(
          hexDistance(a, { q: 0, r: 0 }) + hexDistance({ q: 0, r: 0 }, b),
        );
      }
    }
  });
});
