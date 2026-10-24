import { traitsFor, hasTraits, combatRulesFor } from '@tft/game-data';
import {
  CombatInputSchema,
  COMBAT_PROTOCOL,
  MAX_COMBAT_TICKS,
  EconomyConfigSchema,
  MatchActionSchema,
  MATCH_RULES,
  CombatSeedSchema,
  type CombatReplay,
  type EconomyConfig,
  type MatchState,
  type MatchAction,
  type MatchCommand,
  type OwnedUnit,
  type UnitLocation,
  type RoundReward,
} from '@tft/shared';
import { ECONOMY_CONFIG, matchCatalog } from '@tft/game-data';
import { compareIds, randomUint32 } from '../combat/math';
import { runCombat } from '../combat/engine';
import { isInBounds, offsetToAxial } from '../hex';
import {
  copiesOf,
  definition,
  deployedCount,
  interestFor,
  levelRule,
  sameLocation,
  scaledProfile,
  sellValue,
} from './selectors';
import { calculateRoundDamage } from './roundDamage';
import { refreshShop } from './shop';
import { validateMatchState } from './invariants';
export type MatchError =
  | 'invalid-action'
  | 'invalid-state'
  | 'stale-action'
  | 'wrong-phase'
  | 'insufficient-gold'
  | 'missing-offer'
  | 'missing-unit'
  | 'bench-full'
  | 'invalid-location'
  | 'deployment-limit'
  | 'max-level'
  | 'empty-board'
  | 'wrong-round'
  | 'same-location';
export type MatchOutcome =
  | { ok: true; state: MatchState }
  | { ok: false; state: MatchState; error: MatchError };
