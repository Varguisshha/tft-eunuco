import {
  ADVANCED_COMBAT_RULES,
  MECHANICS_RULES,
  CHARACTER_RULES,
  COMPOSITE_RULES,
  isFlorinRules,
  type CombatStatus,
  type CombatInput,
  type CombatEffect,
  type TraitDefinition,
  type Side,
} from '@tft/shared';
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
    const implemented = reached.filter((t) => t.effectState !== 'pending_effects');
    const thresholds = trait.stacking === 'highest' ? implemented.slice(-1) : implemented;
    const progressionThresholds = trait.stacking === 'highest' ? reached.slice(-1) : reached;
    return {
      trait,
      count: contributors.length,
      contributors,
      active: trait.planning?.effectState !== 'pending_effects' && thresholds.length > 0,
      progressionThresholds,
      reached: reached.length > 0,
      thresholds,
      level: reached.length,
      nextThreshold: trait.thresholds.find((t) => t.count > contributors.length)?.count ?? null,
    };
  });
}
/** Apply to a fresh clone only. Input/base profiles remain untouched across rounds. */
export function prepareTraitProfiles(input: CombatInput) {
  const units = structuredClone(input.units);
  const modifiers: { unitId: string; status: CombatStatus }[] = units.flatMap((unit) =>
    (unit.profile.initialItemModifiers ?? []).map((m) => ({
      unitId: unit.id,
      status: { ...m, kind: 'modifier' as const, origin: 'item' as const, expiresTick: null },
    })),
  );
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
            if (
              input.rulesVersion === ADVANCED_COMBAT_RULES ||
              input.rulesVersion === MECHANICS_RULES ||
              input.rulesVersion === CHARACTER_RULES ||
              input.rulesVersion === COMPOSITE_RULES ||
              isFlorinRules(input.rulesVersion)
            ) {
              modifiers.push({
                unitId: unit.id,
                status: {
                  id: `trait-${modifiers.length}`,
                  sourceId: result.trait.id,
                  kind: 'modifier',
                  stat: bonus.stat,
                  mode: bonus.mode,
                  origin: 'trait',
                  amount: bonus.amount,
                  expiresTick: null,
                },
              });
              continue;
            }
            // Percentages use the unmodified, star-scaled input, never a previous trait's result.
            const base = input.units.find((u) => u.id === unit.id)!.profile.stats[bonus.stat] ?? 0;
            const delta =
              bonus.mode === 'flat' ? bonus.amount : Math.floor((base * bonus.amount) / 1000);
            const cap = bonus.stat === 'attackSpeedMilli' ? 5000 : 1_000_000;
            unit.profile.stats[bonus.stat] = Math.min(
              cap,
              (unit.profile.stats[bonus.stat] ?? 0) + delta,
            );
          }
          for (const effect of threshold.effects) effects.push({ unitId: unit.id, effect });
        }
    }
  }
  return { units, activations, effects, modifiers };
}
