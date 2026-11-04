import { validateItemState } from '../items/inventory';
import { progressDefinition } from './progress';
import { MatchStateSchema, type MatchState } from '@tft/shared';
import { JEW_POLICY, matchCatalog } from '@tft/game-data';
import { isInBounds } from '../hex';
import { copiesOf, definition, sameLocation, levelRule } from './selectors';
/** Semantic validation for loads and every authority transaction; never silently repairs units. */
export function validateMatchState(
  value: unknown,
  externalCopies: Readonly<Record<string, number>> = {},
): MatchState {
  const state = MatchStateSchema.parse(value);
  failSynergyState(state);
  validateItemState(state);
  const fail = (condition: boolean, message: string) => {
    if (condition) throw new Error(message);
  };
  if (state.lastCombatStatistics) {
    const stats = state.lastCombatStatistics;
    fail(
      !['f0p11c-1', 'f0p11g-1', 'f0p11h-1'].includes(state.config.catalog ?? '') ||
        !stats.complete ||
        stats.round > state.round,
      'Invalid retained combat statistics',
    );
    fail(
      new Set(stats.units.map((u) => u.unitId)).size !== stats.units.length,
      'Duplicate statistics unit',
    );
  }
  if (['f0p11g-1', 'f0p11h-1'].includes(state.config.catalog ?? '')) {
    fail(!state.shopRolls || state.shopRolls.length !== 5, 'Missing shop roll trace');
    for (const [i, roll] of state.shopRolls!.entries()) {
      const offer = state.shop[i];
      fail((roll.outcome === 'offered') !== !!offer, 'Shop trace offer state');
      fail(
        !!offer &&
          matchCatalog(state.config).find((d) => d.id === offer.definitionId)?.cost !== roll.cost,
        'Shop trace cost',
      );
      fail(
        roll.outcome === 'no-catalog' &&
          matchCatalog(state.config).some((d) => d.cost === roll.cost),
        'Shop trace catalog',
      );
    }
    if (state.lastReward) {
      const r = state.lastReward,
        p = r.receipt;
      fail(!p, 'Missing credited reward receipt');
      if (p)
        fail(
          p.base + p.interest + p.victory + p.streak + (r.jew?.credited ?? 0) !== r.credited ||
            p.base > r.base ||
            p.interest > r.interest ||
            p.victory > r.victory ||
            p.streak > r.streak,
          'Invalid credited reward receipt',
        );
    }
  } else fail(!!state.shopRolls || !!state.lastReward?.receipt, 'Unexpected economic metadata');
  const jewEntries = state.ledger.filter((e) => e.reason === 'jew_interest');
  fail(
    !state.config.jewPolicy && (jewEntries.length > 0 || !!state.lastReward?.jew),
    'Jew in historical catalog',
  );
  if (state.config.jewPolicy) {
    fail(new Set(jewEntries.map((e) => e.round)).size !== jewEntries.length, 'Duplicate Jew round');
    fail(
      jewEntries.some(
        (e) =>
          e.reference !== `p13s-jew-${e.round}` ||
          e.requested < 0 ||
          e.requested > 8 ||
          e.delta < 0 ||
          e.delta > e.requested ||
          e.round > state.round,
      ),
      'Invalid Jew ledger',
    );
    const r = state.lastReward;
    if (r) {
      const j = r.jew;
      fail(!j, 'Missing Jew receipt');
      if (j) {
        const requested = j.stars
          ? Math.min(
              Math.floor((j.bank * JEW_POLICY.ratesMilli[j.stars - 1]!) / 1000),
              JEW_POLICY.caps[j.stars - 1]!,
            )
          : 0;
        const entries = jewEntries.filter((e) => e.round === j.round);
        const closing = state.ledger.findIndex((e) => e.reason === 'base' && e.round === r.round);
        fail(closing < 1 || state.ledger[closing - 1]!.balance !== j.bank, 'Jew eligible bank');
        fail(
          r.total !== r.base + r.interest + r.victory + r.streak + j.requested ||
            r.overflow !== r.total - r.credited,
          'Jew reward conservation',
        );
        fail(
          j.round !== r.round ||
            j.id !== `p13s-jew-${r.round}` ||
            j.settlementId !== r.receipt!.id ||
            j.requested !== requested ||
            j.credited > j.requested ||
            (j.unitId === null) !== (j.stars === null) ||
            entries.length !== 1 ||
            entries[0]!.reference !== j.id ||
            entries[0]!.requested !== j.requested ||
            entries[0]!.delta !== j.credited,
          'Invalid Jew receipt',
        );
      }
    }
  }
  fail(state.gold > state.config.goldCap, 'Gold cap');
  fail(
    state.level === state.config.maxLevel ? state.xp !== 0 : state.xp >= levelRule(state).xpToNext,
    'XP threshold',
  );
  fail(state.units.length > 37, 'Unit capacity');
  const ids = new Set<string>();
  for (const u of state.units) {
    definition(u.definitionId);
    fail(!matchCatalog(state.config).some((d) => d.id === u.definitionId), 'Unit outside catalog');
    fail(ids.has(u.id), 'Duplicate unit');
    ids.add(u.id);
    if (u.progress) {
      const def = progressDefinition(u, state.config);
      fail(
        !def ||
          u.progress.stacks.some(
            (s) => s.id !== def.id || s.count > def.maximum || s.lastRound > state.round,
          ),
        'Invalid unit progression',
      );
    }
    fail(
      u.location.kind === 'board' && (!isInBounds(u.location.hex) || u.location.hex.r < 4),
      'Invalid deployment',
    );
  }
  for (let i = 0; i < state.units.length; i++)
    for (let j = i + 1; j < state.units.length; j++)
      fail(sameLocation(state.units[i]!.location, state.units[j]!.location), 'Overlapping units');
  for (const offer of state.shop)
    if (offer) {
      definition(offer.definitionId);
      fail(
        !matchCatalog(state.config).some((d) => d.id === offer.definitionId),
        'Offer outside catalog',
      );
      fail(ids.has(offer.id), 'Duplicate offer');
      ids.add(offer.id);
    }
  fail(
    Object.keys(state.pool).length !== matchCatalog(state.config).length,
    'Pool catalog mismatch',
  );
  for (const d of matchCatalog(state.config)) {
    const expected = state.config.copiesByCost[d.cost - 1]!;
    const owned = state.units
      .filter((u) => u.definitionId === d.id)
      .reduce((n, u) => n + copiesOf(u, state.config), 0);
    const pending =
      state.synergies?.pendingChampions.filter((u) => u.definitionId === d.id).length ?? 0;
    const offered = state.shop.filter((o) => o?.definitionId === d.id).length;
    fail(
      (state.pool[d.id] ?? -1) + owned + offered + pending + (externalCopies[d.id] ?? 0) !==
        expected,
      'Copy conservation',
    );
  }
  fail(
    !state.development && state.ledger.some((e) => e.reason === 'development'),
    'DEV ledger in normal match',
  );
  let gold = 0;
  state.ledger.forEach((e, i) => {
    gold += e.delta;
    fail(
      e.seq !== i || e.balance !== gold || gold < 0 || gold > state.config.goldCap,
      'Ledger conservation',
    );
  });
  fail(gold !== state.gold, 'Gold conservation');
  const health = {
    north: state.config.roundDamage.initialHp,
    south: state.config.roundDamage.initialHp,
  };
  let synergyAdjustmentIndex = 0;
  const synergyAdjustments = state.synergies?.health ?? [];
  const synergyAdjust = (index: number) => {
    while (
      synergyAdjustmentIndex < synergyAdjustments.length &&
      synergyAdjustments[synergyAdjustmentIndex]!.index === index
    ) {
      const a = synergyAdjustments[synergyAdjustmentIndex++]!;
      fail(a.before !== health.south, 'Synergy health conservation');
      health.south = a.after;
    }
  };
  let adjustmentIndex = 0;
  const adjustments = state.development?.healthAdjustments ?? [];
  const adjust = (index: number) => {
    while (adjustmentIndex < adjustments.length && adjustments[adjustmentIndex]!.index === index) {
      const a = adjustments[adjustmentIndex++]!;
      fail(health[a.side] !== a.before, 'DEV health conservation');
      health[a.side] = a.after;
    }
  };
  fail(
    adjustments.some(
      (a, i) =>
        a.index > state.healthLedger.length || (i > 0 && a.index < adjustments[i - 1]!.index),
    ),
    'DEV health order',
  );
  state.healthLedger.forEach((entry, i) => {
    adjust(i);
    synergyAdjust(i);
    fail(
      entry.round !== Math.floor(i / 2) + 1 || entry.side !== (i % 2 ? 'south' : 'north'),
      'Health ledger order',
    );
    fail(
      entry.hpBefore !== health[entry.side] ||
        entry.requested !== entry.base + entry.survivors ||
        entry.applied !== Math.min(entry.hpBefore, entry.requested) ||
        entry.hpAfter !== entry.hpBefore - entry.applied,
      'Health conservation',
    );
    fail(entry.outcome === 'win' && entry.requested !== 0, 'Winner damage');
    health[entry.side] = entry.hpAfter;
  });
  adjust(state.healthLedger.length);
  synergyAdjust(state.healthLedger.length);
  fail(synergyAdjustmentIndex !== synergyAdjustments.length, 'Synergy health order');
  fail(
    health.north !== state.health.north || health.south !== state.health.south,
    'Health balance',
  );
  fail(
    state.healthLedger.length !== 2 * (state.round - (state.phase === 'resolution' ? 0 : 1)),
    'Missing or repeated round damage',
  );
  fail(
    state.revision !== state.history.length || state.nextActionSeq !== state.history.length,
    'Action sequence',
  );
  state.history.forEach((a, i) =>
    fail(a.seq !== i || a.expectedRevision !== i, 'Action history sequence'),
  );
  fail(
    state.phase === 'combat' &&
      (!state.combat || state.combat.round !== state.round || state.combat.result !== null),
    'Combat phase',
  );
  fail(
    state.phase === 'resolution' &&
      (!state.combat?.result || state.lastReward?.round !== state.round),
    'Resolution phase',
  );
  return state;
}

