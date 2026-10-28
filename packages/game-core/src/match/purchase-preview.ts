import type { MatchState } from '@tft/shared';
import { applyMatchAction, applySharedEconomy, commandFor, type EconomyContext } from './engine';
/** Exact transaction dry-run, including full bench, cascade, equipment and every restriction. */
export function purchasePreviews(state: MatchState, context?: EconomyContext) {
  return state.shop.map((offer) => {
    if (!offer) return { error: 'Sin oferta' as const, upgrade: null };
    const action = commandFor(state, { type: 'buy_unit', offerId: offer.id });
    const out = context
      ? applySharedEconomy(state, action, context)
      : applyMatchAction(state, action);
    if (!out.ok) return { error: out.error, upgrade: null };
    const upgrades = out.state.lastUpgrades.filter((u) =>
      out.state.units.some((n) => n.id === u.id && n.definitionId === offer.definitionId),
    );
    const stars = upgrades.reduce((n, u) => Math.max(n, u.stars), 0);
    return {
      error: null,
      upgrade: stars >= 2 ? { offerId: offer.id, stars: stars as 2 | 3 } : null,
    };
  });
}
