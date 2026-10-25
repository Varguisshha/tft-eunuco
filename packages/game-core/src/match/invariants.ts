import { progressDefinition } from './progress';
import { MatchStateSchema, type MatchState } from '@tft/shared';
import { matchCatalog } from '@tft/game-data';
import { isInBounds } from '../hex';
import { copiesOf, definition, sameLocation, levelRule } from './selectors';
/** Semantic validation for loads and every authority transaction; never silently repairs units. */
export function validateMatchState(
  value: unknown,
  externalCopies: Readonly<Record<string, number>> = {},
): MatchState {
  const state = MatchStateSchema.parse(value);
  const fail = (condition: boolean, message: string) => {
    if (condition) throw new Error(message);
  };
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
    const offered = state.shop.filter((o) => o?.definitionId === d.id).length;
    fail(
      (state.pool[d.id] ?? -1) + owned + offered + (externalCopies[d.id] ?? 0) !== expected,
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
