import {
  SYNERGY_RULES,
  type MatchState,
  type CombatReplay,
  type PredictionKind,
  type SynergyJournal,
  type CombatUnit,
} from '@tft/shared';
import { PREDICTIONS, P13S_JEW_POLICY, ROULETTE_POLICY, matchCatalog } from '@tft/game-data';
import { randomUint32, effectiveStat, compareIds } from '../combat/math';
import { copiesOf } from './selectors';
import { grantItemInstances, returnUnitItems, itemCatalogFor } from '../items/inventory';
const ownBoard = (s: MatchState) => s.units.filter((u) => u.location.kind === 'board');
const members = (s: MatchState, trait: string) =>
  new Set(
    ownBoard(s)
      .filter((u) =>
        matchCatalog(s.config)
          .find((d) => d.id === u.definitionId)!
          .synergies.includes(trait),
      )
      .map((u) => u.definitionId),
  ).size;
export const fantasyCapacity = (s: MatchState) =>
  [2, 4, 6].filter((n) => n <= members(s, 'fantasy')).length;
/** Rejection sampling; one independent, persisted RNG stream for P13S economy. */
export function synergyRandom(j: SynergyJournal, max: number) {
  if (!Number.isSafeInteger(max) || max < 1 || max > 0x100000000)
    throw Error('Invalid uniform bound');
  const limit = 0x100000000 - (0x100000000 % max);
  let value: number;
  do {
    const next = randomUint32(j.rng);
    j.rng = next.state;
    value = next.value;
  } while (value >= limit);
  return value % max;
}
export function synergyGold(s: MatchState, requested: number, reference: string) {
  const after = Math.max(0, Math.min(s.config.goldCap, s.gold + requested)),
    delta = after - s.gold;
  s.gold = after;
  s.ledger.push({
    seq: s.ledger.length,
    round: s.round,
    reason: 'synergy',
    requested,
    delta,
    balance: after,
    reference,
  });
  return delta;
}
export function createSynergyJournal(seed: number): SynergyJournal {
  return {
    version: SYNERGY_RULES,
    rng: (seed ^ 0x27d4eb2d) >>> 0,
    markets: [],
    receipts: [],
    health: [],
    discardedItems: [],
    pendingChampions: [],
  };
}
function receipt(
  s: MatchState,
  kind: SynergyJournal['receipts'][number]['kind'],
  before: number,
  outcome: string,
  details: string[],
  gold: number,
  character?: { id: string; stars: 1 | 2 | 3 },
) {
  s.synergies!.receipts.push({
    id: `p13s-${kind}-${s.round}`,
    round: s.round,
    kind,
    rngBefore: before,
    rngAfter: s.synergies!.rng,
    outcome,
    details,
    gold,
    applied: true,
    ...(character ? { characterId: character.id, stars: character.stars } : {}),
  });
}
function freeBench(s: MatchState) {
  return Array.from({ length: 9 }, (_, i) => i).find(
    (i) => !s.units.some((u) => u.location.kind === 'bench' && u.location.slot === i),
  );
}
export function deliverSynergyChampions(s: MatchState) {
  const j = s.synergies;
  if (!j) return;
  while (j.pendingChampions.length) {
    const slot = freeBench(s);
    if (slot === undefined) return;
    const u = j.pendingChampions.shift()!;
    s.units.push({ ...u, stars: 1, location: { kind: 'bench', slot } });
  }
}
export function startSynergyRound(s: MatchState) {
  if (!s.synergies) return;
  const j = s.synergies;
  if (j.markets.some((m) => m.round === s.round)) return;
  const types = Object.keys(PREDICTIONS) as PredictionKind[],
    offers: PredictionKind[] = [];
  for (let i = 0; i < 3; i++) offers.push(types.splice(synergyRandom(j, types.length), 1)[0]!);
  j.markets.push({ round: s.round, offers, locked: false, bets: [] });
  const dani = ownBoard(s)
    .filter((u) => u.definitionId === 'danigm')
    .sort((a, b) => b.stars - a.stars || compareIds(a.id, b.id))[0];
  if (!dani) return;
  const before = j.rng,
    roll = synergyRandom(j, 100),
    star = dani.stars - 1;
  const outcome = rouletteCategory(dani.stars, roll);
  const details: string[] = [],
    goldBefore = s.gold;
  const apply = (positive: boolean) => {
    const choices = positive ? ROULETTE_POLICY.positives : ROULETTE_POLICY.negatives;
    const result = choices[synergyRandom(j, choices.length)]!;
    if (result === 'gold') {
      const [min, max] = ROULETTE_POLICY.gold[star]!;
      const value = min + synergyRandom(j, max - min + 1);
      details.push(`gold:${synergyGold(s, positive ? value : -value, `p13s-roulette-${s.round}`)}`);
    } else if (result === 'health') {
      const [min, max] = ROULETTE_POLICY.health[star]!;
      const value = min + synergyRandom(j, max - min + 1),
        before = s.health.south;
      s.health.south = positive ? before + value : Math.max(1, before - value);
      j.health.push({
        index: s.healthLedger.length,
        before,
        after: s.health.south,
        receiptId: `p13s-roulette-${s.round}`,
      });
      details.push(`health:${s.health.south - before}`);
    } else if (result === 'component') {
      if (positive) {
        const defs = itemCatalogFor(s).definitions.filter((d) => d.kind === 'component');
        const d = defs[synergyRandom(j, defs.length)]!;
        const id = `p13s-r-${s.round}-${details.length}`;
        grantItemInstances(s, id, [d.id]);
        details.push(`component:${d.id}`);
      } else {
        const candidates = [
          ...s.items!.components,
          ...s.items!.pending.filter((i) => i.kind === 'component'),
        ].sort((a, b) => compareIds(a.id, b.id));
        if (!candidates.length) {
          details.push('component:no-op:empty');
          return;
        }
        const i = candidates[synergyRandom(j, candidates.length)]!;
        s.items!.components = s.items!.components.filter((x) => x.id !== i.id);
        s.items!.pending = s.items!.pending.filter((x) => x.id !== i.id);
        j.discardedItems.push(i.id);
        details.push(`component:lost:${i.id}`);
      }
    } else if (result === 'champion') {
      if (positive) {
        const available = matchCatalog(s.config).filter((d) => s.pool[d.id]! > 0);
        if (!available.length) {
          details.push('champion:no-op:exhausted');
          return;
        }
        const d = available[synergyRandom(j, available.length)]!;
        s.pool[d.id]!--;
        j.pendingChampions.push({
          id: `${s.items!.ownerId}/p13s-${s.nextEntity++}`,
          definitionId: d.id,
        });
        deliverSynergyChampions(s);
        details.push(`champion:${d.id}`);
      } else {
        const bench = s.units
          .filter((u) => u.location.kind === 'bench')
          .sort((a, b) => compareIds(a.id, b.id));
        if (!bench.length) {
          details.push('champion:no-op:empty-bench');
          return;
        }
        const u = bench[synergyRandom(j, bench.length)]!;
        returnUnitItems(s, u);
        s.pool[u.definitionId]! += copiesOf(u, s.config);
        s.units = s.units.filter((x) => x !== u);
        details.push(`champion:lost:${u.id}`);
      }
    } else {
      for (const u of ownBoard(s).sort((a, b) => compareIds(a.id, b.id))) {
        const cost = matchCatalog(s.config).find((d) => d.id === u.definitionId)!.cost,
          targetCost = cost + (positive ? 1 : -1),
          copies = copiesOf(u, s.config);
        const tier = matchCatalog(s.config).filter((d) => d.cost === targetCost),
          available = tier.filter((d) => s.pool[d.id]! >= copies);
        if (!available.length) {
          details.push(
            `${result}:${u.id}:no-op:${targetCost < 1 || targetCost > 5 ? 'boundary' : tier.length ? 'pool-exhausted' : 'no-catalog'}`,
          );
          continue;
        }
        const d = available[synergyRandom(j, available.length)]!,
          old = u.definitionId;
        s.pool[d.id]! -= copies;
        s.pool[old]! += copies;
        u.definitionId = d.id;
        delete u.progress;
        details.push(`${result}:${u.id}:${old}->${d.id}:${copies}`);
      }
    }
  };
  apply(outcome !== 'failure');
  if (outcome === 'jackpot') apply(true);
  receipt(s, 'roulette', before, `${outcome}:${roll}`, details, s.gold - goldBefore, dani);
}
export function selectPrediction(s: MatchState, kind: PredictionKind, unitId?: string) {
  const m = s.synergies?.markets.find((m) => m.round === s.round);
  if (
    !m ||
    m.locked ||
    s.phase !== 'preparation' ||
    !m.offers.includes(kind) ||
    m.bets.some((b) => b.kind === kind) ||
    m.bets.length >= fantasyCapacity(s) ||
    s.gold < 1
  )
    return false;
  if (PREDICTIONS[kind].unit ? !ownBoard(s).some((u) => u.id === unitId) : unitId !== undefined)
    return false;
  synergyGold(s, -1, `p13s-bet-${s.round}-${kind}`);
  m.bets.push({ kind, ...(unitId ? { unitId } : {}), paid: 1, status: 'selected', credited: 0 });
  return true;
}
export function lockPredictions(s: MatchState) {
  const m = s.synergies?.markets.find((m) => m.round === s.round);
  if (!m || m.locked) return;
  let capacity = fantasyCapacity(s);
  for (const b of m.bets) {
    if (capacity < 1 || (b.unitId && !ownBoard(s).some((u) => u.id === b.unitId))) {
      b.status = 'void';
      b.credited = synergyGold(s, 1, `p13s-void-${s.round}-${b.kind}`);
    } else capacity--;
  }
  m.locked = true;
}
/** Public pre-fight score. Prepared tick-zero profiles include items and traits. */
export const armyStrength = (units: readonly CombatUnit[]) =>
  units.reduce(
    (n, u) =>
      n +
      effectiveStat(u, 'maxHp') +
      10 * effectiveStat(u, 'attack') +
      10 * effectiveStat(u, 'abilityPower') +
      5 * (Math.max(0, effectiveStat(u, 'armor')) + Math.max(0, effectiveStat(u, 'magicResist'))),
    0,
  );
