import { applyMatchAction, commandFor } from '@tft/game-core';
import type { MatchState } from '@tft/shared';
/** Dry-run the core transaction on its clone; never approximate full-bench/fusion rules in UI. */
export function purchaseAvailability(state: MatchState): (string | null)[] {
  return state.shop.map((offer) => {
    if (!offer) return 'Sin oferta';
    const result = applyMatchAction(
      state,
      commandFor(state, { type: 'buy_unit', offerId: offer.id }),
    );
    if (result.ok) return null;
    return result.error === 'bench-full'
      ? 'Banquillo lleno'
      : result.error === 'insufficient-gold'
        ? 'Falta oro'
        : result.error === 'wrong-phase'
          ? 'Espera a preparación'
          : 'No disponible';
  });
}
