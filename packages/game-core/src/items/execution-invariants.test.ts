import { it, expect } from 'vitest';
import {
  EFFECT_ITEMS_ECONOMY_CONFIG as config,
  EXECUTABLE_ITEM_CATALOG as catalog,
} from '@tft/game-data';
import { createMatch, commandFor, applyMatchAction, combine } from '../match/engine';
import { validateMatchState } from '../match/invariants';
import { allItemInstances, grantItemInstances } from './inventory';
import { unit, act } from './fixture.test-support';
it('seeded command sequences conserve every issued instance through crafting, equips, failures, merges and sales', () => {
  const definitions = catalog.definitions.filter((d) => d.kind === 'completed');
  for (let seed = 0; seed < 64; seed++) {
    let s = createMatch(seed, config);
    unit(s, 'u');
    const d = definitions[seed % definitions.length]!;
    grantItemInstances(s, 'pair', d.recipe);
    const ids = s.items!.components.map((i) => i.id);
    s = act(s, { type: 'equip_item', unitId: 'u', itemId: ids[0]! });
    s = act(s, { type: 'equip_item', unitId: 'u', itemId: ids[1]! });
    expect(s.units[0]!.equipment![0]!.definitionId).toBe(d.id);
    expect(allItemInstances(s)).toHaveLength(1);
    grantItemInstances(s, 'copy', [d.id]);
    const before = structuredClone(s);
    const result = applyMatchAction(
      s,
      commandFor(s, { type: 'equip_item', unitId: 'u', itemId: s.items!.completed[0]!.id }),
    );
    if (result.ok) s = result.state;
    else expect(result.state).toEqual(before);
    for (let i = 0; i < 4; i++) {
      const prior = structuredClone(s);
      expect(
        applyMatchAction(s, commandFor(s, { type: 'equip_item', unitId: 'u', itemId: ids[i % 2]! }))
          .ok,
      ).toBe(false);
      expect(s).toEqual(prior);
      validateMatchState(s);
    }
    s = act(s, { type: 'sell_unit', unitId: 'u' });
    expect(allItemInstances(s)).toHaveLength(2);
    expect(new Set(allItemInstances(s).map((i) => i.id)).size).toBe(2);
    expect(s.items!.completed).toHaveLength(2);
    validateMatchState(s);
  }
});

it('star fusion preserves the three-slot glove and returns surplus objects without losing instances', () => {
  let s = createMatch(42, config);
  for (let i = 0; i < 3; i++) unit(s, `u${i}`, 1, i, 'vargas');
  grantItemInstances(s, 'g', [
    'item-forge-critical--critical',
    'item-forge-health--health',
    'item-forge-health--health',
  ]);
  for (const [i, item] of [...s.items!.completed].entries())
    s = act(s, { type: 'equip_item', unitId: `u${i}`, itemId: item.id });
  const ids = allItemInstances(s)
    .map((i) => i.id)
    .sort();
  combine(s);
  validateMatchState(s);
  expect(s.units).toHaveLength(1);
  expect(s.units[0]!.stars).toBe(2);
  expect(s.units[0]!.equipment).toHaveLength(1);
  expect(s.items!.completed).toHaveLength(2);
  expect(
    allItemInstances(s)
      .map((i) => i.id)
      .sort(),
  ).toEqual(ids);
});
