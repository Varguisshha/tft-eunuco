import type { CombatInput, CombatEffect, TraitDefinition, Side } from '@tft/shared';
export interface TraitContributor {
  definitionId: string;
  traits: readonly string[];
  deployed: boolean;
}
export function analyzeTraits(
  units: readonly TraitContributor[],
  definitions: readonly TraitDefinition[],
) {
  return definitions.map((trait) => {
    const contributors = [
      ...new Set(
        units.filter((u) => u.deployed && u.traits.includes(trait.id)).map((u) => u.definitionId),
      ),
    ].sort();
    const reached = trait.thresholds.filter((t) => t.count <= contributors.length);
    const thresholds = trait.stacking === 'highest' ? reached.slice(-1) : reached;
    return {
      trait,
      count: contributors.length,
      contributors,
      active: thresholds.length > 0,
      thresholds,
      level: reached.length,
      nextThreshold: trait.thresholds.find((t) => t.count > contributors.length)?.count ?? null,
    };
  });
}
/** Apply to a fresh clone only. Input/base profiles remain untouched across rounds. */
export function prepareTraitProfiles(input: CombatInput) {
  const units = structuredClone(input.units);
  const activations: {
    side: Side;
    traitId: string;
    count: number;
    threshold: number;
    unitIds: string[];
  }[] = [];
  const effects: { unitId: string; effect: CombatEffect }[] = [];
  for (const side of ['north', 'south'] as const) {
    const team = units.filter((u) => u.owner === side);
    for (const result of analyzeTraits(
      team.map((u) => ({
        definitionId: u.definitionId,
        traits: u.profile.traits ?? [],
        deployed: true,
      })),
      input.traits ?? [],
    )) {
      if (!result.active) continue;
      const recipients = team.filter(
        (u) => result.trait.recipients === 'team' || u.profile.traits?.includes(result.trait.id),
      );
      activations.push({
        side,
        traitId: result.trait.id,
        count: result.count,
        threshold: result.thresholds.at(-1)!.count,
        unitIds: recipients.map((u) => u.id).sort(),
      });
      for (const unit of recipients)
        for (const threshold of result.thresholds) {
          for (const bonus of threshold.bonuses) {
            // Percentages use the unmodified, star-scaled input, never a previous trait's result.
            const base = input.units.find((u) => u.id === unit.id)!.profile.stats[bonus.stat];
            const delta =
              bonus.mode === 'flat' ? bonus.amount : Math.floor((base * bonus.amount) / 1000);
            const cap = bonus.stat === 'attackSpeedMilli' ? 5000 : 1_000_000;
            unit.profile.stats[bonus.stat] = Math.min(cap, unit.profile.stats[bonus.stat] + delta);
          }
          for (const effect of threshold.effects) effects.push({ unitId: unit.id, effect });
        }
    }
  }
  return { units, activations, effects };
}
