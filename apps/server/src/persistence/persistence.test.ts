import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { commandFor } from '@tft/game-core';
import type { MatchCommand } from '@tft/shared';
import { equip } from '../multi-fixture';
import { AuthoritativeMatch } from '../AuthoritativeMatch';
import { DurableMatch } from './DurableMatch';
import { type MatchRepository } from './repository';
import { type StoredMatch } from './snapshot';
import {
  COMPETITIVE_VERSION,
  LOBBY_VERSION,
  NETWORK_VERSION,
  type LobbySnapshot,
} from '@tft/shared';
class Memory implements MatchRepository {
  data: StoredMatch | null = null;
  fail = false;
  ambiguous = false;
  async commit(expected: number, s: StoredMatch) {
    if (this.fail) throw new Error('offline');
    if (this.data?.commitId === s.commitId) return;
    if ((this.data?.revision ?? 0) !== expected) throw new Error('conflict');
    this.data = structuredClone(s);
    if (this.ambiguous) {
      this.ambiguous = false;
      throw new Error('response lost');
    }
  }
  async load() {
    return this.data ? [structuredClone(this.data)] : [];
  }
}
function setup(capacity: 2 | 3 | 4 = 2, seed = 42) {
  let now = 1000;
  const m = new AuthoritativeMatch(randomUUID(), { now: () => now }, () => seed, capacity);
  for (let i = 0; i < capacity; i++) m.join(`s${i}`, { userId: randomUUID(), name: `Player${i}` });
  m.start('s0');
  const lobby: LobbySnapshot = {
    version: LOBBY_VERSION,
    roomId: randomUUID(),
    roomCode: 'ABCDEFGH',
    hostUserId: m.players[0]!.id,
    capacity,
    participants: m.players.map((p) => ({
      userId: p.id,
      name: p.name,
      avatarId: p.avatarId,
      readyState: true,
      connected: true,
    })),
    status: 'in_match',
    createdAt: Date.now(),
    expiresAt: Date.now() + 900000,
    matchId: m.id,
    revision: 1,
  };
  return {
    m,
    lobby,
    advance: (ms: number) => {
      now += ms;
      m.pulse();
    },
  };
}
function buy(m: AuthoritativeMatch) {
  const p = m.players[0]!;
  return {
    version: NETWORK_VERSION,
    sessionId: p.sessionId,
    requestId: randomUUID(),
    sequence: p.sequence,
    matchId: m.id,
    phaseId: m.clock.snapshot().phaseId,
    action: {
      type: 'buy_unit' as const,
      expectedRevision: p.state.revision,
      seq: p.state.nextActionSeq,
      offerId: p.state.shop.find(Boolean)!.id,
    },
  };
}
describe('durable authoritative state', () => {
  it.each([2, 3, 4] as const)(
    '%i participants restore exact economy, pool, clock and disconnected roster',
    (capacity) => {
      const { m, advance } = setup(capacity);
      m.submit('s0', buy(m));
      advance(1300);
      const saved = m.exportState();
      const r = AuthoritativeMatch.restore(JSON.parse(JSON.stringify(saved)), {
        now: () => 500000,
      });
      expect(r.players.map((p) => p.state)).toEqual(m.players.map((p) => p.state));
      expect(r.pool).toEqual(m.pool);
      expect(r.clock.snapshot().remainingMs).toBe(28700);
      expect(r.clock.snapshot().phaseDeadline).toBe(528700);
      expect(r.players.every((p) => !p.connected)).toBe(true);
    },
  );
  it('rejects corrupt pool, version, catalog and invalid traces', () => {
    const { m } = setup();
    const s = m.exportState();
    expect(() => AuthoritativeMatch.restore({ ...s, schema: 2 })).toThrow();
    expect(() => AuthoritativeMatch.restore({ ...s, catalog: 'old' })).toThrow();
    s.pool[Object.keys(s.pool)[0]!]!++;
    expect(() => AuthoritativeMatch.restore(s)).toThrow();
  });
  it('does not publish a failed purchase, retries ambiguous commit exactly once', async () => {
    const { m, lobby } = setup();
    const repo = new Memory();
    const d = new DurableMatch(m, repo, lobby);
    await d.run(() => {});
    const before = d.match.players[0]!.state.gold;
    repo.ambiguous = true;
    const c = buy(d.match);
    await expect(d.run((x) => x.submit('s0', c))).rejects.toThrow();
    expect(d.match.players[0]!.state.gold).toBe(before);
    expect(d.unavailable).toBe(true);
    expect(repo.data!.authority.players[0]!.state.gold).toBeLessThan(before);
    const restored = AuthoritativeMatch.restore(repo.data!.authority);
    restored.resume('new', restored.players[0]!.id);
    const receipt = restored.submit('new', { ...c, sessionId: 'new' });
    expect(receipt.accepted).toBe(true);
    expect(restored.players[0]!.state.gold).toBe(repo.data!.authority.players[0]!.state.gold);
  });
  it('serializes simultaneous commands and rejects storage outage without acknowledgement', async () => {
    const { m, lobby } = setup();
    const repo = new Memory();
    const d = new DurableMatch(m, repo, lobby);
    const c = buy(m);
    const results = await Promise.all([
      d.run((x) => x.submit('s0', c)),
      d.run((x) => x.submit('s0', c)),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect(d.match.players[0]!.state.units).toHaveLength(1);
    repo.fail = true;
    await expect(d.run((x) => x.submit('s0', buy(x)))).rejects.toThrow();
    expect(d.match.players[0]!.state.units).toHaveLength(1);
  });
  it.each([2, 3, 4] as const)(
    'restores %i combat traces and resolution ledgers without resimulation',
    (capacity) => {
      const { m, advance } = setup(capacity);
      advance(30000);
      const s = m.exportState();
      const r = AuthoritativeMatch.restore(s);
      expect(r.duels).toEqual(m.duels);
      expect(r.simulations).toBe(m.simulations);
      advance(45600);
      const settled = AuthoritativeMatch.restore(m.exportState());
      expect([...settled.settlements]).toEqual([...m.settlements]);
      expect(settled.finalResults).toEqual(m.finalResults);
      expect(settled.players.map((p) => p.state.gold)).toEqual(m.players.map((p) => p.state.gold));
    },
  );
  it('restores Overtime at the saved tick and later elimination/final without extra rewards', () => {
    const { m, advance } = setup(4);
    equip(m, undefined, ['test-k01']);
    advance(30000);
    advance(31000);
    const overtime = AuthoritativeMatch.restore(m.exportState(), { now: () => 1 });
    expect(overtime.clock.snapshot().phaseDuration - overtime.clock.snapshot().remainingMs).toBe(
      31000,
    );
    expect(overtime.duels).toEqual(m.duels);
    for (let round = 0; round < 80 && !m.finalResults; round++)
      advance(m.clock.snapshot().remainingMs);
    expect(m.finalResults).not.toBeNull();
    const final = AuthoritativeMatch.restore(m.exportState());
    expect(final.finalResults).toEqual(m.finalResults);
    expect(final.players.every((p) => p.poolReleased || !p.eliminated)).toBe(true);
    const gold = final.players.map((p) => p.state.gold);
    final.pulse();
    expect(final.players.map((p) => p.state.gold)).toEqual(gold);
  });
  it('keeps one monotonic origin across restored combat and next phases', async () => {
    const { m, lobby, advance } = setup();
    advance(30000);
    const restored = AuthoritativeMatch.restore(m.exportState(), { now: () => 0 }, false);
    const d = new DurableMatch(restored, new Memory(), lobby);
    const initial = d.match.clock.now();
    await d.run((x) => {
      const c = x.clock.snapshot();
      x.clock.restore({ ...c, remainingMs: 0 });
      x.pulse();
    });
    const resolutionTime = d.match.clock.now();
    expect(resolutionTime).toBeGreaterThanOrEqual(initial);
    await d.run(() => {});
    expect(d.match.clock.now()).toBeGreaterThanOrEqual(resolutionTime);
  });

  it('persists fusion, movement, sale, XP, reroll and shop lock through repeated restores', async () => {
    const { m, lobby } = setup();
    // Reserve an explicit three-copy shop fixture through the real shared pool.
    const player = m.players[0]!;
    for (const offer of player.state.shop) if (offer) m.pool[offer.definitionId]!++;
    player.state.shop = Array.from({ length: 5 }, (_, i) =>
      i < 3 ? { id: `fusion-offer-${i}`, definitionId: 'test-k01' } : null,
    );
    m.pool['test-k01']! -= 3;
    for (const p of m.players) p.state.pool = { ...m.pool };
    m.assertConservation();
    const repo = new Memory();
    let d = new DurableMatch(m, repo, lobby);
    const commit = async (action: MatchCommand) => {
      const p = d.match.players[0]!;
      const c = {
        version: NETWORK_VERSION,
        sessionId: p.sessionId,
        requestId: randomUUID(),
        sequence: p.sequence,
        matchId: m.id,
        phaseId: d.match.clock.snapshot().phaseId,
        action: commandFor(p.state, action),
      };
      expect((await d.run((x) => x.submit(p.sessionId, c))).accepted).toBe(true);
      const saved = repo.data!;
      const restored = AuthoritativeMatch.restore(saved.authority, undefined, false);
      expect(restored.pool).toEqual(d.match.pool);
      expect(restored.players[0]!.state).toEqual(d.match.players[0]!.state);
      d = new DurableMatch(restored, repo, lobby, saved);
    };
    for (let i = 0; i < 3; i++)
      await commit({ type: 'buy_unit', offerId: d.match.players[0]!.state.shop.find(Boolean)!.id });
    expect(d.match.players[0]!.state.units).toHaveLength(1);
    expect(d.match.players[0]!.state.units[0]!.stars).toBe(2);
    const unitId = d.match.players[0]!.state.units[0]!.id;
    await commit({ type: 'move_unit', unitId, to: { kind: 'board', hex: { q: 0, r: 4 } } });
    await commit({ type: 'sell_unit', unitId });
    await commit({ type: 'buy_xp' });
    await commit({ type: 'reroll_shop' });
    await commit({ type: 'lock_shop', locked: true });
    expect(d.match.players[0]!.state.shopLocked).toBe(true);
  });
  it('restores eliminated spectators with released inventory and no future frames', () => {
    const { m, advance } = setup(4);
    equip(m, [1, 2, 3]);
    for (let i = 0; i < 100 && !m.players[0]!.eliminated; i++)
      advance(m.clock.snapshot().remainingMs);
    expect(m.players[0]!.eliminated).toBe(true);
    expect(m.players[0]!.poolReleased).toBe(true);
    advance(5000);
    advance(30000);
    expect(
      m.spectate('s0', {
        version: COMPETITIVE_VERSION,
        matchId: m.id,
        phaseId: m.clock.snapshot().phaseId,
        sequence: 0,
        duelId: m.duels[0]!.pairing.combatId,
      }),
    ).toBe(true);
    advance(500);
    const expected = m.spectatorFrame('s0');
    const restored = AuthoritativeMatch.restore(m.exportState(), { now: () => 1000000 });
    restored.resume('recovered-spectator', restored.players[0]!.id);
    const frame = restored.spectatorFrame('recovered-spectator')!;
    expect(frame.state).toEqual(expected!.state);
    expect(frame.events.every((e) => e.tick <= frame.state.tick)).toBe(true);
    expect(frame.state.result).toBeNull();
    expect(frame).not.toHaveProperty('replay');
    expect(restored.players[0]!.finalPosition).toBe(m.players[0]!.finalPosition);
    expect(restored.pool).toEqual(m.pool);
    expect(
      restored.submit('recovered-spectator', {
        version: NETWORK_VERSION,
        sessionId: 'recovered-spectator',
        requestId: randomUUID(),
        sequence: restored.players[0]!.sequence,
        matchId: restored.id,
        phaseId: restored.clock.snapshot().phaseId,
        action: commandFor(restored.players[0]!.state, { type: 'reroll_shop' }),
      }).accepted,
    ).toBe(false);
  });
});

describe('final retention without idle durable rewrites', () => {
  function finished() {
    const value = setup(2);
    for (let n = 0; n < 160 && !value.m.finalResults; n++)
      value.advance(value.m.clock.snapshot().remainingMs);
    expect(value.m.finalResults).not.toBeNull();
    return value;
  }
  it('anchors expiry to the first final commit and preserves exact replay/results on resume', async () => {
    const { m, lobby } = finished();
    const repo = new Memory();
    const d = new DurableMatch(m, repo, lobby, undefined, 300000);
    await d.run(() => {});
    const deadline = d.retentionDeadline;
    const saved = structuredClone(repo.data!);
    const r = new DurableMatch(
      AuthoritativeMatch.restore(saved.authority),
      repo,
      lobby,
      saved,
      1000,
    );
    await r.run((candidate) => candidate.resume('replacement', candidate.players[0]!.id));
    expect(r.retentionDeadline).toBe(deadline);
    expect(r.match.duels).toEqual(m.duels);
    expect(r.match.finalResults).toEqual(m.finalResults);
    const revision = repo.data!.revision;
    await r.shutdown();
    await r.close();
    expect(repo.data!.revision).toBe(revision);
    expect(repo.data!.status).toBe('finished');
  });
  it('volatile eviction keeps the committed final available until its durable expiry', async () => {
    const { m, lobby } = finished();
    const repo = new Memory();
    const d = new DurableMatch(m, repo, lobby);
    await d.run(() => {});
    const saved = structuredClone(repo.data);
    await d.close();
    expect(repo.data).toEqual(saved);
    await expect(d.run(() => {})).rejects.toThrow();
  });
  it('does not overwrite an ambiguous final commit when disposed', async () => {
    const { m, lobby } = finished();
    const repo = new Memory();
    const d = new DurableMatch(m, repo, lobby);
    repo.ambiguous = true;
    await expect(d.run(() => {})).rejects.toThrow();
    const saved = structuredClone(repo.data);
    await d.close();
    expect(repo.data).toEqual(saved);
    expect(d.unavailable).toBe(true);
  });
});
