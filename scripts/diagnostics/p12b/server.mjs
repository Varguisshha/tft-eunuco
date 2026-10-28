/* global URL, console, structuredClone */
/** Loopback only, disposable synthetic identities; no Supabase/Railway or real accounts. */
import { createServer as http } from 'node:http';
import { createServer } from '../../../apps/server/src/server.ts';
import { MatchRoom } from '../../../apps/server/src/MatchRoom.ts';
import { AuthoritativeMatch } from '../../../apps/server/src/AuthoritativeMatch.ts';
import { P12B_ECONOMY_CONFIG } from '../../../packages/game-data/src/index.ts';
import { equip, fixtureUsers, act } from '../../../apps/server/src/multi-fixture.ts';
const matches = new Map();
const verify = async (token) => {
  const i = ['fixture-0', 'fixture-1', 'fixture-2', 'fixture-3'].indexOf(token);
  if (i < 0) throw Error('Local fixtures only');
  return {
    token,
    userId: fixtureUsers[i],
    name: ['Vargas', 'Florin', 'Nora', 'Alex'][i],
    avatarId: 'jade',
    expiresAt: Date.now() + 3600000,
  };
};
class Fixture extends MatchRoom {
  static onAuth = verify;
  verify = verify;
  createMatch(capacity = 4) {
    const m = new AuthoritativeMatch(
      this.roomId,
      { now: () => 0 },
      () => 360,
      capacity,
      P12B_ECONOMY_CONFIG,
    );
    matches.set(this.roomId, m);
    return m;
  }
}
await createServer(Fixture, verify).listen(2578, '127.0.0.1');
http((req, res) => {
  try {
    const path = new URL(req.url, 'http://127.0.0.1').pathname;
    if (req.method === 'POST')
      for (const m of matches.values()) {
        if (path === '/advance') {
          m.clock.restore({ ...m.clock.snapshot(), remainingMs: 0 });
          m.pulse();
        }
        if (path === '/setup') {
          equip(m, undefined, ['dolea', 'vargas']);
          for (const p of m.players) m.grantItems(p.id, 'full-bag', Array(16).fill('component-ad'));
          m.revision++;
        }
        if (path === '/eliminate') {
          if (m.clock.snapshot().currentPhase !== 'preparation')
            throw Error('Prepare elimination only before combat');
          const p = m.players.find(
            (p) =>
              !p.eliminated &&
              p.state.healthLedger.filter((h) => h.side === 'south').at(-1)?.outcome === 'loss',
          );
          if (!p) throw Error('A prior losing participant is required');
          const draft = structuredClone(p.state),
            h = draft.healthLedger.filter((h) => h.side === 'south').at(-1);
          h.base = h.hpBefore - 1;
          h.survivors = 0;
          h.requested = h.base;
          h.applied = h.base;
          h.hpAfter = 1;
          draft.health.south = 1;
          const before = p.state;
          p.state = draft;
          try {
            m.assertConservation();
          } catch (error) {
            p.state = before;
            throw error;
          }
          for (const u of [...p.state.units])
            if (!act(m, m.players.indexOf(p), { type: 'sell_unit', unitId: u.id }).accepted)
              throw Error('Fixture sale failed');
          m.assertConservation();
          m.revision++;
        }
      }
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify(
        [...matches.values()].map((m) => ({
          phase: m.clock.snapshot().currentPhase,
          round: m.clock.snapshot().roundId,
          players: m.players.map((p) => ({
            id: p.id,
            hp: p.state.health.south,
            eliminated: p.eliminated,
          })),
          pairings: m.plan?.pairings,
          removers: m.players.map((p) => p.state.items.removers.issued.length),
        })),
      ),
    );
  } catch (error) {
    console.warn('Fixture control rejected:', error.message);
    res.statusCode = 400;
    res.end(error.message);
  }
}).listen(2579, '127.0.0.1');
console.log('P12B loopback visual lab 2578 / 2579');
