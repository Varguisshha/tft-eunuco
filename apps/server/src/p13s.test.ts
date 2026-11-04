import { expect, it } from 'vitest';
import { P13S_ECONOMY_CONFIG, PREDICTIONS } from '@tft/game-data';
import { runCombat } from '@tft/game-core';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import { equip, fixtureUsers, act, intent } from './multi-fixture';
import { P13S_CATALOG_HASH, P12F_CATALOG_HASH } from './persistence/snapshot';
import { encodeStoredMatch, decodeStoredMatch } from './persistence/codec';
import { randomUUID } from 'node:crypto';
import { LOBBY_VERSION } from '@tft/shared';
const advance = (m: AuthoritativeMatch) => {
  m.clock.restore({ ...m.clock.snapshot(), remainingMs: 0 });
  m.pulse();
};
function setup(n: 2 | 3 | 4) {
  const m = new AuthoritativeMatch(
    randomUUID(),
    { now: () => 0 },
    () => 360,
    n,
    P13S_ECONOMY_CONFIG,
  );
  for (let i = 0; i < n; i++)
    m.join(`socket-${i}`, { userId: fixtureUsers[i]!, name: `P13S ${i}` });
  for (const p of m.players) {
    p.state.level = 7;
    p.state.xp = 0;
  }
  m.start('socket-0');
  equip(m, undefined, ['dolea', 'vargas', 'danigm', 'peibol']);
  return m;
}
it.each([2, 3, 4] as const)(
  '%i authorities: hidden RNG, idempotent bets, combat, clones, restore, new fingerprint and one settlement per real player',
  (n) => {
    let m = setup(n);
    expect(m.exportState().catalog).toBe(P13S_CATALOG_HASH);
    expect(P13S_CATALOG_HASH).not.toBe(P12F_CATALOG_HASH);
    for (let i = 0; i < n; i++) {
      const p = m.players[i]!,
        market = p.state.synergies!.markets[0]!,
        kind = market.offers[0]!,
        cmd = intent(m, i, {
          type: 'select_prediction',
          kind,
          ...(PREDICTIONS[kind].unit ? { unitId: p.state.units[0]!.id } : {}),
        });
      expect(m.submit(p.sessionId, cmd).accepted).toBe(true);
      const gold = p.state.gold;
      expect(m.submit(p.sessionId, cmd).accepted).toBe(true);
      expect(p.state.gold).toBe(gold);
      expect(m.roundSnapshot(p.sessionId).own.synergies!.rng).toBe(0);
    }
    advance(m);
    expect(m.duels).toHaveLength(n === 2 ? 1 : 2);
    for (const d of m.duels) {
      expect(d.replay.input.rulesVersion).toBe('f0p13s-1');
      expect(runCombat(d.replay.input)).toEqual(d.replay);
    }
    const saved = m.exportState();
    m = AuthoritativeMatch.restore(saved, { now: () => 0 }, false);
    expect(m.duels).toEqual(saved.duels);
    advance(m);
    m.assertConservation();
    expect(m.settlements.size).toBe(n);
    for (const p of m.players) {
      expect(p.state.synergies!.receipts.filter((r) => r.kind === 'interest')).toHaveLength(1);
      expect(p.state.synergies!.receipts.filter((r) => r.kind === 'predictions')).toHaveLength(1);
    }
    const same = m.exportState();
    m.pulse();
    expect(m.exportState()).toEqual(same);
    advance(m);
    m.assertConservation();
    for (const p of m.players.filter((p) => !p.eliminated))
      expect(p.state.synergies!.markets).toHaveLength(2);
    const lobby = {
      version: LOBBY_VERSION,
      roomId: randomUUID(),
      roomCode: 'ABCDEFGH',
      hostUserId: fixtureUsers[0]!,
      capacity: n,
      participants: m.players.map((p) => ({
        userId: p.id,
        name: p.name,
        avatarId: p.avatarId,
        connected: true,
        readyState: true,
      })),
      status: 'in_match' as const,
      createdAt: Date.now(),
      expiresAt: Date.now() + 900000,
      matchId: m.id,
      revision: 1,
    };
    const document = {
      id: m.id,
      revision: 1,
      commitId: randomUUID(),
      status: 'active' as const,
      expiresAt: Date.now() + 900000,
      lobby,
      authority: m.exportState(),
    };
    expect(decodeStoredMatch(encodeStoredMatch(document))).toEqual(document);
    const restored = AuthoritativeMatch.restore(document.authority, { now: () => 0 }, false);
    restored.assertConservation();
    expect(restored.players.map((p) => p.state.synergies)).toEqual(
      m.players.map((p) => p.state.synergies),
    );
  },
);
it.each([2, 3, 4] as const)(
  '%i players: elimination/endgame and reconnect retain P13S receipts, do not grant clone-owner interests',
  (n) => {
    let m = setup(n);
    for (let i = 0; i < 150 && !m.finalResults; i++) {
      advance(m);
      m = AuthoritativeMatch.restore(m.exportState(), { now: () => 0 }, false);
      m.assertConservation();
    }
    expect(m.finalResults).not.toBeNull();
    const p = m.players[0]!,
      before = structuredClone(p.state.synergies);
    m.disconnect(p.sessionId);
    expect(m.resume('rejoined', p.id)).not.toBeNull();
    expect(m.players[0]!.state.synergies).toEqual(before);
    for (const player of m.players) {
      const rounds = player.state
        .synergies!.receipts.filter((r) => r.kind === 'interest')
        .map((r) => r.round);
      expect(new Set(rounds).size).toBe(rounds.length);
    }
    expect(act(m, 0, { type: 'select_prediction', kind: 'survival' }).accepted).toBe(false);
  },
  60000,
);
