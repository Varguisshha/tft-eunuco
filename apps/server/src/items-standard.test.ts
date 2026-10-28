import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import {
  STANDARD_ITEMS_ECONOMY_CONFIG,
  ITEMS_ECONOMY_CONFIG,
  STANDARD_ITEM_CATALOG,
} from '@tft/game-data';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import {
  CATALOG,
  COMPOSITE_CATALOG,
  ITEM_CATALOG_HASH,
  STANDARD_ITEM_CATALOG_HASH,
} from './persistence/snapshot';
it('keeps literal historical fingerprints while adding the frozen standard catalog', () => {
  expect(CATALOG).toBe('6ea00046ac77e4b6d6a6da066fa9f7de2f3d79b921bb68c451820430e1773814');
  expect(COMPOSITE_CATALOG).toBe(
    '9d7856e10295c0b9a8385215d4727c0c024c6830f7eb73df5aee192103437365',
  );
  expect(ITEM_CATALOG_HASH).toBe(
    '3b28bee386abbbcf4ad39ebb9ea23bf0d7ea8dd0123686ec32d4290f37374e93',
  );
  expect(STANDARD_ITEM_CATALOG_HASH).not.toBe(ITEM_CATALOG_HASH);
});
it.each([ITEMS_ECONOMY_CONFIG, STANDARD_ITEMS_ECONOMY_CONFIG])(
  'restores exact item meaning, ownership and grants for $itemCatalog',
  (config) => {
    const match = new AuthoritativeMatch(randomUUID(), { now: () => 0 }, () => 42, 2, config);
    for (let i = 0; i < 2; i++) match.join(`s${i}`, { userId: randomUUID(), name: `P${i}` });
    match.start('s0');
    const id = match.players[0]!.id;
    match.grantItems(id, 'test', ['component-ad', 'component-mana']);
    const snapshot = JSON.parse(JSON.stringify(match.exportState()));
    const restored = AuthoritativeMatch.restore(snapshot, { now: () => 0 }, false);
    expect(restored.exportState()).toEqual(snapshot);
    restored.grantItems(id, 'test', ['component-ad', 'component-mana']);
    expect(restored.exportState()).toEqual(snapshot);
    expect(restored.players[0]!.state.config.itemCatalog).toBe(config.itemCatalog);
    expect(restored.players[0]!.state.items!.distributions).toEqual([]);
    snapshot.players[0].state.items.catalogVersion =
      config.itemCatalog === 'f0p8a-1' ? 'f0p8b-14.1-1' : 'f0p8a-1';
    expect(() => AuthoritativeMatch.restore(snapshot, { now: () => 0 }, false)).toThrow();
    if (config.itemCatalog === 'f0p8b-14.1-1') {
      for (const d of STANDARD_ITEM_CATALOG.definitions.filter((d) => d.kind === 'completed')) {
        expect(() => restored.grantItems(id, `bad-${d.id}`, [d.id])).toThrow('item-unavailable');
      }
      expect(restored.exportState()).toEqual(match.exportState());
    }
  },
);
