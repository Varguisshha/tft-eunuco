import { HORTALEZA_CONTRIBUTIONS, getUnitDefinition } from '@tft/game-data';
import type { TraitDefinition } from '@tft/shared';
/** Display once, independently from the five multiplier tiers. */
export function NeighborhoodContributions({ trait }: { trait: TraitDefinition }) {
  if (trait.id !== 'hortaleza' || trait.recipients !== 'team') return null;
  return (
    <section className="neighborhood-contributions" aria-label="Aportaciones de Hortaleza">
      <h4>Aportación de cada vecino</h4>
      <dl>
        {Object.entries(HORTALEZA_CONTRIBUTIONS).map(([id, c]) => (
          <div key={id}>
            <dt>{getUnitDefinition(id)?.name ?? id}</dt>
            <dd>{c.label}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
