/** P12D loopback laboratory. Not imported by main/server; no remote credentials or databases. */
import { createServer as createHttp } from 'node:http';
import { createServer } from './server';
import { MatchRoom } from './MatchRoom';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import { P12D_ECONOMY_CONFIG } from '@tft/game-data';
import { fixtureUsers, equip } from './multi-fixture';
import type { VerifiedIdentity } from './auth';
const now = () => performance.now();
const matches = new Map<string, AuthoritativeMatch>();
async function verify(token: unknown): Promise<VerifiedIdentity> {
  const i = ['fixture-0', 'fixture-1', 'fixture-2', 'fixture-3'].indexOf(String(token));
  if (i < 0) throw Error('Lab identity required');
  return {
    userId: fixtureUsers[i]!,
    name: ['Vargas LAB', 'Florin LAB', 'Nora LAB', 'Alex LAB'][i]!,
    avatarId: 'jade',
    token: String(token),
    expiresAt: Date.now() + 3600000,
  };
}
class Fixture extends MatchRoom {
  static onAuth = verify;
  protected verify = verify;
  protected createMatch(capacity: 2 | 3 | 4 = 2) {
    const m = new AuthoritativeMatch(
      this.roomId,
      { now },
      () => 360,
      capacity,
      P12D_ECONOMY_CONFIG,
    );
    matches.set(this.roomId, m);
    return m;
  }
}
const server = createServer(Fixture, verify);
await server.listen(2592, '127.0.0.1');
createHttp((req, res) => {
  if (req.method === 'POST' && req.url === '/setup') {
    for (const m of matches.values()) {
      if (
        m.clock.snapshot().currentPhase !== 'preparation' ||
        m.players.some((p) => p.state.units.length)
      )
        continue;
      equip(m, undefined, ['florin', 'dolea']);
      for (const p of m.players) {
        m.grantItems(p.id, 'lab-items', [
          'component-ad',
          'component-ad',
          'component-attack_speed',
          'component-attack_speed',
          'component-attack_speed',
        ]);
      }
      m.revision++;
    }
  } else if (req.method === 'POST' && req.url === '/advance') {
    for (const m of matches.values()) {
      const s = m.clock.snapshot();
      m.clock.restore({ ...s, phaseDuration: s.phaseDuration - s.remainingMs, remainingMs: 0 });
      m.pulse();
    }
  } else if (req.method === 'POST' && req.url === '/near-final') {
    for (const m of matches.values())
      for (const p of m.players) {
        const h = p.state.healthLedger.filter((h) => h.side === 'south').at(-1);
        if (h?.outcome !== 'loss' || p.eliminated) continue;
        h.base = h.hpBefore - 1;
        h.survivors = 0;
        h.requested = h.base;
        h.applied = h.base;
        h.hpAfter = 1;
        p.state.health.south = 1;
      }
  } else if (req.method === 'POST' && req.url?.startsWith('/tick/')) {
    res.writeHead(400);
    res.end();
    return;
  } else if (req.method !== 'GET') {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify(
      [...matches.values()].map((m) => ({
        phase: m.clock.snapshot().currentPhase,
        remaining: m.clock.snapshot().remainingMs,
        round: m.players[0]?.state.round,
        players: m.players.length,
        final: !!m.finalResults,
      })),
    ),
  );
}).listen(2593, '127.0.0.1');
console.log('P12D LAB ready:2592, clock:2593');
