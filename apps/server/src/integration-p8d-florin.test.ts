import { it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  INTEGRATED_ECONOMY_CONFIG,
  DROP_ITEMS_ECONOMY_CONFIG,
  FLORIN_ECONOMY_CONFIG,
  EFFECT_ITEMS_ECONOMY_CONFIG,
  STANDARD_ITEMS_ECONOMY_CONFIG,
  ITEMS_ECONOMY_CONFIG,
  JARAMILLO_ECONOMY_CONFIG,
  VARGAS_ECONOMY_CONFIG,
  matchCatalog,
  traitsFor,
} from '@tft/game-data';
import * as snapshots from './persistence/snapshot';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import { planItemDrop } from './item-drops';
import { fixtureUsers } from './multi-fixture';
it('freezes all seven historical fingerprints', () => {
  expect([
    snapshots.CATALOG,
    snapshots.COMPOSITE_CATALOG,
    snapshots.ITEM_CATALOG_HASH,
    snapshots.STANDARD_ITEM_CATALOG_HASH,
    snapshots.EFFECT_ITEM_CATALOG_HASH,
    snapshots.DROP_ITEM_CATALOG_HASH,
    snapshots.FLORIN_CATALOG_HASH,
  ]).toEqual([
    '6ea00046ac77e4b6d6a6da066fa9f7de2f3d79b921bb68c451820430e1773814',
    '9d7856e10295c0b9a8385215d4727c0c024c6830f7eb73df5aee192103437365',
    '3b28bee386abbbcf4ad39ebb9ea23bf0d7ea8dd0123686ec32d4290f37374e93',
    '082b6bdf5fb3d91865720fa0b919fd3222347d92e8ad96f8e52b532c24267d72',
    '8107c0053d8c6445ad25607ab14cea7c6fe296a1271dbe2223819b8d9f9a3e5a',
    'd4df4a0d295e1222d3239933419f8a87012141ffc4545fcb113b00f6096291cf',
    '3844748d2c84597e79f8e80883754a33b77dec1b7247109b2b747d422baa9499',
  ]);
});
it.each([
  VARGAS_ECONOMY_CONFIG,
  JARAMILLO_ECONOMY_CONFIG,
  ITEMS_ECONOMY_CONFIG,
  STANDARD_ITEMS_ECONOMY_CONFIG,
  EFFECT_ITEMS_ECONOMY_CONFIG,
  DROP_ITEMS_ECONOMY_CONFIG,
  FLORIN_ECONOMY_CONFIG,
  INTEGRATED_ECONOMY_CONFIG,
])('restores explicit configuration without upgrading historical semantics %#', (config) => {
  const m = new AuthoritativeMatch(randomUUID(), { now: () => 0 }, undefined, 2, config);
  fixtureUsers.slice(0, 2).forEach((userId, i) => m.join(`s${i}`, { userId, name: `Player${i}` }));
  m.start('s0');
  const snapshot = m.exportState();
  expect(AuthoritativeMatch.restore(snapshot, { now: () => 0 }, false).exportState()).toEqual(
    snapshot,
  );
  expect(!!snapshot.itemDrops).toBe(config.itemCatalog === 'f0p8d-1');
});
it('consolidates four characters and traits without changing the drop mapping', () => {
  expect(matchCatalog(INTEGRATED_ECONOMY_CONFIG).map((d) => d.id)).toEqual(
    matchCatalog(FLORIN_ECONOMY_CONFIG).map((d) => d.id),
  );
  expect(traitsFor('f0p8d-florin-1')).toEqual(traitsFor('florin-1'));
  const id = randomUUID();
  const games = [DROP_ITEMS_ECONOMY_CONFIG, INTEGRATED_ECONOMY_CONFIG].map((config) => {
    const m = new AuthoritativeMatch(id, { now: () => 0 }, undefined, 4, config);
    const s = m.exportState();
    s.itemDrops!.seed = 123;
    const fixed = AuthoritativeMatch.restore(s, { now: () => 0 }, false);
    fixtureUsers.forEach((userId, i) => fixed.join(`s${i}`, { userId, name: `Player${i}` }));
    fixed.start('s0');
    for (let i = 0; i < 8; i++) {
      fixed.clock.restore({ ...fixed.clock.snapshot(), remainingMs: 0 });
      fixed.pulse();
    }
    return fixed.exportState().itemDrops!;
  });
  expect(games[0]).toEqual(games[1]);
  const plan = planItemDrop(id, 3, 123, fixtureUsers);
  expect(games[1]!.rounds[0]!.players.map((p) => p.definitionIds)).toEqual(
    plan.players.map((p) => p.definitionIds),
  );
});
