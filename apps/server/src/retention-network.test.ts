import { it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { defineServer, defineRoom, matchMaker } from '@colyseus/core';
import { Client } from '@colyseus/sdk';
import { LOBBY_VERSION, RECOVERY_VERSION, type LobbySnapshot } from '@tft/shared';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import { MatchRoom } from './MatchRoom';
import { lobbyRooms } from './LobbyRoom';
import type { StoredMatch } from './persistence/snapshot';
import type { VerifiedIdentity } from './auth';
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
it('restored finals release source snapshots, stay quiet, resume once and expire without deleting durable results', async () => {
  let now = 0;
  const match = new AuthoritativeMatch(randomUUID(), { now: () => now });
  const users: VerifiedIdentity[] = [0, 1].map((i) => ({
    userId: randomUUID(),
    token: `fixture-${i}`,
    name: `Fixture ${i}`,
    avatarId: 'jade',
    expiresAt: Date.now() + 60000,
  }));
  users.forEach((u, i) => match.join(`old-${i}`, u));
  match.start('old-0');
  for (let n = 0; n < 200 && !match.finalResults; n++) {
    now += match.clock.snapshot().remainingMs;
    match.pulse();
  }
  expect(match.finalResults).not.toBeNull();
  const lobby: LobbySnapshot = {
    version: LOBBY_VERSION,
    roomId: randomUUID(),
    roomCode: 'ABCDEFGH',
    hostUserId: users[0]!.userId,
    capacity: 2,
    participants: users.map((u) => ({
      userId: u.userId,
      name: u.name,
      avatarId: u.avatarId,
      readyState: true,
      connected: false,
    })),
    status: 'in_match',
    createdAt: Date.now(),
    expiresAt: Date.now() + 60000,
    matchId: match.id,
    revision: 1,
  };
  let data: StoredMatch = {
    id: match.id,
    revision: 1,
    commitId: randomUUID(),
    status: 'finished',
    expiresAt: Date.now() + 2600,
    lobby,
    authority: match.exportState(),
  };
  const deadline = data.expiresAt;
  let writes = 0;
  const repository = {
    load: async () => [
      structuredClone(data),
      { ...structuredClone(data), id: randomUUID(), expiresAt: Date.now() - 1 },
    ],
    commit: async (expected: number, next: StoredMatch) => {
      expect(expected).toBe(data.revision);
      writes++;
      data = structuredClone(next);
    },
  };
  const verify = async (token: unknown) => {
    const u = users.find((u) => u.token === token);
    if (!u) throw Error('Invalid');
    return u;
  };
  class Fixture extends MatchRoom {
    static onAuth = verify;
    protected verify = verify;
  }
  const rooms = lobbyRooms(verify, Fixture, repository, 300000);
  const server = defineServer({
    greet: false,
    gracefullyShutdown: false,
    rooms: { private_match: defineRoom(rooms.PrivateMatch) },
    beforeListen: async () => {
      await matchMaker.onReady;
      await rooms.restore();
    },
  });
  const client = new Client('http://127.0.0.1:2605');
  client.auth.token = users[0]!.token;
  try {
    await server.listen(2605, '127.0.0.1');
    const live = matchMaker.getLocalRoomById(match.id)!;
    const internal = live as unknown as {
      permit: { saved?: StoredMatch };
      ready: Set<string>;
      credentials: Map<string, unknown>;
      sentCombat: Map<string, string>;
      sentFinal: Set<string>;
    };
    expect(internal.permit.saved).toBeUndefined();
    expect(writes).toBe(0);
    async function join() {
      const r = await client.joinById(match.id, { recoveryVersion: RECOVERY_VERSION });
      r.reconnection.enabled = false;
      let finals = 0,
        traces = 0;
      for (const type of ['state_snapshot', 'service_status', 'resume_accepted'])
        r.onMessage(type, () => {});
      r.onMessage('combat_trace', () => traces++);
      const received = new Promise<void>((resolve) =>
        r.onMessage('final_results', (value) => {
          expect(value).toEqual(match.finalResults);
          finals++;
          resolve();
        }),
      );
      r.send('sync', null);
      await received;
      return { r, counts: () => ({ finals, traces }) };
    }
    const first = await join();
    const count = writes,
      sent = first.counts();
    await pause(1050);
    expect(writes).toBe(count);
    expect(first.counts()).toEqual(sent);
    await first.r.leave();
    await pause(30);
    const second = await join();
    expect(data.expiresAt).toBe(deadline);
    expect(second.counts().finals).toBe(1);
    const finalWrites = writes;
    const socket = live.clients[0]!.ref;
    expect(socket.listenerCount('message')).toBeGreaterThan(0);
    await pause(Math.max(0, deadline - Date.now()) + 250);
    expect(writes).toBe(finalWrites);
    expect(matchMaker.getLocalRoomById(match.id)).toBeUndefined();
    expect(second.r.connection.isOpen).toBe(false);
    expect(socket.listenerCount('message')).toBe(0);
    expect(live.clock.delayed.filter((d) => d.active)).toHaveLength(0);
    expect(internal.credentials.size).toBe(0);
    expect(internal.ready.size).toBe(0);
    expect(internal.sentCombat.size).toBe(0);
    expect(internal.sentFinal.size).toBe(0);
    expect(data.status).toBe('finished');
    expect(data.expiresAt).toBe(deadline);
    await expect(
      client.joinById(match.id, { recoveryVersion: RECOVERY_VERSION }),
    ).rejects.toThrow();
    await rooms.restore();
    expect(matchMaker.getLocalRoomById(match.id)).toBeUndefined();
  } finally {
    await server.gracefullyShutdown(false);
  }
});
