import { useState, useSyncExternalStore } from 'react';
import { axialToOffset, offsetToAxial } from '@tft/game-core';
import { getUnitDefinition, UNIT_DEFINITIONS, COMBAT_PROFILES } from '@tft/game-data';
import { CombatControls } from './game/CombatControls';
import type { UnitDefinition } from '@tft/shared';
import { BoardSession } from './game/session';
import { GameCanvas } from './game/GameCanvas';
import { pixelRects, ROLE_COLORS, ROLE_LABELS } from './game/pixelArt';
function PixelUnit({ role, large = false }: { role: UnitDefinition['role']; large?: boolean }) {
  return (
    <svg
      className={large ? 'pixel-unit large' : 'pixel-unit'}
      viewBox="0 0 32 40"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {pixelRects(role).map(([x, y, width, height, fill], i) => (
        <rect key={i} {...{ x, y, width, height, fill }} />
      ))}
    </svg>
  );
}
function Mark() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 2 29 9.5v13L16 30 3 22.5v-13L16 2Z" stroke="currentColor" strokeWidth="2" />
      <path d="m10 11 6 3.5 6-3.5v10l-6 3.5-6-3.5V11Z" fill="currentColor" />
    </svg>
  );
}
function ResetIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" />
    </svg>
  );
}
export function App() {
  const [session] = useState(() => new BoardSession());
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [zoom, setZoom] = useState(1);
  const [help, setHelp] = useState(false);
  const combatFrame = session.combatFrame();
  const selected = (combatFrame?.state.units ?? state.board.units).find(
    (u) => u.id === state.selectedId,
  );
  const liveUnit = combatFrame?.state.units.find((u) => u.id === state.selectedId);
  const definition = getUnitDefinition(selected?.definitionId ?? state.paletteId ?? '');
  const profile = definition ? COMBAT_PROFILES[definition.id] : undefined;
  const activeCoord = state.hover ?? selected?.position ?? state.cursor;
  const offset = axialToOffset(activeCoord);
  const friendlyCount = combatFrame
    ? combatFrame.state.units.filter((u) => u.owner === state.side && u.hp > 0).length
    : state.board.units.filter((u) => u.owner === state.side).length;
  const cursorOffset = axialToOffset(state.cursor);
  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#arena" aria-label="TFT EUNUCO, ir al tablero">
          <Mark />
          <span>
            TFT <strong>EUNUCO</strong>
          </span>
        </a>
        <div className="project-label">
          <span className="status-dot" />
          Laboratorio de combate
        </div>
        <span className="version">
          F0–P2 <span>·</span> PROTOTIPO LOCAL
        </span>
      </header>
      <main id="arena">
        <div className="page-heading">
          <div>
            <h1>
              Arena de pruebas<span>.</span>
            </h1>
            <p>Prepara, simula y observa. Arena interna de desarrollo.</p>
          </div>
          <button className="button quiet" onClick={() => session.reset()}>
            <ResetIcon />
            Restaurar formación
          </button>
        </div>
        <CombatControls session={session} combat={state.combat} />
        <div className="workspace">
          <section className="arena-panel" aria-label="Arena hexagonal">
            <div className="arena-toolbar">
              <div className="arena-title">
                <span className="live-square" />
                <h2>{session.editable ? 'Tablero de preparación' : 'Combate local'}</h2>
              </div>
              <span className="board-dimensions">
                7 × 8 <span>HEXÁGONOS</span>
              </span>
            </div>
            <div className="arena-viewport">
              <div className="territory north">
                <span />
                Territorio ámbar <small>4 filas</small>
              </div>
              <GameCanvas session={session} zoom={zoom} />
              <div className="territory south">
                <span />
                Territorio jade <small>4 filas</small>
              </div>
              <div className="view-controls" aria-label="Escala del tablero">
                <button
                  aria-label="Alejar tablero"
                  disabled={zoom <= 0.85}
                  onClick={() => setZoom(0.85)}
                >
                  −
                </button>
                <button
                  className="zoom-value"
                  aria-label="Restablecer zoom"
                  onClick={() => setZoom(1)}
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  aria-label="Acercar tablero"
                  disabled={zoom >= 1.15}
                  onClick={() => setZoom(1.15)}
                >
                  +
                </button>
              </div>
            </div>
            <div className="arena-status">
              <div
                className={state.invalid ? 'feedback invalid' : 'feedback'}
                role="status"
                aria-live="polite"
              >
                <span />
                {state.message}
              </div>
              <span className="coordinates" title="Coordenadas axiales">
                q {activeCoord.q} <span>/</span> r {activeCoord.r}
              </span>
            </div>
            <div className="reserve">
              <div className="reserve-heading">
                <h2>Reserva de pruebas</h2>
                <span>Selecciona y coloca</span>
              </div>
              <div className="unit-roster">
                {UNIT_DEFINITIONS.map((unit) => (
                  <button
                    key={unit.id}
                    className={`roster-unit ${state.paletteId === unit.id ? 'active' : ''}`}
                    disabled={!session.editable}
                    onClick={() => session.choose(unit.id)}
                    aria-pressed={state.paletteId === unit.id}
                  >
                    <div className="portrait">
                      <PixelUnit role={unit.role} />
                    </div>
                    <span className="roster-label">
                      <strong>{unit.name}</strong>
                      <span>{ROLE_LABELS[unit.role]}</span>
                    </span>
                    <span className="cost" title={`Coste de referencia ${unit.cost}`}>
                      {unit.cost}
                    </span>
                  </button>
                ))}
              </div>
              <p className="reserve-note">
                Unidades ficticias · Sin límite de copias en este prototipo · Costes de referencia
              </p>
            </div>
          </section>
          <aside className="inspector">
            <section className="formation">
              <h2>Tu formación</h2>
              <div
                className="side-switch"
                aria-label={
                  session.editable ? 'Equipo que estás editando' : 'Equipo que estás inspeccionando'
                }
              >
                <button
                  className={state.side === 'south' ? 'active jade' : ''}
                  aria-pressed={state.side === 'south'}
                  onClick={() => session.setSide('south')}
                >
                  <span className="team-dot jade" />
                  Jade
                </button>
                <button
                  className={state.side === 'north' ? 'active amber' : ''}
                  aria-pressed={state.side === 'north'}
                  onClick={() => session.setSide('north')}
                >
                  <span className="team-dot amber" />
                  Ámbar
                </button>
              </div>
              <div className="deployment-count">
                <strong>
                  {friendlyCount.toString().padStart(2, '0')}
                  <span>/28</span>
                </strong>
                <span>{session.editable ? 'casillas ocupadas' : 'unidades vivas'}</span>
              </div>
              <div className="capacity" aria-hidden="true">
                {Array.from({ length: 28 }, (_, i) => (
                  <span key={i} className={i < friendlyCount ? state.side : ''} />
                ))}
              </div>
            </section>
            <section className="unit-details">
              <div className="detail-heading">
                <h2>{definition ? 'Unidad seleccionada' : 'Sin selección'}</h2>
                {definition && <span className="detail-index">{definition.name}</span>}
              </div>
              {definition ? (
                <>
                  <div
                    className="selected-portrait"
                    style={{ '--unit-color': ROLE_COLORS[definition.role] } as React.CSSProperties}
                  >
                    <div className="portrait-plinth" />
                    <PixelUnit role={definition.role} large />
                  </div>
                  <div className="unit-name">
                    <h3>{definition.name}</h3>
                    <span>PROVISIONAL</span>
                  </div>
                  <p className="unit-role">{ROLE_LABELS[definition.role]}</p>
                  <dl>
                    <div>
                      <dt>Coste de referencia</dt>
                      <dd>
                        <span className="cost">{definition.cost}</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Equipo</dt>
                      <dd>
                        {selected ? (selected.owner === 'south' ? 'Jade' : 'Ámbar') : 'En reserva'}
                      </dd>
                    </div>
                    <div>
                      <dt>Posición axial</dt>
                      <dd className="mono">
                        {selected
                          ? `${selected.position.q}, ${selected.position.r}`
                          : 'Sin desplegar'}
                      </dd>
                    </div>
                    {profile && (
                      <>
                        <div>
                          <dt>Vida</dt>
                          <dd>
                            {liveUnit?.hp ?? profile.stats.maxHp} / {profile.stats.maxHp}
                          </dd>
                        </div>
                        <div>
                          <dt>Maná</dt>
                          <dd>
                            {liveUnit?.mana ?? profile.stats.startingMana} / {profile.stats.maxMana}
                          </dd>
                        </div>
                        <div>
                          <dt>Ataque base / alcance</dt>
                          <dd>
                            {profile.stats.attack} / {profile.stats.range}
                          </dd>
                        </div>
                        <div>
                          <dt>Ataques/s base</dt>
                          <dd>{profile.stats.attackSpeedMilli / 1000}</dd>
                        </div>
                        <div>
                          <dt>Objetivo</dt>
                          <dd className="mono">{liveUnit?.targetId ?? '—'}</dd>
                        </div>
                        <div>
                          <dt>Estado</dt>
                          <dd>
                            {liveUnit?.deathTick !== null && liveUnit?.deathTick !== undefined
                              ? 'Eliminada'
                              : liveUnit?.statuses.some((s) => s.kind === 'stun')
                                ? 'Aturdida'
                                : liveUnit?.action?.kind === 'cast'
                                  ? 'Lanzando'
                                  : liveUnit?.statuses.some((s) => s.kind === 'shield')
                                    ? 'Con escudo'
                                    : 'Disponible'}
                          </dd>
                        </div>
                      </>
                    )}
                  </dl>
                  <p className="pending-note">
                    {profile?.ability?.name ?? 'Sin habilidad'} ·{' '}
                    {profile?.passive ? 'Pasiva: blindaje inicial' : 'Sin pasiva en este perfil'}
                  </p>
                </>
              ) : (
                <div className="empty-inspector">
                  <Mark />
                  <p>Selecciona una unidad del tablero o de la reserva para inspeccionarla.</p>
                </div>
              )}
            </section>
            <section className="precise-controls">
              <h2>Casilla seleccionada</h2>
              <div className="coordinate-inputs">
                <label>
                  Columna
                  <select
                    value={cursorOffset.column}
                    onChange={(e) =>
                      session.setCursor(offsetToAxial(Number(e.target.value), cursorOffset.row))
                    }
                  >
                    {Array.from({ length: 7 }, (_, i) => (
                      <option value={i} key={i}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Fila
                  <select
                    value={cursorOffset.row}
                    onChange={(e) =>
                      session.setCursor(offsetToAxial(cursorOffset.column, Number(e.target.value)))
                    }
                  >
                    {Array.from({ length: 8 }, (_, i) => (
                      <option value={i} key={i}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                className="button apply"
                disabled={!session.editable}
                onClick={() =>
                  selected
                    ? session.move(selected.id, state.cursor)
                    : session.activate(state.cursor)
                }
              >
                {state.paletteId
                  ? 'Desplegar en casilla'
                  : selected
                    ? 'Mover a casilla'
                    : 'Seleccionar casilla'}
              </button>
              <span className="cell-summary">
                Bajo el cursor: columna {offset.column + 1}, fila {offset.row + 1}
              </span>
            </section>
          </aside>
        </div>
        {!session.editable && (
          <div className="combat-legend">
            <span>Vida: jade / ámbar</span>
            <span>Maná: azul</span>
            <span>Escudo: contorno claro</span>
            <span>Aturdimiento: cruz amarilla</span>
            <span>Modificador: triángulo verde</span>
          </div>
        )}
        <footer className="footer">
          <p id="board-instructions">
            <span className="mouse-icon" />
            Arrastra para mover <span className="footer-divider" />
            Tab + flechas para navegar · Intro para colocar · Esc para cancelar
          </p>
          <button
            className="text-button"
            aria-expanded={help}
            aria-controls="help-panel"
            onClick={() => setHelp(!help)}
          >
            Cómo usar el tablero <span>{help ? '−' : '+'}</span>
          </button>
        </footer>
        {help && (
          <section className="help-panel" id="help-panel">
            <h2>Prepara tu formación</h2>
            <ol>
              <li>
                Elige el equipo jade o ámbar. Solo puedes colocar y mover unidades en sus cuatro
                filas.
              </li>
              <li>
                Selecciona una unidad de la reserva y pulsa una casilla libre. Para moverla,
                arrástrala o selecciona otra casilla.
              </li>
              <li>
                Los puntos indican destinos disponibles. Un contorno cobre con una cruz indica un
                destino inválido.
              </li>
              <li>
                También puedes elegir columna y fila en el panel, o enfocar el tablero y usar
                flechas e Intro. Las filas y columnas se muestran desde 1; las coordenadas axiales
                usan enteros desde 0 y pueden ser negativas.
              </li>
            </ol>
            <p>
              Este laboratorio no guarda cambios al recargar. Carga el duelo de prueba e inicia el
              combate; durante la reproducción puedes inspeccionar, pausar o cambiar la velocidad.
              La economía y el multijugador pertenecen a fases posteriores.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
