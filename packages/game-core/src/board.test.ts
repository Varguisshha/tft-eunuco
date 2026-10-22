import { describe, expect, it } from 'vitest';
import type { BoardState, UnitInstance } from '@tft/shared';
import { moveUnit, placeUnit, unitAt, walkableNeighbors } from './board';
const unit: UnitInstance = {
  id: 'u1',
  definitionId: 'test-k01',
  owner: 'south',
  position: { q: 0, r: 4 },
};
const occupied: BoardState = { units: [unit, { ...unit, id: 'u2', position: { q: 1, r: 4 } }] };
describe('deployment and immutable occupancy', () => {
  it('places valid units without mutating the source or retaining coordinate aliases', () => {
    const empty = Object.freeze({ units: [] });
    const result = placeUnit(empty, unit);
    expect(result.ok).toBe(true);
    expect(empty.units).toHaveLength(0);
    if (result.ok) {
      expect(unitAt(result.board, { q: 0, r: 4 })?.id).toBe('u1');
      expect(result.board.units[0]?.position).not.toBe(unit.position);
    }
  });
  it.each([
    [{ q: 0, r: 3 }, 'wrong-half'],
    [{ q: 4, r: 7 }, 'out-of-bounds'],
    [{ q: -4, r: 7 }, 'out-of-bounds'],
    [{ q: 0.1, r: 4 }, 'out-of-bounds'],
    [{ q: 1, r: 4 }, 'occupied'],
  ] as const)('rejects invalid placement at %o with %s', (position, reason) => {
    expect(placeUnit(occupied, { ...unit, id: 'u3', position })).toEqual({ ok: false, reason });
  });
  it('rejects duplicate identity and unknown definitions', () => {
    expect(placeUnit(occupied, unit)).toEqual({ ok: false, reason: 'duplicate-id' });
    expect(placeUnit({ units: [] }, { ...unit, definitionId: 'missing' })).toEqual({
      ok: false,
      reason: 'unknown-definition',
    });
  });
  it('supports north placement and rejects its south half', () => {
    expect(placeUnit({ units: [] }, { ...unit, owner: 'north', position: { q: 0, r: 0 } }).ok).toBe(
      true,
    );
    expect(placeUnit({ units: [] }, { ...unit, owner: 'north' })).toEqual({
      ok: false,
      reason: 'wrong-half',
    });
  });
  it('moves atomically, releases the source, and preserves identity', () => {
    const before = JSON.stringify(occupied);
    const result = moveUnit(occupied, 'u1', { q: -3, r: 7 }, 'south');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(unitAt(result.board, unit.position)).toBeUndefined();
      expect(unitAt(result.board, { q: -3, r: 7 })?.id).toBe('u1');
      expect(result.board.units).toHaveLength(2);
    }
    expect(JSON.stringify(occupied)).toBe(before);
  });
  it('accepts same-cell drops without duplication', () => {
    const result = moveUnit(occupied, 'u1', unit.position, 'south');
    expect(result).toEqual({ ok: true, board: occupied });
  });
  it('rejects occupied, wrong owner, missing, out of bounds and wrong half moves without mutation', () => {
    const before = JSON.stringify(occupied);
    expect(moveUnit(occupied, 'u1', { q: 1, r: 4 }, 'south')).toEqual({
      ok: false,
      reason: 'occupied',
    });
    expect(moveUnit(occupied, 'u1', { q: 0, r: 4 }, 'north')).toEqual({
      ok: false,
      reason: 'wrong-owner',
    });
    expect(moveUnit(occupied, 'unknown', { q: 0, r: 4 }, 'south')).toEqual({
      ok: false,
      reason: 'missing-unit',
    });
    expect(moveUnit(occupied, 'u1', { q: 0, r: 8 }, 'south')).toEqual({
      ok: false,
      reason: 'out-of-bounds',
    });
    expect(moveUnit(occupied, 'u1', { q: 0, r: 3 }, 'south')).toEqual({
      ok: false,
      reason: 'wrong-half',
    });
    expect(JSON.stringify(occupied)).toBe(before);
  });
  it('exposes empty board neighbors for future pathfinding', () => {
    expect(walkableNeighbors(occupied, unit.position)).not.toContainEqual({ q: 1, r: 4 });
    expect(walkableNeighbors(occupied, unit.position)).toHaveLength(5);
  });
});
