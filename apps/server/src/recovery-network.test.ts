import { beforeAll, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Client, type Room } from '@colyseus/sdk';
import { ServerError, matchMaker } from '@colyseus/core';
import {
  LOBBY_VERSION,
  RECOVERY_VERSION,
  ResumeAcceptedSchema,
  CompetitiveSnapshotSchema,
  SpectateFrameSchema,
  COMPETITIVE_VERSION,
  type CompetitiveSnapshot,
  type ResumeAccepted,
  type LobbyEvent,
  type SpectateFrame,
} from '@tft/shared';
import { createServer } from './server';
import { MatchRoom } from './MatchRoom';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import { fixtureUsers, equip, intent } from './multi-fixture';
let now = 0;
const revoked = new Set<string>();
const authorities = new Map<string, AuthoritativeMatch>();
async function verify(token: unknown) {
  const index = typeof token === 'string' ? /^fixture-([0-3])$/.exec(token) : null;
  if (!index || revoked.has(String(token))) throw new ServerError(401, 'Invalid session');
  const i = Number(index[1]);
  return {
    token: String(token),
    userId: fixtureUsers[i]!,
    name: `User ${i}`,
    avatarId: 'jade' as const,
    expiresAt: Date.now() + 3600000,
  };
}
class Fixture extends MatchRoom {
  static onAuth = verify;
  protected verify = verify;
  protected createMatch(capacity: 2 | 3 | 4 = 2) {
    const match = new AuthoritativeMatch(this.roomId, { now: () => now }, () => 360, capacity);
    authorities.set(this.roomId, match);
    return match;
  }
}
const server = createServer(Fixture, verify),
  rooms: Room[] = [];
