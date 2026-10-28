import { it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AuthoritativeMatch } from '../AuthoritativeMatch';
import { act, equip, fixtureUsers, intent } from '../multi-fixture';
import { ROSTER_ECONOMY_CONFIG } from '@tft/game-data';
import { runCombat } from '@tft/game-core';
import * as hashes from './snapshot';
it('preserves every previous fingerprint exactly', () => {
  const expected = {
    CATALOG: '6ea00046ac77e4b6d6a6da066fa9f7de2f3d79b921bb68c451820430e1773814',
    COMPOSITE_CATALOG: '9d7856e10295c0b9a8385215d4727c0c024c6830f7eb73df5aee192103437365',
    DROP_ITEM_CATALOG_HASH: 'd4df4a0d295e1222d3239933419f8a87012141ffc4545fcb113b00f6096291cf',
    EFFECT_ITEM_CATALOG_HASH: '8107c0053d8c6445ad25607ab14cea7c6fe296a1271dbe2223819b8d9f9a3e5a',
    FLORIN_CATALOG_HASH: '3844748d2c84597e79f8e80883754a33b77dec1b7247109b2b747d422baa9499',
    INTEGRATED_CATALOG_HASH: '9e6339d7b3493ad4f0751c50de7da0a9a8e3e9f89fcbbf759c3d3fb26109a975',
    ITEM_CATALOG_HASH: '3b28bee386abbbcf4ad39ebb9ea23bf0d7ea8dd0123686ec32d4290f37374e93',
    STANDARD_ITEM_CATALOG_HASH: '082b6bdf5fb3d91865720fa0b919fd3222347d92e8ad96f8e52b532c24267d72',
  };
  for (const [key, value] of Object.entries(expected))
    expect(hashes[key as keyof typeof expected]).toBe(value);
  expect(Object.values(expected)).not.toContain(hashes.ROSTER_CATALOG_HASH);
});
it.each([2, 3, 4] as const)(
  'P10A %i players preserve private shops, deterministic combat, item grants, drops, receipts and reconnection',
  (capacity) => {
    let now = 0;
    const match = new AuthoritativeMatch(
      randomUUID(),
      { now: () => now },
      () => 42,
      capacity,
      ROSTER_ECONOMY_CONFIG,
    );
    for (let i = 0; i < capacity; i++)
      match.join(`socket-${i}`, { userId: fixtureUsers[i]!, name: `Roster ${i}` });
    match.start('socket-0');
    expect(Object.keys(match.pool).sort()).toEqual(['dolea', 'florin', 'jaramillo', 'vargas']);
    expect(
      match.players
        .flatMap((p) => p.state.shop)
        .filter(Boolean)
        .every((o) => Object.hasOwn(match.pool, o!.definitionId)),
    ).toBe(true);
    const request = intent(match, 0, {
      type: 'buy_unit',
      offerId: match.players[0]!.state.shop[0]!.id,
    });
    expect(match.submit('socket-0', request).accepted).toBe(true);
    expect(
      act(match, 0, { type: 'sell_unit', unitId: match.players[0]!.state.units[0]!.id }).accepted,
    ).toBe(true);
    equip(match, undefined, ['dolea', 'florin']);
    match.grantItems(match.players[0]!.id, 'p10a-real-item', ['item-forge-ap--armor']);
    expect(
      act(match, 0, {
        type: 'equip_item',
        unitId: match.players[0]!.state.units[0]!.id,
        itemId: match.players[0]!.state.items!.completed[0]!.id,
      }).accepted,
    ).toBe(true);
    const advance = () => {
      now += match.clock.snapshot().remainingMs;
      match.pulse();
    };
    for (let i = 0; i < 8; i++) advance();
    expect(match.exportState().itemDrops!.rounds.map((r) => r.round)).toEqual([3]);
    match.assertConservation();
    for (const duel of match.duels) {
      expect(duel.replay.input.rulesVersion).toBe('f0p10a-1');
      expect(runCombat(duel.replay.input)).toEqual(duel.replay);
    }
    const saved = match.exportState();
    expect(saved.catalog).toBe(hashes.ROSTER_CATALOG_HASH);
    const restored = AuthoritativeMatch.restore(saved, { now: () => now });
    restored.resume('new-roster-session', fixtureUsers[0]!);
    expect(restored.players.map((p) => p.state.units)).toEqual(
      match.players.map((p) => p.state.units),
    );
    expect(restored.exportState().duels).toEqual(saved.duels);
    expect(restored.exportState().itemDrops).toEqual(saved.itemDrops);
    expect(restored.exportState().settlements).toEqual(saved.settlements);
    expect(hashes.snapshotConfig(saved.rules, saved.catalog)).toEqual(ROSTER_ECONOMY_CONFIG);
  },
);