class RuleError extends Error {
  constructor(readonly code: MatchError) {
    super(code);
  }
}
function reject(code: MatchError): never {
  throw new RuleError(code);
}
function ledger(
  state: MatchState,
  reason: MatchState['ledger'][number]['reason'],
  requested: number,
  reference: string,
): number {
  if (requested < 0 && state.gold < -requested) reject('insufficient-gold');
  const balance = Math.min(state.config.goldCap, state.gold + requested);
  const delta = balance - state.gold;
  state.gold = balance;
  state.ledger.push({
    seq: state.ledger.length,
    round: state.round,
    reason,
    requested,
    delta,
    balance,
    reference,
  });
  return delta;
}
export function createMatch(seed = 42, config: EconomyConfig = ECONOMY_CONFIG): MatchState {
  seed = CombatSeedSchema.parse(seed);
  config = EconomyConfigSchema.parse(config);
  for (const tier of config.opponents) for (const id of tier.definitions) definition(id);
  const state: MatchState = {
    rulesVersion: MATCH_RULES,
    config,
    seed,
    shopRng: (seed ^ 0x9e3779b9) >>> 0,
    combatRng: (seed ^ 0x85ebca6b) >>> 0,
    revision: 0,
    nextActionSeq: 0,
    nextEntity: 0,
    phase: 'preparation',
    round: 1,
    gold: 0,
    health: { north: config.roundDamage.initialHp, south: config.roundDamage.initialHp },
    healthLedger: [],
    level: config.initialLevel,
    xp: 0,
    totalXp: 0,
    streak: 0,
    units: [],
    shop: Array(config.shopSize).fill(null),
    shopLocked: false,
    pool: Object.fromEntries(
      matchCatalog(config).map((d) => [d.id, config.copiesByCost[d.cost - 1]!]),
    ),
    ledger: [],
    history: [],
    combat: null,
    lastReward: null,
    lastUpgrades: [],
  };
  ledger(state, 'initial', config.initialGold, 'initial');
  refreshShop(state);
  return validateMatchState(state);
}
export function commandFor(state: MatchState, command: MatchCommand): MatchAction {
  return { ...command, seq: state.nextActionSeq, expectedRevision: state.revision } as MatchAction;
}
function freeBench(state: MatchState): number {
  return (
    Array.from({ length: state.config.benchSize }, (_, i) => i).find(
      (i) => !state.units.some((u) => u.location.kind === 'bench' && u.location.slot === i),
    ) ?? -1
  );
}
export function combine(state: MatchState): void {
  for (const d of matchCatalog(state.config))
    for (const stars of [1, 2] as const) {
      let candidates = state.units.filter((u) => u.definitionId === d.id && u.stars === stars);
      while (candidates.length >= 3) {
        candidates.sort(
          (a, b) =>
            Number(b.location.kind === 'board') - Number(a.location.kind === 'board') ||
            compareIds(a.id, b.id),
        );
        const survivor = candidates[0]!;
        const consumed = new Set(candidates.slice(1, 3).map((u) => u.id));
        survivor.stars = (stars + 1) as 2 | 3;
        state.units = state.units.filter((u) => !consumed.has(u.id));
        state.lastUpgrades.push({ id: survivor.id, stars: survivor.stars });
        candidates = state.units.filter((u) => u.definitionId === d.id && u.stars === stars);
      }
    }
}
export function addXp(state: MatchState, amount: number): void {
  if (state.level === state.config.maxLevel) return;
  state.totalXp += amount;
  state.xp += amount;
  while (state.level < state.config.maxLevel && state.xp >= levelRule(state).xpToNext) {
    state.xp -= levelRule(state).xpToNext;
    state.level++;
  }
  if (state.level === state.config.maxLevel) state.xp = 0;
}
function move(state: MatchState, unitId: string, to: UnitLocation): void {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) reject('missing-unit');
  if (to.kind === 'board' && (!isInBounds(to.hex) || to.hex.r < 4)) reject('invalid-location');
  if (sameLocation(unit.location, to)) reject('same-location');
  const before = deployedCount(state);
  const other = state.units.find((u) => sameLocation(u.location, to));
  const previous = unit.location;
  unit.location = to;
  if (other) other.location = previous;
  // Existing excess deployments can always be safely withdrawn; no silent deletion.
  if (deployedCount(state) > state.level && deployedCount(state) > before)
    reject('deployment-limit');
}
export function opponentUnits(state: MatchState) {
  const tier = [...state.config.opponents].reverse().find((t) => t.fromRound <= state.round)!;
  return tier.definitions.map((definitionId, i) => ({
    id: `rival-${i}`,
    definitionId,
    owner: 'north' as const,
    position: offsetToAxial([2, 4, 1, 5, 3, 0, 6][i]!, i < 2 ? 2 : 0),
    profile: scaledProfile(definitionId, tier.stars, state.config),
  }));
}
function startCombat(state: MatchState, allowEmpty = false): void {
  if (!allowEmpty && deployedCount(state) === 0) reject('empty-board');
  if (deployedCount(state) > state.level) reject('deployment-limit');
  const next = randomUint32(state.combatRng);
  state.combatRng = next.state;
  const units = state.units.flatMap((u) =>
    u.location.kind === 'board'
      ? [
          {
            id: u.id,
            definitionId: u.definitionId,
            owner: 'south' as const,
            position: u.location.hex,
            profile: scaledProfile(u.definitionId, u.stars, state.config),
          },
        ]
      : [],
  );
  state.combat = {
    round: state.round,
    bank: state.gold,
    input: CombatInputSchema.parse({
      protocolVersion: COMBAT_PROTOCOL,
      rulesVersion: combatRulesFor(state.config.catalog),
      ...(state.config.catalog === 'f0p6b2' || state.config.catalog === 'f0p6b3'
        ? { combatId: `match-${state.seed}-round-${state.round}` }
        : {}),
      ...(hasTraits(state.config.catalog) ? { traits: traitsFor(state.config.catalog) } : {}),
      seed: next.value,
      maxTicks: MAX_COMBAT_TICKS,
      obstacles: [],
      units: [...units, ...opponentUnits(state)],
    }),
    result: null,
  };
  state.phase = 'combat';
}
function resolve(state: MatchState, cached?: CombatReplay, multiplayer = false): void {
  const combat = state.combat!;
  const replay = cached ?? runCombat(combat.input);
  combat.result = replay.result;
  const rivalStars = [...state.config.opponents]
    .reverse()
    .find((t) => t.fromRound <= state.round)!.stars;
  const damage = calculateRoundDamage(
    state.round,
    combat.result,
    replay.snapshots
      .at(-1)!
      .units.filter((u) => u.hp > 0)
      .map((u) => ({
        side: u.owner,
        stars: multiplayer
          ? (u.profile.starLevel ?? 1)
          : u.owner === 'south'
            ? state.units.find((owned) => owned.id === u.id)!.stars
            : rivalStars,
      })),
    state.config.roundDamage,
  );
  for (const side of ['north', 'south'] as const) {
    const hpBefore = state.health[side];
    const applied = Math.min(hpBefore, damage[side].requested);
    state.health[side] -= applied;
    state.healthLedger.push({
      round: state.round,
      side,
      ...damage[side],
      applied,
      hpBefore,
      hpAfter: state.health[side],
    });
  }
  const outcome =
    combat.result.winner === 'south'
      ? 'win'
      : combat.result.winner === 'north'
        ? 'loss'
        : 'double_loss';
  state.streak =
    outcome === 'double_loss'
      ? 0
      : outcome === 'win'
        ? Math.max(0, state.streak) + 1
        : Math.min(0, state.streak) - 1;
  const base =
    state.config.baseIncome[Math.min(state.round - 1, state.config.baseIncome.length - 1)]!;
  const streak =
    outcome === 'double_loss'
      ? 0
      : [...state.config.streaks].reverse().find((t) => t.from <= Math.abs(state.streak))!.gold;
  const reward: RoundReward = {
    round: state.round,
    outcome,
    bank: combat.bank,
    base,
    interest: interestFor(combat.bank, state.config),
    victory: outcome === 'win' ? state.config.victoryGold : 0,
    streak,
    total: 0,
    credited: 0,
    overflow: 0,
    xp: state.level < state.config.maxLevel ? state.config.passiveXp : 0,
  };
  for (const reason of ['base', 'interest', 'victory', 'streak'] as const) {
    reward.total += reward[reason];
    reward.credited += ledger(state, reason, reward[reason], `round-${state.round}`);
  }
  reward.overflow = reward.total - reward.credited;
  addXp(state, reward.xp);
  state.lastReward = reward;
  state.phase = 'resolution';
}
export function applyMatchAction(original: MatchState, value: unknown): MatchOutcome {
  return applyAction(original, value);
}
export interface EconomyContext {
  externalCopies: Readonly<Record<string, number>>;
  prefix: string;
}
/** Server-only composition boundary; network handlers never accept this context from clients. */
export function applySharedEconomy(
  original: MatchState,
  value: unknown,
  context: EconomyContext,
  cached?: CombatReplay,
): MatchOutcome {
  return applyAction(original, value, cached, context);
}
function applyAction(
  original: MatchState,
  value: unknown,
  cached?: CombatReplay,
  context?: EconomyContext,
): MatchOutcome {
  const parsed = MatchActionSchema.safeParse(value);
  if (!parsed.success) return { ok: false, state: original, error: 'invalid-action' };
  let state: MatchState;
  try {
    state = validateMatchState(original, context?.externalCopies);
  } catch {
    return { ok: false, state: original, error: 'invalid-state' };
  }
  const action = parsed.data;
  try {
    if (action.seq !== state.nextActionSeq || action.expectedRevision !== state.revision)
      reject('stale-action');
    if (action.type === 'resolve_round') {
      if (state.phase !== 'combat') reject('wrong-phase');
      if (action.round !== state.round) reject('wrong-round');
      resolve(state, cached, !!context);
    } else if (action.type === 'next_round') {
      if (state.phase !== 'resolution') reject('wrong-phase');
      if (action.round !== state.round) reject('wrong-round');
      state.round++;
      state.phase = 'preparation';
      state.combat = null;
      if (!state.shopLocked) refreshShop(state, context?.prefix);
    } else {
      if (state.phase !== 'preparation') reject('wrong-phase');
      state.lastUpgrades = [];
      switch (action.type) {
        case 'buy_unit': {
          const slot = state.shop.findIndex((o) => o?.id === action.offerId);
          if (slot < 0) reject('missing-offer');
          const offer = state.shop[slot]!;
          ledger(state, 'buy', -definition(offer.definitionId).cost, offer.id);
          state.shop[slot] = null;
          // Temporary off-bench candidate is private to this transaction; validate only after fusion.
          const unit: OwnedUnit = {
            id: `${context?.prefix ?? ''}unit-${state.nextEntity++}`,
            definitionId: offer.definitionId,
            stars: 1,
            location: { kind: 'bench', slot: freeBench(state) },
          };
          state.units.push(unit);
          combine(state);
          const pending = state.units.find(
            (u) => u.location.kind === 'bench' && u.location.slot === -1,
          );
          if (pending) {
            const free = freeBench(state);
            if (free < 0) reject('bench-full');
            pending.location = { kind: 'bench', slot: free };
          }
          break;
        }
        case 'sell_unit': {
          const unit = state.units.find((u) => u.id === action.unitId);
          if (!unit) reject('missing-unit');
          ledger(state, 'sell', sellValue(unit, state.config), unit.id);
          state.pool[unit.definitionId]! += copiesOf(unit, state.config);
          state.units = state.units.filter((u) => u.id !== unit.id);
          break;
        }
        case 'reroll_shop':
          ledger(state, 'reroll', -state.config.rerollCost, `reroll-${state.revision}`);
          refreshShop(state, context?.prefix);
          break;
        case 'lock_shop':
          state.shopLocked = action.locked;
          break;
        case 'buy_xp':
          if (state.level === state.config.maxLevel) reject('max-level');
          ledger(state, 'xp', -state.config.xpCost, `xp-${state.revision}`);
          addXp(state, state.config.xpPurchase);
          break;
        case 'move_unit':
          move(state, action.unitId, action.to);
          break;
        case 'swap_units': {
          const other = state.units.find((u) => u.id === action.otherId);
          if (!other) reject('missing-unit');
          move(state, action.unitId, other.location);
          break;
        }
        case 'start_combat_auto':
          startCombat(state, true);
          break;
        case 'start_combat':
          startCombat(state);
          break;
      }
    }
    state.history.push(action);
    state.revision++;
    state.nextActionSeq++;
    return { ok: true, state: validateMatchState(state, context?.externalCopies) };
  } catch (error) {
    if (error instanceof RuleError) return { ok: false, state: original, error: error.code };
    throw error;
  }
}
export function replayMatch(
  seed: number,
  actions: readonly MatchAction[],
  config: EconomyConfig = ECONOMY_CONFIG,
): MatchState {
  let state = createMatch(seed, config);
  for (const action of actions) {
    const result = applyMatchAction(state, action);
    if (!result.ok) throw new Error(`Invalid replay: ${result.error}`);
    state = result.state;
  }
  return state;
}

/** Local authority owns the computed trace. Never accept a winner in a player command. */
export class RoundAuthority {
  constructor(private cached: CombatReplay | null = null) {}
  begin(state: MatchState): { state: MatchState; replay: CombatReplay } {
    const outcome = applyMatchAction(state, commandFor(state, { type: 'start_combat_auto' }));
    if (!outcome.ok) throw new Error(outcome.error);
    this.cached = runCombat(outcome.state.combat!.input);
    return { state: outcome.state, replay: this.cached };
  }
  settle(state: MatchState): MatchOutcome {
    if (!this.cached || JSON.stringify(this.cached.input) !== JSON.stringify(state.combat?.input))
      return { ok: false, state, error: 'wrong-round' };
    return applyAction(
      state,
      commandFor(state, { type: 'resolve_round', round: state.round }),
      this.cached,
    );
  }
}
