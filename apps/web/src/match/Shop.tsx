import { isP11Catalog } from '@tft/shared';
import { AffinityBand } from './AffinityBand';
import { ContentIcon } from './hud/ContentIcon';
import { useMemo, useState } from 'react';
import { purchasePreviews, levelRule } from '@tft/game-core';
import { getTraitDefinition, matchCatalog } from '@tft/game-data';
import { SplashArt } from '../game/SplashArt';
import { splashArtFor } from '../game/splashArtCatalog';
import { CharacterSpecialization } from '../game/CharacterSpecialization';
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
  const purchaseErrors = useMemo(
    () => session.remote?.purchaseErrors ?? purchaseAvailability(state),
    [state, session],
  );
  const upgrades = useMemo(
    () =>
      ['f0p11g-1', 'f0p11h-1'].includes(state.config.catalog ?? '')
        ? (session.remote?.purchaseUpgrades ?? purchasePreviews(state).map((p) => p.upgrade))
        : [],
    [state, session],
  );
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
            disabled={!session.canLockShop}
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
          const wasPurchased = state.shopRolls
            ? state.shopRolls[i]?.outcome === 'purchased'
            : !!purchases[i];
          const purchasedName = wasPurchased ? purchases[i] : undefined;
          const buying =
            !!offer && session.canEconomicAction({ type: 'buy_unit', offerId: offer.id });
          const error = !buying ? 'Compra no disponible' : purchaseErrors[i];
          const status = !d
            ? 'empty'
            : !buying
              ? 'closed'
              : purchaseErrors[i] === 'Falta oro'
                ? 'unaffordable'
                : purchaseErrors[i]
                  ? 'unavailable'
                  : 'available';
          const upgrade =
            offer &&
            upgrades[i]?.offerId === offer.id &&
            !error &&
            session.canEconomicAction({ type: 'buy_unit', offerId: offer.id })
              ? upgrades[i]
              : null;
          const modern = state.config.catalog === 'f0p10a-1' || isP11Catalog(state.config.catalog);
          const Card = modern ? 'article' : 'button';
          const buy = () => {
            if (offer && d && session.dispatch({ type: 'buy_unit', offerId: offer.id }))
              setPurchases((previous) => ({ ...previous, [i]: d.name }));
          };
          return (
            <Card
              type={modern ? undefined : 'button'}
              className={`shop-offer cost-${d?.cost ?? 0} ${d && splashArtFor(d.id) ? 'has-splash' : ''}${modern ? ' multi-affinity-card' : ''}`}
              key={offer?.id ?? `empty-${i}`}
              data-state={status}
              data-upgrade={upgrade?.stars}
              aria-label={
                offer && d
                  ? `Comprar ${d.name}, oferta ${i + 1}, ${d.cost} oro`
                  : `Oferta ${i + 1} vacía`
              }
              aria-describedby={d ? `offer-detail-${i}` : undefined}
              disabled={modern ? undefined : !buying || !!purchaseErrors[i]}
              onClick={modern ? undefined : buy}
            >
              {modern && (
                <button
                  type="button"
                  className="offer-purchase"
                  disabled={!d || !buying || !!purchaseErrors[i]}
                  onClick={buy}
                  aria-label={
                    d
                      ? `Comprar ${d.name}, oferta ${i + 1}, ${d.cost} oro`
                      : `Oferta ${i + 1} vacía`
                  }
                  aria-describedby={d ? `offer-detail-${i}` : undefined}
                />
              )}
              <GameFrame card />
              {d && (
                <>
                  <span className="offer-motif" aria-hidden="true" />
                  <span className="offer-medallion" aria-hidden="true">
                    <GameIcon name="gold" />
                  </span>
                  <span className="offer-role">
                    <CharacterSpecialization id={d.id} compact tooltip={modern} />
                  </span>
                  {upgrade && (
                    <span
                      className={`fusion-cue stars-${upgrade.stars}`}
                      role="status"
                      aria-label={`Esta compra permite ascender a ${upgrade.stars} estrellas`}
                    >
                      {Array.from({ length: upgrade.stars }, (_, n) => (
                        <GameIcon key={n} name="star" />
                      ))}
                    </span>
                  )}
                  <span className="offer-pips" aria-hidden="true" hidden={!!upgrade}>
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
                    <SplashArt character={d} />
                    {d.provisional && (
                      <span
                        className="provisional-character"
                        title="Coste, estadísticas y retrato temporales. Solo ataques básicos; habilidades personales pendientes."
                      >
                        Provisional
                      </span>
                    )}
                  </span>
                  {modern ? (
                    <>
                      <AffinityBand ids={d.synergies} catalog={state.config.catalog!} />
                      <span className="sr-only" id={`offer-detail-${i}`}>
                        {d.synergies
                          .map((id) => getTraitDefinition(id, state.config.catalog)?.name ?? id)
                          .join(', ')}
                      </span>
                    </>
                  ) : (
                    <span className="offer-traits" id={`offer-detail-${i}`}>
                      {d.synergies.map((id) => (
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
                  )}
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
                <span className={`empty-offer ${wasPurchased ? 'is-purchased' : ''}`}>
                  <GameIcon name={wasPurchased ? 'check' : 'neutral'} />
                  <strong>
                    {state.shopRolls?.[i]?.outcome === 'no-catalog'
                      ? `Coste ${state.shopRolls[i]!.cost} sin catálogo`
                      : state.shopRolls?.[i]?.outcome === 'exhausted'
                        ? `Coste ${state.shopRolls[i]!.cost} agotado`
                        : wasPurchased
                          ? 'Reclutado'
                          : 'Sin oferta'}
                  </strong>
                  {purchasedName && <span>{purchasedName}</span>}
                </span>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
