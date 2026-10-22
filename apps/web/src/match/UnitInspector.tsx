import { useEffect, useRef } from 'react';
import { axialToOffset, offsetToAxial, scaledProfile, sellValue } from '@tft/game-core';
import { getUnitDefinition } from '@tft/game-data';
import { PixelUnit } from '../game/PixelUnit';
import { ROLE_LABELS } from '../game/pixelArt';
import type { LocalSession } from './LocalSession';
import { synergyLabel } from './uiLabels';
export function UnitInspector({
  session,
  view,
}: {
  session: LocalSession;
  view: ReturnType<LocalSession['getSnapshot']>;
}) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.scrollTo({ top: 0 });
  }, [view.selectedId]);
  const state = session.getMatch(),
    selected = session.selected(),
    def = getUnitDefinition(selected?.definitionId ?? '');
  const preparing = state.phase === 'preparation';
  const cursor = axialToOffset(view.cursor);
  const stats = selected
    ? scaledProfile(selected.definitionId, selected.stars, state.config).stats
    : null;
  const live = session.combatFrame()?.state.units.find((u) => u.id === view.selectedId);
  return (
    <aside ref={panel} className="local-inspector" aria-label="Unidad de partida seleccionada">
      {selected && def && stats ? (
        <>
          <div className="local-unit-title">
            <PixelUnit role={def.role} spriteId={def.spriteId} stars={selected.stars} />
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
      <details
        className="placement-details"
        onToggle={(event) => {
          if (!event.currentTarget.open) panel.current?.scrollTo({ top: 0 });
        }}
      >
        <summary>Colocar sin arrastrar</summary>
        <div className="local-placement">
          <label>
            Columna
            <select
              aria-label="Columna de destino"
              value={cursor.column}
              onChange={(e) => session.setCursor(offsetToAxial(Number(e.target.value), cursor.row))}
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
      </details>
      <section className="synergy-panel" aria-label="Afinidades informativas">
        <h3>Afinidades</h3>
        <p>{def?.synergies.map(synergyLabel).join(' · ') || 'Selecciona una unidad'}</p>
        <small>Información del prototipo · sin efectos activos</small>
      </section>
    </aside>
  );
}
