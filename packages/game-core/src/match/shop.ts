import type { MatchState } from '@tft/shared';
import { matchCatalog } from '@tft/game-data';
import { randomUint32 } from '../combat/math';
import { levelRule } from './selectors';
/** Mutates only the transaction-owned draft. Each offered unit reserves one copy. */
export function refreshShop(state: MatchState): void {
  for (const offer of state.shop) if (offer) state.pool[offer.definitionId]!++;
  state.shop = Array.from({ length: state.config.shopSize }, () => null);
  const roll = (max: number) => {
    const next = randomUint32(state.shopRng);
    state.shopRng = next.state;
    return next.value % max;
  };
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
    state.shop[slot] = { id: `offer-${state.nextEntity++}`, definitionId: selected.id };
  }
}
