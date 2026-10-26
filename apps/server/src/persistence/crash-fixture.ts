/** Explicit, loopback-only diagnostics process. Never imported by production main. */
import { STANDARD_ITEMS_ECONOMY_CONFIG, EFFECT_ITEMS_ECONOMY_CONFIG } from '@tft/game-data';
import { AuthoritativeMatch } from '../AuthoritativeMatch';
import { act } from '../multi-fixture';
import { copiesOf } from '@tft/game-core';
import { createServer as http } from 'node:http';
import { matchMaker, ServerError } from '@colyseus/core';
import { createServer } from '../server';
import { MatchRoom } from '../MatchRoom';
import { PostgresTestRepository } from './PostgresTestRepository';
import { equip, fixtureUsers } from '../multi-fixture';
const url = process.env.PERSISTENCE_TEST_URL;
if (!url || !/^postgres(?:ql)?:\/\/[^/]*127\.0\.0\.1:55439\//.test(url))
  throw new Error('Isolated PostgreSQL required');
const repo = new PostgresTestRepository(url);
async function verify(token: unknown) {
  const i = Number(String(token).replace('fixture-', ''));
  if (!Number.isInteger(i) || !fixtureUsers[i]) throw new ServerError(401, 'Invalid fixture');
  return {
    token: String(token),
    userId: fixtureUsers[i]!,
    name: ['Vargas', 'Florin', 'Nora', 'Alex'][i]!,
    avatarId: 'jade' as const,
    expiresAt: Date.now() + 3600000,
  };
}
class Fixture extends MatchRoom {
  protected createMatch(capacity: 2 | 3 | 4 = 2) {
    return new AuthoritativeMatch(
      this.roomId,
      undefined,
      undefined,
      capacity,
      process.env.P8C_DIAGNOSTIC === '1'
        ? EFFECT_ITEMS_ECONOMY_CONFIG
        : STANDARD_ITEMS_ECONOMY_CONFIG,
    );
  }
  async itemEffects() {
    await this.mutate(() => {
      equip(this.match, undefined, ['dolea', 'jaramillo']);
      for (let i = 0; i < this.match.players.length; i++) {
        const p = this.match.players[i]!;
        this.match.grantItems(p.id, 'p8c-effects', [
          'item-forge-ap--armor',
          'item-forge-armor--health',
          'item-forge-attack_speed--magic_resist',
          'item-forge-attack_speed--critical',
        ]);
        for (const [j, item] of [...p.state.items!.completed].entries()) {
          const receipt = act(this.match, i, {
            type: 'equip_item',
            unitId: p.state.units[Math.floor(j / 2)]!.id,
            itemId: item.id,
          });
          if (!receipt.accepted)
            throw Error(
              JSON.stringify({
                reason: receipt.reason,
                index: i,
                j,
                clock: this.match.clock.snapshot(),
              }),
            );
        }
      }
    });
  }
  static onAuth = verify;
  protected verify = verify;
  async itemFoundation() {
    await this.mutate(() => {
      if (this.match.clock.snapshot().currentPhase === 'resolution') {
        const c = this.match.clock.snapshot();
        this.match.clock.restore({ ...c, remainingMs: 0 });
        this.match.pulse();
      }
      const p = this.match.players[0]!;
      this.match.grantItems(p.id, 'p8a-crash-grant', Array(20).fill('component-ad'));
    });
  }
  async fusionShop() {
    await this.mutate(() => {
      const p = this.match.players[0]!;
      for (const offer of p.state.shop) if (offer) this.match.pool[offer.definitionId]!++;
      p.state.shop = Array.from({ length: 5 }, (_, i) =>
        i < 3 ? { id: `fusion-offer-${i}`, definitionId: 'test-k01' } : null,
      );
      this.match.pool['test-k01']! -= 3;
      for (const player of this.match.players) player.state.pool = { ...this.match.pool };
      this.match.revision++;
      this.match.assertConservation();
    });
  }
  async overtime() {
    await this.mutate(() => {
      if (this.match.clock.snapshot().currentPhase === 'resolution') {
        const c = this.match.clock.snapshot();
        this.match.clock.restore({ ...c, remainingMs: 0 });
        this.match.pulse();
      }
      if (this.match.clock.snapshot().currentPhase !== 'preparation')
        throw Error('Preparation required');
      for (const p of this.match.players) {
        for (const u of p.state.units)
          this.match.pool[u.definitionId]! += copiesOf(u, p.state.config);
        p.state.units = [];
      }
      equip(this.match, undefined, ['test-k01']);
      const c = this.match.clock.snapshot();
      this.match.clock.restore({ ...c, remainingMs: 0 });
      this.match.pulse();
      const combat = this.match.clock.snapshot();
      this.match.clock.restore({ ...combat, remainingMs: combat.phaseDuration - 31000 });
      this.match.revision++;
    });
  }
  async finish() {
    await this.mutate(() => {
      for (let i = 0; i < 200 && !this.match.finalResults; i++) {
        const c = this.match.clock.snapshot();
        this.match.clock.restore({ ...c, remainingMs: 0 });
        this.match.pulse();
      }
    });
  }
  async advance(ms?: number) {
    await this.mutate(() => {
      const c = this.match.clock.snapshot();
      const remaining = ms === undefined ? 0 : Math.max(0, c.remainingMs - ms);
      this.match.clock.restore({ ...c, remainingMs: remaining });
      this.match.pulse();
    });
  }
}
const server = createServer(Fixture, verify, repo);
await server.listen(2582, '127.0.0.1');
const control = http(async (req, res) => {
  try {
    const parsed = new URL(req.url!, 'http://localhost');
    if (
      req.method === 'POST' &&
      ['/overtime', '/finish', '/fusion-shop', '/item-foundation', '/item-effects'].includes(
        parsed.pathname,
      )
    ) {
      for (const r of await matchMaker.query({ name: 'private_match' })) {
        const room = matchMaker.getLocalRoomById(r.roomId) as Fixture;
        if (parsed.pathname === '/item-effects') {
          if (parsed.searchParams.get('matchId') !== room.roomId) continue;
          await room.itemEffects();
        } else if (parsed.pathname === '/item-foundation') {
          if (parsed.searchParams.get('matchId') !== room.roomId) continue;
          await room.itemFoundation();
        } else if (parsed.pathname === '/fusion-shop') await room.fusionShop();
        else if (parsed.pathname === '/overtime') await room.overtime();
        else await room.finish();
      }
    }
    if (req.method === 'POST' && parsed.pathname === '/advance') {
      for (const r of await matchMaker.query({ name: 'private_match' }))
        await (matchMaker.getLocalRoomById(r.roomId) as Fixture).advance(
          parsed.searchParams.has('ms') ? Number(parsed.searchParams.get('ms')) : undefined,
        );
    }
    res.end('ok');
  } catch (error) {
    res.statusCode = 503;
    res.end(error instanceof Error ? error.message : 'storage unavailable');
  }
}).listen(2583, '127.0.0.1');
console.log('PERSISTENCE_READY');
for (const sig of ['SIGINT', 'SIGTERM'] as const)
  process.on(
    sig,
    () =>
      void server.gracefullyShutdown(false).then(async () => {
        control.close();
        await repo.pool.end();
        process.exit(0);
      }),
  );
