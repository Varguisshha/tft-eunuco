import { LocalMatchCoordinator, type TimeSource } from '@tft/game-core';
import type { AutomaticSave, CombatState, CombatUnit } from '@tft/shared';
export const AUTOMATIC_SAVE_KEY = 'tft-eunuco-local-f0p5-1';
export const DEVELOPMENT_SAVE_KEY = 'tft-eunuco-dev-f0p5-1';
type Delta = { state: Partial<Omit<CombatState, 'units'>>; units: Partial<CombatUnit>[] };
/** Store initial snapshot and field deltas. Preserves exact trace without repeating unit profiles 451 times. */
function changes<T extends object>(current: T, previous: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(current).filter(
      ([key, value]) => JSON.stringify(value) !== JSON.stringify(previous[key as keyof T]),
    ),
  ) as Partial<T>;
}
const encoded = new WeakMap<object, Delta[]>();
export function encodeSave(save: AutomaticSave): string {
  if (!save.replay) return JSON.stringify({ encoding: 'snapshot-deltas-v1', ...save });
  const { snapshots, ...replay } = save.replay;
  let deltas = encoded.get(save.replay);
  if (!deltas) {
    deltas = snapshots.slice(1).map((snapshot, i) => {
      const { units, ...state } = snapshot;
      const { units: previousUnits, ...previous } = snapshots[i]!;
      return {
        state: changes(state, previous),
        units: units.map((unit, j) => changes(unit, previousUnits[j]!)),
      };
    });
    encoded.set(save.replay, deltas);
  }
  return JSON.stringify({
    encoding: 'snapshot-deltas-v1',
    ...save,
    replay: { ...replay, initial: snapshots[0], deltas },
  });
}
export function decodeSave(text: string, time: TimeSource): LocalMatchCoordinator {
  const value = JSON.parse(text);
  if (value.encoding !== 'snapshot-deltas-v1') throw new Error('Unknown save encoding');
  delete value.encoding;
  if (value.replay) {
    const { initial, deltas, ...replay } = value.replay;
    if (!initial || !Array.isArray(deltas) || deltas.length > 450) throw new Error('Invalid trace');
    const snapshots: CombatState[] = [initial];
    for (const delta of deltas as Delta[]) {
      const previous = snapshots.at(-1)!;
      if (!Array.isArray(delta.units) || delta.units.length !== previous.units.length)
        throw new Error('Invalid units');
      snapshots.push({
        ...previous,
        ...delta.state,
        units: delta.units.map((unit, i) => ({ ...previous.units[i]!, ...unit })),
      });
    }
    value.replay = { ...replay, snapshots };
  }
  return LocalMatchCoordinator.restore(value, time);
}
