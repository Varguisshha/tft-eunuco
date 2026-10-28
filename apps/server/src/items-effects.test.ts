import { randomUUID } from 'node:crypto';
import { it, expect } from 'vitest';
import { EFFECT_ITEMS_ECONOMY_CONFIG, EXECUTABLE_ITEM_CATALOG } from '@tft/game-data';
import { LOBBY_VERSION } from '@tft/shared';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import { equip, act } from './multi-fixture';
import { encodeStoredMatch, decodeStoredMatch } from './persistence/codec';
import {
  EFFECT_ITEM_CATALOG_HASH,
  STANDARD_ITEM_CATALOG_HASH,
  type StoredMatch,
} from './persistence/snapshot';
function setup(count: 2 | 3 | 4) {
  const m = new AuthoritativeMatch(
    randomUUID(),
    { now: () => 0 },
    undefined,
    count,
    EFFECT_ITEMS_ECONOMY_CONFIG,
  );
  for (let i = 0; i < count; i++) m.join(`s${i}`, { userId: randomUUID(), name: `P${i}` });
  m.start('s0');
  equip(m);
  for (let i = 0; i < count; i++) {
    const p = m.players[i]!;
    m.grantItems(p.id, 'items', ['item-forge-attack_speed--magic_resist', 'item-forge-ap--armor']);
    for (const [j, item] of [...p.state.items!.completed].entries())
      expect(
        act(m, i, { type: 'equip_item', unitId: p.state.units[j]!.id, itemId: item.id }).accepted,
      ).toBe(true);
  }
  return m;
}
function store(m: AuthoritativeMatch): StoredMatch {
  return {
    id: m.id,
    revision: 1,
    commitId: randomUUID(),
    status: 'active',
    expiresAt: Date.now() + 3600000,
    authority: m.exportState(),
    lobby: {
      version: LOBBY_VERSION,
      roomId: randomUUID(),
      roomCode: 'ABCDEFGH',
      hostUserId: m.players[0]!.id,
      capacity: m.capacity,
      participants: m.players.map((p) => ({
        userId: p.id,
        name: p.name,
        avatarId: p.avatarId,
        readyState: true,
        connected: true,
      })),
      status: 'in_match',
      createdAt: 0,
      expiresAt: Date.now() + 3600000,
      matchId: m.id,
      revision: 1,
    },
  };
}
it.each([2, 3, 4] as const)(
  '%i players preserve equipment, ghost copies, causal traces and results across restore',
  (count) => {
    const m = setup(count),
      saved = m.exportState();
    const restored = AuthoritativeMatch.restore(
      JSON.parse(JSON.stringify(saved)),
      { now: () => 0 },
      false,
    );
    expect(restored.exportState()).toEqual(saved);
    for (const game of [m, restored]) {
      game.clock.restore({ ...game.clock.snapshot(), remainingMs: 0 });
      game.pulse();
    }
    expect(restored.duels).toEqual(m.duels);
    expect(
      m.duels.every((d) =>
        d.replay.events.some((e) => e.type === 'damage' && e.payload.itemSource),
      ),
    ).toBe(true);
    const document = store(m),
      encoded = encodeStoredMatch(document);
    expect(decodeStoredMatch(encoded)).toEqual(document);
    expect(encodeStoredMatch(document)).toEqual(encoded);
    expect(Buffer.byteLength(JSON.stringify(encoded))).toBeLessThan(
      Buffer.byteLength(JSON.stringify(document)) / 3,
    );
    const again = AuthoritativeMatch.restore(
      decodeStoredMatch(encoded).authority,
      { now: () => 0 },
      false,
    );
    expect(again.duels).toEqual(m.duels);
    expect(again.exportState().simulations).toBe(m.exportState().simulations);
    for (const game of [m, again]) {
      game.clock.restore({ ...game.clock.snapshot(), remainingMs: 0 });
      game.pulse();
    }
    expect(again.finalResults).toEqual(m.finalResults);
    expect(again.players.map((p) => p.state.gold)).toEqual(m.players.map((p) => p.state.gold));
  },
);
it('compressed persistence rejects corrupt, oversized, wrong-version or double-encoded traces', () => {
  const m = setup(2);
  m.clock.restore({ ...m.clock.snapshot(), remainingMs: 0 });
  m.pulse();
  const encoded = encodeStoredMatch(store(m));
  if (!('packedDuels' in encoded.authority)) throw Error();
  const copy = structuredClone(encoded);
  if (!('packedDuels' in copy.authority)) throw Error();
  copy.authority.packedDuels.sha256 = '0'.repeat(64);
  expect(() => decodeStoredMatch(copy)).toThrow('integrity');
  copy.authority.packedDuels.bytes = 200 * 1024 * 1024;
  expect(() => decodeStoredMatch(copy)).toThrow();
  copy.authority.catalog = STANDARD_ITEM_CATALOG_HASH;
  expect(() => decodeStoredMatch(copy)).toThrow('envelope');
  expect(() =>
    decodeStoredMatch({ ...encoded, authority: { ...encoded.authority, duels: m.duels } }),
  ).toThrow('envelope');
});
it('new catalog is distinct while frozen P8B fingerprint remains exact', () => {
  expect(STANDARD_ITEM_CATALOG_HASH).toBe(
    '082b6bdf5fb3d91865720fa0b919fd3222347d92e8ad96f8e52b532c24267d72',
  );
  expect(EFFECT_ITEM_CATALOG_HASH).not.toBe(STANDARD_ITEM_CATALOG_HASH);
  expect(
    EXECUTABLE_ITEM_CATALOG.definitions.filter(
      (d) => d.kind === 'completed' && d.availability === 'available',
    ),
  ).toHaveLength(36);
});
