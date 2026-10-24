import type { HexCoord } from './board-contracts';
/** 180° rotation of the 7×8 odd-r board; an involution. No simulation is performed. */
export function reverseHex(hex: HexCoord): HexCoord {
  const col = hex.q + Math.floor(hex.r / 2),
    r = 7 - hex.r;
  return { q: 6 - col - Math.floor(r / 2), r };
}
/** Rebase presentation only. IDs, event order, damage, ticks and seeds are preserved. */
export function reversePerspective<T>(value: T): T {
  const visit = (v: unknown): unknown => {
    if (v === 'north') return 'south';
    if (v === 'south') return 'north';
    if (Array.isArray(v)) return v.map(visit);
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (Object.keys(o).length === 2 && typeof o.q === 'number' && typeof o.r === 'number')
        return reverseHex({ q: o.q, r: o.r });
      return Object.fromEntries(
        Object.entries(o).map(([k, x]) => [
          k === 'north' ? 'south' : k === 'south' ? 'north' : k,
          visit(x),
        ]),
      );
    }
    return v;
  };
  return visit(value) as T;
}
