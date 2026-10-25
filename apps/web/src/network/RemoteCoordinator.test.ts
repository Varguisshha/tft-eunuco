import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Room } from '@colyseus/sdk';
import { PAIRING_VERSION, reversePerspective } from '@tft/shared';
import { multiFixture, equip } from '../../../server/src/multi-fixture';
import { RemoteCoordinator } from './RemoteCoordinator';
import { authorizedReplay, currentPairing, opponent, projectRemote } from './remoteView';
function fixture(count: 2 | 3 | 4 = 4) {
  const f = multiFixture(count);
  equip(f.match);
  f.advance(30000);
  const snapshot = (i: number) => f.match.roundSnapshot(`socket-${i}`);
  const trace = (i: number) => {
    const d = f.match.duelFor(`socket-${i}`)!;
    return {
      version: PAIRING_VERSION,
      matchId: f.match.id,
      combatId: d.pairing.combatId,
      pairing: d.pairing,
      side:
        d.pairing.southPlayerId === snapshot(i).playerId ? ('south' as const) : ('north' as const),
      startedAt: f.match.clock.snapshot().phaseStart,
      replay: d.replay,
    };
  };
  return { ...f, snapshot, trace };
}
function socket() {
  const handlers = new Map<string, (raw: unknown) => void>();
  const room = {
    roomId: 'diagnostic',
    sessionId: 'socket-0',
    reconnection: { enabled: true },
    onMessage: (key: string, cb: (raw: unknown) => void) => handlers.set(key, cb),
    onLeave: vi.fn(),
    send: vi.fn(),
    leave: vi.fn(),
  };
  return {
    room: room as unknown as Room,
    send: (key: string, data: unknown) => handlers.get(key)!(data),
    sent: room.send,
  };
}
afterEach(() => vi.useRealTimers());
describe('private duel presentation', () => {
  it.each([2, 3, 4] as const)('projects %i identities and only the assigned enemy', (count) => {
    const f = fixture(count);
    for (let i = 0; i < count; i++) {
      const s = f.snapshot(i),
        t = f.trace(i),
        r = authorizedReplay(s, t)!;
      expect(currentPairing(s)?.combatId).toBe(s.combatId);
      expect(opponent(s)?.id).toBe(s.players[i]!.opponentId);
      expect(r).toEqual(t.side === 'north' ? reversePerspective(t.replay) : t.replay);
      expect(projectRemote(s, r).health.south).toBe(s.own.hp);
      expect(projectRemote(s, r).pool).toEqual({});
    }
  });
  it('rejects wrong identity, side, round, pairing, match and unauthorized trace', () => {
    const f = fixture(),
      s = f.snapshot(0),
      t = f.trace(0);
    const other = [1, 2, 3].find((i) => f.trace(i).combatId !== t.combatId)!;
    expect(authorizedReplay(s, f.trace(other))).toBeNull();
    expect(authorizedReplay(s, { ...t, side: t.side === 'south' ? 'north' : 'south' })).toBeNull();
    expect(authorizedReplay(s, { ...t, matchId: 'other' })).toBeNull();
    expect(authorizedReplay({ ...s, own: { ...s.own, round: 2 } }, t)).toBeNull();
    expect(authorizedReplay({ ...s, pairings: [] }, t)).toBeNull();
  });
  it('ghost owner sees own human duel, ghost facing player sees isolated copy', () => {
    const f = fixture(3),
      ghost = f.match.duels.find((d) => d.pairing.kind === 'ghost')!;
    const owner = f.match.players.findIndex((p) => p.id === ghost.pairing.northPlayerId);
    expect(currentPairing(f.snapshot(owner))?.kind).toBe('human');
    const facing = f.match.players.findIndex((p) => p.id === ghost.pairing.southPlayerId);
    expect(currentPairing(f.snapshot(facing))?.kind).toBe('ghost');
    expect(authorizedReplay(f.snapshot(owner), f.trace(facing))).toBeNull();
  });
  it('buffers trace before snapshot, retains replay identity across revisions and clears next round', () => {
    vi.useFakeTimers();
    const f = fixture(),
      ws = socket(),
      remote = new RemoteCoordinator(ws.room);
    ws.send('combat_trace', f.trace(0));
    expect(remote.getReplay()).toBeNull();
    ws.send('state_snapshot', f.snapshot(0));
    const replay = remote.getReplay();
    expect(replay).not.toBeNull();
    ws.send('state_snapshot', { ...f.snapshot(0), revision: f.snapshot(0).revision + 1 });
    expect(remote.getReplay()).toBe(replay);
    ws.send('combat_trace', f.trace(1));
    expect(remote.getReplay()).toBe(replay);
    const s = f.snapshot(0);
    ws.send('state_snapshot', {
      ...s,
      revision: s.revision + 2,
      combatId: null,
      pairings: [],
      own: { ...s.own, phase: 'preparation', round: 2 },
    });
    expect(remote.getReplay()).toBeNull();
    remote.dispose();
  });
  it('accepts snapshot before trace and ignores stale, malformed and changed-player snapshots', () => {
    vi.useFakeTimers();
    const f = fixture(),
      ws = socket(),
      remote = new RemoteCoordinator(ws.room),
      s = f.snapshot(0);
    ws.send('state_snapshot', s);
    expect(remote.getReplay()).toBeNull();
    ws.send('combat_trace', f.trace(0));
    expect(remote.getReplay()).not.toBeNull();
    const state = remote.getMatch();
    ws.send('state_snapshot', { ...s, revision: s.revision - 1 });
    ws.send('state_snapshot', f.snapshot(1));
    ws.send('state_snapshot', {});
    expect(remote.getMatch()).toBe(state);
    remote.dispose();
  });
  it('uses server standings including ties, and awaiting_round cannot submit or settle', () => {
    vi.useFakeTimers();
    const f = fixture(),
      ws = socket(),
      remote = new RemoteCoordinator(ws.room),
      s = f.snapshot(0);
    s.players.forEach((p, i) => {
      p.provisionalPosition = i < 2 ? 2 : 1;
      if (p.id === s.playerId) p.status = 'awaiting_round';
    });
    ws.send('combat_trace', f.trace(0));
    ws.send('state_snapshot', s);
    expect(remote.standings.map((p) => p.position)).toEqual([1, 1, 2, 2]);
    expect(remote.duel.awaiting).toBe(true);
    const before = JSON.stringify(remote.getMatch());
    expect(
      remote.submit({
        matchId: s.matchId,
        phaseId: s.clock.phaseId,
        expectedRevision: s.own.revision,
        command: { type: 'reroll_shop' },
      }),
    ).toBe(false);
    vi.advanceTimersByTime(2000);
    expect(JSON.stringify(remote.getMatch())).toBe(before);
    expect(remote.rivals().every((u) => u.id.startsWith(opponent(s)!.id))).toBe(true);
    remote.dispose();
  });
});

