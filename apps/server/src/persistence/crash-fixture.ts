/** Explicit, loopback-only diagnostics process. Never imported by production main. */
import {
  P11_ECONOMY_CONFIG,
  P11H_ECONOMY_CONFIG,
  P11K_ECONOMY_CONFIG,
  P12B_ECONOMY_CONFIG,
  P12D_ECONOMY_CONFIG,
  P12F_ECONOMY_CONFIG,
  P11H_ITEM_CATALOG,
  TFT_POOL_ECONOMY_CONFIG,
  INTEGRATED_ECONOMY_CONFIG,
  ROSTER_ECONOMY_CONFIG,
  FLORIN_ECONOMY_CONFIG,
  DROP_ITEMS_ECONOMY_CONFIG,
  STANDARD_ITEMS_ECONOMY_CONFIG,
  EFFECT_ITEMS_ECONOMY_CONFIG,
} from '@tft/game-data';
import { appendFileSync, mkdirSync } from 'node:fs';
import type { StoredMatch } from './snapshot';
import { AuthoritativeMatch } from '../AuthoritativeMatch';
import { act } from '../multi-fixture';
import { copiesOf, grantItemInstances, applyItemCommand } from '@tft/game-core';
import { createServer as http } from 'node:http';
import { matchMaker, ServerError } from '@colyseus/core';
import { createServer } from '../server';
import { MatchRoom } from '../MatchRoom';
import { PostgresTestRepository } from './PostgresTestRepository';
import { equip, fixtureUsers } from '../multi-fixture';
const url = process.env.PERSISTENCE_TEST_URL;
if (!url || !/^postgres(?:ql)?:\/\/[^/]*127\.0\.0\.1:55439\//.test(url))
  throw new Error('Isolated PostgreSQL required');
function trace(stage: string, extra = {}) {
  if (process.env.P12R2_DIAGNOSTICS !== '1') return;
  mkdirSync('../../artifacts/p12a-r2', { recursive: true });
  appendFileSync(
    '../../artifacts/p12a-r2/fixture-trace.jsonl',
    JSON.stringify({
      at: Date.now(),
      pid: process.pid,
      stage,
      cpu: process.cpuUsage(),
      ...extra,
    }) + '\n',
  );
}
let preparationDelayMs = 0;
class ProbedRepository extends PostgresTestRepository {
  async commit(expected: number, document: StoredMatch) {
    const delay = preparationDelayMs;
    preparationDelayMs = 0;
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    trace('sql-submit', { revision: document.revision });
    process.send?.({ type: 'fixture-before-commit', revision: document.revision });
    try {
      await super.commit(expected, document);
    } finally {
      trace('sql-return', { revision: document.revision });
    }
  }
}
const repo = new ProbedRepository(url);
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
  onCreate() {
    super.onCreate();
    // This scenario advances every phase by HTTP against a fixed-step control.
    // Keep transport/auth timers, but avoid a second independent phase driver.
    // Other crash tests and the genuine automatic TLS/WSS campaigns keep the real driver.
    if (process.env.MANUAL_PHASE_STEPS === '1') this.setSimulationInterval(() => {});
  }

  protected createMatch(capacity: 2 | 3 | 4 = 2) {
    return new AuthoritativeMatch(
      this.roomId,
      undefined,
      undefined,
      capacity,
      process.env.P12F_DIAGNOSTIC === '1'
        ? P12F_ECONOMY_CONFIG
        : process.env.P12D_DIAGNOSTIC === '1'
          ? P12D_ECONOMY_CONFIG
          : process.env.P12B_DIAGNOSTIC === '1'
            ? P12B_ECONOMY_CONFIG
            : process.env.P11K_DIAGNOSTIC === '1'
              ? P11K_ECONOMY_CONFIG
              : process.env.P11H_DIAGNOSTIC === '1'
                ? P11H_ECONOMY_CONFIG
                : process.env.P11_DIAGNOSTIC === '1'
                  ? P11_ECONOMY_CONFIG
                  : process.env.POOL_DIAGNOSTIC === '1'
                    ? TFT_POOL_ECONOMY_CONFIG
                    : process.env.ROSTER_DIAGNOSTIC === '1'
                      ? ROSTER_ECONOMY_CONFIG
                      : process.env.INTEGRATED_DIAGNOSTIC === '1'
                        ? INTEGRATED_ECONOMY_CONFIG
                        : process.env.P8D_DIAGNOSTIC === '1'
                          ? DROP_ITEMS_ECONOMY_CONFIG
                          : process.env.FLORIN_DIAGNOSTIC === '1'
                            ? FLORIN_ECONOMY_CONFIG
                            : process.env.P8C_DIAGNOSTIC === '1'
                              ? EFFECT_ITEMS_ECONOMY_CONFIG
                              : STANDARD_ITEMS_ECONOMY_CONFIG,
    );
  }
  async p12fSetup() {
    if (process.env.P12F_DIAGNOSTIC !== '1') throw Error('P12F loopback fixture only');
    await this.mutate(() => {
      equip(this.match);
      for (const [i, p] of this.match.players.entries()) {
        p.state.units.push({
          id: `p12f-bench-${i}`,
          definitionId: 'florin',
          stars: 1,
          location: { kind: 'bench', slot: 0 },
        });
        this.match.pool.florin!--;
        for (const q of this.match.players) q.state.pool = { ...this.match.pool };
        this.match.grantItems(p.id, 'p12f-crash', [
          'component-ad',
          'component-ad',
          'component-attack_speed',
        ]);
      }
      for (const p of this.match.players) p.state.pool = { ...this.match.pool };
      this.match.assertConservation();
    });
  }
  async removerSetup() {
    await this.mutate(() => {
      equip(this.match);
      for (const [i, p] of this.match.players.entries()) {
        const unit = {
          id: `remover-bench-${i}`,
          definitionId: 'florin',
          stars: 1 as const,
          location: { kind: 'bench' as const, slot: 0 },
        };
        p.state.units.push(unit);
        this.match.pool.florin!--;
        for (const q of this.match.players) q.state.pool = { ...this.match.pool };
        const definitions = ['TFT_Item_Deathblade', 'TFT_Item_WarmogsArmor'].map(
          (id) => P11H_ITEM_CATALOG.definitions.find((d) => d.content?.sourceRecordId === id)!.id,
        );
        this.match.grantItems(p.id, 'remover-items', definitions);
        for (const item of [...p.state.items!.completed]) {
          const receipt = act(this.match, i, {
            type: 'equip_item',
            unitId: unit.id,
            itemId: item.id,
          });
          if (!receipt.accepted)
            throw Error(
              `Remover setup equipment: ${receipt.reason}; ${this.match.clock.snapshot().currentPhase}`,
            );
        }
        this.match.grantItems(p.id, 'remover-full-bag', Array(16).fill(definitions[0]!));
      }
      this.match.assertConservation();
    });
  }
  async itemEffects() {
    await this.mutate(() => {
      const integrated =
        process.env.INTEGRATED_DIAGNOSTIC === '1' || process.env.ROSTER_DIAGNOSTIC === '1';
      if (integrated) {
        equip(this.match, undefined, ['jaramillo']);
        for (let i = 0; i < this.match.players.length; i++) {
          const p = this.match.players[i]!;
          const prior = p.state.shop[0];
          if (prior) this.match.pool[prior.definitionId]!++;
          this.match.pool.florin!--;
          p.state.shop[0] = { id: `integration-florin-${i}`, definitionId: 'florin' };
          for (const player of this.match.players) player.state.pool = { ...this.match.pool };
          if (!act(this.match, i, { type: 'buy_unit', offerId: p.state.shop[0]!.id }).accepted)
            throw Error('Florin purchase failed');
          const florin = p.state.units.find((u) => u.definitionId === 'florin')!;
          if (
            !act(this.match, i, {
              type: 'move_unit',
              unitId: florin.id,
              to: { kind: 'board', hex: { q: 1, r: 4 } },
            }).accepted
          )
            throw Error('Florin deployment failed');
        }
      } else
        equip(this.match, undefined, [
          process.env.FLORIN_DIAGNOSTIC === '1' ? 'florin' : 'dolea',
          'jaramillo',
        ]);
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
      if (process.env.P11H_DIAGNOSTIC === '1') {
        equip(this.match);
        const definitions = ['TFT_Item_RapidFireCannon', 'TFT_Item_MadredsBloodrazor'].map(
          (id) => P11H_ITEM_CATALOG.definitions.find((d) => d.content?.sourceRecordId === id)!.id,
        );
        for (const p of this.match.players) {
          grantItemInstances(p.state, `h-verified-${p.id}`, definitions);
          for (const item of [...p.state.items!.completed])
            applyItemCommand(p.state, {
              type: 'equip_item',
              itemId: item.id,
              unitId: p.state.units[0]!.id,
            });
        }
        this.match.assertConservation();
        this.match.revision++;
        return;
      }
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
    trace('advance-start');
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
    if (req.method === 'POST' && parsed.pathname === '/probe-preparation-delay') {
      preparationDelayMs = 2300;
    }
    if (
      req.method === 'POST' &&
      [
        '/overtime',
        '/finish',
        '/fusion-shop',
        '/item-foundation',
        '/item-effects',
        '/remover-setup',
        '/p12f-setup',
      ].includes(parsed.pathname)
    ) {
      for (const r of await matchMaker.query({ name: 'private_match' })) {
        const room = matchMaker.getLocalRoomById(r.roomId) as Fixture;
        if (parsed.pathname === '/p12f-setup') await room.p12fSetup();
        else if (parsed.pathname === '/remover-setup') await room.removerSetup();
        else if (parsed.pathname === '/item-effects') {
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
