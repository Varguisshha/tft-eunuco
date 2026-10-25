import { beforeAll, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Client, type Room } from '@colyseus/sdk';
import { ServerError } from '@colyseus/core';
import {
  LOBBY_VERSION,
  LobbyEventSchema,
  RoundSnapshotSchema,
  type LobbyEvent,
  type RoundSnapshot,
} from '@tft/shared';
import { MatchRoom } from './MatchRoom';
import { createServer } from './server';
import type { VerifiedIdentity } from './auth';
const identities: Record<string, VerifiedIdentity> = Object.fromEntries(
  ['first', 'second', 'third'].map((token, i) => [
    token,
    {
      token,
      userId: randomUUID(),
      name: ['Ada', 'Lin', 'Sol'][i]!,
      avatarId: 'jade',
      expiresAt: Date.now() + 120_000,
    },
  ]),
);
const revoked = new Set<string>();
async function verify(token: unknown) {
  const p = typeof token === 'string' ? identities[token] : undefined;
  if (!p || revoked.has(p.token) || p.expiresAt <= Date.now())
    throw new ServerError(401, 'Invalid');
  return p;
}
class TestMatch extends MatchRoom {
  static onAuth = verify;
  protected verify = verify;
}
const server = createServer(TestMatch, verify);
const rooms: Room[] = [];
beforeAll(() => server.listen(2571, '127.0.0.1'));
afterAll(async () => {
  await Promise.all(rooms.filter((r) => r.connection.isOpen).map((r) => r.leave().catch(() => {})));
  await server.gracefullyShutdown(false);
});
function client(token: string) {
  const c = new Client('http://127.0.0.1:2571');
  c.auth.token = token;
  return c;
}
async function gateway(token: string) {
  const r = await client(token).create('lobby_gateway', { userId: 'forged' });
  r.reconnection.enabled = false;
  rooms.push(r);
  r.onMessage('protocol_error', () => {});
  return r;
}
function action(room: Room, type: string, extra = {}) {
  return new Promise<LobbyEvent>((resolve, reject) => {
    const requestId = randomUUID();
    const timer = setTimeout(() => {
      off();
      reject(Error('timeout ' + type));
    }, 4000);
    const off = room.onMessage('lobby_event', (raw: unknown) => {
      const e = LobbyEventSchema.parse(raw);
      if (e.requestId === requestId) {
        clearTimeout(timer);
        off();
        resolve(e);
      }
    });
    room.send('lobby_action', { version: LOBBY_VERSION, requestId, type, ...extra });
  });
}
function snapshot(room: Room) {
  return new Promise<RoundSnapshot>((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('snapshot timeout')), 3000);
    const off = room.onMessage('state_snapshot', (raw: unknown) => {
      clearTimeout(timer);
      off();
      resolve(RoundSnapshotSchema.parse(raw));
    });
    room.onMessage('pong', () => {});
    room.onMessage('combat_trace', () => {});
    room.send('sync', null);
  });
}
it('rejects invalid auth and client-created private destinations', async () => {
  await expect(client('bad').create('lobby_gateway')).rejects.toThrow();
  await expect(
    client('first').create('private_match', {
      ticket: 'forged',
      users: [identities.first!.userId],
    }),
  ).rejects.toThrow();
});
it('authenticates lobby identities, restricts destination and starts two participants automatically', async () => {
  const a = await gateway('first'),
    b = await gateway('second');
  a.onMessage('lobby_event', () => {});
  b.onMessage('lobby_event', () => {});
  await expect(gateway('first')).rejects.toThrow();
  const created = await action(a, 'create_lobby', { capacity: 2 });
  expect(created.lobby!.hostUserId).toBe(identities.first!.userId);
  const joined = await action(b, 'join_lobby', { roomCode: created.lobby!.roomCode.toLowerCase() });
  expect(joined.lobby!.participants.map((p) => p.name)).toEqual(['Ada', 'Lin']);
  expect((await action(b, 'start_match')).error).toMatch(/anfitrión/);
  await action(a, 'set_ready', { readyState: true });
  await action(b, 'set_ready', { readyState: true });
  const started = await action(a, 'start_match');
  const matchId = started.lobby!.matchId!;
  expect(matchId).toBeTruthy();
  await expect(client('third').joinById(matchId)).rejects.toThrow();
  const ma = await client('first').joinById(matchId);
  rooms.push(ma);
  ma.reconnection.enabled = false;
  ma.onMessage('state_snapshot', () => {});
  const sa = await snapshot(ma);
  expect(sa.playerId).toBe(identities.first!.userId);
  const mb = await client('second').joinById(matchId);
  rooms.push(mb);
  mb.reconnection.enabled = false;
  mb.onMessage('state_snapshot', () => {});
  await snapshot(mb);
  await new Promise((r) => setTimeout(r, 120));
  expect((await action(a, 'sync')).lobby!.status).toBe('in_match');
  const next = await snapshot(ma);
  expect(next.players).toHaveLength(2);
  expect(next.clock.currentPhase).not.toBe('not_started');
  expect(JSON.stringify(joined.lobby)).not.toMatch(/token|email|password/);
  await action(a, 'leave_lobby');
  await action(b, 'leave_lobby');
  await a.leave();
  await b.leave();
  await ma.leave();
  await mb.leave();
});
it('rejects identity switches and revokes active lobby sessions', async () => {
  const a = await gateway('third');
  a.onMessage('lobby_event', () => {});
  await action(a, 'create_lobby', { capacity: 2 });
  const left = new Promise<number>((r) => a.onLeave(r));
  a.send('authenticate', 'first');
  expect(await left).toBe(4001);
  const b = await gateway('second');
  b.onMessage('lobby_event', () => {});
  const revokedLeave = new Promise<number>((r) => b.onLeave(r));
  revoked.add('second');
  expect(await revokedLeave).toBe(4001);
}, 10000);
it('closes an already connected lobby when its verified token expires', async () => {
  identities.first!.expiresAt = Date.now() + 1000;
  const a = await gateway('first');
  a.onMessage('lobby_event', () => {});
  const left = new Promise<number>((resolve) => a.onLeave(resolve));
  await new Promise((resolve) => setTimeout(resolve, 1100));
  a.send('lobby_action', {
    version: LOBBY_VERSION,
    requestId: randomUUID(),
    type: 'create_lobby',
    capacity: 2,
  });
  expect(await left).toBe(4001);
  await expect(client('first').create('lobby_gateway')).rejects.toThrow();
});
