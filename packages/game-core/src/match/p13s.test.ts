import { expect, it } from 'vitest';
import {
  P13S_ECONOMY_CONFIG,
  P12F_ECONOMY_CONFIG,
  P13S_TRAITS,
  P11_TRAITS,
  HORTALEZA_CONTRIBUTIONS,
  PREDICTIONS,
  matchCatalog,
} from '@tft/game-data';
import { SYNERGY_RULES, type MatchState } from '@tft/shared';
import { createMatch, applyMatchAction, commandFor, RoundAuthority, combine } from './engine';
import {
  startSynergyRound,
  selectPrediction,
  lockPredictions,
  settleSynergies,
  predictionEvidence,
  synergyRandom,
  rouletteCategory,
  deliverSynergyChampions,
} from './synergies';
import { validateMatchState } from './invariants';
import { grantItemInstances, validateItemState } from '../items/inventory';
export function fixture(seed = 42, definitions = ['danigm', 'peibol'], stars: 1 | 2 | 3 = 1) {
  const s = createMatch(seed, { ...P13S_ECONOMY_CONFIG, initialGold: 100 });
  for (const o of s.shop) if (o) s.pool[o.definitionId]!++;
  s.shop = Array(5).fill(null);
  s.shopRolls = s.shopRolls!.map((r) => ({ ...r, outcome: 'released' }));
  s.level = 7;
  s.xp = 0;
  s.units = definitions.map((definitionId, i) => ({
    id: `unit-${i}`,
    definitionId,
    stars,
    location: { kind: 'board', hex: { q: i - 2, r: 4 } },
  }));
  for (const u of s.units) s.pool[u.definitionId]! -= 3 ** (stars - 1);
  // Re-open the synthetic initial round with an installed formation; no production hook does this.
  s.synergies!.markets = [];
  return s;
}
function resolve(s: MatchState) {
  const a = new RoundAuthority(),
    begun = a.begin(s);
  const out = a.settle(begun.state);
  if (!out.ok) throw Error(out.error);
  return { state: out.state, replay: begun.replay };
}
it('historical traits, other synergies and 34 characters are preserved; P13S is opt-in', () => {
  const historical = createMatch();
  expect(historical.synergies).toBeUndefined();
  expect(P12F_ECONOMY_CONFIG.synergyPolicy).toBeUndefined();
  expect(matchCatalog(P13S_ECONOMY_CONFIG)).toHaveLength(34);
  expect(Object.keys(HORTALEZA_CONTRIBUTIONS)).toEqual(
    expect.arrayContaining(P13S_TRAITS.find((t) => t.id === 'hortaleza')!.planning!.members),
  );
  expect(Object.keys(HORTALEZA_CONTRIBUTIONS)).toHaveLength(12);
  for (const t of P11_TRAITS) {
    const n = P13S_TRAITS.find((x) => x.id === t.id)!;
    if (!['upm', 'hortaleza', 'fantasy', 'shisheros', 'jew', 'todo-al-rojo'].includes(t.id))
      expect({ ...n, description: t.description }).toEqual(t);
  }
  expect(P13S_TRAITS.find((t) => t.id === 'lenceria')).toEqual(
    P11_TRAITS.find((t) => t.id === 'lenceria'),
  );
});
it('market costs one gold, quota, no duplicates, eligible unit, phase freeze and replay evaluation', () => {
  let s = fixture(4, ['dolea', 'vargas', 'cosmin', 'agus']);
  startSynergyRound(s);
  const market = s.synergies!.markets[0]!;
  expect(new Set(market.offers).size).toBe(3);
  const nonunit = market.offers.find((k) => !PREDICTIONS[k].unit) ?? market.offers[0]!;
  const uid = PREDICTIONS[nonunit].unit ? s.units[0]!.id : undefined;
  const before = s.gold;
  expect(selectPrediction(s, nonunit, uid)).toBe(true);
  expect(s.gold).toBe(before - 1);
  expect(selectPrediction(s, nonunit, uid)).toBe(false);
  const invalid = market.offers.find((k) => PREDICTIONS[k].unit);
  if (invalid && invalid !== nonunit)
    expect(selectPrediction(s, invalid, 'not-deployed')).toBe(false);
  const next = market.offers.find((k) => k !== nonunit)!;
  expect(selectPrediction(s, next, PREDICTIONS[next].unit ? s.units[1]!.id : undefined)).toBe(true);
  const last = market.offers.find((k) => k !== nonunit && k !== next)!;
  expect(selectPrediction(s, last, PREDICTIONS[last].unit ? s.units[2]!.id : undefined)).toBe(
    false,
  );
  const { state, replay } = resolve(s);
  s = state;
  expect(s.synergies!.markets[0]!.locked).toBe(true);
  for (const b of s.synergies!.markets[0]!.bets)
    expect(b.status).toBe(predictionEvidence(replay)(b.kind, b.unitId) ? 'won' : 'lost');
  const saved = structuredClone(s);
  settleSynergies(s, replay, 100);
  expect(s).toEqual(saved);
  expect(selectPrediction(s, last)).toBe(false);
  expect(() => validateMatchState(s)).not.toThrow();
});
it('invalidated unit predictions refund before pairing; selected reserve is not spent twice', () => {
  const s = fixture(3, ['dolea', 'vargas']);
  startSynergyRound(s);
  const m = s.synergies!.markets[0]!;
  m.offers = ['untouchable', 'wall', 'survival'];
  expect(selectPrediction(s, 'untouchable', 'unit-0')).toBe(true);
  s.units[0]!.location = { kind: 'bench', slot: 0 };
  const gold = s.gold;
  lockPredictions(s);
  lockPredictions(s);
  expect(s.gold).toBe(gold + 1);
  expect(m.bets[0]!.status).toBe('void');
});
it.each([1, 2, 3] as const)(
  'Jew %i★ frozen deployed Peibol, caps, bank before all incomes, independent from normal interest',
  (stars) => {
    const s = fixture(71, ['peibol'], stars);
    startSynergyRound(s);
    const { state } = resolve(s);
    const r = state.synergies!.receipts.find((r) => r.kind === 'interest')!;
    expect(r.gold).toBe([2, 4, 8][stars - 1]);
    expect(r.details).toContain(`bank:${s.gold}`);
    expect(state.lastReward!.interest).toBe(5);
    expect(state.gold).toBe(s.gold + state.lastReward!.credited + r.gold);
  },
);
it('Jew does not count bench-only or absent Peibol', () => {
  const s = fixture(71, ['peibol']);
  s.units[0]!.location = { kind: 'bench', slot: 0 };
  startSynergyRound(s);
  const { state } = resolve(s);
  expect(state.synergies!.receipts.find((r) => r.kind === 'interest')!.gold).toBe(0);
});
it('roulette seeded sweep covers jackpot, every positive/negative result, sequential transformations, no replay reroll and economic integrity', () => {
  const seen = new Set<string>();
  let jackpots = 0;
  for (let seed = 0; seed < 512; seed++) {
    const s = fixture(seed, ['danigm', 'peibol']);
    s.units.push({
      id: 'bench',
      definitionId: 'cosmin',
      stars: 1,
      location: { kind: 'bench', slot: 0 },
    });
    s.pool.cosmin!--;
    grantItemInstances(s, 'component', ['component-ad']);
    const copy = structuredClone(s);
    startSynergyRound(s);
    startSynergyRound(copy);
    expect(s).toEqual(copy);
    const r = s.synergies!.receipts[0]!;
    expect(r.kind).toBe('roulette');
    if (r.outcome.startsWith('jackpot')) {
      jackpots++;
      expect(r.details.length).toBeGreaterThanOrEqual(2);
    }
    for (const d of r.details)
      seen.add(
        `${r.outcome.split(':')[0] === 'failure' ? 'negative' : 'positive'}:${d.split(':')[0]}`,
      );
    expect(() => validateMatchState(s)).not.toThrow();
    const before = structuredClone(s);
    startSynergyRound(s);
    expect(s).toEqual(before);
  }
  expect(jackpots).toBeGreaterThan(0);
  for (const result of ['gold', 'health', 'component', 'champion', 'upgrade'])
    expect(seen.has(`positive:${result}`)).toBe(true);
  for (const result of ['gold', 'health', 'component', 'champion', 'downgrade'])
    expect(seen.has(`negative:${result}`)).toBe(true);
});
it('full bags queue item grants and full benches reserve pending copies, then delivery never mints copies', () => {
  let pending: MatchState | undefined, overflow: MatchState | undefined;
  for (let seed = 0; seed < 300 && (!pending || !overflow); seed++) {
    const s = fixture(seed, ['danigm']);
    for (let i = 0; i < 9; i++) {
      s.units.push({
        id: `bench-${i}`,
        definitionId: 'cosmin',
        stars: 1,
        location: { kind: 'bench', slot: i },
      });
      s.pool.cosmin!--;
    }
    grantItemInstances(s, 'fill', Array(16).fill('component-ad'));
    startSynergyRound(s);
    validateMatchState(s);
    if (s.synergies!.pendingChampions.length) pending = s;
    if (s.items!.pending.length) overflow = s;
  }
  expect(pending).toBeDefined();
  expect(overflow).toBeDefined();
  validateItemState(overflow!);
  const s = pending!,
    u = s.units.find((u) => u.id === 'bench-0')!;
  s.pool[u.definitionId]!++;
  s.units = s.units.filter((x) => x !== u);
  deliverSynergyChampions(s);
  combine(s);
  expect(s.synergies!.pendingChampions).toHaveLength(0);
  validateMatchState(s);
});
it('uniform random stream never uses client randomness and preserves all 100 probability buckets', () => {
  const j = fixture().synergies!;
  const seen = new Set<number>();
  for (let i = 0; i < 5000; i++) seen.add(synergyRandom(j, 100));
  expect(seen.size).toBe(100);
  expect(j.version).toBe(SYNERGY_RULES);
});
it('network-compatible prediction actions reject history retry without duplicate charges', () => {
  const s = fixture(30, ['dolea', 'vargas']);
  startSynergyRound(s);
  const k = s.synergies!.markets[0]!.offers[0]!,
    command = commandFor(s, {
      type: 'select_prediction',
      kind: k,
      ...(PREDICTIONS[k].unit ? { unitId: s.units[0]!.id } : {}),
    });
  const result = applyMatchAction(s, command);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(applyMatchAction(result.state, command).ok).toBe(false);
});

