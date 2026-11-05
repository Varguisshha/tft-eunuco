import './fantasy.css';
import { ContentIcon } from './ContentIcon';
import { P13S_JEW_POLICY } from '@tft/game-data';
import { useState } from 'react';
import { PREDICTIONS, getUnitDefinition } from '@tft/game-data';
import { fantasyCapacity } from '@tft/game-core';
import type { LocalSession } from '../LocalSession';
import { GameButton } from './GameButton';
import { ContextTooltip } from '../overlays/ContextTooltip';
/** Same authoritative selection command in local and network play. */
export function SynergyEconomy({ session }: { session: LocalSession }) {
  const state = session.getMatch(),
    journal = state.synergies;
  const [unitId, setUnitId] = useState('');
  if (!journal) return null;
  const market = journal.markets.find((m) => m.round === state.round),
    capacity = fantasyCapacity(state),
    units = state.units.filter((u) => u.location.kind === 'board');
  const chosen = units.some((u) => u.id === unitId) ? unitId : units[0]?.id;
  const peibol = units
    .filter((u) => u.definitionId === 'peibol')
    .sort((a, b) => b.stars - a.stars)[0];
  const expectedInterest = peibol
    ? Math.min(
        Math.floor((state.gold * P13S_JEW_POLICY.ratesMilli[peibol.stars - 1]!) / 1000),
        P13S_JEW_POLICY.caps[peibol.stars - 1]!,
      )
    : 0;
  const selected = market?.bets.filter((b) => b.status !== 'void').length ?? 0;
  const latest = journal.receipts
    .filter((r) => r.kind === 'roulette' || (r.kind === 'interest' && r.outcome === 'paid'))
    .slice(-2);
  return (
    <section className="synergy-economy" aria-label="Economía de sinergias">
      {market && capacity > 0 && (
        <ContextTooltip
          label="Predicciones Fantasy"
          interactive
          content={
            <>
              <header>
                <h3>Predicciones Fantasy</h3>
              </header>
              <p>
                Elige antes de conocer al rival. Cada apuesta cuesta 1 oro; el premio indicado es
                bruto.
              </p>
              <p>
                {market.bets.filter((b) => b.status !== 'void').length}/{capacity} selecciones ·{' '}
                {market.locked ? 'Mercado cerrado' : 'Preparación'}
              </p>
              <label className="fantasy-unit-picker">
                Unidad para apuestas individuales
                <select
                  value={chosen ?? ''}
                  disabled={market.locked}
                  onChange={(e) => setUnitId(e.target.value)}
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {getUnitDefinition(u.definitionId)?.name ?? u.definitionId} {u.stars}★
                    </option>
                  ))}
                </select>
              </label>
              <div className="synergy-predictions">
                {market.offers.map((kind) => {
                  const p = PREDICTIONS[kind],
                    bet = market.bets.find((b) => b.kind === kind),
                    command = {
                      type: 'select_prediction' as const,
                      kind,
                      ...(p.unit && chosen ? { unitId: chosen } : {}),
                    };
                  return (
                    <section key={kind}>
                      <h4>
                        {p.name} · {p.prize} oro
                      </h4>
                      <p>{p.description}</p>
                      {bet ? (
                        <p role="status">
                          {
                            {
                              selected: 'Apostado',
                              won: 'Acertada',
                              lost: 'Fallida',
                              void: 'Anulada; coste devuelto',
                            }[bet.status]
                          }
                          {bet.unitId
                            ? ` · ${getUnitDefinition(state.units.find((u) => u.id === bet.unitId)?.definitionId ?? '')?.name ?? 'Unidad elegida'}`
                            : ''}
                        </p>
                      ) : (
                        <GameButton
                          label={`Apostar: ${p.name}`}
                          displayLabel="Apostar"
                          icon="gold"
                          cost={1}
                          disabled={
                            market.locked ||
                            state.gold < 1 ||
                            market.bets.length >= capacity ||
                            (p.unit && !chosen) ||
                            !session.canEconomicAction(command)
                          }
                          onAction={() => session.dispatch(command)}
                        />
                      )}
                    </section>
                  );
                })}
              </div>
            </>
          }
        >
          <button className="synergy-action" data-attention={!market.locked && selected < capacity}>
            <ContentIcon id="fantasy" active />
            <span>
              <strong>Fantasy</strong>
              <span>
                {market.locked
                  ? 'Ver apuestas'
                  : selected < capacity
                    ? 'Elegir apuestas'
                    : 'Apuestas elegidas'}
              </span>
            </span>
            <b>
              {selected}/{capacity}
            </b>
          </button>
        </ContextTooltip>
      )}
      {peibol && (
        <div className="synergy-bank" aria-label="Jew: intereses de Peibol">
          <ContentIcon id="jew" active />
          <span>
            <strong>Jew · {peibol.stars}★</strong>
            <span>
              {P13S_JEW_POLICY.ratesMilli[peibol.stars - 1]! / 10} % · tope{' '}
              {P13S_JEW_POLICY.caps[peibol.stars - 1]}
            </span>
            <small>Con {state.gold} oro</small>
          </span>
          <b>
            +{expectedInterest}
            <small>oro</small>
          </b>
        </div>
      )}
      {latest.map((r) => (
        <details key={r.id}>
          <summary>
            {r.kind === 'roulette' ? 'Todo al Rojo' : 'Banco Peibol'} · {r.gold >= 0 ? '+' : ''}
            {r.gold} oro
          </summary>
          <p>
            {r.kind === 'roulette'
              ? r.outcome.startsWith('jackpot')
                ? 'Jackpot'
                : r.outcome.startsWith('success')
                  ? 'Éxito'
                  : 'Fallo'
              : r.outcome === 'paid'
                ? 'Interés abonado'
                : 'Sin Peibol desplegado'}
          </p>
          {r.details.map((d, i) => (
            <p key={i}>{rewardText(d)}</p>
          ))}
        </details>
      ))}
      {journal.pendingChampions.length > 0 && (
        <p>
          {journal.pendingChampions.length} personaje pendiente: libera espacio en el banquillo.
        </p>
      )}
    </section>
  );
}
function rewardText(detail: string) {
  const [kind, ...parts] = detail.split(':');
  const labels: Record<string, string> = {
    gold: 'Oro',
    health: 'Vida de jugador',
    component: 'Componente',
    champion: 'Personaje',
    upgrade: 'Mejora de coste',
    downgrade: 'Reducción de coste',
    bank: 'Oro previo al cierre',
    requested: 'Interés calculado',
  };
  return `${labels[kind!] ?? kind}: ${parts.map((p) => (p === 'no-op' ? 'sin cambio' : p === 'no-catalog' ? 'sin personaje de ese coste' : p === 'pool-exhausted' ? 'pool insuficiente' : p === 'boundary' ? 'coste límite' : p === 'empty' ? 'sin componentes' : p === 'empty-bench' ? 'banquillo vacío' : p === 'lost' ? 'perdido' : (getUnitDefinition(p)?.name ?? p))).join(' · ')}`;
}
