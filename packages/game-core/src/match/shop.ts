import type { MatchState } from '@tft/shared';
import { matchCatalog } from '@tft/game-data';
import { randomUint32 } from '../combat/math';
import { levelRule } from './selectors';
/** Mutates only the transaction-owned draft. Each offered unit reserves one copy. */
export function refreshShop(state: MatchState, prefix = ''): void {
  for (const offer of state.shop) if (offer) state.pool[offer.definitionId]!++;
  state.shop = Array.from({ length: state.config.shopSize }, () => null);
  const roll = (max: number) => {
    const next = randomUint32(state.shopRng);
    state.shopRng = next.state;
    return next.value % max;
  };
  if (['f0p11g-1', 'f0p11h-1'].includes(state.config.catalog ?? '')) {
    const uniform = (max: number) => {
      const limit = 0x100000000 - (0x100000000 % max);
      let n: number;
      do {
        const next = randomUint32(state.shopRng);
        state.shopRng = next.state;
        n = next.value;
      } while (n >= limit);
      return n % max;
    };
    state.shopRolls = [];
    for (let slot = 0; slot < state.config.shopSize; slot++) {
      let pick = uniform(100),
        cost = 1;
      for (const [i, weight] of levelRule(state).odds.entries()) {
        pick -= weight;
        if (pick < 0) {
          cost = i + 1;
          break;
        }
      }
      const definitions = matchCatalog(state.config).filter((d) => d.cost === cost);
      const available = definitions.filter((d) => state.pool[d.id]! > 0);
      if (!available.length) {
        state.shopRolls.push({ cost, outcome: definitions.length ? 'exhausted' : 'no-catalog' });
        continue;
      }
      let copy = uniform(available.reduce((n, d) => n + state.pool[d.id]!, 0));
      const chosen = available.find((d) => {
        copy -= state.pool[d.id]!;
        return copy < 0;
      })!;
      state.pool[chosen.id]!--;
      state.shop[slot] = { id: `${prefix}offer-${state.nextEntity++}`, definitionId: chosen.id };
      state.shopRolls.push({ cost, outcome: 'offered' });
    }
    return;
  }
  for (let slot = 0; slot < state.config.shopSize; slot++) {
    const buckets = levelRule(state)
      .odds.map((weight, i) => ({
        cost: i + 1,
        weight,
        defs: matchCatalog(state.config).filter((d) => d.cost === i + 1 && state.pool[d.id]! > 0),
      }))
      .filter((b) => b.weight > 0 && b.defs.length > 0);
    if (!buckets.length) break;
    let pick = roll(buckets.reduce((n, b) => n + b.weight, 0));
    const bucket = buckets.find((b) => {
      pick -= b.weight;
      return pick < 0;
    })!;
    let copy = roll(bucket.defs.reduce((n, d) => n + state.pool[d.id]!, 0));
    const selected = bucket.defs.find((d) => {
      copy -= state.pool[d.id]!;
      return copy < 0;
    })!;
    state.pool[selected.id]!--;
    state.shop[slot] = { id: `${prefix}offer-${state.nextEntity++}`, definitionId: selected.id };
  }
}
