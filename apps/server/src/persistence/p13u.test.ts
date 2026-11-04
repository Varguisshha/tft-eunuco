import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { P13U_ECONOMY_CONFIG, P13_ECONOMY_CONFIG } from '@tft/game-data';
import { LOBBY_VERSION, reversePerspective } from '@tft/shared';
import { runCombat } from '@tft/game-core';
import { AuthoritativeMatch } from '../AuthoritativeMatch';
import { equip, fixtureUsers } from '../multi-fixture';
import { encodeStoredMatch, decodeStoredMatch } from './codec';
import { P13U_CATALOG_HASH, P13_CATALOG_HASH, P13S_CATALOG_HASH } from './snapshot';
const advance = (m: AuthoritativeMatch) => {
  m.clock.restore({ ...m.clock.snapshot(), remainingMs: 0 });
  m.pulse();
};
it.each([2, 3, 4] as const)(
  '%i players preserve definitive synergies, summons, shared pool and a single settlement across restore',
  (n) => {
    let m = new AuthoritativeMatch(
      randomUUID(),
      { now: () => 0 },
      () => 42,
      n,
      P13U_ECONOMY_CONFIG,
    );
    for (let i = 0; i < n; i++) m.join(`u-${i}`, { userId: fixtureUsers[i]!, name: `Local ${i}` });
    for (const p of m.players) {
      p.state.level = 7;
      p.state.xp = 0;
    }
    m.start('u-0');
    equip(m, undefined, ['jaramillo', 'peibol', 'vargas', 'dolea', 'florin']);
    advance(m);
    const snapshot = m.exportState();
    expect(snapshot.catalog).toBe(P13U_CATALOG_HASH);
    expect(snapshot.rules).toBe('f0p13u-1');
    for (const d of m.duels) {
      expect(runCombat(d.replay.input)).toEqual(d.replay);
      expect(reversePerspective(reversePerspective(d.replay))).toEqual(d.replay);
    }
    m = AuthoritativeMatch.restore(snapshot, { now: () => 0 }, false);
    advance(m);
    m.assertConservation();
    expect(m.settlements.size).toBe(n);
    for (const p of m.players)
      expect(p.state.ledger.filter((e) => e.reference === 'p13u-combat-gold-1')).toHaveLength(1);
    const settled = m.exportState();
    m.pulse();
    expect(m.exportState()).toEqual(settled);
  },
);
it('keeps exact published P13/S fingerprints and compressed historical snapshots readable', () => {
  expect(P13_CATALOG_HASH).toBe('ae4fae44b8648d52fc82d7b9f7129b283aa00c974ee1517af178fe13ecf4760d');
  expect(P13S_CATALOG_HASH).toBe(
    'f738f224b56e374b9e8225f63e2744c0b34ef2da91a03f2bf3f82cbfb10156d8',
  );
  expect(P13U_CATALOG_HASH).not.toBe(P13_CATALOG_HASH);
  const old = new AuthoritativeMatch(randomUUID(), undefined, undefined, 2, P13_ECONOMY_CONFIG);
  expect(AuthoritativeMatch.restore(old.exportState()).config).toEqual(P13_ECONOMY_CONFIG);
});
it('round-trips the new replay codec without changing the SQL envelope', () => {
  const m = new AuthoritativeMatch(
    randomUUID(),
    { now: () => 0 },
    () => 42,
    2,
    P13U_ECONOMY_CONFIG,
  );
  for (let i = 0; i < 2; i++)
    m.join(`codec-${i}`, { userId: fixtureUsers[i]!, name: `Local ${i}` });
  m.start('codec-0');
  equip(m, undefined, ['vargas', 'peibol']);
  advance(m);
  const authority = m.exportState();
  const document = {
    id: m.id,
    revision: 1,
    commitId: randomUUID(),
    status: 'active' as const,
    expiresAt: Date.now() + 60000,
    lobby: {
      version: LOBBY_VERSION,
      roomId: randomUUID(),
      roomCode: 'ABCDEFGH',
      hostUserId: fixtureUsers[0]!,
      capacity: 2 as const,
      status: 'in_match' as const,
      participants: m.players.map((p) => ({
        userId: p.id,
        name: p.name,
        avatarId: p.avatarId,
        connected: true,
        readyState: true,
      })),
      matchId: m.id,
      revision: 1,
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000,
    },
    authority,
  };
  expect(() => encodeStoredMatch(document)).not.toThrow();
  const packed = encodeStoredMatch(document);
  expect('packedDuels' in packed.authority).toBe(true);
  expect(decodeStoredMatch(packed)).toEqual(document);
  expect(
    AuthoritativeMatch.restore(
      decodeStoredMatch(packed).authority,
      { now: () => 0 },
      false,
    ).exportState(),
  ).toEqual(authority);
});
