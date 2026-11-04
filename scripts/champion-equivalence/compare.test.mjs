import { expect, it } from 'vitest';
import { firstDifference } from './compare.mjs';
it('detects an intermediate event/state mutation while the winner is unchanged', () => {
  const a = {
    snapshots: [{ tick: 7, units: [{ hp: 53 }] }],
    events: [{ tick: 7, order: 2, type: 'damage', payload: { amount: 12 } }],
    result: { winner: 'south' },
  };
  expect(firstDifference(a, globalThis.structuredClone(a))).toBeNull();
  const event = globalThis.structuredClone(a);
  event.events[0].payload.amount++;
  expect(event.result).toEqual(a.result);
  expect(firstDifference(a, event)).toMatchObject({ path: '$.events[0].payload.amount', tick: 7 });
  const state = globalThis.structuredClone(a);
  state.snapshots[0].units[0].hp--;
  expect(state.result).toEqual(a.result);
  expect(firstDifference(a, state)).toMatchObject({ path: '$.snapshots[0].units[0].hp', tick: 7 });
});
it('does not hide null, absent/undefined, array order, sparse arrays, keys or numeric distinctions', () => {
  for (const [a, b] of [
    [{}, { x: null }],
    [{ x: undefined }, {}],
    [
      [1, 2],
      [2, 1],
    ],
    [0, -0],
    [Array(1), []],
    [
      { a: 1, b: 2 },
      { b: 2, a: 1 },
    ],
  ])
    expect(firstDifference(a, b)).not.toBeNull();
});

import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { championAuthoringCatalog } from '../../packages/game-data/src/champions/authoring.ts';
import { SPLASH_ARTS } from '../../apps/web/src/game/splashArtCatalog.ts';
it('resolves actual sprite/splash references for four complete champions and 30 nominal fallbacks', () => {
  const manifests = JSON.parse(
    readFileSync(new URL('../../apps/web/src/assets/characters.json', import.meta.url), 'utf8'),
  );
  for (const v of championAuthoringCatalog()) {
    if (v.identity.provisional) {
      expect(v.assets.spriteId).toBe(`provisional-${v.identity.id}`);
      expect(v.assets.splashArtKey).toBeNull();
    } else {
      expect(manifests.some((m) => m.id === v.assets.spriteId)).toBe(true);
      expect(SPLASH_ARTS[v.identity.id].splashArtKey).toBe(v.assets.splashArtKey);
    }
  }
});
