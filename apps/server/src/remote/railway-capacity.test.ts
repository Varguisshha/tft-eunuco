import { createServer as createTcpServer } from 'node:net';
import { startRuntime } from './runtime';
import { it, expect } from 'vitest';
import { Client, type Room } from '@colyseus/sdk';
import { randomUUID } from 'node:crypto';
import { createServer } from '../server';
import { MatchRoom } from '../MatchRoom';
import { LOBBY_VERSION, type LobbyEvent } from '@tft/shared';
import { readConfig } from './config';
it('pilot caps concurrent reservations and lobby sockets', async () => {
  const c = readConfig({
    SUPABASE_URL: 'https://example.test',
    SUPABASE_PUBLISHABLE_KEY: 'public',
    SUPABASE_SERVICE_ROLE_KEY: 'private',
  });
  c.maxMatches = 1;
  c.maxGateways = 8;
  const server = createServer(
    MatchRoom,
    async (token) => ({
      userId: String(token),
      name: 'Fixture',
      avatarId: 'jade',
      expiresAt: Date.now() + 60000,
      token: String(token),
    }),
    undefined,
    c,
  );
  const http = await server.serverless();
  await new Promise<void>((r) => http.listen(0, '127.0.0.1', r));
  const port = (http.address() as { port: number }).port;
  c.publicUrl = new URL(`http://127.0.0.1:${port}`);
  c.origins = [c.publicUrl.origin];
  const rooms: Room[] = [];
  const client = () => {
    const sdk = new Client(c.publicUrl.origin, { headers: { Origin: c.publicUrl.origin } });
    sdk.auth.token = randomUUID();
    return sdk;
  };
  const action = (room: Room, type: string, extra = {}) =>
    new Promise<LobbyEvent>((resolve) => {
      const requestId = randomUUID();
      const off = room.onMessage('lobby_event', (e: LobbyEvent) => {
        if (e.requestId === requestId) {
          off();
          resolve(e);
        }
      });
      room.send('lobby_action', { version: LOBBY_VERSION, requestId, type, ...extra });
    });
  try {
    for (let i = 0; i < 8; i++) {
      const r = await client().create('lobby_gateway');
      r.onMessage('lobby_event', () => {});
      rooms.push(r);
    }
    await expect(client().create('lobby_gateway')).rejects.toThrow();
    for (let group = 0; group < 2; group++) {
      const peers = rooms.slice(group * 4, group * 4 + 4);
      const created = await action(peers[0]!, 'create_lobby', { capacity: 4 });
      for (const p of peers.slice(1))
        await action(p, 'join_lobby', { roomCode: created.lobby!.roomCode });
      for (const p of peers) await action(p, 'set_ready', { readyState: true });
    }
    const results = await Promise.all([
      action(rooms[0]!, 'start_match'),
      action(rooms[4]!, 'start_match'),
    ]);
    expect(results.filter((r) => r.lobby?.matchId)).toHaveLength(1);
    expect(results.filter((r) => r.lobby?.status === 'waiting')).toHaveLength(1);
  } finally {
    for (const r of rooms) await r.leave();
    await server.gracefullyShutdown(false);
  }
}, 15000);

it('does not expose readiness or accept connections before restore completes', async () => {
  const reservation = createTcpServer();
  await new Promise<void>((r) => reservation.listen(0, '127.0.0.1', r));
  const port = (reservation.address() as { port: number }).port;
  await new Promise<void>((r) => reservation.close(() => r()));
  const config = readConfig({
    SUPABASE_URL: 'https://example.test',
    SUPABASE_PUBLISHABLE_KEY: 'public',
    SUPABASE_SERVICE_ROLE_KEY: 'private',
  });
  config.port = port;
  config.publicUrl = new URL(`http://127.0.0.1:${port}`);
  config.origins = [config.publicUrl.origin];
  let release!: () => void;
  let entered!: () => void;
  const restoring = new Promise<void>((r) => {
    entered = r;
  });
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const pending = startRuntime(
    config,
    {
      load: async () => {
        entered();
        await gate;
        return [];
      },
      commit: async () => {},
    },
    async () => {
      throw Error('No users in restore test');
    },
    async () => {},
  );
  await restoring;
  try {
    await expect(fetch(new URL('/readyz', config.publicUrl))).rejects.toThrow();
  } finally {
    release();
    const runtime = await pending;
    try {
      expect((await fetch(new URL('/readyz', config.publicUrl))).status).toBe(200);
    } finally {
      await runtime.stop();
    }
  }
});
