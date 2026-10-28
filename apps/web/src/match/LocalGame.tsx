import { CombatStatisticsPanel } from './CombatStatisticsPanel';
import { equipmentCommand, itemInteraction, previewItemCommand } from './items/itemInteraction';
import { ItemHud } from './items/ItemHud';
import { CompetitiveHud } from '../network/CompetitiveHud';
import { GameFrame } from './hud/GameFrame';
import { GameIconButton } from './hud/GameIconButton';
import { TraitRail } from './hud/TraitRail';
import { useRef, useState, useSyncExternalStore } from 'react';
import { deployedCount, interestFor, levelRule, type LocalMatchCoordinator } from '@tft/game-core';
import { GameCanvas } from '../game/GameCanvas';
import { PhaseClock } from './PhaseClock';

import { GameButton } from './hud/GameButton';
import { GameIcon } from './hud/GameIcon';
import './hud/neonHud.css';
import './hud/p11gHud.css';
import { RoundFeedback } from './hud/RoundFeedback';
import { ShopOdds } from './hud/ShopOdds';
import { MultiplayerDuel, MultiplayerStandings } from '../network/MultiplayerHud';
import { LocalSession } from './LocalSession';
import { UnitInspector } from './UnitInspector';
import { Bench } from './Bench';
import { Shop } from './Shop';
import { MAR_DE_CRISTAL } from '../arenas/marDeCristal';
export function LocalGame({
  session,
  onNew,
}: {
  session: LocalSession;
  onNew: () => void;
  onReplace: (c: LocalMatchCoordinator) => void;
}) {
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const state = session.getMatch();
  const coordinator = session.authority;
  const clock = coordinator?.getClock();
  const phase = clock?.currentPhase ?? state.phase;
  const [zoom, setZoom] = useState(1);
  const rule = levelRule(state),
    preparing = session.editable;
  const journal = useRef<HTMLDialogElement>(null);
  if (session.remote?.finalResults)
    return (
      <main className="local-game game-hud multiplayer-game">
        <CompetitiveHud remote={session.remote} onExit={onNew} />
      </main>
    );
  return (
    <main
      className={`local-game game-hud phase-${phase} ${session.remote ? 'multiplayer-game' : ''} ${session.remote?.eliminated ? 'is-eliminated' : ''}`}
    >
      {session.remote && <CompetitiveHud remote={session.remote} onExit={onNew} />}
      <RoundFeedback
        state={state}
        scope={`${clock?.matchId ?? state.seed}/${state.items?.ownerId ?? 'south'}`}
      />
      <header className="match-heading">
        <div className="match-logo">
          TFT <b>EUNUCO</b>
        </div>
        <div className="phase-plate">
          <div className="round-emblem">
            <span>RONDA</span>
            <h1>{String(session.remote?.currentRound ?? state.round).padStart(2, '0')}</h1>
          </div>
          <PhaseClock
            phase={phase}
            frame={session.combatFrame()}
            paused={clock ? clock.clockState === 'paused' : view.combat.mode === 'paused'}
            remote={!!session.remote}
            {...((phase !== 'combat' || session.remote) && clock
              ? { authoritativeRemainingMs: clock.remainingMs }
              : {})}
          />
        </div>
        <div className="round-actions">
          {phase === 'not_started' && session.remote ? (
            <span className="automatic-label">Conectando participantes…</span>
          ) : phase === 'not_started' ? (
            <GameButton
              label="Iniciar partida"
              icon="play"
              disabled={false}
              onAction={() => {
                coordinator?.start();
                return true;
              }}
            />
          ) : phase === 'finished' ? (
            <GameButton
              label="Nueva partida"
              icon="refresh"
              disabled={false}
              onAction={() => {
                onNew();
                return true;
              }}
            />
          ) : (
            <span className="automatic-label">
              {phase === 'resolution'
                ? `Siguiente: ronda ${(session.remote?.currentRound ?? state.round) + 1}`
                : 'Rondas automáticas'}
            </span>
          )}
          {coordinator?.development && (
            <span className="dev-environment">DEV · PRUEBA AISLADA</span>
          )}
        </div>
      </header>
      <div className="battlefield">
        <aside
          className="player-rail"
          aria-label={session.remote ? 'Participantes' : 'Participantes locales'}
        >
          {session.remote ? (
            <MultiplayerStandings remote={session.remote} />
          ) : (
            <>
              <div className="rail-heading">
                <h2>Clasificación</h2>
              </div>
              {[...(['south', 'north'] as const)]
                .sort((a, b) => state.health[b] - state.health[a])
                .map((side) => (
                  <article
                    key={side}
                    className={`player-banner ${side} ${state.health[side] === 0 ? 'eliminated' : ''}`}
                  >
                    <span className="player-sigil" aria-hidden="true">
                      <GameIcon name="shield" />
                    </span>
                    <div>
                      <h3>{session.names[side]}</h3>
                      <small>
                        {state.health[side] === 0
                          ? 'Eliminado'
                          : side === 'south'
                            ? 'Tú · Jade'
                            : 'Rival · Ámbar'}
                      </small>
                    </div>
                    <strong>
                      {state.health[side]}
                      <small> VIDA</small>
                    </strong>
                    <meter
                      aria-label={`Vida de ${session.names[side]}`}
                      min={0}
                      max={state.config.roundDamage.initialHp}
                      value={state.health[side]}
                    />
                  </article>
                ))}
            </>
          )}

          {!state.lastReward?.receipt &&
            (state.phase === 'resolution' || phase === 'finished') &&
            state.lastReward && (
              <section
                className={`round-reward ${phase === 'finished' ? 'elimination-panel' : ''}`}
                aria-label={phase === 'finished' ? 'Partida finalizada' : 'Recompensas de ronda'}
              >
                <strong>
                  {phase === 'finished'
                    ? 'Partida finalizada'
                    : state.lastReward.outcome === 'win'
                      ? session.remote
                        ? 'Victoria'
                        : 'Victoria jade'
                      : state.lastReward.outcome === 'loss'
                        ? session.remote
                          ? 'Derrota'
                          : 'Derrota jade'
                        : 'Doble derrota'}{' '}
                  <span>+{state.lastReward.credited} oro</span>
                </strong>
                <p>
                  {state.healthLedger
                    .slice(session.remote ? -1 : -2)
                    .map((e) => `${session.names[e.side]} −${e.applied} vida`)
                    .join(' · ')}
                </p>
                <p>
                  +{state.lastReward.xp} XP · Racha {Math.abs(state.streak)}{' '}
                  {state.streak > 0 ? 'victorias' : state.streak < 0 ? 'derrotas' : ''}
                </p>
                <details>
                  <summary>Desglose de la ronda</summary>
                  <p>
                    {state.combat?.result?.reason === 'timeout' ? 'Tiempo agotado' : 'Eliminación'}{' '}
                    · Tick {state.combat?.result?.tick}
                  </p>
                  <p>
                    Base {state.lastReward.base} · Intereses {state.lastReward.interest} (sobre{' '}
                    {state.lastReward.bank} oro) · Victoria {state.lastReward.victory} · Racha{' '}
                    {state.lastReward.streak} · Exceso {state.lastReward.overflow}
                  </p>
                </details>
              </section>
            )}

          <GameButton
            label="Registro de partida"
            icon="journal"
            disabled={false}
            onAction={() => {
              journal.current?.showModal();
              return true;
            }}
          />
          <TraitRail state={state} combatState={session.combatFrame()?.state} />
        </aside>
        <section
          className="local-board"
          aria-label={
            session.remote ? 'Tablero de partida multijugador' : 'Tablero de partida local'
          }
        >
          {session.remote && <MultiplayerDuel remote={session.remote} />}
          <div className="local-board-title">
            <span>{session.names.north} · Ámbar</span>
            <div className="local-zoom">
              <GameIconButton label="Alejar tablero" icon="minus" onAction={() => setZoom(0.85)} />
              <button aria-label="Restablecer zoom" onClick={() => setZoom(1)}>
                {Math.round(zoom * 100)}%
              </button>
              <GameIconButton label="Acercar tablero" icon="plus" onAction={() => setZoom(1.15)} />
            </div>
          </div>
          <GameCanvas
            session={session}
            zoom={zoom}
            itemDrop={(unitId, itemId) => itemInteraction(session).equip(unitId, itemId)}
            itemPreview={(unitId) => {
              const id = itemInteraction(session).getSnapshot().selected;
              return (
                !!id &&
                session.editable &&
                !previewItemCommand(state, equipmentCommand(state, unitId, id))
              );
            }}
            fitted
            hideTimer
            arena={MAR_DE_CRISTAL}
            development={coordinator?.development ?? false}
          />
          <div className="formation-readout">
            <strong>
              <GameIcon name="shield" />
              {deployedCount(state)} / {state.level}
            </strong>
            <span>Tu formación</span>
          </div>
          <div className="local-board-footer">
            <span>{session.names.south} · Jade</span>
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
        <CombatStatisticsPanel session={session} />
        <p className={`match-feedback ${view.invalid ? 'invalid' : ''}`} role="status">
          {view.message}
        </p>
        <Bench session={session} view={view} />
        <ItemHud session={session} />
      </div>
      <div className="recruitment-dock">
        <section className="economy-bar" aria-label="Economía">
          <GameFrame width={246} height={231} />
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
          <div
            className={`level-readout ${['f0p11g-1', 'f0p11h-1'].includes(state.config.catalog ?? '') ? 'modern-level' : ''}`}
          >
            {['f0p11g-1', 'f0p11h-1'].includes(state.config.catalog ?? '') && (
              <ShopOdds state={state} />
            )}
            {!['f0p11g-1', 'f0p11h-1'].includes(state.config.catalog ?? '') && (
              <span>
                Nivel <strong>{state.level}</strong>{' '}
                <small>
                  · {deployedCount(state)}/{state.level} desplegadas
                </small>
              </span>
            )}
            <progress
              aria-label="Experiencia de nivel"
              value={state.level === state.config.maxLevel ? 1 : state.xp}
              max={state.level === state.config.maxLevel ? 1 : rule.xpToNext}
            />
            <small>
              {state.level === state.config.maxLevel ? (
                'Nivel máximo'
              ) : (
                <>
                  {state.xp} / {rule.xpToNext} XP
                  <span className="xp-hint"> · +{state.config.passiveXp} por ronda</span>
                </>
              )}
            </small>
          </div>
          <GameButton
            label={`Comprar ${state.config.xpPurchase} XP`}
            displayLabel="Comprar XP"
            icon="xp"
            cost={state.config.xpCost}
            disabled={
              !preparing ||
              state.level === state.config.maxLevel ||
              state.gold < state.config.xpCost
            }
            onAction={() => session.dispatch({ type: 'buy_xp' })}
          />
          <div className="streak-readout" title="Racha de rondas">
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
              Ronda {e.round} · {session.names[e.side]} ·{' '}
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
                          development: 'Ajuste DEV',
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
