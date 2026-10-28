import { P11_ROSTER, CHARACTER_REGISTRY, ROSTER_SOURCE } from '@tft/game-data';
import { AffinityBand } from '../match/AffinityBand';
/** Presentation only: drafts have no spawn or combat action. Removed from public builds. */
export function RosterGallery({ modern = false }: { modern?: boolean }) {
  return (
    <details className="roster-gallery">
      <summary>Galería {modern ? 'P11A' : 'P10A'} · 34 personajes</summary>
      <p>
        {modern ? '34 jugables · 30 provisionales' : '4 jugables · 30 borradores'} ·{' '}
        {ROSTER_SOURCE.issues.length} errores de asignación. Excel: {ROSTER_SOURCE.version}.
      </p>
      {CHARACTER_REGISTRY.map((c) => (
        <article key={c.id} data-roster-id={c.id}>
          <h3>
            {c.name} · {c.synergies.length} afinidades
          </h3>
          <p>
            {modern && P11_ROSTER.find((u) => u.id === c.id)?.provisional
              ? 'Jugable provisional · coste y estadísticas temporales · solo ataques básicos, sin activa ni pasiva personal.'
              : c.status === 'draft'
                ? 'Borrador · coste, rol, alcance, estadísticas, habilidad y pasiva pendientes. Sin sprite ni splash art. Fuera del pool y del combate.'
                : 'Jugable · mecánicas existentes conservadas.'}
          </p>
          <AffinityBand ids={c.synergies} catalog={modern ? 'f0p11a-1' : 'f0p10a-1'} />
        </article>
      ))}
    </details>
  );
}
