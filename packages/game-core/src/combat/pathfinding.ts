import type { CombatUnit, HexCoord } from '@tft/shared';
import { BOARD_HEXES, boardNeighbors, hexDistance, hexKey, isInBounds, sameHex } from '../hex';
import { compareIds, isAlive } from './math';
const compareCells = (a: HexCoord, b: HexCoord) => a.r - b.r || a.q - b.q;
/** Returns steps excluding start, including goal. Null means unreachable; [] already at a goal. */
export function findPath(
  start: HexCoord,
  goals: readonly HexCoord[],
  blocked: ReadonlySet<string>,
): HexCoord[] | null {
  const validGoals = goals.filter(
    (h) => isInBounds(h) && (!blocked.has(hexKey(h)) || sameHex(h, start)),
  );
  if (!isInBounds(start) || !validGoals.length) return null;
  const heuristic = (hex: HexCoord) => Math.min(...validGoals.map((g) => hexDistance(hex, g)));
  const goalKeys = new Set(validGoals.map(hexKey));
  const open = [{ hex: start, g: 0, h: heuristic(start), path: [] as HexCoord[] }];
  const best = new Map([[hexKey(start), 0]]);
  const closed = new Set<string>();
  while (open.length) {
    open.sort((a, b) => a.g + a.h - (b.g + b.h) || a.h - b.h || compareCells(a.hex, b.hex));
    const current = open.shift()!;
    const key = hexKey(current.hex);
    if (closed.has(key)) continue;
    if (goalKeys.has(key)) return current.path;
    closed.add(key);
    for (const next of boardNeighbors(current.hex).sort(compareCells)) {
      const nextKey = hexKey(next);
      const g = current.g + 1;
      if (blocked.has(nextKey) || closed.has(nextKey) || (best.get(nextKey) ?? Infinity) <= g)
        continue;
      best.set(nextKey, g);
      open.push({ hex: next, g, h: heuristic(next), path: [...current.path, next] });
    }
  }
  return null;
}
export function blockedCells(
  units: readonly CombatUnit[],
  obstacles: readonly HexCoord[],
  exceptId: string,
): Set<string> {
  const blocked = new Set(obstacles.map(hexKey));
  for (const u of units)
    if (isAlive(u) && u.id !== exceptId) {
      blocked.add(hexKey(u.position));
      if (u.action?.kind === 'move' || u.action?.kind === 'jump') blocked.add(hexKey(u.action.to));
    }
  return blocked;
}
export interface TargetChoice {
  target: CombatUnit;
  path: HexCoord[];
}
export function chooseTarget(
  unit: CombatUnit,
  units: readonly CombatUnit[],
  obstacles: readonly HexCoord[],
): TargetChoice | null {
  const range = unit.profile.stats.range;
  const blocked = blockedCells(units, obstacles, unit.id);
  const candidates = units
    .filter(
      (enemy) =>
        isAlive(enemy) &&
        !enemy.statuses.some((s) => s.group === 'item-untargetable') &&
        enemy.owner !== unit.owner,
    )
    .sort((a, b) => {
      const da = hexDistance(unit.position, a.position);
      const db = hexDistance(unit.position, b.position);
      return Number(db <= range) - Number(da <= range) || da - db || compareIds(a.id, b.id);
    });
  for (const target of candidates) {
    const goals = BOARD_HEXES.filter(
      (h) => hexDistance(h, target.position) <= range && !sameHex(h, target.position),
    );
    const path = findPath(unit.position, goals, blocked);
    if (path !== null) return { target, path };
  }
  return null;
}
