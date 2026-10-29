import { useState } from 'react';
import { sortTraitRows, traitState, traitStatus } from './traitOrder';
import { synergyLabel } from '../uiLabels';
import { ContextTooltip } from '../overlays/ContextTooltip';
import { analyzeTraits, matchTraits } from '@tft/game-core';
import {
  getUnitDefinition,
  matchCatalog,
  P12F_ECONOMY_CONFIG,
  characterPresentation,
} from '@tft/game-data';
import { SynergyPortrait } from './SynergyPortrait';
import type {
  MatchState,
  CombatInput,
  CombatState,
  TraitProgress,
  UnitDefinition,
  OwnedUnit,
} from '@tft/shared';
import { ContentIcon } from './ContentIcon';
export function TraitRail({
  state,
  combatState,
}: {
  state: MatchState;
  combatState?: CombatState | undefined;
}) {
  return (
    <TraitRows
      rows={matchTraits(state)}
      progress={combatState?.mechanics?.traits ?? []}
      roster={matchCatalog(state.config)}
      owned={state.units}
    />
  );
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
  return (
    <TraitRows
      rows={rows}
      progress={state?.mechanics?.traits ?? []}
      roster={matchCatalog(P12F_ECONOMY_CONFIG)}
      owned={input.units
        .filter((u) => u.owner === 'south')
        .map((u) => ({
          id: u.id,
          definitionId: u.definitionId,
          stars: 1,
          location: { kind: 'board', hex: u.position },
        }))}
    />
  );
}
function TraitRows({
  rows: all,
  progress,
  roster,
  owned,
}: {
  rows: ReturnType<typeof analyzeTraits>;
  progress: TraitProgress[];
  roster: readonly UnitDefinition[];
  owned: readonly OwnedUnit[];
}) {
  const rows = sortTraitRows(all.filter((t) => t.count > 0));
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
        const presentation = traitState(row);
        const internal = progress.filter((p) => p.traitId === row.trait.id && p.side === 'south');
        const casts = internal.reduce((n, p) => n + p.casts, 0),
          kills = internal.reduce((n, p) => n + p.kills, 0);
        const memberGoal = row.nextThreshold ?? row.trait.thresholds.at(-1)!.count;
        return (
          <div
            key={row.trait.id}
            className={`trait-row ${presentation.active ? 'is-active' : ''}`}
            data-tone={row.trait.visual.tone}
            data-trait-id={row.trait.id}
            data-activation={
              presentation.active ? 'active' : presentation.pending ? 'pending' : 'inactive'
            }
            data-reached-level={row.level}
          >
            <ContextTooltip
              label={row.trait.name}
              interactive
              hoverOpen
              content={
                <>
                  {' '}
                  <header>
                    <ContentIcon id={row.trait.icon} active={presentation.active} />
                    <h3>{row.trait.name}</h3>
                  </header>
                  <p>{row.trait.description}</p>
                  <ol>
                    {row.trait.thresholds.map((t) => (
                      <li key={t.count} className={row.thresholds.includes(t) ? 'is-reached' : ''}>
                        <b>{t.count}</b>
                        <span>
                          {t.description}
                          {t.effectState === 'pending_effects' && (
                            <strong> · Efecto pendiente</strong>
                          )}
                          {t.reservation && <small>{t.reservation}</small>}
                          {row.thresholds.includes(t) &&
                            t.effectState !== 'pending_effects' &&
                            t.availability !== 'reserved' && <strong> · Activo</strong>}
                          {t.count <= row.count && t.effectState === 'pending_effects' && (
                            <strong> · Umbral alcanzado, sin bonificación nueva</strong>
                          )}
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
                  <TraitMembers
                    traitId={row.trait.id}
                    name={row.trait.name}
                    roster={roster}
                    owned={owned}
                  />
                </>
              }
            >
              <button className="trait-trigger">
                {' '}
                <ContentIcon id={row.trait.icon} active={presentation.active} />
                <span className="trait-title">
                  <strong>
                    {row.trait.id === 'upm'
                      ? 'UPM'
                      : row.trait.planning
                        ? row.trait.name
                        : synergyLabel(row.trait.id)}
                  </strong>
                  <small>{traitStatus(row)}</small>
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
            </ContextTooltip>
          </div>
        );
      })}
    </section>
  );
}

/** Lives inside the synergy portal, after the description; never expands the rail. */
export function TraitMembers({
  traitId,
  name,
  roster,
  owned,
}: {
  traitId: string;
  name: string;
  roster: readonly UnitDefinition[];
  owned: readonly OwnedUnit[];
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const members = roster.filter((d) => d.synergies.includes(traitId));
  const presence = (id: string) =>
    owned.some((u) => u.definitionId === id && u.location.kind === 'board')
      ? 'deployed'
      : owned.some((u) => u.definitionId === id)
        ? 'bench'
        : 'missing';
  const labels = { deployed: 'Desplegado', bench: 'En banquillo', missing: 'Sin poseer' };
  const selected = members.find((d) => d.id === hovered),
    info = selected && characterPresentation(selected.id);
  return (
    <section className="trait-members-section" aria-label={`Personajes de ${name}`}>
      <h4>Personajes</h4>
      <div className="trait-members">
        {members.map((d) => {
          const state = presence(d.id),
            p = characterPresentation(d.id);
          return (
            <button
              key={d.id}
              className="trait-member"
              data-presence={state}
              aria-label={`${d.name}, coste ${d.cost}, ${p.roleLabel}, ${labels[state]}`}
              onMouseEnter={() => setHovered(d.id)}
              onMouseLeave={(e) => {
                if (document.activeElement !== e.currentTarget) setHovered(null);
              }}
              onFocus={() => setHovered(d.id)}
              onBlur={() => setHovered(null)}
              onClick={() => setHovered(d.id)}
            >
              <SynergyPortrait id={d.id} name={d.name} />
              <span className="trait-member-name">{d.name}</span>
              <span className="trait-presence-mark" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <div className="trait-member-readout" aria-live="polite">
        {selected && info ? (
          <>
            <strong>{selected.name}</strong>
            <span>
              Coste {selected.cost} · {info.roleLabel}
            </span>
            <span>
              {info.damageLabel} · {labels[presence(selected.id)]}
            </span>
          </>
        ) : (
          <small>Verde: desplegado · Oro: banquillo · Atenuado: sin poseer</small>
        )}
      </div>
    </section>
  );
}
