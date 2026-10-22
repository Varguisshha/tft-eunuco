import { getUnitDefinition } from '@tft/game-data';
import type { BoardState, HexCoord, Side, UnitInstance } from '@tft/shared';
import { boardNeighbors, isInBounds, isInHalf, sameHex } from './hex';
export type PlacementError =
  | 'out-of-bounds'
  | 'wrong-half'
  | 'occupied'
  | 'unknown-definition'
  | 'duplicate-id'
  | 'missing-unit'
  | 'wrong-owner';
export type BoardResult = { ok: true; board: BoardState } | { ok: false; reason: PlacementError };
export function unitAt(board: BoardState, hex: HexCoord): UnitInstance | undefined {
  return board.units.find((u) => sameHex(u.position, hex));
}
export function validateDestination(
  board: BoardState,
  hex: HexCoord,
  owner: Side,
  movingId?: string,
): PlacementError | null {
  if (!isInBounds(hex)) return 'out-of-bounds';
  if (!isInHalf(hex, owner)) return 'wrong-half';
  const occupied = unitAt(board, hex);
  return occupied && occupied.id !== movingId ? 'occupied' : null;
}
export function placeUnit(board: BoardState, unit: UnitInstance): BoardResult {
  if (!getUnitDefinition(unit.definitionId)) return { ok: false, reason: 'unknown-definition' };
  if (!unit.id || board.units.some((u) => u.id === unit.id))
    return { ok: false, reason: 'duplicate-id' };
  const reason = validateDestination(board, unit.position, unit.owner);
  return reason
    ? { ok: false, reason }
    : { ok: true, board: { units: [...board.units, { ...unit, position: { ...unit.position } }] } };
}
export function moveUnit(
  board: BoardState,
  unitId: string,
  to: HexCoord,
  actor: Side,
): BoardResult {
  const unit = board.units.find((u) => u.id === unitId);
  if (!unit) return { ok: false, reason: 'missing-unit' };
  if (unit.owner !== actor) return { ok: false, reason: 'wrong-owner' };
  const reason = validateDestination(board, to, actor, unitId);
  return reason
    ? { ok: false, reason }
    : {
        ok: true,
        board: {
          units: board.units.map((u) => (u.id === unitId ? { ...u, position: { ...to } } : u)),
        },
      };
}
/** Adjacency only: no path search or combat movement policy is implemented. */
export function walkableNeighbors(board: BoardState, from: HexCoord): HexCoord[] {
  return boardNeighbors(from).filter((hex) => !unitAt(board, hex));
}
