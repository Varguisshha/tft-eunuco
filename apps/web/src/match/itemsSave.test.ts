import { it, expect } from 'vitest';
import { LocalMatchCoordinator, createMatch } from '@tft/game-core';
import { ITEMS_ECONOMY_CONFIG, JARAMILLO_ECONOMY_CONFIG } from '@tft/game-data';
import {
  fixture,
  unit,
  grant,
  act,
} from '../../../../packages/game-core/src/items/fixture.test-support';
import { encodeSave, decodeSave } from './automaticSave';
it('automatic save codec preserves crafted equipment, inventory, pending queue and owner in local DEV', () => {
  let s = fixture();
  unit(s);
  s = grant(s, ['component-ad', 'component-ad']);
  s = act(s, {
    type: 'combine_components',
    firstId: s.items!.components[0]!.id,
    secondId: s.items!.components[1]!.id,
  });
  s = act(s, { type: 'equip_item', itemId: s.items!.completed[0]!.id, unitId: 'unit-a' });
  s = grant(s, Array(17).fill('diagnostic-double-ad'));
  const c = new LocalMatchCoordinator(s, {
    matchId: 'dev-items-codec',
    time: { now: () => 0 },
    development: true,
  });
  c.start();
  const before = structuredClone(c.getMatch()),
    recovered = decodeSave(encodeSave(c.exportSave()), { now: () => 500000 });
  expect(recovered.getMatch()).toEqual(before);
  expect(recovered.getMatch().items!.pending).toHaveLength(1);
  expect(recovered.getMatch().units[0]!.equipment).toHaveLength(1);
  expect(recovered.getMatch().items!.crafts).toHaveLength(1);
});
it('automatic save keeps old matches inventory-free and restores empty new inventories explicitly', () => {
  for (const config of [JARAMILLO_ECONOMY_CONFIG, ITEMS_ECONOMY_CONFIG]) {
    const c = new LocalMatchCoordinator(createMatch(42, config), {
      matchId: 'item-version-codec',
      time: { now: () => 0 },
    });
    c.start();
    const recovered = decodeSave(encodeSave(c.exportSave()), { now: () => 10000 });
    expect(recovered.getMatch()).toEqual(c.getMatch());
    if (config.itemCatalog) expect(recovered.getMatch().items!.components).toEqual([]);
    else expect(recovered.getMatch()).not.toHaveProperty('items');
  }
});