export function predictionEvidence(r: CombatReplay) {
  const initial = r.snapshots[0]!.units,
    final = r.snapshots.at(-1)!.units,
    own = initial.filter((u) => u.owner === 'south'),
    enemies = new Set(initial.filter((u) => u.owner === 'north').map((u) => u.id)),
    ids = new Set(own.map((u) => u.id));
  const minima = new Map(own.map((u) => [u.id, 1000])),
    received = new Map(own.map((u) => [u.id, 0]));
  const live = new Map(initial.map((u) => [u.id, structuredClone(u)]));
  const sample = (u: CombatUnit) => {
    if (ids.has(u.id))
      minima.set(
        u.id,
        Math.min(minima.get(u.id)!, Math.floor((u.hp * 1000) / effectiveStat(u, 'maxHp'))),
      );
  };
  initial.forEach(sample);
  for (const e of r.events) {
    if (e.type === 'damage' || e.type === 'heal') {
      const u = live.get(e.payload.targetId);
      if (u) {
        u.hp = e.payload.hpAfter;
        sample(u);
      }
      if (e.type === 'damage' && ids.has(e.payload.targetId) && enemies.has(e.payload.sourceId))
        received.set(
          e.payload.targetId,
          received.get(e.payload.targetId)! + e.payload.amount + e.payload.absorbed,
        );
    } else if (e.type === 'status_apply' || e.type === 'shield_apply') {
      const u = live.get(e.payload.unitId);
      if (u) {
        const before = effectiveStat(u, 'maxHp');
        u.statuses.push(structuredClone(e.payload.status));
        if (e.payload.status.stat === 'maxHp')
          u.hp = Math.min(
            effectiveStat(u, 'maxHp'),
            Math.max(1, u.hp + effectiveStat(u, 'maxHp') - before),
          );
        sample(u);
      }
    } else if (e.type === 'status_expire') {
      const u = live.get(e.payload.unitId);
      if (u) {
        u.statuses = u.statuses.filter((s) => s.id !== e.payload.statusId);
        u.hp = Math.min(u.hp, effectiveStat(u, 'maxHp'));
        sample(u);
      }
    }
  }
  const alive = new Set(final.filter((u) => u.hp > 0 && u.deathTick === null).map((u) => u.id)),
    deaths = r.events.filter((e) => e.type === 'unit_death');
  const enemyDeaths = deaths.filter((e) => enemies.has(e.payload.unitId));
  const killed = new Set(
    r.events.flatMap((e) =>
      e.type === 'kill_attributed' && enemies.has(e.payload.victimId) && e.payload.killerId
        ? [e.payload.killerId]
        : [],
    ),
  );
  const won = r.result.winner === 'south',
    survivors = own.filter((u) => alive.has(u.id)).length,
    losses = own.length - survivors,
    total = [...received.values()].reduce((a, b) => a + b, 0);
  return (kind: PredictionKind, unitId?: string) => {
    switch (kind) {
      case 'survival':
        return won && survivors >= 1 && survivors <= 2;
      case 'comeback':
        return won && own.length > 0 && losses * 2 >= own.length;
      case 'underdog':
        return won && armyStrength(own) < armyStrength(initial.filter((u) => u.owner === 'north'));
      case 'untouchable':
        return !!unitId && alive.has(unitId) && (minima.get(unitId) ?? 0) >= 500;
      case 'double-kill':
        return enemyDeaths.some((e, i) =>
          enemyDeaths.slice(i + 1).some((x) => x.tick - e.tick <= 10),
        );
      case 'overtime':
        return won && r.events.some((e) => e.type === 'overtime_start');
      case 'wall':
        return !!unitId && total > 0 && (received.get(unitId) ?? 0) * 100 >= total * 30;
      case 'individual-comeback':
        return (
          !!unitId && alive.has(unitId) && (minima.get(unitId) ?? 1000) < 250 && killed.has(unitId)
        );
    }
  };
}
export function settleSynergies(s: MatchState, replay: CombatReplay, bank: number) {
  const j = s.synergies;
  if (!j) return;
  if (!j.receipts.some((r) => r.kind === 'interest' && r.round === s.round)) {
    const peibol = replay.input.units
      .filter((u) => u.owner === 'south' && u.definitionId === 'peibol')
      .sort((a, b) => (b.profile.starLevel ?? 1) - (a.profile.starLevel ?? 1))[0];
    const star = (peibol?.profile.starLevel ?? 1) - 1,
      amount = peibol
        ? Math.min(
            Math.floor((bank * P13S_JEW_POLICY.ratesMilli[star]!) / 1000),
            P13S_JEW_POLICY.caps[star]!,
          )
        : 0;
    const gold = synergyGold(s, amount, `p13s-interest-${s.round}`);
    receipt(
      s,
      'interest',
      j.rng,
      peibol ? 'paid' : 'no-deployed-peibol',
      [`bank:${bank}`, `requested:${amount}`],
      gold,
      peibol ? { id: peibol.id, stars: peibol.profile.starLevel ?? 1 } : undefined,
    );
  }
  if (j.receipts.some((r) => r.kind === 'predictions' && r.round === s.round)) return;
  const market = j.markets.find((m) => m.round === s.round);
  if (!market?.locked) throw Error('Unfrozen prediction market');
  const evaluate = predictionEvidence(replay),
    details: string[] = [];
  let gold = 0;
  for (const b of market.bets) {
    if (b.status !== 'selected') continue;
    b.status = evaluate(b.kind, b.unitId) ? 'won' : 'lost';
    b.credited =
      b.status === 'won'
        ? synergyGold(s, PREDICTIONS[b.kind].prize, `p13s-prize-${s.round}-${b.kind}`)
        : 0;
    gold += b.credited;
    details.push(`${b.kind}:${b.status}:${b.credited}`);
  }
  receipt(s, 'predictions', j.rng, 'settled', details, gold);
}

/** The three partitions cover exactly 100 integer outcomes for each star level. */
export function rouletteCategory(stars: 1 | 2 | 3, roll: number) {
  if (!Number.isInteger(roll) || roll < 0 || roll >= 100) throw Error('Invalid roulette roll');
  const i = stars - 1;
  return roll < ROULETTE_POLICY.jackpot[i]!
    ? 'jackpot'
    : roll < ROULETTE_POLICY.jackpot[i]! + ROULETTE_POLICY.success[i]!
      ? 'success'
      : 'failure';
}
