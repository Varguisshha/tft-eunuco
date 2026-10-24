import { ContentIcon } from './hud/ContentIcon';
import { useMemo, useState } from 'react';
import { levelRule } from '@tft/game-core';
import { getTraitDefinition, matchCatalog } from '@tft/game-data';
import { PixelUnit } from '../game/PixelUnit';
import { ROLE_LABELS } from '../game/pixelArt';
import type { LocalSession } from './LocalSession';
import { synergyLabel } from './uiLabels';
import { purchaseAvailability } from './purchaseAvailability';
import { GameButton } from './hud/GameButton';
import { GameFrame } from './hud/GameFrame';
import { GameIcon } from './hud/GameIcon';
export function Shop({ session }: { session: LocalSession }) {
  const state = session.getMatch(),
    preparing = session.editable,
    rule = levelRule(state);
  const purchaseErrors = useMemo(() => purchaseAvailability(state), [state]);
  const [purchases, setPurchases] = useState<Record<number, string>>({});
  return (
    <section
      className={`shop-section ${state.shopLocked ? 'is-locked' : ''}`}
      aria-label="Tienda de personajes"
    >
      <div className="section-line">
        <div className="shop-control-heading">
          <h2>Tienda</h2>
          <span className="shop-odds" aria-label="Probabilidades por coste">
            {rule.odds.map((odds, i) => (
              <span key={i} className={`odds-cost-${i + 1}`}>
                <b>C{i + 1}</b> {odds}%
              </span>
            ))}
          </span>
        </div>
        <div className="shop-actions">
          <GameButton
            label="Renovar"
            icon="refresh"
            cost={state.config.rerollCost}
            tone="gold"
            disabled={!preparing || state.gold < state.config.rerollCost}
            onAction={() => {
              const ok = session.dispatch({ type: 'reroll_shop' });
              if (ok) setPurchases({});
              return ok;
            }}
          />
          <GameButton
            label={state.shopLocked ? 'Desbloquear tienda' : 'Bloquear tienda'}
            displayLabel={state.shopLocked ? 'Desbloquear' : 'Bloquear'}
            icon={state.shopLocked ? 'lock' : 'unlock'}
            active={state.shopLocked}
            disabled={!preparing}
            title="Conserva las ofertas para la siguiente ronda. Puedes seguir comprando."
            onAction={() => session.dispatch({ type: 'lock_shop', locked: !state.shopLocked })}
          />
        </div>
        <span className="shop-lock-note">
          {state.shopLocked ? 'Ofertas reservadas' : 'Cambian en la próxima ronda'}
        </span>
      </div>
      <div className="shop-offers">
        {state.shop.map((offer, i) => {
          const d = matchCatalog(state.config).find((d) => d.id === offer?.definitionId);
          const error = !preparing ? 'Tienda cerrada' : purchaseErrors[i];
          const status = !d
            ? 'empty'
            : !preparing
              ? 'closed'
              : purchaseErrors[i] === 'Falta oro'
                ? 'unaffordable'
                : purchaseErrors[i]
                  ? 'unavailable'
                  : 'available';
          return (
            <button
              type="button"
              className={`shop-offer cost-${d?.cost ?? 0}`}
              key={offer?.id ?? `empty-${i}`}
              data-state={status}
              aria-label={
                offer && d
                  ? `Comprar ${d.name}, oferta ${i + 1}, ${d.cost} oro`
                  : `Oferta ${i + 1} vacía`
              }
              aria-describedby={d ? `offer-detail-${i}` : undefined}
              disabled={!preparing || !!purchaseErrors[i]}
              onClick={() => {
                if (offer && d && session.dispatch({ type: 'buy_unit', offerId: offer.id }))
                  setPurchases((previous) => ({ ...previous, [i]: d.name }));
              }}
            >
              <GameFrame card />
              {d && (
                <>
                  <span className="offer-motif" aria-hidden="true" />
                  <span className="offer-medallion" aria-hidden="true">
                    <GameIcon name="gold" />
                  </span>
                  <span className="offer-role">
                    {d.id === 'vargas' || d.id === 'dolea' ? ROLE_LABELS[d.role] : 'Provisional'}
                  </span>
                  <span className="offer-pips" aria-hidden="true">
                    {Array.from({ length: d.cost }, (_, n) => (
                      <i key={n} />
                    ))}
                  </span>
                </>
              )}
              {d ? (
                <>
                  {state.shopLocked && (
                    <span className="offer-lock" aria-label="Oferta reservada">
                      <GameIcon name="lock" />
                    </span>
                  )}
                  <span className="offer-art">
                    <PixelUnit role={d.role} spriteId={d.spriteId} />
                  </span>
                  <span className="offer-traits" id={`offer-detail-${i}`}>
                    {d.synergies.slice(0, 2).map((id) => (
                      <span
                        className="offer-trait"
                        key={id}
                        title={getTraitDefinition(id)?.name ?? synergyLabel(id)}
                      >
                        <ContentIcon id={getTraitDefinition(id)?.icon ?? id} />
                        <span>{id === 'upm' ? 'UPM' : synergyLabel(id)}</span>
                      </span>
                    ))}
                    {!d.synergies.some((id) => getTraitDefinition(id)) && (
                      <span className="trait-provisional">Sinergias provisionales</span>
                    )}
                  </span>
                  <span className="offer-footer">
                    <strong>{d.name}</strong>
                    <span className="offer-price">
                      <GameIcon name="gold" />
                      {d.cost}
                    </span>
                  </span>
                  {error && <span className="offer-state">{error}</span>}
                  <span className="offer-intent" aria-hidden="true">
                    Reclutar
                  </span>
                </>
              ) : (
                <span className={`empty-offer ${purchases[i] ? 'is-purchased' : ''}`}>
                  <GameIcon name={purchases[i] ? 'check' : 'neutral'} />
                  <strong>{purchases[i] ? 'Reclutado' : 'Sin oferta'}</strong>
                  {purchases[i] && <span>{purchases[i]}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
