import { useMemo } from 'react';
import { levelRule } from '@tft/game-core';
import { getUnitDefinition } from '@tft/game-data';
import { PixelUnit } from '../game/PixelUnit';
import { ROLE_LABELS } from '../game/pixelArt';
import type { LocalSession } from './LocalSession';
import { synergyLabel } from './uiLabels';
import { purchaseAvailability } from './purchaseAvailability';
export function Shop({ session }: { session: LocalSession }) {
  const state = session.getMatch(),
    preparing = session.editable,
    rule = levelRule(state);
  const purchaseErrors = useMemo(() => purchaseAvailability(state), [state]);
  return (
    <section className="shop-section" aria-label="Tienda de personajes">
      <div className="section-line">
        <div>
          <h2>Tienda</h2>
          <span className="shop-odds">
            Probabilidades propias · C1 {rule.odds[0]}% / C2 {rule.odds[1]}% / C3 {rule.odds[2]}%
          </span>
        </div>
        <div className="shop-actions">
          <button
            className="button"
            disabled={!preparing || state.gold < state.config.rerollCost}
            onClick={() => session.dispatch({ type: 'reroll_shop' })}
          >
            Renovar · {state.config.rerollCost} ◈
          </button>
          <button
            className={`button ${state.shopLocked ? 'locked' : ''}`}
            aria-pressed={state.shopLocked}
            disabled={!preparing}
            onClick={() => session.dispatch({ type: 'lock_shop', locked: !state.shopLocked })}
          >
            {state.shopLocked ? 'Desbloquear tienda' : 'Bloquear tienda'}
          </button>
        </div>
      </div>
      <div className="shop-offers">
        {state.shop.map((offer, i) => {
          const d = getUnitDefinition(offer?.definitionId ?? '');
          return (
            <button
              className={`shop-offer cost-${d?.cost ?? 0}`}
              key={offer?.id ?? `empty-${i}`}
              aria-label={
                offer && d
                  ? `Comprar ${d.name}, oferta ${i + 1}, ${d.cost} oro`
                  : `Oferta ${i + 1} vacía`
              }
              disabled={!preparing || !!purchaseErrors[i]}
              onClick={() => offer && session.dispatch({ type: 'buy_unit', offerId: offer.id })}
            >
              {d ? (
                <>
                  <div className="offer-art">
                    <PixelUnit role={d.role} spriteId={d.spriteId} />
                    <span className="offer-price">{d.cost} ◈</span>
                  </div>
                  <strong>{d.name}</strong>
                  <span>
                    {ROLE_LABELS[d.role]} · {d.synergies.map(synergyLabel).join(' / ')}
                  </span>

                  <span className="offer-state">
                    {!preparing ? 'Tienda cerrada' : purchaseErrors[i] || 'Reclutar'}
                  </span>
                </>
              ) : (
                <span className="empty-offer">Sin oferta</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
