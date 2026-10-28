import { isP11ItemCatalog } from '@tft/shared';
import { isP11Catalog } from '@tft/shared';
import { TFT185_EXECUTION_POLICY, matchCatalog, resolveItemCatalog } from '@tft/game-data';
import type { ItemModifierBonus } from '@tft/shared';
import { combatStatsView } from '../combat/stats';
import { DEFAULT_OVERTIME } from '@tft/shared';
import { traitsFor } from '@tft/game-data';
import { analyzeTraits, prepareTraitProfiles } from '../combat/traits';
import type {
  MatchState,
  OwnedUnit,
  UnitLocation,
  EconomyConfig,
  CombatProfile,
  PlayerItemState,
} from '@tft/shared';
import {
  COMBAT_PROFILES,
  CURRENT_COMBAT_PROFILES,
  ADVANCED_COMBAT_PROFILES,
  VARGAS_COMBAT_PROFILES,
  JARAMILLO_COMBAT_PROFILES,
  FLORIN_COMBAT_PROFILES,
  P11_COMBAT_PROFILES,
  ROSTER_COMBAT_PROFILES,
  hasTraits,
  combatRulesFor,
  getUnitDefinition,
} from '@tft/game-data';
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
  const source = (
    isP11Catalog(config.catalog)
      ? P11_COMBAT_PROFILES
      : config.catalog === 'f0p10a-1'
        ? ROSTER_COMBAT_PROFILES
        : config.catalog === 'florin-1' || config.catalog === 'f0p8d-florin-1'
          ? FLORIN_COMBAT_PROFILES
          : config.catalog === 'f0p6c'
            ? JARAMILLO_COMBAT_PROFILES
            : config.catalog === 'f0p6b3'
              ? VARGAS_COMBAT_PROFILES
              : config.catalog === 'f0p6b1' || config.catalog === 'f0p6b2'
                ? ADVANCED_COMBAT_PROFILES
                : config.catalog === 'f0p6a'
                  ? CURRENT_COMBAT_PROFILES
                  : COMBAT_PROFILES
  )[definitionId];
  if (!source) throw new Error('Unknown combat profile');
  const profile = JSON.parse(JSON.stringify(source)) as CombatProfile;
  if (
    config.catalog === 'f0p6b1' ||
    config.catalog === 'f0p6b2' ||
    config.catalog === 'f0p6b3' ||
    config.catalog === 'f0p6c' ||
    config.catalog === 'florin-1' ||
    config.catalog === 'f0p8d-florin-1' ||
    config.catalog === 'f0p10a-1' ||
    isP11Catalog(config.catalog)
  )
    profile.starLevel = stars;
  const scale = config.statScaleMilli[stars - 1]!;
  const amount = (n: number) => Math.min(1_000_000, Math.floor((n * scale) / 1000));
  profile.stats.maxHp = amount(profile.stats.maxHp);
  profile.stats.attack = amount(profile.stats.attack);
  for (const ability of [profile.ability, profile.passive])
    for (const effect of ability?.effects ?? [])
      if (effect.kind === 'damage' || effect.kind === 'heal' || effect.kind === 'shield')
        effect.amount = amount(effect.amount);
  const principal = profile.championAbility;
  for (const effect of [
    ...(principal?.active?.effects ?? []),
    ...(principal?.passive?.rules.flatMap((r) => r.effects) ?? []),
  ])
    if ('amount' in effect && 'starScaling' in effect && effect.starScaling === 'stat')
      effect.amount = amount(effect.amount);
  return profile;
}

