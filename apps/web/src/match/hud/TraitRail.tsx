import { useId, useState } from 'react';
import { analyzeTraits, matchTraits } from '@tft/game-core';
import { getUnitDefinition } from '@tft/game-data';
import type { MatchState, CombatInput, CombatState, TraitProgress } from '@tft/shared';
import { ContentIcon } from './ContentIcon';
export function TraitRail({
  state,
  combatState,
}: {
  state: MatchState;
  combatState?: CombatState | undefined;
}) {
  return <TraitRows rows={matchTraits(state)} progress={combatState?.mechanics?.traits ?? []} />;
}
export function CombatTraitRail({
  input,
  state,
}: {
  input: CombatInput;
  state?: CombatState | undefined;
}) {
  const rows = analyzeTraits(
    input.units
      .filter((u) => u.owner === 'south')
      .map((u) => ({
        definitionId: u.definitionId,
        traits: u.profile.traits ?? [],
        deployed: true,
      })),
    input.traits ?? [],
  );
  return <TraitRows rows={rows} progress={state?.mechanics?.traits ?? []} />;
}
function TraitRows({
  rows: all,
  progress,
}: {
  rows: ReturnType<typeof analyzeTraits>;
  progress: TraitProgress[];
}) {
  const rows = all.filter((t) => t.count > 0);
  const [opened, setOpened] = useState<string | null>(null);
  const uid = useId();
  const [anchor, setAnchor] = useState({ left: 170, top: 220 });
  const [dismissed, setDismissed] = useState<string | null>(null);
  const position = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    setAnchor({
      left: Math.max(8, Math.min(innerWidth - 328, rect.right + 8)),
      top: Math.max(8, Math.min(innerHeight - 350, rect.top)),
    });
  };
  if (!rows.length)
    return (
      <section className="trait-rail trait-rail-empty" aria-label="Sinergias de la formación">
        <h2>Sinergias</h2>
        <p>Despliega unidades para formar sinergias.</p>
      </section>
    );
  return (
    <section className="trait-rail" aria-label="Sinergias de la formación">
      <h2>Sinergias</h2>
      {rows.map((row) => {
        const internal = progress.filter((p) => p.traitId === row.trait.id && p.side === 'south');
        const casts = internal.reduce((n, p) => n + p.casts, 0),
          kills = internal.reduce((n, p) => n + p.kills, 0);
        const tooltipId = `${uid}-${row.trait.id}`;
        const memberGoal = row.nextThreshold ?? row.thresholds.at(-1)!.count;
        return (
          <div
            key={row.trait.id}
            className={`trait-row ${row.active ? 'is-active' : ''} ${opened === row.trait.id ? 'is-open' : ''} ${dismissed === row.trait.id ? 'is-dismissed' : ''}`}
            data-tone={row.trait.visual.tone}
            onMouseEnter={(e) => {
              setDismissed(null);
              position(e.currentTarget);
            }}
            onFocus={(e) => {
              setDismissed(null);
              position(e.currentTarget);
            }}
          >
            <button
              className="trait-trigger"
              aria-describedby={tooltipId}
              aria-expanded={opened === row.trait.id}
              onClick={() => {
                setDismissed(null);
                setOpened(opened === row.trait.id ? null : row.trait.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setOpened(null);
                  setDismissed(row.trait.id);
                  e.stopPropagation();
                  e.currentTarget.blur();
                }
              }}
              onBlur={(e) => {
                if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node))
                  setOpened(null);
              }}
            >
              <ContentIcon id={row.trait.icon} active={row.active} />
              <span className="trait-title">
                <strong>{row.trait.id === 'upm' ? 'UPM' : row.trait.name}</strong>
                <small>{row.active ? `Nivel ${row.level} · Activa` : 'Inactiva'}</small>
                {internal.length > 0 && (
                  <small>
                    {row.trait.id === 'upm'
                      ? `${casts} Créditos`
                      : `${kills} elim.${row.trait.id === 'el-depredador' ? ` · Próx. individual ${[2, 4, 6].find((n) => n > Math.max(...internal.map((p) => p.kills))) ?? 'completo'}` : ` · ${casts} lanz.`}`}
                  </small>
                )}
              </span>
              <b
                className="trait-count"
                aria-label={`${row.count} de ${memberGoal} miembros distintos desplegados`}
              >
                {row.count}
                <small>/{memberGoal}</small>
              </b>
            </button>
            <div className="trait-tooltip" id={tooltipId} role="tooltip" style={anchor}>
              <header>
                <ContentIcon id={row.trait.icon} active={row.active} />
                <h3>{row.trait.name}</h3>
              </header>
              <p>{row.trait.description}</p>
              <ol>
                {row.trait.thresholds.map((t) => (
                  <li key={t.count} className={row.thresholds.includes(t) ? 'is-reached' : ''}>
                    <b>{t.count}</b>
                    <span>
                      {t.description}
                      {row.thresholds.includes(t) && <strong> · Activo</strong>}
                    </span>
                  </li>
                ))}
              </ol>
              <p>
                {row.count} {row.count === 1 ? 'personaje distinto' : 'personajes distintos'} ·{' '}
                {row.nextThreshold ? `Próximo umbral: ${row.nextThreshold}` : 'Umbral máximo'}
              </p>
              {internal.length > 0 && (
                <p>
                  Progreso interno{' '}
                  {internal[0]!.scope === 'team'
                    ? 'compartido por equipo'
                    : 'individual por unidad'}
                  : {casts} lanzamientos y {kills} eliminaciones en total. No añade miembros.
                </p>
              )}
              {internal.map((p) => (
                <p key={p.unitId ?? 'team'}>
                  {p.unitId ?? 'Equipo'}: {p.kills} eliminaciones · {p.casts} lanzamientos
                </p>
              ))}
              <p className="trait-contributors">
                {row.contributors.map((id) => getUnitDefinition(id)?.name ?? id).join(' · ')}
              </p>
              <small>
                Valores de balance provisionales. Solo cuentan personajes distintos desplegados.
              </small>
            </div>
          </div>
        );
      })}
    </section>
  );
}
