import { GameIcon } from './hud/GameIcon';
import { GameFrame } from './hud/GameFrame';
import { GameButton } from './hud/GameButton';
import { GameIconButton } from './hud/GameIconButton';
import { MechanicsStatus } from '../game/MechanicsStatus';
import { ADVANCED_STATS_DEFAULTS } from '@tft/shared';
import { ContentIcon } from './hud/ContentIcon';
import { PassiveStatus } from '../game/PassiveStatus';
import { useEffect, useRef, useState } from 'react';
import { axialToOffset, offsetToAxial, sellValue } from '@tft/game-core';
import {
  getUnitDefinition,
  abilityPresentation,
  getTraitDefinition,
  matchCatalog,
} from '@tft/game-data';
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
  const def =
    matchCatalog(session.getMatch().config).find((d) => d.id === selected?.definitionId) ??
    getUnitDefinition(selected?.definitionId ?? '');
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
  const { stats } = selected.profile;
  const ability = abilityPresentation(selected.profile);
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
      <GameFrame width={360} height={654} />
      <div className="inspector-close">
        <GameIconButton label="Cerrar ficha de unidad" icon="close" onAction={close} />
      </div>
      <div className="inspector-scroll">
        <div className="inspector-kicker">UNIDAD SELECCIONADA</div>
        <div className="local-unit-title">
          <PixelUnit role={def.role} spriteId={def.spriteId} stars={selected.stars} />
          <div>
            <h2 id="inspected-name">{def.name}</h2>
            <span>
              {ROLE_LABELS[def.role]} · <GameIcon name="gold" /> {def.cost} ·{' '}
              {selected.side === 'south' ? 'Vargas' : 'Florin'}
            </span>
            <div className="stars" aria-label={`${selected.stars} estrellas`}>
              {'★'.repeat(selected.stars)}
            </div>
          </div>
        </div>
        <section className="inspector-traits" aria-label="Sinergias del personaje">
          {def.synergies.map((id) => (
            <span key={id}>
              <ContentIcon id={getTraitDefinition(id)?.icon ?? id} />
              {synergyLabel(id)}
            </span>
          ))}
          {!def.synergies.some((id) => getTraitDefinition(id)) && (
            <p>Afinidades provisionales, sin efectos activos.</p>
          )}
        </section>
        <div className="inspector-vitals">
          <div className="inspector-vital-values">
            <span>
              <GameIcon name="heart" />
              <span className="sr-only">Vida </span>
              {selected.hp} / {stats.maxHp}
            </span>
            {stats.maxMana > 0 && (
              <span>
                <GameIcon name="pulse" />
                <span className="sr-only">Maná </span>
                {selected.mana} / {stats.maxMana}
              </span>
            )}
          </div>
          <meter aria-label="Vida" min={0} max={stats.maxHp} value={selected.hp} />
          {stats.maxMana > 0 && (
            <meter aria-label="Maná" min={0} max={stats.maxMana} value={selected.mana} />
          )}
          {selected.shield > 0 && (
            <p className="inspector-shield">
              Escudo activo <strong>{selected.shield}</strong>
            </p>
          )}
        </div>
        <dl className="combat-stats">
          <div>
            <dt title="Daño de ataque; también puede escalar habilidades de cualquier tipo de daño.">
              AD
            </dt>
            <dd>{stats.attack}</dd>
          </div>
          <div>
            <dt title="Poder de habilidad; se aplica solo cuando el efecto declara un ratio de AP.">
              AP
            </dt>
            <dd>{stats.abilityPower ?? ADVANCED_STATS_DEFAULTS.abilityPower}</dd>
          </div>
          <div>
            <dt>Prob. crítico</dt>
            <dd>{(stats.critChanceMilli ?? ADVANCED_STATS_DEFAULTS.critChanceMilli) / 10}%</dd>
          </div>
          <div>
            <dt title="Daño total de un impacto crítico antes de mitigación.">Daño crítico</dt>
            <dd>
              {(stats.critMultiplierMilli ?? ADVANCED_STATS_DEFAULTS.critMultiplierMilli) / 10}%
            </dd>
          </div>
          <div>
            <dt>Ataques/s</dt>
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
        <MechanicsStatus value={selected.mechanics} />
        <section className="inspector-abilities" aria-label="Habilidad principal">
          {ability ? (
            <>
              <header className="ability-heading">
                <ContentIcon id={ability.icon} active />
                <div>
                  <h3>{ability.name}</h3>
                  <p>
                    {ability.type === 'mixed'
                      ? 'Mixta'
                      : ability.type === 'active'
                        ? 'Activa'
                        : 'Pasiva'}
                    {ability.active ? ` · ${ability.active.manaCost} maná` : ' · Sin maná'}
                  </p>
                </div>
              </header>
              {ability.passive && (
                <div className="ability-component">
                  <h4>Pasiva — {ability.passive.name}</h4>
                  <PassiveStatus value={selected.passive} />
                  <p>{ability.passive.description}</p>
                </div>
              )}
              {ability.active && (
                <div className="ability-component">
                  <h4>Activa — {ability.active.name}</h4>
                  <p>{ability.active.description}</p>
                </div>
              )}
              {selected.statuses.some((s) => s.kind === 'modifier') && (
                <p className="effective-status-note">
                  Bonificaciones activas incluidas en las estadísticas.
                </p>
              )}
            </>
          ) : (
            <p>Sin habilidad configurada.</p>
          )}
        </section>
        {selected.owned && (
          <>
            <GameButton
              label={`Vender ${def.name}`}
              icon="gold"
              cost={sellValue(selected.owned, session.getMatch().config)}
              tone="gold"
              disabled={!editable}
              onAction={() => session.dispatch({ type: 'sell_unit', unitId: selected.id })}
            />
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
      </div>
    </aside>
  );
}