it.each([1, 2, 3] as const)(
  'roulette %i★ has exact probability partitions and uses the declarative value intervals',
  (stars) => {
    const counts = { jackpot: 0, success: 0, failure: 0 };
    for (let roll = 0; roll < 100; roll++) counts[rouletteCategory(stars, roll)]++;
    expect(counts).toEqual(
      stars === 3
        ? { jackpot: 10, success: 50, failure: 40 }
        : { jackpot: 5, success: 45, failure: 50 },
    );
    for (let seed = 0; seed < 150; seed++) {
      const s = fixture(seed, ['danigm'], stars);
      startSynergyRound(s);
      const r = s.synergies!.receipts[0]!;
      const positive = !r.outcome.startsWith('failure');
      for (const detail of r.details) {
        if (detail.startsWith('gold:')) {
          const amount = Number(detail.split(':')[1]);
          expect(Math.abs(amount)).toBeGreaterThanOrEqual([1, 4, 9][stars - 1]!);
          expect(Math.abs(amount)).toBeLessThanOrEqual([3, 8, 15][stars - 1]!);
          expect(amount > 0).toBe(positive);
        }
        if (detail.startsWith('health:')) {
          const amount = Number(detail.split(':')[1]);
          expect(Math.abs(amount)).toBeGreaterThanOrEqual([1, 8, 15][stars - 1]!);
          expect(Math.abs(amount)).toBeLessThanOrEqual([7, 14, 25][stars - 1]!);
          expect(amount > 0).toBe(positive);
        }
      }
      validateMatchState(s);
    }
  },
);
it('transformation boundaries preserve equipment and star-copy pool accounting; missing cost 4/5 never manufactures identities', () => {
  let upper = false,
    lower = false,
    doubleUpgrade = false;
  for (let seed = 0; seed < 1500 && (!upper || !lower || !doubleUpgrade); seed++) {
    const s = fixture(seed, ['danigm', 'cosmin'], 2);
    grantItemInstances(s, 'eq', ['component-ad']);
    const equipment = s.items!.components.splice(0, 1);
    s.units[0]!.equipment = equipment;
    startSynergyRound(s);
    validateMatchState(s);
    expect(s.units.find((u) => u.id === 'unit-0')!.equipment).toEqual(equipment);
    expect(s.units.find((u) => u.id === 'unit-0')!.stars).toBe(2);
    const r = s.synergies!.receipts[0]!;
    upper ||= r.details.some((d) => d.startsWith('upgrade:unit-0:no-op:no-catalog'));
    lower ||= r.details.some((d) => d.startsWith('downgrade:unit-1:no-op:boundary'));
    const lines = r.details.filter((d) => d.startsWith('upgrade:unit-1:'));
    if (lines.length === 2) {
      doubleUpgrade = true;
      expect(lines[1]).not.toContain('cosmin->');
    }
  }
  expect(upper).toBe(true);
  expect(lower).toBe(true);
  expect(doubleUpgrade).toBe(true);
});
