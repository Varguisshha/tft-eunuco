import { BaseSequencer, type TestSpecification } from 'vitest/node';
const budgets = [
  'packages/game-core/src/items/stabilization.test.ts',
  'apps/web/src/game/itemPlayback.test.ts',
];
/** Keep every spec; measure fixed budgets before long network/crash campaigns. */
export function budgetFirst<T extends { moduleId: string }>(files: T[]): T[] {
  return [...files].sort((a, b) => {
    const priority = (f: T) => {
      const i = budgets.findIndex((name) => f.moduleId.endsWith('/' + name));
      return i < 0 ? budgets.length : i;
    };
    return priority(a) - priority(b);
  });
}
export default class ReleaseSequencer extends BaseSequencer {
  async sort(files: TestSpecification[]) {
    return budgetFirst(await super.sort(files));
  }
}
