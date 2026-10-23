import { TraitRail } from './hud/TraitRail';
import { useRef, useState, useSyncExternalStore } from 'react';
import { deployedCount, interestFor, levelRule, type LocalMatchCoordinator } from '@tft/game-core';
import { GameCanvas } from '../game/GameCanvas';
import { PhaseClock } from './PhaseClock';
import './gameHud.css';
import './hud/recruitment.css';
import './hud/traits.css';
import { GameButton } from './hud/GameButton';
import { GameIcon } from './hud/GameIcon';
import { LocalSession } from './LocalSession';
import { UnitInspector } from './UnitInspector';
import { Bench } from './Bench';
import { Shop } from './Shop';
import { DevelopmentClock } from './DevelopmentClock';
import { MAR_DE_CRISTAL } from '../arenas/marDeCristal';
export function LocalGame({
  session,
  onNew,
  onReplace,
}: {
  session: LocalSession;
  onNew: () => void;
  onReplace: (c: LocalMatchCoordinator) => void;
}) {
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const state = session.getMatch();
  const coordinator = session.coordinator;
  const clock = coordinator?.getClock();
  const phase = clock?.currentPhase ?? state.phase;
  const [zoom, setZoom] = useState(1);
  const rule = levelRule(state),
    preparing = session.editable;
  const journal = useRef<HTMLDialogElement>(null);
  return (
    <main className={`local-game game-hud phase-${phase}`}>
      <header className="match-heading">
        <div className="round-emblem">
          <span>RONDA</span>
          <h1>{String(state.round).padStart(2, '0')}</h1>
        </div>
        <PhaseClock
          phase={phase}
          frame={session.combatFrame()}
          paused={clock ? clock.clockState === 'paused' : view.combat.mode === 'paused'}
          {...(phase !== 'combat' && clock ? { authoritativeRemainingMs: clock.remainingMs } : {})}
        />
        <div className="round-actions">
          {phase === 'not_started' ? (
            <button className="button combat-primary" onClick={() => coordinator?.start()}>
              Iniciar partida
            </button>
          ) : phase === 'finished' ? (
            <button className="button combat-primary" onClick={onNew}>
              Nueva partida
            </button>
          ) : (
            <span className="automatic-label">
              {phase === 'resolution'
                ? `Siguiente: ronda ${state.round + 1}`
                : 'Rondas automáticas'}
            </span>
          )}
          {coordinator?.development && (
            <DevelopmentClock coordinator={coordinator} onReplace={onReplace} />
          )}
        </div>
      </header>
      <div className="battlefield">
        <aside className="player-rail" aria-label="Participantes locales">
          <div className="rail-heading">
            <h2>En esta arena</h2>
          </div>
          {[...(['south', 'north'] as const)]
            .sort((a, b) => state.health[b] - state.health[a])
            .map((side) => (
              <article
                key={side}
                className={`player-banner ${side} ${state.health[side] === 0 ? 'eliminated' : ''}`}
              >
                <span className="player-sigil" aria-hidden="true">
                  {side === 'south' ? 'V' : 'F'}
                </span>
                <div>
                  <h3>{side === 'south' ? 'Vargas' : 'Florin'}</h3>
                  <small>
                    {state.health[side] === 0
                      ? 'Eliminado'
                      : side === 'south'
                        ? 'Tú · Jade'
                        : 'Rival actual'}
                  </small>
                </div>
                <strong>
                  {state.health[side]}
                  <small> VIDA</small>
                </strong>
                <meter
                  aria-label={side === 'south' ? 'Vida de Vargas' : 'Vida de Florin'}
                  min={0}
                  max={state.config.roundDamage.initialHp}
                  value={state.health[side]}
                />
              </article>
            ))}

          {(state.phase === 'resolution' || phase === 'finished') && state.lastReward && (
            <section
              className={`round-reward ${phase === 'finished' ? 'elimination-panel' : ''}`}
              aria-label={phase === 'finished' ? 'Partida finalizada' : 'Recompensas de ronda'}
            >
              <strong>
                {phase === 'finished'
                  ? 'Vargas eliminado'
                  : state.lastReward.outcome === 'win'
                    ? 'Victoria jade'
                    : state.lastReward.outcome === 'loss'
                      ? 'Derrota jade'
                      : 'Doble derrota'}{' '}
                <span>+{state.lastReward.credited} oro</span>
              </strong>
              <p>
                {state.healthLedger
                  .slice(-2)
                  .map((e) => `${e.side === 'south' ? 'Vargas' : 'Florin'} −${e.applied} vida`)
                  .join(' · ')}
              </p>
              <p>
                +{state.lastReward.xp} XP · Racha {Math.abs(state.streak)}{' '}
                {state.streak > 0 ? 'victorias' : state.streak < 0 ? 'derrotas' : ''}
              </p>
              <details>
                <summary>Desglose de la ronda</summary>
                <p>
                  {state.combat?.result?.reason === 'timeout' ? 'Tiempo agotado' : 'Eliminación'} ·
                  Tick {state.combat?.result?.tick}
                </p>
                <p>
                  Base {state.lastReward.base} · Intereses {state.lastReward.interest} (sobre{' '}
                  {state.lastReward.bank} oro) · Victoria {state.lastReward.victory} · Racha{' '}
                  {state.lastReward.streak} · Exceso {state.lastReward.overflow}
                </p>
              </details>
            </section>
          )}

          <button className="button journal-button" onClick={() => journal.current?.showModal()}>
            Registro de partida
          </button>
          <TraitRail state={state} />
        </aside>
        <section className="local-board" aria-label="Tablero de partida local">
          <div className="local-board-title">
            <span>Florin · Ámbar</span>
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
          <GameCanvas
            session={session}
            zoom={zoom}
            fitted
            hideTimer
            arena={MAR_DE_CRISTAL}
            development={coordinator?.development ?? false}
          />
          <div className="local-board-footer">
            <span>Vargas · Jade</span>
            <span>
              {phase === 'preparation'
                ? `${deployedCount(state)} / ${state.level} unidades`
                : phase === 'not_started'
                  ? 'Despliega tu formación al iniciar'
                  : phase === 'combat'
                    ? 'Combate automático'
                    : phase === 'resolution'
                      ? 'Ronda liquidada'
                      : 'Partida finalizada'}
            </span>
          </div>
        </section>
        <UnitInspector session={session} view={view} />
        <p className={`match-feedback ${view.invalid ? 'invalid' : ''}`} role="status">
          {view.message}
        </p>
        <Bench session={session} view={view} />
      </div>
      <div className="recruitment-dock">
        <section className="economy-bar" aria-label="Economía">
          <div className="gold-readout">
            <span>Oro</span>
            <strong>
              {state.gold}
              <small>
                <GameIcon name="gold" />
              </small>
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
          <GameButton
            label={`Comprar ${state.config.xpPurchase} XP`}
            icon="xp"
            cost={state.config.xpCost}
            disabled={
              !preparing ||
              state.level === state.config.maxLevel ||
              state.gold < state.config.xpCost
            }
            onAction={() => session.dispatch({ type: 'buy_xp' })}
          />
          <div className="streak-readout">
            <span>Racha</span>
            <strong>{Math.abs(state.streak)}</strong>
            <small>
              {state.streak > 0 ? 'victorias' : state.streak < 0 ? 'derrotas' : 'sin racha'}
            </small>
          </div>
        </section>
        <Shop session={session} />
      </div>
      <p className="sr-only" id="board-instructions">
        Selecciona una unidad para inspeccionarla. Arrastra para mover. Flechas e Intro sobre el
        tablero para colocar; Escape para cerrar la ficha.
      </p>
      <dialog className="match-journal" ref={journal} aria-labelledby="journal-title">
        <header>
          <h2 id="journal-title">Registro de partida</h2>
          <form method="dialog">
            <button className="button">Cerrar registro</button>
          </form>
        </header>
        <details className="health-ledger">
          <summary>Registro de vida · {state.healthLedger.length} movimientos</summary>
          {state.healthLedger.map((e) => (
            <p key={`${e.round}-${e.side}`}>
              Ronda {e.round} · {e.side === 'south' ? 'Vargas' : 'Florin'} ·{' '}
              {e.outcome === 'win' ? 'Victoria' : 'Derrota'} · daño {e.requested}, aplicado{' '}
              {e.applied} · vida {e.hpBefore} → {e.hpAfter}
            </p>
          ))}
        </details>
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
      </dialog>
    </main>
  );
}
