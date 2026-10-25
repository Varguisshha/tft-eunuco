/** Explicit local visual diagnostic. Never imported by the production entry. */
import { createServer as httpServer } from 'node:http';
import { createServer } from './server';
import { MatchRoom } from './MatchRoom';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import { equip, fixtureUsers } from './multi-fixture';
import type { Client } from '@colyseus/core';
import type { VerifiedIdentity } from './auth';
let now = 0;
const matches = new Map<string, AuthoritativeMatch>();
async function verify(token: unknown): Promise<VerifiedIdentity> {
  const i =
    typeof token === 'string'
      ? ['fixture-0', 'fixture-1', 'fixture-2', 'fixture-3'].indexOf(token)
      : -1;
  if (i < 0) throw Error('Explicit fixtures only');
  return {
    token: String(token),
    userId: fixtureUsers[i]!,
    name: ['Vargas', 'Florin', 'Nora', 'Alex'][i]!,
    avatarId: i === 1 ? 'pulse' : i === 2 ? 'spark' : 'jade',
    expiresAt: Date.now() + 3600000,
  };
}
class Fixture extends MatchRoom {
  static onAuth = verify;
  protected verify = verify;
  protected createMatch(capacity: 2 | 3 | 4 = 2) {
    const m = new AuthoritativeMatch(this.roomId, { now: () => now }, () => 360, capacity);
    matches.set(this.roomId, m);
    return m;
  }
  onJoin(c: Client, o: unknown, a?: VerifiedIdentity) {
    super.onJoin(c, o, a);
    if (this.match.players.length === this.match.capacity) {
      const tie = process.env.COMPETITION_FIXTURE === 'tie';
      this.match.players.forEach((p, i) => {
        const identity = fixtureUsers.indexOf(p.id);
        const health = tie ? 1 : [1, 9, 30, 100][identity]!;
        p.state.config = structuredClone(p.state.config);
        p.state.config.roundDamage.initialHp = health;
        p.state.health = { north: health, south: health };
        if (!tie && identity > 0)
          equip(this.match, [i], [identity === 3 ? 'vargas' : 'dolea'], identity === 3 ? 3 : 1);
      });
      this.match.revision++;
    }
  }
}
await createServer(Fixture, verify).listen(2574, '127.0.0.1');
httpServer((req, res) => {
  if (req.method === 'POST' && req.url === '/advance') {
    now += Math.max(0, ...[...matches.values()].map((m) => m.clock.snapshot().remainingMs));
    for (const m of matches.values()) m.pulse();
  } else if (req.method === 'POST' && req.url === '/tick') {
    now += 1000;
    for (const m of matches.values()) m.pulse();
  } else if (req.method !== 'GET') {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify(
      [...matches.values()].map((m) => ({
        id: m.id,
        phase: m.clock.snapshot().currentPhase,
        remaining: m.clock.snapshot().remainingMs,
        round: m.clock.snapshot().roundId,
        players: m.players.map((p) => ({
          id: p.id,
          name: p.name,
          hp: p.state.health.south,
          eliminated: p.eliminated,
        })),
        final: m.finalResults,
      })),
    ),
  );
}).listen(2576, '127.0.0.1');
console.log('Explicit controlled visual fixtures: game 2574, clock 2576; production untouched.');
