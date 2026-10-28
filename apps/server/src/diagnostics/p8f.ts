/** Loopback laboratory only; never imported by main. Only time can be mutated. */
import { createServer as createHttpServer } from 'node:http';
import { ServerError } from '@colyseus/core';
import { INTEGRATED_ECONOMY_CONFIG } from '@tft/game-data';
import { AuthoritativeMatch } from '../AuthoritativeMatch';
import { MatchRoom } from '../MatchRoom';
import { createServer } from '../server';
import { fixtureUsers } from '../multi-fixture';
const matches = new Map<string, AuthoritativeMatch>();
let now = 0;
async function verify(token: unknown) {
  const i = ['fixture-0', 'fixture-1', 'fixture-2', 'fixture-3'].indexOf(String(token));
  if (i < 0) throw new ServerError(401, 'Invalid laboratory identity');
  return {
    token: String(token),
    userId: fixtureUsers[i]!,
    name: ['Vargas', 'Florin', 'Nora', 'Alex'][i]!,
    avatarId: 'jade' as const,
    expiresAt: Date.now() + 3600000,
  };
}
class Laboratory extends MatchRoom {
  static onAuth = verify;
  protected verify = verify;
  protected createMatch(capacity: 2 | 3 | 4 = 2) {
    const snapshot = new AuthoritativeMatch(
      this.roomId,
      { now: () => now },
      undefined,
      capacity,
      INTEGRATED_ECONOMY_CONFIG,
    ).exportState();
    snapshot.rng = 80126;
    snapshot.itemDrops!.seed = 80626;
    const match = AuthoritativeMatch.restore(snapshot, { now: () => now }, false);
    matches.set(this.roomId, match);
    return match;
  }
}
const server = createServer(Laboratory, verify);
await server.listen(2592, '127.0.0.1');
const control = createHttpServer((req, res) => {
  const url = new URL(req.url!, 'http://127.0.0.1');
  const match = matches.get(url.searchParams.get('match') ?? '');
  if (!match) {
    res.writeHead(404).end();
    return;
  }
  if (req.method === 'POST' && url.pathname === '/advance') {
    now += url.searchParams.has('ms')
      ? Number(url.searchParams.get('ms'))
      : match.clock.snapshot().remainingMs;
    match.pulse();
  } else if (!(req.method === 'GET' && url.pathname === '/snapshot')) {
    res.writeHead(405).end();
    return;
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(match.exportState()));
}).listen(2593, '127.0.0.1');
for (const sig of ['SIGINT', 'SIGTERM'] as const)
  process.on(
    sig,
    () =>
      void server.gracefullyShutdown(false).then(() => {
        control.close();
        process.exit(0);
      }),
  );
console.log('P8F_LAB_READY');