beforeAll(() => server.listen(2578, '127.0.0.1'));
afterAll(async () => {
  await Promise.all(rooms.filter((r) => r.connection.isOpen).map((r) => r.leave()));
  await server.gracefullyShutdown(false);
});
function client(i: number) {
  const c = new Client('http://127.0.0.1:2578');
  c.auth.token = `fixture-${i}`;
  return c;
}
async function until(test: () => boolean) {
  const end = Date.now() + 4000;
  while (!test()) {
    if (Date.now() > end) throw Error('timeout');
    await new Promise((r) => setTimeout(r, 10));
  }
}
async function gateway(i: number) {
  const r = await client(i).create('lobby_gateway');
  r.reconnection.enabled = false;
  rooms.push(r);
  r.onMessage('lobby_event', () => {});
  return r;
}
function action(r: Room, type: string, extra = {}) {
  return new Promise<LobbyEvent>((resolve) => {
    const requestId = randomUUID();
    const off = r.onMessage('lobby_event', (e: LobbyEvent) => {
      if (e.requestId === requestId) {
        off();
        resolve(e);
      }
    });
    r.send('lobby_action', { version: LOBBY_VERSION, requestId, type, ...extra });
  });
}
async function join(i: number, id: string) {
  const r = await client(i).joinById(id, { recoveryVersion: RECOVERY_VERSION });
  rooms.push(r);
  r.reconnection.enabled = false;
  const data = {
    r,
    view: undefined as CompetitiveSnapshot | undefined,
    resume: undefined as ResumeAccepted | undefined,
    traces: [] as unknown[],
    frames: [] as SpectateFrame[],
    receipts: [] as unknown[],
  };
  r.onMessage('state_snapshot', (s: unknown) => {
    data.view = CompetitiveSnapshotSchema.parse(s);
  });
  r.onMessage('resume_accepted', (s: unknown) => {
    data.resume = ResumeAcceptedSchema.parse(s);
  });
  r.onMessage('combat_trace', (t: unknown) => data.traces.push(t));
  r.onMessage('spectate_snapshot', (s: unknown) => data.frames.push(SpectateFrameSchema.parse(s)));
  r.onMessage('action_receipt', (s: unknown) => data.receipts.push(s));
  r.onMessage('final_results', () => {});
  r.onMessage('protocol_error', () => {});
  r.send('sync', null);
  await until(() => !!data.view && !!data.resume);
  return data;
}
it.each([2, 3, 4] as const)(
  '%i independent SDK clients recover phases, replacement, all-offline and retained final',
  async (count) => {
    now = 0;
    const gates = await Promise.all(Array.from({ length: count }, (_, i) => gateway(i)));
    const created = await action(gates[0]!, 'create_lobby', { capacity: count });
    for (let i = 1; i < count; i++)
      await action(gates[i]!, 'join_lobby', { roomCode: created.lobby!.roomCode });
    for (const g of gates) await action(g, 'set_ready', { readyState: true });
    const started = await action(gates[0]!, 'start_match'),
      id = started.lobby!.matchId!;
    // Reload during transition recovers exactly the same destination and host.
    await gates[0]!.leave();
    gates[0] = await gateway(0);
    const transition = await action(gates[0]!, 'sync');
    expect(transition.lobby!.matchId).toBe(id);
    expect(transition.lobby!.hostUserId).toBe(fixtureUsers[0]);
    const sockets: Awaited<ReturnType<typeof join>>[] = [];
    for (let i = 0; i < count; i++) sockets.push(await join(i, id));
    const m = authorities.get(id)!;
    await until(() => m.clock.snapshot().currentPhase === 'preparation');
    const p = m.players.find((p) => p.id === fixtureUsers[0])!,
      index = m.players.indexOf(p);
    const buy = intent(m, index, { type: 'buy_unit', offerId: p.state.shop[0]!.id });
    sockets[0]!.r.send('command', buy);
    await until(() => sockets[0]!.receipts.length === 1);
    expect(sockets[0]!.receipts[0]).toMatchObject({ accepted: true });
    const saved = structuredClone(p.state),
      deadline = m.clock.snapshot().phaseDeadline;
    const oldId = p.sessionId,
      closed = new Promise<number>((resolve) => sockets[0]!.r.onLeave(resolve));
    sockets[0] = await join(0, id);
    expect(await closed).toBe(4002);
    expect(sockets[0]!.resume!.generation).toBe(2);
    expect(sockets[0]!.resume!.nextSequence).toBe(1);
    expect(p.state).toEqual(saved);
    expect(m.clock.snapshot().phaseDeadline).toBe(deadline);
    expect(m.submit(oldId, buy).accepted).toBe(false);
    expect(m.players).toHaveLength(count);
    if (count < 4)
      await expect(
        client(3).joinById(id, { recoveryVersion: RECOVERY_VERSION, userId: p.id }),
      ).rejects.toThrow();
    revoked.add('fixture-0');
    await expect(client(0).joinById(id, { recoveryVersion: RECOVERY_VERSION })).rejects.toThrow();
    revoked.delete('fixture-0');
    // All sockets disappear; same process continues and preserves authoritative state.
    await Promise.all(sockets.map((s) => s.r.leave()));
    await until(() => m.players.every((p) => !p.connected));
    // A durable existing unit fixture reaches overtime, without changing the combat engine.
    for (const player of m.players) {
      for (const u of player.state.units) m.pool[u.definitionId]! += 3 ** (u.stars - 1);
      player.state.units = [];
    }
    equip(m, undefined, ['test-k01']);
    if (count > 2) {
      p.state.config = structuredClone(p.state.config);
      p.state.config.roundDamage.initialHp = 1;
      p.state.health = { south: 1, north: 1 };
    }
    now = deadline;
    m.pulse();
    expect(m.duels.every((d) => d.replay.result.tick === 450)).toBe(true);
    const simulations = m.simulations;
    now += 31000;
    m.pulse();
    sockets[0] = await join(0, id);
    expect(sockets[0]!.view!.clock.currentPhase).toBe('combat');
    expect(sockets[0]!.view!.serverTime - sockets[0]!.view!.clock.phaseStart).toBe(31000);
    expect(sockets[0]!.traces).toHaveLength(1);
    expect(m.simulations).toBe(simulations);
    expect(sockets[0]!.resume!.duelId).toBe(m.duelFor(p.sessionId)!.pairing.combatId);
    now += m.clock.snapshot().remainingMs;
    m.pulse();
    const reward = structuredClone(p.state.lastReward),
      settlements = m.settlements.size;
    await sockets[0]!.r.leave();
    sockets[0] = await join(0, id);
    expect(sockets[0]!.view!.clock.currentPhase).toBe('resolution');
    expect(p.state.lastReward).toEqual(reward);
    expect(m.settlements.size).toBe(settlements);
    if (count > 2) {
      expect(p.eliminated).toBe(true);
      const position = p.finalPosition;
      now += m.clock.snapshot().remainingMs;
      m.pulse();
      now += m.clock.snapshot().remainingMs;
      m.pulse();
      await sockets[0]!.r.leave();
      sockets[0] = await join(0, id);
      expect(sockets[0]!.traces).toHaveLength(0);
      const duelId = m.duels[0]!.pairing.combatId;
      sockets[0]!.r.send('spectate_duel', {
        version: COMPETITIVE_VERSION,
        matchId: id,
        phaseId: m.clock.snapshot().phaseId,
        sequence: sockets[0]!.resume!.spectateSequence + 1,
        duelId,
      });
      await until(() => sockets[0]!.frames.length > 0);
      const frame = sockets[0]!.frames.at(-1)!;
      expect(frame.state.result).toBeNull();
      expect(frame.state).not.toHaveProperty('rngState');
      expect(frame.events.every((e) => e.tick <= frame.state.tick)).toBe(true);
      await sockets[0]!.r.leave();
      sockets[0] = await join(0, id);
      await until(() => sockets[0]!.frames.length > 0);
      expect(p.finalPosition).toBe(position);
      expect(sockets[0]!.resume!.spectateSequence).toBe(0);
      expect(sockets[0]!.traces).toHaveLength(0);
    }
    while (!m.finalResults) {
      now += m.clock.snapshot().remainingMs;
      m.pulse();
    }
    const final = m.finalResults;
    await sockets[0]!.r.leave();
    sockets[0] = await join(0, id);
    expect(sockets[0]!.view!.finalResults).toEqual(final);
    expect(m.players).toHaveLength(count);
    m.assertConservation();
    for (const g of gates) {
      await action(g, 'leave_lobby');
      await g.leave();
    }
    await sockets[0]!.r.leave();
    await matchMaker.remoteRoomCall(id, 'disconnect');
    await expect(
      client(0).joinById(id, { recoveryVersion: RECOVERY_VERSION }),
    ).rejects.toMatchObject({ code: 522 });
  },
  20000,
);
