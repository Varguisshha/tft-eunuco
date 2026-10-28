import { describe, it, expect } from 'vitest';
import {
  P11G_ECONOMY_CONFIG,
  P11C_ECONOMY_CONFIG,
  TFT185_SHOP_ODDS,
  matchCatalog,
} from '@tft/game-data';
import type { MatchState } from '@tft/shared';
import { createMatch, applyMatchAction, commandFor } from './engine';
import { purchasePreviews } from './purchase-preview';
import { refreshShop } from './shop';
import { validateMatchState } from './invariants';
import { DevelopmentController } from '../development/controller';
import { LocalMatchCoordinator } from './coordinator';
import { grantItemInstances } from '../items/inventory';
import { settleLocalDrop } from '../items/local-drops';
const time = { now: () => 0 };
function lab(config = P11G_ECONOMY_CONFIG) {
  const c = new DevelopmentController(time, 42, 'dev-p11g-test', {
    ...config,
    roundDamage: { ...config.roundDamage, initialHp: 1000 },
  });
  c.coordinator.start();
  return c;
}
function offer(state: MatchState, id = 'dolea') {
  for (const o of state.shop) if (o) state.pool[o.definitionId]!++;
  state.shop = [{ id: 'target', definitionId: id }, null, null, null, null];
  state.pool[id]!--;
  state.shopRolls = [
    { cost: matchCatalog(state.config).find((d) => d.id === id)!.cost, outcome: 'offered' },
    ...Array.from({ length: 4 }, () => ({ cost: 4, outcome: 'no-catalog' as const })),
  ];
}
function units(state: MatchState, stars: (1 | 2 | 3)[]) {
  stars.forEach((n, i) => {
    state.units.push({
      id: `owned-${i}`,
      definitionId: 'dolea',
      stars: n,
      location: i === 0 ? { kind: 'board', hex: { q: -2, r: 4 } } : { kind: 'bench', slot: i - 1 },
    });
    state.pool.dolea! -= state.config.starCopies[n - 1]!;
  });
}
function buy(state: MatchState) {
  return applyMatchAction(state, commandFor(state, { type: 'buy_unit', offerId: 'target' }));
}
function through(c: LocalMatchCoordinator, round: number) {
  for (let i = 0; i < 100; i++) {
    if (c.getMatch().round === round && c.getClock().currentPhase === 'resolution') return;
    c.debugAdvance();
  }
  throw Error('Round missing');
}
describe('P11G nominal shop policy', () => {
  it('pins all ten levels, five cost copy counts, unchanged cap and combat', () => {
    expect(TFT185_SHOP_ODDS.map((r) => r.odds)).toEqual([
      [100, 0, 0, 0, 0],
      [100, 0, 0, 0, 0],
      [75, 25, 0, 0, 0],
      [55, 30, 15, 0, 0],
      [45, 33, 20, 2, 0],
      [30, 40, 25, 5, 0],
      [19, 30, 40, 10, 1],
      [15, 20, 32, 30, 3],
      [10, 17, 25, 33, 15],
      [5, 10, 20, 40, 25],
    ]);
    expect(P11G_ECONOMY_CONFIG.maxLevel).toBe(7);
    expect(P11G_ECONOMY_CONFIG.copiesByCost).toEqual([30, 25, 18, 10, 9]);
    expect(matchCatalog(P11G_ECONOMY_CONFIG)).toEqual(matchCatalog(P11C_ECONOMY_CONFIG));
  });
  it('deterministically reserves and returns copies over repeated rerolls', () => {
    const a = createMatch(18, P11G_ECONOMY_CONFIG),
      b = structuredClone(a);
    for (let n = 0; n < 100; n++) {
      refreshShop(a);
      refreshShop(b);
      expect(a).toEqual(b);
      validateMatchState(a);
    }
  });
  it('does not renormalize absent categories at level seven', () => {
    const s = createMatch(45, P11G_ECONOMY_CONFIG);
    s.level = 7;
    s.xp = 0;
    s.totalXp = s.config.levels.filter((r) => r.level < 7).reduce((n, r) => n + r.xpToNext, 0);
    const counts = [0, 0, 0, 0, 0];
    for (let n = 0; n < 4000; n++) {
      refreshShop(s);
      for (const [i, r] of s.shopRolls!.entries()) {
        counts[r.cost - 1]!++;
        expect(r.outcome === 'no-catalog').toBe(r.cost >= 4);
        expect(!!s.shop[i]).toBe(r.cost <= 3);
      }
    }
    for (let i = 0; i < 5; i++)
      expect(Math.abs(counts[i]! / 200 - TFT185_SHOP_ODDS[6]!.odds[i]!)).toBeLessThan(1.3);
  });
  it('leaves all slots empty for exhausted tier one instead of drawing tier two', () => {
    const s = createMatch(1, P11G_ECONOMY_CONFIG);
    s.shop = Array(5).fill(null);
    for (const d of matchCatalog(s.config)) if (d.cost === 1) s.pool[d.id] = 0;
    refreshShop(s);
    expect(s.shop).toEqual(Array(5).fill(null));
    expect(s.shopRolls!.every((r) => r.cost === 1 && r.outcome === 'exhausted')).toBe(true);
  });
});
describe('P11G exact purchase preview', () => {
  it.each([
    { stars: [1, 1] as (1 | 2)[], expected: 2 },
    { stars: [2, 2, 1, 1] as (1 | 2)[], expected: 3 },
  ])('previews board+bench and cascade $expected', ({ stars, expected }) => {
    const s = createMatch(42, P11G_ECONOMY_CONFIG);
    offer(s);
    units(s, stars);
    const before = JSON.stringify(s);
    expect(purchasePreviews(s)[0]!.upgrade?.stars).toBe(expected);
    expect(JSON.stringify(s)).toBe(before);
    const result = buy(s);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.units.some((u) => u.stars === expected)).toBe(true);
    validateMatchState(result.state);
    expect(purchasePreviews(result.state)[0]!.upgrade).toBeNull();
  });
  it('withdraws cue after sale and unaffordable purchase without touching stock', () => {
    const s = createMatch(42, P11G_ECONOMY_CONFIG);
    offer(s);
    units(s, [1, 1]);
    const sale = applyMatchAction(s, commandFor(s, { type: 'sell_unit', unitId: 'owned-1' }));
    expect(sale.ok).toBe(true);
    if (sale.ok) expect(purchasePreviews(sale.state)[0]!.upgrade).toBeNull();
    const poor = createMatch(42, { ...P11G_ECONOMY_CONFIG, initialGold: 0 });
    offer(poor);
    units(poor, [1, 1]);
    expect(purchasePreviews(poor)[0]!.error).toBe('insufficient-gold');
    expect(purchasePreviews(poor)[0]!.upgrade).toBeNull();
  });
  it('removes cue on closed phase and reroll, restores exact preview after save', () => {
    const c = lab();
    const save = c.coordinator.exportSave();
    offer(save.match);
    units(save.match, [1, 1]);
    const restored = LocalMatchCoordinator.restore(save, time);
    expect(purchasePreviews(restored.getMatch())[0]!.upgrade?.stars).toBe(2);
    const s = structuredClone(save.match);
    s.phase = 'resolution';
    expect(purchasePreviews(s)[0]!.upgrade).toBeNull();
    refreshShop(save.match);
    expect(
      purchasePreviews(save.match).every((p) => !p.upgrade || p.upgrade.offerId !== 'target'),
    ).toBe(true);
  });
});
it('full bench suppresses a blocked buy but permits a fusion that frees space', () => {
  const s = createMatch(42, P11G_ECONOMY_CONFIG);
  offer(s);
  const ids = matchCatalog(s.config)
    .filter((d) => d.id !== 'dolea')
    .slice(0, 9);
  ids.forEach((d, i) => {
    s.units.push({
      id: `full-${i}`,
      definitionId: d.id,
      stars: 1,
      location: { kind: 'bench', slot: i },
    });
    s.pool[d.id]!--;
  });
  expect(purchasePreviews(s)[0]).toEqual({ error: 'bench-full', upgrade: null });
  // Two own DOLEA board copies may fuse even with all nine bench positions occupied.
  s.units.push(
    {
      id: 'board-a',
      definitionId: 'dolea',
      stars: 1,
      location: { kind: 'board', hex: { q: 0, r: 4 } },
    },
    {
      id: 'board-b',
      definitionId: 'dolea',
      stars: 1,
      location: { kind: 'board', hex: { q: 1, r: 4 } },
    },
  );
  s.pool.dolea! -= 2;
  expect(purchasePreviews(s)[0]!.upgrade?.stars).toBe(2);
  const out = buy(s);
  expect(out.ok).toBe(true);
  if (out.ok) validateMatchState(out.state);
});
describe('P11G local delivery and settlement', () => {
  it('delivers in 3/6/9 with restart, pending overflow and idempotent settlement', () => {
    let c = lab().coordinator;
    grantItemInstances(c.getMatch(), 'fill', Array(16).fill('component-ad'));
    for (const round of [3, 6, 9]) {
      through(c, round);
      const saved = c.exportSave();
      expect(saved.localDrops!.rounds.map((r) => r.round)).toEqual(
        [3, 6, 9].filter((r) => r <= round),
      );
      const last = saved.localDrops!.rounds.at(-1)!;
      expect([2, 3]).toContain(last.quantity);
      expect(last.definitionIds).toHaveLength(last.quantity);
      expect(saved.match.items!.pending.length).toBeGreaterThan(0);
      expect(
        settleLocalDrop(structuredClone(saved.match), saved.localDrops!, saved.clock.matchId),
      ).toEqual(saved.localDrops);
      c = LocalMatchCoordinator.restore(saved, time);
      c.pulse();
      expect(c.exportSave().localDrops).toEqual(saved.localDrops);
    }
  });
  it('rejects altered seed, missing journal, removed award and duplicate round', () => {
    const c = lab().coordinator;
    through(c, 3);
    const save = c.exportSave();
    for (const mutate of [
      (s: typeof save) => {
        s.localDrops!.seed ^= 1;
      },
      (s: typeof save) => {
        delete s.localDrops;
      },
      (s: typeof save) => {
        s.localDrops!.rounds = [];
      },
      (s: typeof save) => {
        s.localDrops!.rounds.push(s.localDrops!.rounds[0]!);
      },
    ]) {
      const bad = structuredClone(save);
      mutate(bad);
      expect(() => LocalMatchCoordinator.restore(bad, time)).toThrow();
    }
  });
  it('does not retroactively grant components or metadata to historical local catalog', () => {
    const c = lab(P11C_ECONOMY_CONFIG).coordinator;
    through(c, 11);
    expect(c.getMatch().items!.components).toEqual([]);
    expect(c.exportSave()).not.toHaveProperty('localDrops');
    expect(c.getMatch().lastReward).not.toHaveProperty('receipt');
    expect(() => LocalMatchCoordinator.restore(c.exportSave(), time)).not.toThrow();
  });
  it('records exact credited sources including gold cap and immutable settlement identity', () => {
    const controller = lab();
    expect(
      controller.execute({
        id: 'max',
        origin: 'test',
        expectedRevision: 0,
        command: { type: 'gold', mode: 'max' },
      }).ok,
    ).toBe(true);
    const c = controller.coordinator;
    through(c, 1);
    const r = c.getMatch().lastReward!;
    expect(r.receipt!.id).toBe('dev-p11g-test/round/1/settlement');
    expect(r.credited).toBe(0);
    expect(
      Object.entries(r.receipt!)
        .filter(([k]) => !['id', 'version'].includes(k))
        .reduce((n, [, v]) => n + Number(v), 0),
    ).toBe(0);
    expect(r.overflow).toBe(r.total);
  });
});
