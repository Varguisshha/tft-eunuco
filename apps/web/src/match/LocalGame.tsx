import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  axialToOffset,
  deployedCount,
  interestFor,
  levelRule,
  offsetToAxial,
  sellValue,
  scaledProfile,
} from '@tft/game-core';
import { getUnitDefinition } from '@tft/game-data';
import { PixelUnit } from '../game/PixelUnit';
import { ROLE_LABELS } from '../game/pixelArt';
import { GameCanvas } from '../game/GameCanvas';
import { LocalSession } from './LocalSession';
export function LocalGame({ session }: { session: LocalSession }) {
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const state = session.getMatch(),
    selected = session.selected(),
    def = getUnitDefinition(selected?.definitionId ?? '');
  const [zoom, setZoom] = useState(1);
  const rule = levelRule(state),
    preparing = state.phase === 'preparation';
  const cursor = axialToOffset(view.cursor);
  const stats = selected
    ? scaledProfile(selected.definitionId, selected.stars, state.config).stats
    : null;
  const live = session.combatFrame()?.state.units.find((u) => u.id === view.selectedId);
  useEffect(() => {
    session.dropOutside = (id, x, y) => {
      const target = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-bench-slot]');
      return target ? session.bench(Number(target.dataset.benchSlot), id) : false;
    };
    return () => {
      session.dropOutside = undefined;
    };
  }, [session]);
  const drag = (event: React.DragEvent, id: string) => {
    event.dataTransfer.setData('application/x-tft-unit', id);
    event.dataTransfer.effectAllowed = 'move';
    session.select(id);
  };
  const drop = (event: React.DragEvent, slot: number) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('application/x-tft-unit');
    if (id && preparing) session.bench(slot, id);
  };
  return (
    <main className="local-game">
      <header className="match-heading">
        <div>
          <span className="eyebrow">PARTIDA LOCAL</span>
          <h1>Tu próxima jugada.</h1>
        </div>
        <div className="round-label">
          Ronda <strong>{state.round}</strong>
          <span>
            {preparing ? 'Preparación' : state.phase === 'combat' ? 'Combate' : 'Resultado'}
          </span>
        </div>
      </header>
      <div className="health-bar" aria-label="Vida de participantes">
        <span>
          Tu vida{' '}
          <strong>
            {state.health.south}/{state.config.roundDamage.initialHp}
          </strong>
        </span>
        <span>
          Vida rival{' '}
          <strong>
            {state.health.north}/{state.config.roundDamage.initialHp}
          </strong>
        </span>
        {(state.health.south === 0 || state.health.north === 0) && (
          <small>Modo de prueba: puedes seguir jugando con 0 de vida.</small>
        )}
      </div>
      <section className="economy-bar" aria-label="Economía">
        <div className="gold-readout">
          <span>Oro</span>
          <strong>
            {state.gold}
            <small> ◈</small>
          </strong>
          <span>
            Interés previsto <b>+{interestFor(state.gold, state.config)}</b>
          </span>
        </div>
        <div className="level-readout">
          <span>
            Nivel <strong>{state.level}</strong>{' '}
            <small>
              · {deployedCount(state)}/{state.level} desplegadas
            </small>
          </span>
          <progress
            aria-label="Experiencia de nivel"
            value={state.level === state.config.maxLevel ? 1 : state.xp}
            max={state.level === state.config.maxLevel ? 1 : rule.xpToNext}
          />
          <small>
            {state.level === state.config.maxLevel
              ? 'Nivel máximo'
              : `${state.xp} / ${rule.xpToNext} XP · +${state.config.passiveXp} por ronda`}
          </small>
        </div>
        <button
          className="button"
          disabled={
            !preparing || state.level === state.config.maxLevel || state.gold < state.config.xpCost
          }
          onClick={() => session.dispatch({ type: 'buy_xp' })}
        >
          Comprar {state.config.xpPurchase} XP <b>{state.config.xpCost} ◈</b>
        </button>
        <div className="streak-readout">
          <span>Racha</span>
          <strong>{Math.abs(state.streak)}</strong>
          <small>
            {state.streak > 0 ? 'victorias' : state.streak < 0 ? 'derrotas' : 'sin racha'}
          </small>
        </div>
        <div className="round-actions">
          {preparing ? (
            <button
              className="button combat-primary"
              disabled={deployedCount(state) === 0 || deployedCount(state) > state.level}
              onClick={() => session.dispatch({ type: 'start_combat' })}
            >
              Iniciar combate →
            </button>
          ) : state.phase === 'combat' ? (
            <>
              <button className="button" onClick={() => session.pauseCombat()}>
                {view.combat.mode === 'paused' ? 'Reanudar' : 'Pausar'}
              </button>
              <button
                className="button"
                aria-pressed={view.combat.speed === 2}
                onClick={() => session.setSpeed(view.combat.speed === 1 ? 2 : 1)}
              >
                ×{view.combat.speed}
              </button>
            </>
          ) : (
            <button
              className="button combat-primary"
              onClick={() => session.dispatch({ type: 'next_round', round: state.round })}
            >
              Siguiente ronda →
            </button>
          )}
        </div>
      </section>
      {state.phase === 'resolution' && state.lastReward && (
        <section className="round-reward" aria-label="Recompensas de ronda">
          <strong>
            {state.lastReward.outcome === 'win'
              ? 'Victoria jade'
              : state.lastReward.outcome === 'loss'
                ? 'Derrota jade'
                : 'Doble derrota'}{' '}
            <span>+{state.lastReward.credited} oro</span>
          </strong>
          <p>
            {state.combat?.result?.reason === 'timeout'
              ? 'Tiempo agotado'
              : state.lastReward.outcome === 'double_loss'
                ? 'Eliminación mutua'
                : 'Eliminación'}{' '}
            · Tick {state.combat?.result?.tick}
          </p>
          <p>
            Base {state.lastReward.base} · Intereses {state.lastReward.interest} (sobre{' '}
            {state.lastReward.bank} oro) · Victoria {state.lastReward.victory} · Racha{' '}
            {state.lastReward.streak} · +{state.lastReward.xp} XP
            {state.lastReward.overflow > 0
              ? ` · ${state.lastReward.overflow} oro excede el límite`
              : ''}
          </p>
          <p>
            {state.healthLedger
              .slice(-2)
              .map(
                (e) =>
                  `${e.side === 'south' ? 'Jade' : 'Ámbar'}: −${e.applied} vida (base ${e.base} + supervivientes ${e.survivors}; ${e.hpAfter} restante)`,
              )
              .join(' · ')}
          </p>
        </section>
      )}
      <details className="health-ledger">
        <summary>Registro de vida · {state.healthLedger.length} movimientos</summary>
        {state.healthLedger.map((e) => (
          <p key={`${e.round}-${e.side}`}>
            Ronda {e.round} · {e.side === 'south' ? 'Jade' : 'Ámbar'} ·{' '}
            {e.outcome === 'win' ? 'Victoria' : 'Derrota'} · daño {e.requested}, aplicado{' '}
            {e.applied} · vida {e.hpBefore} → {e.hpAfter}
          </p>
        ))}
      </details>
      <div className="local-battle-layout">
        <section className="local-board" aria-label="Tablero de partida local">
          <div className="local-board-title">
            <span>Ámbar · Rival de pruebas</span>
            <div className="local-zoom">
              <button aria-label="Alejar tablero" onClick={() => setZoom(0.85)}>
                −
              </button>
              <button aria-label="Restablecer zoom" onClick={() => setZoom(1)}>
                {Math.round(zoom * 100)}%
              </button>
              <button aria-label="Acercar tablero" onClick={() => setZoom(1.15)}>
                +
              </button>
            </div>
          </div>
          <GameCanvas session={session} zoom={zoom} />
          <div className="local-board-footer">
            <span>Jade · Tu formación</span>
            <span>
              {preparing
                ? `${deployedCount(state)} / ${state.level} unidades`
                : `Tick ${view.combat.tick} · ×${view.combat.speed}`}
            </span>
          </div>
        </section>
        <aside className="local-inspector" aria-label="Unidad de partida seleccionada">
          {selected && def && stats ? (
            <>
              <div className="local-unit-title">
                <PixelUnit role={def.role} />
                <div>
                  <h2>{def.name}</h2>
                  <span>{ROLE_LABELS[def.role]}</span>
                  <div className="stars">{'★'.repeat(selected.stars)}</div>
                </div>
              </div>
              <dl>
                <div>
                  <dt>Vida</dt>
                  <dd>
                    {live?.hp ?? stats.maxHp} / {stats.maxHp}
                  </dd>
                </div>
                <div>
                  <dt>Ataque</dt>
                  <dd>{stats.attack}</dd>
                </div>
                <div>
                  <dt>Armadura / RM</dt>
                  <dd>
                    {stats.armor} / {stats.magicResist}
                  </dd>
                </div>
                <div>
                  <dt>Alcance</dt>
                  <dd>{stats.range}</dd>
                </div>
                <div>
                  <dt>Posición</dt>
                  <dd>
                    {selected.location.kind === 'bench'
                      ? `Banquillo ${selected.location.slot + 1}`
                      : 'Tablero'}
                  </dd>
                </div>
              </dl>
              <button
                className="button sell-button"
                disabled={!preparing}
                onClick={() => session.dispatch({ type: 'sell_unit', unitId: selected.id })}
              >
                Vender {def.name} · {sellValue(selected, state.config)} ◈
              </button>
            </>
          ) : (
            <div className="local-empty">
              <h2>
                {preparing
                  ? 'Construye tu equipo'
                  : state.phase === 'combat'
                    ? 'Observa el combate'
                    : 'Ronda completada'}
              </h2>
              <p>
                {preparing
                  ? 'Compra en la tienda y arrastra desde el banquillo a la mitad jade.'
                  : 'Selecciona una unidad para consultar sus estadísticas.'}
              </p>
              <p>Tres copias iguales se combinan. Ahorra de diez en diez para ganar intereses.</p>
            </div>
          )}
          <div className="local-placement">
            <label>
              Columna
              <select
                aria-label="Columna de destino"
                value={cursor.column}
                onChange={(e) =>
                  session.setCursor(offsetToAxial(Number(e.target.value), cursor.row))
                }
              >
                {Array.from({ length: 7 }, (_, i) => (
                  <option key={i} value={i}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fila
              <select
                aria-label="Fila de destino"
                value={cursor.row}
                onChange={(e) =>
                  session.setCursor(offsetToAxial(cursor.column, Number(e.target.value)))
                }
              >
                {[4, 5, 6, 7].map((i) => (
                  <option key={i} value={i}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button"
              disabled={!preparing || !selected}
              onClick={() => selected && session.move(selected.id, view.cursor)}
            >
              Colocar selección
            </button>
          </div>
          <p className="local-help" id="board-instructions">
            Selecciona y arrastra. También puedes elegir destino con los controles, o enfocar el
            tablero y usar flechas e Intro. Para retirar, arrastra a un espacio del banquillo o
            selecciónalo y pulsa un espacio vacío.
          </p>
        </aside>
      </div>
      <p className={`match-feedback ${view.invalid ? 'invalid' : ''}`} role="status">
        {view.message}
      </p>
      <section className="bench-section" aria-label="Banquillo">
        <div className="section-line">
          <h2>Banquillo</h2>
          <span>
            {state.units.filter((u) => u.location.kind === 'bench').length} /{' '}
            {state.config.benchSize} plazas
          </span>
        </div>
        <div className="bench-slots">
          {Array.from({ length: state.config.benchSize }, (_, slot) => {
            const u = state.units.find(
                (u) => u.location.kind === 'bench' && u.location.slot === slot,
              ),
              d = getUnitDefinition(u?.definitionId ?? '');
            return (
              <button
                key={slot}
                data-bench-slot={slot}
                className={`bench-slot ${u?.id === view.selectedId ? 'selected' : ''}`}
                aria-label={`Banquillo ${slot + 1}${d && u ? `: ${d.name}, ${u.stars} estrellas` : ': vacío'}`}
                draggable={!!u && preparing}
                onDragStart={(e) => u && drag(e, u.id)}
                onDragOver={(e) => {
                  if (preparing) e.preventDefault();
                }}
                onDrop={(e) => drop(e, slot)}
                onClick={() => (u ? session.select(u.id) : session.bench(slot))}
              >
                <span className="slot-number">{slot + 1}</span>
                {d && u ? (
                  <>
                    <PixelUnit role={d.role} />
                    <span className="bench-name">{d.name}</span>
                    <span className="stars">{'★'.repeat(u.stars)}</span>
                  </>
                ) : (
                  <span className="empty-slot">+</span>
                )}
              </button>
            );
          })}
        </div>
      </section>
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
                disabled={!preparing || !offer || !d || state.gold < d.cost}
                onClick={() => offer && session.dispatch({ type: 'buy_unit', offerId: offer.id })}
              >
                {d ? (
                  <>
                    <div className="offer-art">
                      <PixelUnit role={d.role} />
                      <span className="offer-price">{d.cost} ◈</span>
                    </div>
                    <strong>{d.name}</strong>
                    <span>{ROLE_LABELS[d.role]}</span>
                    <small>
                      ★ ·{' '}
                      {state.units.filter((u) => u.definitionId === d.id && u.stars === 1).length}{' '}
                      copias de 1★
                    </small>
                  </>
                ) : (
                  <span className="empty-offer">Sin oferta</span>
                )}
              </button>
            );
          })}
        </div>
      </section>
      {state.lastUpgrades.length > 0 && preparing && (
        <div key={state.revision} className="upgrade-notice" role="status">
          {state.lastUpgrades
            .map(
              (u) =>
                `${getUnitDefinition(state.units.find((v) => v.id === u.id)?.definitionId ?? '')?.name ?? 'Unidad'} ${'★'.repeat(u.stars)}`,
            )
            .join(' · ')}
        </div>
      )}
      <details className="economy-ledger">
        <summary>Registro de oro · {state.ledger.length} movimientos</summary>
        <table>
          <thead>
            <tr>
              <th>Ronda</th>
              <th>Concepto</th>
              <th>Cambio</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {state.ledger
              .slice()
              .reverse()
              .map((e) => (
                <tr key={e.seq}>
                  <td>{e.round}</td>
                  <td>
                    {
                      {
                        initial: 'Oro inicial',
                        buy: 'Compra',
                        sell: 'Venta',
                        reroll: 'Renovación',
                        xp: 'Experiencia',
                        base: 'Ingreso base',
                        interest: 'Intereses',
                        victory: 'Victoria',
                        streak: 'Racha',
                      }[e.reason]
                    }
                  </td>
                  <td>
                    {e.delta > 0 ? '+' : ''}
                    {e.delta}
                  </td>
                  <td>{e.balance}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </main>
  );
}
