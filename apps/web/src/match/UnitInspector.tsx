import { useEffect, useRef, useState } from 'react';
import { axialToOffset, offsetToAxial, sellValue } from '@tft/game-core';
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
  const current = session.inspection();
  const [retained, setRetained] = useState(current);
  // Retain content for a short exit only. Re-selection cancels the exit without remounting.
  useEffect(() => {
    if (view.selectedId) {
      setRetained(session.inspection());
      return;
    }
    const timer = window.setTimeout(() => setRetained(null), 120);
    return () => window.clearTimeout(timer);
  }, [session, view.selectedId]);
  const selected = current ?? retained;
  const def = getUnitDefinition(selected?.definitionId ?? '');
  const cursor = axialToOffset(view.cursor);
  const close = () => {
    const containedFocus = panel.current?.contains(document.activeElement);
    session.cancel();
    if (containedFocus) document.querySelector<HTMLElement>('.game-hud .canvas-shell')?.focus();
  };
  useEffect(() => {
    if (!view.selectedId) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
      const containedFocus = panel.current?.contains(document.activeElement);
      session.cancel();
      if (containedFocus) document.querySelector<HTMLElement>('.game-hud .canvas-shell')?.focus();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [session, view.selectedId]);
  if (!selected || !def) return null;
  const { stats, ability, passive } = selected.profile;
  const editable = session.editable && !!selected.owned;
  return (
    <aside
      ref={panel}
      className={`local-inspector ${current ? '' : 'is-closing'}`}
      inert={!current}
      aria-hidden={!current}
      aria-label="Unidad de partida seleccionada"
      aria-labelledby="inspected-name"
    >
      <button className="inspector-close" aria-label="Cerrar ficha de unidad" onClick={close}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
      <div className="local-unit-title">
        <PixelUnit role={def.role} spriteId={def.spriteId} stars={selected.stars} />
        <div>
          <span>
            {selected.side === 'south' ? 'Vargas' : 'Florin'} · {def.cost} oro
          </span>
          <h2 id="inspected-name">{def.name}</h2>
          <span>{ROLE_LABELS[def.role]}</span>
          <div className="stars" aria-label={`${selected.stars} estrellas`}>
            {'★'.repeat(selected.stars)}
          </div>
        </div>
      </div>
      <div className="inspector-vitals">
        <label>
          Vida{' '}
          <strong>
            {selected.hp} / {stats.maxHp}
          </strong>
          <meter min={0} max={stats.maxHp} value={selected.hp} />
        </label>
        <label>
          Maná{' '}
          <strong>
            {selected.mana} / {stats.maxMana}
          </strong>
          <meter min={0} max={stats.maxMana || 1} value={selected.mana} />
        </label>
      </div>
      <dl className="combat-stats">
        <div>
          <dt>Ataque</dt>
          <dd>{stats.attack}</dd>
        </div>
        <div>
          <dt>Ataques/s base</dt>
          <dd>{stats.attackSpeedMilli / 1000}</dd>
        </div>
        <div>
          <dt>Armadura</dt>
          <dd>{stats.armor}</dd>
        </div>
        <div>
          <dt>Resist. mágica</dt>
          <dd>{stats.magicResist}</dd>
        </div>
        <div>
          <dt>Alcance</dt>
          <dd>{stats.range}</dd>
        </div>
        <div>
          <dt>Posición</dt>
          <dd>
            {selected.owned?.location.kind === 'bench'
              ? `Reserva ${selected.owned.location.slot + 1}`
              : 'Tablero'}
          </dd>
        </div>
      </dl>
      <section className="inspector-abilities" aria-label="Habilidades provisionales">
        <h3>{ability?.name ?? 'Sin habilidad activa'}</h3>
        <p>
          {ability ? `Activa provisional · ${ability.manaCost} maná` : 'Sin activa configurada'}
        </p>
        <h3>Pasiva</h3>
        <p>
          {passive
            ? `Provisional · ${passive.trigger === 'combat_start' ? 'al iniciar combate' : passive.trigger}`
            : 'Sin pasiva configurada'}
        </p>
        {passive && (
          <p>
            {passive.effects
              .map((effect) =>
                effect.kind === 'shield' ? `Escudo: ${effect.amount}` : effect.kind,
              )
              .join(' · ')}
          </p>
        )}
      </section>
      <section className="synergy-panel" aria-label="Afinidades informativas">
        <h3>{def.synergies.map(synergyLabel).join(' · ')}</h3>
        <p>Afinidades provisionales, sin efectos activos.</p>
      </section>
      {selected.owned && (
        <>
          <button
            className="button sell-button"
            disabled={!editable}
            onClick={() => session.dispatch({ type: 'sell_unit', unitId: selected.id })}
          >
            Vender {def.name} · {sellValue(selected.owned, session.getMatch().config)} oro
          </button>
          <details className="placement-details">
            <summary>Colocar sin arrastrar</summary>
            <div className="local-placement">
              <label>
                Columna
                <select
                  aria-label="Columna de destino"
                  disabled={!editable}
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
                  disabled={!editable}
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
                disabled={!editable}
                onClick={() => session.move(selected.id, view.cursor)}
              >
                Colocar selección
              </button>
            </div>
          </details>
        </>
      )}
    </aside>
  );
}
