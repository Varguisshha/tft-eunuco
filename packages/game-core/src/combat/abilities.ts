import type { CombatProfile, CombatUnit, AbilityCondition } from '@tft/shared';
import { hexDistance } from '../hex';
import { effectiveStat, isAlive, isStunned } from './math';
export function activeAbility(profile: CombatProfile) {
  const main = profile.championAbility;
  if (main) return main.active ? { ...main.active, id: main.id, name: main.name } : null;
  return profile.ability
    ? {
        ...profile.ability,
        targeting: 'current_enemy' as const,
        conditions: [] as AbilityCondition[],
      }
    : null;
}
export function abilityConditions(
  unit: CombatUnit,
  units: readonly CombatUnit[],
  conditions: readonly AbilityCondition[],
) {
  return conditions.every((condition) => {
    switch (condition.kind) {
      case 'stack_count':
        return (
          (unit.mechanics?.stacks.find((s) => s.definitionId === condition.stackId)?.count ?? 0) >=
          condition.minimum
        );
      case 'hp_below':
        return unit.hp * 1000 < effectiveStat(unit, 'maxHp') * condition.ratioMilli;
      case 'not_stunned':
        return !isStunned(unit);
      case 'enemies_nearby':
        return (
          units.filter(
            (u) =>
              isAlive(u) &&
              u.owner !== unit.owner &&
              hexDistance(u.position, unit.position) <= condition.radius,
          ).length >= condition.minimum
        );
    }
  });
}
