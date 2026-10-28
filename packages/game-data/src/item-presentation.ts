import type { ItemDefinition, PlannedItemEffect } from '@tft/shared';
import { itemBonusDescription } from './items';
import { plannedItemEffectDescription } from './item-description';
/** A single data-derived contract for inventory, equipped items and recipe previews. */
export function itemPresentation(d: ItemDefinition) {
  const effects =
    d.kind === 'completed'
      ? d.effects.filter(
          (e): e is PlannedItemEffect =>
            e.implementation === 'executable-v1' || e.implementation === 'reserved-design-v2',
        )
      : [];
  const passive = d.content?.visibleDescription
    ? [d.content.visibleDescription]
    : effects.map((e) => {
        const text = plannedItemEffectDescription(e);
        const condition =
          e.condition?.healthAtOrBelowMilli !== undefined
            ? ` Vida al ${e.condition.healthAtOrBelowMilli / 10} % o menos.`
            : '';
        const once = e.condition?.oncePerCombat ? ' Una vez por combate.' : '';
        return `${text}${condition}${once}`;
      });
  return {
    name: d.content?.visibleName ?? d.content?.accessibleLabel ?? d.id,
    stats: itemBonusDescription(d.bonuses) || 'Sin estadísticas directas.',
    passive,
    restrictions:
      d.kind === 'completed'
        ? [
            d.stacking === 'unique' ? 'Único por personaje.' : 'Permite varias copias.',
            `Desde ${d.restrictions.minimumStars} estrellas.`,
            ...(d.content?.slotCost && d.content.slotCost > 1
              ? [`Ocupa ${d.content.slotCost} ranuras.`]
              : []),
            ...(d.restrictions.excludedDefinitions.length
              ? [`No equipable: ${d.restrictions.excludedDefinitions.join(', ')}.`]
              : []),
          ]
        : [],
    available: d.availability === 'available',
    pending:
      d.availability !== 'available'
        ? effects
            .map((e) => e.note)
            .filter(Boolean)
            .filter((v, i, a) => a.indexOf(v) === i)
        : [],
  };
}
