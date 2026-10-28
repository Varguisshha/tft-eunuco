import { randomUUID } from 'node:crypto';
import { it, expect } from 'vitest';
import {
  FLORIN_ECONOMY_CONFIG,
  FLORIN_TUNING,
  FLORIN_COMBAT_PROFILES,
  traitsFor,
  EXECUTABLE_ITEM_CATALOG,
} from '@tft/game-data';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import { equip, act } from './multi-fixture';
import {
  FLORIN_CATALOG_HASH,
  snapshotConfig,
  EFFECT_ITEM_CATALOG_HASH,
  STANDARD_ITEM_CATALOG_HASH,
} from './persistence/snapshot';
import { encodeStoredMatch, decodeStoredMatch } from './persistence/codec';
import { LOBBY_VERSION } from '@tft/shared';
it.each([2, 3, 4] as const)(
  '%i player Florin matches preserve owner, 3-item equipment, receipts, replays, presence and progress across recovery',
  (count) => {
    const m = new AuthoritativeMatch(
      randomUUID(),
      { now: () => 0 },
      undefined,
      count,
      FLORIN_ECONOMY_CONFIG,
    );
    for (let i = 0; i < count; i++) m.join(`s${i}`, { userId: randomUUID(), name: `P${i}` });
    m.start('s0');
    equip(m, undefined, ['florin', 'jaramillo']);
    for (let i = 0; i < count; i++) {
      const p = m.players[i]!;
      m.grantItems(p.id, 'florin-three', [
        'item-forge-ad--ad',
        'item-forge-ap--ap',
        'item-forge-armor--armor',
      ]);
      for (const item of [...p.state.items!.completed])
        expect(
          act(m, i, { type: 'equip_item', unitId: p.state.units[0]!.id, itemId: item.id }).accepted,
        ).toBe(true);
    }
    const before = m.exportState();
    expect(before.catalog).toBe(FLORIN_CATALOG_HASH);
    expect(before.catalog).not.toBe(EFFECT_ITEM_CATALOG_HASH);
    expect(before.catalog).not.toBe(STANDARD_ITEM_CATALOG_HASH);
    expect(snapshotConfig(before.rules, before.catalog)).toEqual(FLORIN_ECONOMY_CONFIG);
    const restored = AuthoritativeMatch.restore(
      JSON.parse(JSON.stringify(before)),
      { now: () => 0 },
      false,
    );
    expect(restored.exportState()).toEqual(before);
    for (const game of [m, restored]) {
      game.clock.restore({ ...game.clock.snapshot(), remainingMs: 0 });
      game.pulse();
    }
    expect(restored.duels).toEqual(m.duels);
    expect(m.duels.every((d) => d.replay.input.rulesVersion === 'florin-1')).toBe(true);
    const state = m.exportState();
    const lobby = {
      version: LOBBY_VERSION,
      roomId: randomUUID(),
      roomCode: 'ABCDEFGH',
      hostUserId: m.players[0]!.id,
      capacity: count,
      participants: m.players.map((p) => ({
        userId: p.id,
        name: p.name,
        avatarId: p.avatarId,
        readyState: true,
        connected: true,
      })),
      status: 'in_match' as const,
      createdAt: 0,
      expiresAt: 3600000,
      matchId: m.id,
      revision: 1,
    };
    const document = {
      id: m.id,
      revision: 1,
      commitId: randomUUID(),
      expiresAt: 3600000,
      status: 'active' as const,
      lobby,
      authority: state,
    };
    expect(decodeStoredMatch(encodeStoredMatch(document))).toEqual(document);
    const recovered = AuthoritativeMatch.restore(
      decodeStoredMatch(encodeStoredMatch(document)).authority,
      { now: () => 0 },
      false,
    );
    expect(recovered.exportState()).toEqual(state);
    expect(recovered.players[0]!.state.units[0]!.equipment).toHaveLength(3);
    expect(recovered.players[0]!.state.items!.ownerId).toBe(m.players[0]!.id);
    expect(m.duels.flatMap((d) => d.replay.events).some((e) => e.type === 'unit_presence')).toBe(
      true,
    );
    expect(Object.keys(FLORIN_COMBAT_PROFILES)).toContain('florin');
    expect(traitsFor('florin-1')).toHaveLength(8);
    expect(FLORIN_TUNING.version).toBe('florin-1');
    expect(EXECUTABLE_ITEM_CATALOG.definitions.filter((d) => d.kind === 'completed')).toHaveLength(
      36,
    );
  },
);
