import { it, expect } from 'vitest';
import { budgetFirst } from './sequencer.ts';
it('orders both fixed budgets first without dropping, duplicating or mutating any specification', () => {
  const files = [
    'other',
    'apps/web/src/game/itemPlayback.test.ts',
    'last',
    'packages/game-core/src/items/stabilization.test.ts',
  ].map((p) => ({ moduleId: '/repo/' + p }));
  const before = [...files],
    sorted = budgetFirst(files);
  expect(sorted).toEqual([files[3], files[1], files[0], files[2]]);
  expect(new Set(sorted)).toEqual(new Set(files));
  expect(files).toEqual(before);
});