describe('eliminated spectator client', () => {
  it('switches sampled duels without carrying old frames; rejects stale selections and cannot buy', () => {
    vi.useFakeTimers();
    const f = multiFixture(4);
    equip(f.match, [1, 2, 3]);
    const p = f.match.players[0]!;
    p.state.config = structuredClone(p.state.config);
    p.state.config.roundDamage.initialHp = 1;
    p.state.health = { north: 1, south: 1 };
    f.advance(30000);
    f.advance(f.match.clock.snapshot().remainingMs);
    f.advance(5000);
    f.advance(30000);
    const ws = socket(),
      remote = new RemoteCoordinator(ws.room);
    ws.send('state_snapshot', f.match.competitiveSnapshot('socket-0'));
    expect(remote.eliminated).toBe(true);
    expect(
      remote.submit({
        matchId: f.match.id,
        phaseId: f.match.clock.snapshot().phaseId,
        expectedRevision: 0,
        command: { type: 'reroll_shop' },
      }),
    ).toBe(false);
    const choose = (index: number) => {
      remote.spectate(f.match.duels[index]!.pairing.combatId);
      const args = ws.sent.mock.calls.at(-1)!;
      expect(f.match.spectate('socket-0', args[1])).toBe(true);
      ws.send('state_snapshot', f.match.competitiveSnapshot('socket-0'));
      const frame = f.match.spectatorFrame('socket-0')!;
      ws.send('spectate_snapshot', frame);
      return frame;
    };
    const old = choose(0);
    expect(remote.getSpectatorFrame()?.combatId).toBe(old.combatId);
    const next = choose(1);
    ws.send('spectate_snapshot', old);
    expect(remote.getSpectatorFrame()?.combatId).toBe(next.combatId);
    ws.send('spectate_snapshot', { ...next, playerId: 'foreign' });
    expect(remote.getSpectatorFrame()).toEqual(next);
    f.advance(f.match.clock.snapshot().remainingMs);
    ws.send('state_snapshot', f.match.competitiveSnapshot('socket-0'));
    expect(remote.getSpectatorFrame()).toBeNull();
    remote.dispose();
  });
  it('uses final server ties and remains read-only after completion', () => {
    vi.useFakeTimers();
    const f = multiFixture(2);
    for (const p of f.match.players) {
      p.state.config = structuredClone(p.state.config);
      p.state.config.roundDamage.initialHp = 1;
      p.state.health = { north: 1, south: 1 };
    }
    f.advance(30000);
    f.advance(f.match.clock.snapshot().remainingMs);
    const ws = socket(),
      remote = new RemoteCoordinator(ws.room);
    ws.send('state_snapshot', f.match.competitiveSnapshot('socket-0'));
    expect(remote.finalResults?.sharedFirst).toBe(true);
    expect(remote.standings.map((p) => p.position)).toEqual([1, 1]);
    expect(remote.spectate(null)).toBe(false);
    expect(remote.getClock().clockState).toBe('stopped');
    remote.dispose();
  });
});
