import type { MatchState, OwnedUnit, EconomyConfig } from '@tft/shared';
import { scaledProfile } from './selectors';
/** Definitions own their limits; owned instances only persist earned counts and idempotency. */
export function progressDefinition(unit: OwnedUnit, config: EconomyConfig) {
  return scaledProfile(unit.definitionId, unit.stars, config).championAbility?.passive
    ?.matchProgress;
}
export function mergeUnitProgress(survivor: OwnedUnit, copies: OwnedUnit[], config: EconomyConfig) {
  const definition = progressDefinition(survivor, config);
  if (!definition) return;
  const entries = copies.flatMap(
    (u) => u.progress?.stacks.filter((s) => s.id === definition.id) ?? [],
  );
  if (!entries.length) return;
  survivor.progress = {
    version: 1,
    stacks: [
      {
        id: definition.id,
        count: Math.min(definition.maximum, Math.max(...entries.map((s) => s.count))),
        lastRound: Math.max(...entries.map((s) => s.lastRound)),
      },
    ],
  };
}
/** Called only by round settlement, with the authority's competitive/ghost decision. */
export function awardRoundProgress(state: MatchState, eligible = true) {
  if (!eligible || state.development || state.combat?.result?.winner !== 'south') return;
  const participants = new Set(
    state.combat.input.units.filter((u) => u.owner === 'south').map((u) => u.id),
  );
  for (const unit of state.units) {
    if (!participants.has(unit.id)) continue;
    const definition = progressDefinition(unit, state.config);
    if (!definition) continue;
    const entry = unit.progress?.stacks.find((s) => s.id === definition.id);
    if (entry && entry.lastRound >= state.round) continue;
    unit.progress = {
      version: 1,
      stacks: [
        {
          id: definition.id,
          count: Math.min(definition.maximum, (entry?.count ?? 0) + 1),
          lastRound: state.round,
        },
      ],
    };
  }
}
export function clearMatchProgress(state: MatchState) {
  for (const unit of state.units) delete unit.progress;
}
