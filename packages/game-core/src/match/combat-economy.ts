import type { MatchCommand, MatchState } from '@tft/shared';
/** Narrow versioned capability. Combat input remains frozen, including a historical ghost copy. */
export function canUseCombatEconomy(
  state: Pick<MatchState, 'config' | 'phase' | 'units' | 'combat'>,
  action: MatchCommand,
): boolean {
  if (
    !['f0p11c-1', 'f0p11g-1', 'f0p11h-1'].includes(state.config.catalog ?? '') ||
    state.phase !== 'combat'
  )
    return false;
  if (action.type === 'lock_shop') return true;
  if (state.config.catalog === 'f0p11h-1' && action.type === 'buy_unit') return true;
  if (state.config.combatItemPolicy && action.type === 'combine_components') return true;
  if (state.config.combatItemPolicy && action.type === 'equip_item') {
    const u = state.units.find((u) => u.id === action.unitId);
    return u?.location.kind === 'bench' && !state.combat?.input.units.some((x) => x.id === u.id);
  }
  if (action.type === 'remove_unit_items') {
    const u = state.units.find((u) => u.id === action.unitId);
    return (
      !!state.config.removerPolicy?.benchDuringCombat &&
      u?.location.kind === 'bench' &&
      !state.combat?.input.units.some((x) => x.id === u.id)
    );
  }
  if (action.type !== 'sell_unit') return false;
  const u = state.units.find((u) => u.id === action.unitId);
  return u?.location.kind === 'bench' && !state.combat?.input.units.some((x) => x.id === u.id);
}
