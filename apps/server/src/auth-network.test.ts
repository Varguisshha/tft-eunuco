import { afterAll, beforeAll, expect, it } from 'vitest';
import { Client, type Room } from '@colyseus/sdk';
import { ServerError } from '@colyseus/core';
import { NetworkSnapshotSchema, type NetworkSnapshot } from '@tft/shared';
import { MatchRoom } from './MatchRoom';
import { createServer } from './server';
import type { VerifiedIdentity } from './auth';
const identities: Record<string, VerifiedIdentity> = {
  first: {
    userId: '00000000-0000-4000-8000-000000000001',
    name: 'Ada',
    avatarId: 'jade',
    expiresAt: Date.now() + 60000,
    token: 'first',
  },
  second: {
    userId: '00000000-0000-4000-8000-000000000002',
    name: 'Lin',
    avatarId: 'spark',
    expiresAt: Date.now() + 60000,
    token: 'second',
  },
  expired: {
    userId: '00000000-0000-4000-8000-000000000003',
    name: 'Expired',
    avatarId: 'jade',
    expiresAt: 0,
    token: 'expired',
  },
};
async function verify(token: unknown) {
  const identity = typeof token === 'string' ? identities[token] : undefined;
  if (!identity || identity.expiresAt <= Date.now())
    throw new ServerError(401, 'Invalid test credentials');
  return identity;
}
class AuthenticatedTestRoom extends MatchRoom {
  static onAuth = verify;
  protected verify = verify;
}
const server = createServer(AuthenticatedTestRoom),
  rooms: Room[] = [];
beforeAll(() => server.listen(2569, '127.0.0.1'));
afterAll(async () => {
  await Promise.all(rooms.map((r) => r.leave()));
  await server.gracefullyShutdown(false);
});
function client(token?: string) {
  const c = new Client('http://127.0.0.1:2569');
  if (token) c.auth.token = token;
  return c;
}
async function snapshot(room: Room) {
  return new Promise<NetworkSnapshot>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), 3000);
    room.onMessage('state_snapshot', (raw: unknown) => {
      clearTimeout(t);
      resolve(NetworkSnapshotSchema.parse(raw));
    });
    room.send('sync', null);
  });
}
it.each([undefined, 'invalid', 'expired'])(
  'rejects credentials %s and spoof options',
  async (token) => {
    await expect(
      client(token).create('test_match', { userId: identities.first!.userId, name: 'Admin' }),
    ).rejects.toThrow();
  },
);
it('two sockets use verified persistent IDs, preserve privacy and refuse duplicate identity/session switch', async () => {
  const a = await client('first').create('test_match', { userId: 'forged', name: 'Forged' });
  rooms.push(a);
  const sa = await snapshot(a);
  expect(sa.playerId).toBe(identities.first!.userId);
  expect(sa.players[0]!.name).toBe('Ada');
  expect(sa.playerId).not.toBe(a.sessionId);
  await expect(client('first').joinById(a.roomId)).rejects.toThrow();
  const b = await client('second').joinById(a.roomId);
  rooms.push(b);
  const sb = await snapshot(b);
  expect(sb.playerId).toBe(identities.second!.userId);
  expect(sb.players.map((p) => p.name)).toEqual(['Ada', 'Lin']);
  expect(JSON.stringify(sb.players)).not.toMatch(/token|email|shop|gold|bench/);
  const left = new Promise<number>((resolve) => a.onLeave(resolve));
  a.send('authenticate', 'second');
  expect(await left).toBe(4001);
  rooms.splice(rooms.indexOf(a), 1);
});
it('production room fails closed without configuration', async () => {
  await expect(MatchRoom.onAuth('invalid')).rejects.toThrow();
});
