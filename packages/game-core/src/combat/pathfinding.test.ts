import { describe, expect, it } from 'vitest';
import { BOARD_HEXES, hexDistance, hexKey, hexNeighbors } from '../hex';
import { findPath, chooseTarget } from './pathfinding';
import { CombatEngine, runCombat } from './engine';
import { input, spec } from './fixtures.test-support';
describe('A* and targeting', () => {
  it('finds shortest paths and detours around obstacles', () => {
    const start = { q: 0, r: 2 },
      goal = { q: 3, r: 2 };
    expect(findPath(start, [goal], new Set())).toHaveLength(3);
    const blocked = new Set(['1,2', '2,2']);
    const path = findPath(start, [goal], blocked)!;
    expect(path.length).toBeGreaterThan(3);
    expect(path.at(-1)).toEqual(goal);
    let previous = start;
    for (const step of path) {
      expect(hexDistance(previous, step)).toBe(1);
      expect(blocked.has(hexKey(step))).toBe(false);
      previous = step;
    }
  });
  it('returns null for enclosed, invalid or empty goals; [] for an occupied source goal', () => {
    const start = { q: 0, r: 4 };
    const blocked = new Set(hexNeighbors(start).map(hexKey));
    expect(findPath(start, [{ q: 0, r: 0 }], blocked)).toBeNull();
    expect(findPath(start, [], new Set())).toBeNull();
    expect(findPath(start, [{ q: 40, r: 40 }], new Set())).toBeNull();
    expect(findPath(start, [start], new Set([hexKey(start)]))).toEqual([]);
  });
  it('chooses explicit row/column tie order', () => {
    expect(findPath({ q: 0, r: 4 }, [{ q: 1, r: 3 }], new Set())).toEqual([{ q: 1, r: 3 }]);
    const path = findPath({ q: 0, r: 2 }, [{ q: 2, r: 2 }], new Set(['1,2']));
    expect(path).toEqual([
      { q: 1, r: 1 },
      { q: 2, r: 1 },
      { q: 2, r: 2 },
    ]);
  });
  it('selects the nearest reachable enemy, using ID for equal distance', () => {
    const engine = new CombatEngine(
      input([
        spec('self', 'south', { q: 0, r: 4 }),
        spec('z', 'north', { q: 0, r: 3 }),
        spec('a', 'north', { q: 1, r: 3 }),
      ]),
    );
    const units = engine.snapshot().units;
    const self = units.find((u) => u.id === 'self')!;
    expect(chooseTarget(self, units, [])?.target.id).toBe('a');
  });
  it('skips a closer enemy when all its attack cells are inaccessible', () => {
    const start = spec('self', 'south', { q: -2, r: 6 });
    const near = spec('near', 'north', { q: 0, r: 4 });
    const far = spec('far', 'north', { q: 3, r: 0 });
    const obstacles = hexNeighbors(near.position);
    const units = new CombatEngine(input([start, near, far], { obstacles })).snapshot().units;
    expect(chooseTarget(units.find((u) => u.id === 'self')!, units, obstacles)?.target.id).toBe(
      'far',
    );
  });
  it('reserves one contested cell and never overlaps living units or destinations', () => {
    const allowed = new Set(['0,4', '1,4', '1,3', '1,2', '1,1']);
    const replay = runCombat(
      input(
        [
          spec('a', 'south', { q: 0, r: 4 }),
          spec('b', 'south', { q: 1, r: 4 }),
          spec('z', 'north', { q: 1, r: 1 }, { range: 14 }),
        ],
        { maxTicks: 30, obstacles: BOARD_HEXES.filter((h) => !allowed.has(hexKey(h))) },
      ),
    );
    const starts = replay.events.filter((e) => e.type === 'move_start').filter((e) => e.tick === 1);
    expect(starts).toHaveLength(1);
    expect(starts[0]?.payload.unitId).toBe('a');
    for (const state of replay.snapshots) {
      const claims = state.units
        .filter((u) => u.hp > 0)
        .flatMap((u) => [
          hexKey(u.position),
          ...(u.action?.kind === 'move' ? [hexKey(u.action.to)] : []),
        ]);
      expect(new Set(claims).size).toBe(claims.length);
    }
  });
});