/** Same core computation feeds preparation HUD and combat initialization. */
export function matchTraits(state: MatchState) {
  return analyzeTraits(
    state.units.map((u) => ({
      definitionId: u.definitionId,
      deployed: u.location.kind === 'board',
      traits: scaledProfile(u.definitionId, u.stars, state.config).traits ?? [],
    })),
    hasTraits(state.config.catalog) ? traitsFor(state.config.catalog) : [],
  );
}
export function formationProfiles(state: MatchState) {
  const units = state.units.flatMap((u) =>
    u.location.kind === 'board'
      ? [
          {
            id: u.id,
            definitionId: u.definitionId,
            owner: 'south' as const,
            position: u.location.hex,
            profile: scaledOwnedProfile(u, state.config, state.items, state.round, state.seed),
          },
        ]
      : [],
  );
  const prepared = prepareTraitProfiles({
    protocolVersion: 3,
    rulesVersion: combatRulesFor(state.config.catalog),
    seed: 0,
    maxTicks: 450,
    overtime: DEFAULT_OVERTIME,
    obstacles: [],
    units,
    ...(hasTraits(state.config.catalog) ? { traits: [...traitsFor(state.config.catalog)] } : {}),
  });
  if (
    state.config.catalog !== 'f0p6b1' &&
    state.config.catalog !== 'f0p6b2' &&
    state.config.catalog !== 'f0p6b3' &&
    state.config.catalog !== 'f0p6c' &&
    state.config.catalog !== 'florin-1' &&
    state.config.catalog !== 'f0p8d-florin-1' &&
    state.config.catalog !== 'f0p10a-1' &&
    !isP11Catalog(state.config.catalog)
  )
    return prepared.units;
  return prepared.units.map((unit) => ({
    ...unit,
    profile: {
      ...unit.profile,
      stats: {
        ...unit.profile.stats,
        ...combatStatsView({
          profile: unit.profile,
          statuses: prepared.modifiers.filter((m) => m.unitId === unit.id).map((m) => m.status),
        }),
      },
    },
  }));
}

/** Permanent unit bonuses are applied once, after general star scaling. */
export function scaledOwnedProfile(
  unit: OwnedUnit,
  config: EconomyConfig,
  inventory?: PlayerItemState,
  round = 1,
  seed = 0,
): CombatProfile {
  const profile = scaledProfile(unit.definitionId, unit.stars, config);
  if (isP11ItemCatalog(config.catalog)) {
    const role = matchCatalog(config).find((d) => d.id === unit.definitionId)!.role;
    profile.itemRole =
      TFT185_EXECUTION_POLICY.originalRoles[
        unit.definitionId as keyof typeof TFT185_EXECUTION_POLICY.originalRoles
      ] ?? TFT185_EXECUTION_POLICY.provisionalRoles[role];
  }
  const definition = profile.championAbility?.passive?.matchProgress;
  if (definition) {
    const count = Math.min(
      definition.maximum,
      unit.progress?.stacks.find((s) => s.id === definition.id)?.count ?? 0,
    );
    profile.stats.attack = Math.floor(
      (profile.stats.attack * (1000 + count * definition.adPercentMilli)) / 1000,
    );
  }
  if (inventory && unit.equipment?.length) {
    const catalog = resolveItemCatalog(inventory.catalogVersion);
    if (['f0p8c-1', 'f0p8d-1', 'f0p11b-18.5-1', 'f0p11h-18.5-1'].includes(catalog.version))
      profile.itemLoadout = {
        version:
          catalog.version === 'f0p11h-18.5-1'
            ? 'f0p11h-18.5-1'
            : catalog.version === 'f0p11b-18.5-1'
              ? 'f0p11b-18.5-1'
              : 'f0p8c-1',
        round,
        seed,
        instances: unit.equipment.map((i) => ({ instanceId: i.id, definitionId: i.definitionId })),
      };
    const modifiers = unit.equipment.flatMap((item) => {
      if (item.ownerId !== inventory.ownerId) throw Error('Invalid item owner');
      const d = catalog.definitions.find((d) => d.id === item.definitionId);
      if (!d || d.availability !== 'available') throw Error('Unknown or unavailable equipped item');
      const initialMana = d.bonuses
        .filter((b) => b.stat === 'startingMana')
        .reduce((sum, b) => sum + b.amount, 0);
      profile.stats.startingMana = Math.min(
        profile.stats.maxMana,
        profile.stats.startingMana + initialMana,
      );
      if (profile.championAbility?.active)
        profile.championAbility.active.initialMana = profile.stats.startingMana;
      return d.bonuses
        .filter((b): b is ItemModifierBonus => b.stat !== 'startingMana')
        .map((b, index) => ({ ...b, id: `${item.id}:${index}`, sourceId: item.id }));
    });
    if (modifiers.length) profile.initialItemModifiers = modifiers;
  }
  return profile;
}

/** Effective equipment preview for a benched owned unit, without deployed synergies. */
export function equippedStatsPreview(profile: CombatProfile) {
  return combatStatsView({
    profile,
    statuses: (profile.initialItemModifiers ?? []).map((m) => ({
      ...m,
      kind: 'modifier' as const,
      origin: 'item' as const,
      expiresTick: null,
    })),
  });
}
