import { analyzeTraits } from '@tft/game-core';
import { characterRecord, getTraitDefinition, traitsFor } from '@tft/game-data';
import { ContentIcon } from './hud/ContentIcon';
import type { TraitContributor } from '@tft/game-core';
export function AffinityDetails({
  ids,
  contributors,
  catalog = 'f0p10a-1',
}: {
  ids: readonly string[];
  catalog?: string;
  contributors: readonly TraitContributor[];
}) {
  const rows = analyzeTraits(contributors, traitsFor(catalog));
  return (
    <section className="affinity-details" aria-label="Lista completa de afinidades">
      {ids.length === 0 && <p>Sin afiliaciones competitivas en esta versión.</p>}
      {ids.map((id) => {
        const trait = getTraitDefinition(id, catalog)!;
        const row = rows.find((r) => r.trait.id === id)!;
        return (
          <details key={id} data-kind={trait.planning?.kind}>
            <summary>
              <ContentIcon id={trait.icon} />
              <span>
                {trait.name}
                <small>
                  {trait.planning?.kind === 'unique' ? 'Atributo único' : 'Colectiva'} · {row.count}
                  /{row.nextThreshold ?? trait.thresholds.at(-1)!.count}
                </small>
              </span>
            </summary>
            <p>{trait.description}</p>
            <p>
              Umbral alcanzado: {row.progressionThresholds.at(-1)?.count ?? 'ninguno'} · Siguiente:{' '}
              {row.nextThreshold ?? 'completo'}.
            </p>
            <p>
              {trait.planning?.effectState === 'pending_effects'
                ? 'Efectos pendientes. No concede bonificaciones.'
                : 'Las recompensas implementadas se indican por escalón.'}
            </p>
            <ul>
              {trait.thresholds.map((t) => (
                <li key={t.count}>
                  <b>{t.count}</b> ·{' '}
                  {t.effectState === 'pending_effects' ? 'Efecto pendiente' : 'Efecto implementado'}
                  : {t.description}
                  {t.reservation && <small>{t.reservation}</small>}
                </li>
              ))}
            </ul>
            <p>
              Miembros:{' '}
              {trait.planning?.members
                .map((member) => characterRecord(member)?.name ?? member)
                .join(' · ') || 'Sin asignaciones en el Excel'}
              .
            </p>
          </details>
        );
      })}
    </section>
  );
}
