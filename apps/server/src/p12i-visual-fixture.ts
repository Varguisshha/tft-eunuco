/** Explicit loopback-only visual lab; never imported by production. */
import { createServer as http } from 'node:http';
import { createServer } from './server';
import { MatchRoom } from './MatchRoom';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import { P12F_ECONOMY_CONFIG } from '@tft/game-data';
import { offsetToAxial } from '@tft/game-core';
import { fixtureUsers } from './multi-fixture';
import type { Client } from '@colyseus/core';
import type { VerifiedIdentity } from './auth';
const now = () => performance.now();
const matches = new Map<string, AuthoritativeMatch>();
async function verify(token: unknown): Promise<VerifiedIdentity> {
  const i = ['fixture-0', 'fixture-1', 'fixture-2', 'fixture-3'].indexOf(String(token));
  if (i < 0) throw Error('Explicit local identity required');
  return {
    userId: fixtureUsers[i]!,
    name: ['Vargas LAB', 'Florin LAB', 'Nora LAB', 'Alex LAB'][i]!,
    avatarId: 'jade',
    token: String(token),
    expiresAt: Date.now() + 3600000,
  };
}
class Fixture extends MatchRoom {
  onCreate() {
    super.onCreate();
    let held = '';
    this.clock.setInterval(() => {
      const phase = this.match.clock.snapshot();
      if (phase.currentPhase === 'preparation' && phase.phaseId !== held) {
        held = phase.phaseId;
        this.match.clock.restore({
          ...phase,
          phaseDuration: phase.phaseDuration + 600000,
          remainingMs: phase.remainingMs + 600000,
        });
        this.match.revision++;
      }
    }, 50);
  }
  static onAuth = verify;
  protected verify = verify;
  protected createMatch(capacity: 2 | 3 | 4 = 2) {
    const m = new AuthoritativeMatch(
      this.roomId,
      { now },
      () => 360,
      capacity,
      P12F_ECONOMY_CONFIG,
    );
    matches.set(this.roomId, m);
    return m;
  }
  onJoin(c: Client, o: unknown, a?: VerifiedIdentity) {
    super.onJoin(c, o, a);
    if (this.match.players.length === this.match.capacity) {
      const definitions = ['dolea', 'vargas', 'jaramillo', 'florin', 'dolea', 'vargas', 'florin'];
      for (const p of this.match.players) {
        if (p.state.units.length) continue;
        p.state.level = 7;
        p.state.units = definitions.map((definitionId, i) => ({
          id: `${p.id}-visual-${i}`,
          definitionId,
          stars: 1,
          location: { kind: 'board', hex: offsetToAxial(i, 4) },
        }));
        for (const u of p.state.units) this.match.pool[u.definitionId]!--;
      }
      for (const p of this.match.players) p.state.pool = { ...this.match.pool };
      this.match.assertConservation();
      this.match.revision++;
    }
  }
}
await createServer(Fixture, verify).listen(2594, '127.0.0.1');
http((req, res) => {
  if (req.headers.origin !== 'http://127.0.0.1:4192') {
    res.writeHead(403);
    res.end();
    return;
  }
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:4192');
  if (req.method === 'POST' && req.url === '/advance') {
    for (const m of matches.values()) {
      const phase = m.clock.snapshot();
      m.clock.restore({
        ...phase,
        phaseDuration: Math.max(1, phase.phaseDuration - phase.remainingMs),
        remainingMs: 0,
      });
      m.pulse();
    }
    res.end('advanced');
    return;
  }
  res.writeHead(404);
  res.end();
}).listen(2595, '127.0.0.1');
console.log('P12I isolated visual lab: 2594/2595');
