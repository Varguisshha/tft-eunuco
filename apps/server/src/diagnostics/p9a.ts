/** Explicit diagnostic entry. Never imported by production. Only local disposable database. */
import { createServer } from 'node:http';
import { createServer as tcpServer, connect, type Socket } from 'node:net';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { matchMaker } from '@colyseus/core';
import { AuthoritativeMatch } from '../AuthoritativeMatch';
import { MatchRoom } from '../MatchRoom';
import { PostgresTestRepository } from '../persistence/PostgresTestRepository';
import { readConfig } from '../remote/config';
import { startRuntime } from '../remote/runtime';
import { fixtureUsers } from '../multi-fixture';
const secret = process.env.P9A_SIGNING_KEY;
const url = process.env.P9A_TEST_DATABASE_URL;
if (
  !secret ||
  !url ||
  !/^postgres(?:ql)?:\/\/(?:[^/@]+@)?127\.0\.0\.1:55439\/tft_remote_test(?:_[a-z0-9_]+)?$/.test(url)
)
  throw Error('Isolated diagnostic configuration required');
// A real loopback TCP interruption, without stopping the shared PostgreSQL service.
const databaseSockets = new Set<Socket>();
const databaseProxy = tcpServer((socket) => {
  const upstream = connect(55439, '127.0.0.1');
  for (const s of [socket, upstream]) {
    databaseSockets.add(s);
    s.on('close', () => databaseSockets.delete(s));
    s.on('error', () => {
      socket.destroy();
      upstream.destroy();
    });
  }
  socket.pipe(upstream).pipe(socket);
});
const listenDatabase = () =>
  new Promise<void>((resolve) => databaseProxy.listen(55441, '127.0.0.1', resolve));
await listenDatabase();
const repo = new PostgresTestRepository(url.replace(':55439/', ':55441/'));
const guarded = repo;
async function verify(raw: unknown) {
  if (typeof raw !== 'string') throw Error('Invalid diagnostic JWT');
  const [head, body, signature] = raw.split('.');
  const expected = createHmac('sha256', secret!)
    .update(head + '.' + body)
    .digest();
  const actual = Buffer.from(signature ?? '', 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw Error('Invalid diagnostic JWT');
  const payload = JSON.parse(Buffer.from(body!, 'base64url').toString());
  const i = fixtureUsers.indexOf(payload.sub);
  if (i < 0 || payload.aud !== 'p9a-local-only' || payload.exp * 1000 <= Date.now())
    throw Error('Invalid diagnostic JWT');
  return {
    token: raw,
    userId: payload.sub,
    name: ['Vargas', 'Florin', 'Nora', 'Alex'][i]!,
    avatarId: 'jade' as const,
    expiresAt: payload.exp * 1000,
  };
}
class Diagnostic extends MatchRoom {
  protected createMatch(capacity: 2 | 3 | 4 = 2) {
    const snapshot = super.createMatch(capacity).exportState();
    if (process.env.P9A_BROWSER_SEED === '1') {
      snapshot.rng = 80126;
      snapshot.itemDrops!.seed = 80626;
    }
    return AuthoritativeMatch.restore(snapshot, undefined, false);
  }
  async advance(ms?: number) {
    await this.mutate(() => {
      this.match.clock.restore({
        ...this.match.clock.snapshot(),
        remainingMs:
          ms === undefined ? 0 : Math.max(0, this.match.clock.snapshot().remainingMs - ms),
      });
      this.match.pulse();
    });
  }
  snapshot() {
    return this.match.exportState();
  }
}
const config = readConfig({
  TFT_ENV: 'diagnostic',
  TFT_STATIC_DIR: process.env.P9A_STATIC_DIR ?? 'apps/web/dist',
  PORT: '2596',
  TFT_PUBLIC_URL: 'https://localhost:9443',
  TFT_PROXY_ADDRESS: '127.0.0.1',
  SUPABASE_URL: 'http://127.0.0.1:1',
  SUPABASE_PUBLISHABLE_KEY: 'diagnostic-public',
  SUPABASE_SERVICE_ROLE_KEY: 'diagnostic-unused',
});
const runtime = await startRuntime(
  config,
  guarded,
  verify,
  async () => {
    await repo.pool.query('select 1 from private.authority_matches limit 0');
  },
  Diagnostic,
);
const control = createServer((req, res) => {
  void (async () => {
    if (req.headers.authorization !== `Bearer ${secret}`) {
      res.writeHead(401).end();
      return;
    }
    const u = new URL(req.url!, 'http://localhost');
    if (u.pathname === '/outage' && req.method === 'POST') {
      if (u.searchParams.get('on') === '1') {
        for (const socket of databaseSockets) socket.destroy();
        await new Promise<void>((resolve) => databaseProxy.close(() => resolve()));
      } else await listenDatabase();
      await runtime.availability.check(true);
      res.end('ok');
      return;
    }
    const room = matchMaker.getLocalRoomById(u.searchParams.get('match') ?? '') as
      | Diagnostic
      | undefined;
    if (!room) {
      res.writeHead(404).end();
      return;
    }
    if (req.method === 'POST' && u.pathname === '/advance')
      await room.advance(u.searchParams.has('ms') ? Number(u.searchParams.get('ms')) : undefined);
    else if (req.method !== 'GET' || u.pathname !== '/snapshot') {
      res.writeHead(405).end();
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(room.snapshot()));
  })().catch(() => res.writeHead(503).end());
}).listen(2597, '127.0.0.1');
process.on(
  'SIGTERM',
  () =>
    void runtime.stop().then(async () => {
      control.close();
      await repo.pool.end();
      databaseProxy.close();
      process.exit(0);
    }),
);
