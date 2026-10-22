import type {
  MatchState,
  OwnedUnit,
  UnitLocation,
  EconomyConfig,
  CombatProfile,
} from '@tft/shared';
import { COMBAT_PROFILES, getUnitDefinition } from '@tft/game-data';
import { sameHex } from '../hex';
export const definition = (id: string) => {
  const d = getUnitDefinition(id);
  if (!d) throw new Error(`Unknown definition: ${id}`);
  return d;
};
export const copiesOf = (unit: OwnedUnit, config: EconomyConfig) =>
  config.starCopies[unit.stars - 1]!;
export const sellValue = (unit: OwnedUnit, config: EconomyConfig) =>
  definition(unit.definitionId).cost * config.sellCopyMultipliers[unit.stars - 1]!;
export const deployedCount = (state: MatchState) =>
  state.units.filter((u) => u.location.kind === 'board').length;
export const interestFor = (gold: number, config: EconomyConfig) =>
  Math.min(config.interestCap, Math.floor(gold / config.interestDivisor));
export const levelRule = (state: MatchState) =>
  state.config.levels.find((l) => l.level === state.level)!;
export const sameLocation = (a: UnitLocation, b: UnitLocation) =>
  a.kind === 'bench' && b.kind === 'bench'
    ? a.slot === b.slot
    : a.kind === 'board' && b.kind === 'board'
      ? sameHex(a.hex, b.hex)
      : false;
export function scaledProfile(
  definitionId: string,
  stars: OwnedUnit['stars'],
  config: EconomyConfig,
): CombatProfile {
  const source = COMBAT_PROFILES[definitionId];
  if (!source) throw new Error('Unknown combat profile');
  const profile = JSON.parse(JSON.stringify(source)) as CombatProfile;
  const scale = config.statScaleMilli[stars - 1]!;
  const amount = (n: number) => Math.min(1_000_000, Math.floor((n * scale) / 1000));
  profile.stats.maxHp = amount(profile.stats.maxHp);
  profile.stats.attack = amount(profile.stats.attack);
  for (const ability of [profile.ability, profile.passive])
    for (const effect of ability?.effects ?? [])
      if (effect.kind === 'damage' || effect.kind === 'heal' || effect.kind === 'shield')
        effect.amount = amount(effect.amount);
  return profile;
}