function failSynergyState(s: MatchState) {
  if (!!s.synergies !== !!s.config.synergyPolicy) throw Error('Missing/unexpected P13S journal');
  const j = s.synergies;
  if (!j) {
    if (s.ledger.some((e) => e.reason === 'synergy')) throw Error('Historical synergy ledger');
    return;
  }
  if (
    new Set(j.markets.map((m) => m.round)).size !== j.markets.length ||
    new Set(j.receipts.map((r) => r.id)).size !== j.receipts.length
  )
    throw Error('Duplicate synergy receipt');
  if (
    new Set(j.pendingChampions.map((u) => u.id)).size !== j.pendingChampions.length ||
    j.pendingChampions.some((u) => s.units.some((x) => x.id === u.id))
  )
    throw Error('Duplicate pending champion');
  for (const m of j.markets)
    if (
      m.round > s.round ||
      new Set(m.offers).size !== 3 ||
      new Set(m.bets.map((b) => b.kind)).size !== m.bets.length ||
      m.bets.some((b) => !m.offers.includes(b.kind))
    )
      throw Error('Invalid market');
  if (
    j.receipts.some((r) => r.round > s.round) ||
    j.health.some(
      (h, i) =>
        h.index > s.healthLedger.length ||
        (i > 0 && h.index < j.health[i - 1]!.index) ||
        !j.receipts.some((r) => r.id === h.receiptId && r.kind === 'roulette'),
    )
  )
    throw Error('Invalid synergy lineage');
}
