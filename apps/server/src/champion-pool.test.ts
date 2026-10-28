import { describe, it, expect } from 'vitest';
import { EconomyConfigSchema } from '@tft/shared';
import {
  TFT_POOL_ECONOMY_CONFIG as config,
  INTEGRATED_ECONOMY_CONFIG as historical,
  matchCatalog,
} from '@tft/game-data';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import { act, intent, fixtureUsers } from './multi-fixture';
import {
  INTEGRATED_CATALOG_HASH,
  TFT_POOL_CATALOG_HASH,
  snapshotConfig,
} from './persistence/snapshot';
function fixture(n: 2 | 3 | 4) {
  const m = new AuthoritativeMatch('pool-test', { now: () => 0 }, () => 360, n, config);
  for (let i = 0; i < n; i++)
    m.join(`s${i}`, { userId: fixtureUsers[i]!, name: `Player ${i}`, avatarId: 'jade' });
  m.start('s0');
  return m;
}
function sync(m: AuthoritativeMatch) {
  for (const p of m.players) p.state.pool = { ...m.pool };
  m.assertConservation();
}
function step(m: AuthoritativeMatch) {
  m.clock.restore({ ...m.clock.snapshot(), remainingMs: 0 });
  m.pulse();
  m.assertConservation();
}
describe('versioned shared champion pool', () => {
  it('freezes five costs independently of unchanged prices, odds and historical config', () => {
    expect(config.copiesByCost).toEqual([30, 25, 18, 10, 9]);
    expect(historical.copiesByCost).toEqual([29, 22, 18]);
    expect(config.levels).toEqual(historical.levels);
    expect(matchCatalog(config)).toEqual(matchCatalog(historical));
    expect(
      EconomyConfigSchema.safeParse({ ...historical, copiesByCost: config.copiesByCost }).success,
    ).toBe(false);
    expect(
      EconomyConfigSchema.safeParse({ ...config, copiesByCost: historical.copiesByCost }).success,
    ).toBe(false);
    expect(snapshotConfig('f0p8d-florin-1', INTEGRATED_CATALOG_HASH)).toEqual(historical);
    expect(snapshotConfig('f0p8d-florin-1', TFT_POOL_CATALOG_HASH)).toEqual(config);
    expect(TFT_POOL_CATALOG_HASH).not.toBe(INTEGRATED_CATALOG_HASH);
  });
  it('rejects draft stock and tampered versions while preserving historical saves', () => {
    const m = fixture(4);
    const draft = m.exportState();
    draft.pool['unplayable-draft'] = 30;
    for (const p of draft.players) p.state.pool = { ...draft.pool };
    expect(() => AuthoritativeMatch.restore(draft)).toThrow();
    const mislabeled = m.exportState();
    mislabeled.catalog = INTEGRATED_CATALOG_HASH;
    expect(() => AuthoritativeMatch.restore(mislabeled)).toThrow();
    const old = new AuthoritativeMatch(
      'historical-pool',
      { now: () => 0 },
      () => 42,
      2,
      historical,
    );
    old.join('legacy', { userId: fixtureUsers[0]!, name: 'Legacy' });
    const saved = old.exportState();
    expect(AuthoritativeMatch.restore(saved, { now: () => 0 }, false).exportState()).toEqual(saved);
  });
  it.each([2, 3, 4] as const)(
    '%i players reserve, buy, replay receipts and restore without minting',
    (n) => {
      const m = fixture(n);
      for (const d of matchCatalog(config)) {
        const reserved = m.players
          .flatMap((p) => p.state.shop)
          .filter((o) => o?.definitionId === d.id).length;
        expect(m.pool[d.id]! + reserved).toBe(config.copiesByCost[d.cost - 1]);
      }
      expect(Object.keys(m.pool).sort()).toEqual(
        matchCatalog(config)
          .map((d) => d.id)
          .sort(),
      );
      expect(matchCatalog(config).find((d) => d.id === 'dolea')!.cost).toBe(2);
      expect(matchCatalog(config).find((d) => d.id === 'jaramillo')!.cost).toBe(2);
      for (let i = 0; i < n; i++) {
        const message = intent(m, i, {
          type: 'buy_unit',
          offerId: m.players[i]!.state.shop[0]!.id,
        });
        const before = { ...m.pool };
        expect(m.submit(message.sessionId, message).accepted).toBe(true);
        expect(m.pool).toEqual(before); // Offer already owns its physical reservation.
        const restored = AuthoritativeMatch.restore(m.exportState(), { now: () => 0 }, false);
        expect(restored.submit(message.sessionId, message).accepted).toBe(true);
        expect(restored.pool).toEqual(m.pool);
        expect(restored.players.map((p) => p.state.units)).toEqual(
          m.players.map((p) => p.state.units),
        );
        restored.assertConservation();
      }
      const saved = m.exportState();
      expect(AuthoritativeMatch.restore(saved, { now: () => 0 }, false).exportState()).toEqual(
        saved,
      );
      const lock = structuredClone(m.players[0]!.state.shop);
      expect(act(m, 0, { type: 'lock_shop', locked: true }).accepted).toBe(true);
      step(m);
      step(m);
      step(m);
      expect(m.players[0]!.state.shop).toEqual(lock);
      expect(act(m, 0, { type: 'lock_shop', locked: false }).accepted).toBe(true);
      expect(act(m, 0, { type: 'reroll_shop' }).accepted).toBe(true);
      m.assertConservation();
    },
  );
  it.each([1, 2, 3] as const)(
    'returns exactly the %i-star invested copies on sale after restore',
    (stars) => {
      let m = fixture(4);
      const p = m.players[0]!;
      m.pool.jaramillo! -= 3 ** (stars - 1);
      p.state.units.push({
        id: 'sale',
        definitionId: 'jaramillo',
        stars,
        location: { kind: 'bench', slot: 0 },
      });
      sync(m);
      m = AuthoritativeMatch.restore(m.exportState(), { now: () => 0 }, false);
      const before = m.pool.jaramillo!;
      expect(act(m, 0, { type: 'sell_unit', unitId: 'sale' }).accepted).toBe(true);
      expect(m.pool.jaramillo).toBe(before + 3 ** (stars - 1));
      m.assertConservation();
    },
  );
  it('cascades JARAMILLO fusion across board/bench without releasing its nine copies', () => {
    const m = fixture(4),
      p = m.players[0]!;
    for (const o of p.state.shop) if (o) m.pool[o.definitionId]!++;
    p.state.shop = [{ id: 'last', definitionId: 'jaramillo' }, null, null, null, null];
    m.pool.jaramillo! -= 9;
    p.state.units = [2, 2, 1, 1].map((stars, i) => ({
      id: `u${i}`,
      definitionId: 'jaramillo',
      stars: stars as 1 | 2,
      location:
        i === 0
          ? { kind: 'board' as const, hex: { q: 0, r: 4 } }
          : { kind: 'bench' as const, slot: i },
    }));
    sync(m);
    const before = { ...m.pool };
    expect(act(m, 0, { type: 'buy_unit', offerId: 'last' }).accepted).toBe(true);
    expect(p.state.units).toHaveLength(1);
    expect(p.state.units[0]!.stars).toBe(3);
    expect(m.pool).toEqual(before);
    m.assertConservation();
  });
  it('exhausts one identity without affecting another and forbids extra reservations', () => {
    const m = fixture(4);
    for (const p of m.players) {
      for (const o of p.state.shop) if (o) m.pool[o.definitionId]!++;
      p.state.shop = [null, null, null, null, null];
    }
    m.players[0]!.state.units = [0, 1].map((i) => ({
      id: `v${i}`,
      definitionId: 'vargas',
      stars: 3,
      location: { kind: 'bench', slot: i },
    }));
    m.pool.vargas = 0;
    expect(m.pool.florin).toBe(18);
    sync(m);
    for (let i = 0; i < 4; i++) {
      expect(act(m, i, { type: 'reroll_shop' }).accepted).toBe(true);
      expect(m.players[i]!.state.shop.some((o) => o?.definitionId === 'vargas')).toBe(false);
      m.assertConservation();
    }
  });
  it('repeats a fixed-seed four-player match through elimination and restoration', () => {
    const initial = fixture(4).exportState();
    initial.rng = 360;
    initial.itemDrops!.seed = 360;
    const run = () => {
      let m = AuthoritativeMatch.restore(initial, { now: () => 0 }, false);
      for (let i = 0; i < 4; i++) {
        const p = m.players[i]!;
        expect(act(m, i, { type: 'buy_unit', offerId: p.state.shop[0]!.id }).accepted).toBe(true);
      }
      for (let i = 0; i < 200 && !m.exportState().finalResult; i++) {
        step(m);
        m = AuthoritativeMatch.restore(m.exportState(), { now: () => 0 }, false);
      }
      expect(m.players.some((p) => p.poolReleased)).toBe(true);
      m.assertConservation();
      return {
        pool: m.pool,
        rng: m.exportState().rng,
        units: m.players.map((p) => p.state.units),
        eliminated: m.players.map((p) => p.eliminated),
      };
    };
    expect(run()).toEqual(run());
  });
});
