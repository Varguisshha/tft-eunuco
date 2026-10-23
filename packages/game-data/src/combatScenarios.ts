import { CombatInputSchema, type CombatInput } from '@tft/shared';
import { createCombatInput, CURRENT_COMBAT_PROFILES } from './combat';
/** Synthetic, legal profiles for the internal Arena only. Never used by local opponents. */
export type CombatScenario = 'overtime' | 'timeout' | 'mutual';
export function createCombatScenario(scenario: CombatScenario, seed: number): CombatInput {
  const input = createCombatInput(
    {
      units: [
        { id: 'fixture-south', definitionId: 'test-k01', owner: 'south', position: { q: 0, r: 4 } },
        { id: 'fixture-north', definitionId: 'test-k01', owner: 'north', position: { q: 0, r: 3 } },
      ],
    },
    seed,
  );
  for (const unit of input.units) {
    unit.profile = structuredClone(unit.profile);
    unit.profile.ability = null;
    unit.profile.passive = null;
    Object.assign(unit.profile.stats, {
      armor: 0,
      magicResist: 0,
      attackSpeedMilli: 1000,
      attackWindupTicks: 2,
    });
    if (scenario === 'mutual') Object.assign(unit.profile.stats, { maxHp: 10, attack: 100 });
    else if (scenario === 'timeout')
      Object.assign(unit.profile.stats, { maxHp: 100000, attack: 1 });
    else
      Object.assign(
        unit.profile.stats,
        unit.owner === 'south' ? { maxHp: 100000, attack: 100 } : { maxHp: 4000, attack: 0 },
      );
  }
  return CombatInputSchema.parse(input);
}

export type AbilityScenario =
  | 'ability-1'
  | 'ability-2'
  | 'ability-3'
  | 'traits-2'
  | 'traits-3'
  | 'passive-overtime'
  | 'hortaleza-2'
  | 'hortaleza-3'
  | 'padel-1'
  | 'padel-2'
  | 'padel-3';
/** Diagnostic memberships never enter matchCatalog or the shop pool. */
export function createAbilityScenario(scenario: AbilityScenario, seed: number): CombatInput {
  const isolatedTrait = scenario.startsWith('hortaleza-') || scenario.startsWith('padel-');
  const count =
    scenario === 'traits-3' || (isolatedTrait && scenario.endsWith('-3'))
      ? 3
      : scenario === 'traits-2' || (isolatedTrait && scenario.endsWith('-2'))
        ? 2
        : 1;
  const units: CombatInput['units'] = [];
  const stars = scenario === 'ability-3' ? 3 : scenario === 'ability-2' ? 2 : 1;
  const scale = [1000, 1800, 3240][stars - 1]!;
  for (let i = 0; i < count; i++) {
    const definitionId = i === 0 ? 'dolea' : i === 1 ? 'test-k01' : 'test-v02';
    const profile = structuredClone(CURRENT_COMBAT_PROFILES[definitionId]!);
    profile.traits = isolatedTrait
      ? [scenario.startsWith('hortaleza-') ? 'hortaleza' : 'llama-de-padel']
      : ['hortaleza', 'llama-de-padel'];
    if (isolatedTrait && i > 0) {
      profile.stats.attack = 0;
      profile.ability = null;
      profile.passive = null;
    }
    if (i === 0) {
      profile.stats.maxHp = Math.floor((profile.stats.maxHp * scale) / 1000);
      profile.stats.attack = Math.floor((profile.stats.attack * scale) / 1000);
      for (const effect of profile.championAbility!.active!.effects)
        if ('amount' in effect && 'starScaling' in effect && effect.starScaling === 'stat')
          effect.amount = Math.floor((effect.amount * scale) / 1000);
    }
    units.push({
      id: i === 0 ? 'diagnostic-dolea' : `diagnostic-member-${i}`,
      definitionId,
      owner: 'south',
      position: { q: i, r: 4 },
      profile,
    });
  }
  const enemy = structuredClone(CURRENT_COMBAT_PROFILES['test-v02']!);
  enemy.ability = null;
  enemy.passive = null;
  Object.assign(enemy.stats, {
    maxHp: 20000,
    attack: stars === 1 ? 60 : 100,
    range: 14,
    attackSpeedMilli: 1000,
    armor: 0,
  });
  if (scenario === 'passive-overtime') {
    Object.assign(units[0]!.profile.stats, { armor: 0, attack: 0 });
    Object.assign(enemy.stats, { attack: 220, attackSpeedMilli: 32 });
  }
  if (isolatedTrait) enemy.stats.attack = 0;
  units.push({
    id: 'diagnostic-rival',
    definitionId: 'test-v02',
    owner: 'north',
    position: { q: 0, r: 3 },
    profile: enemy,
  });
  const base = createCombatInput({ units: [] }, seed);
  return CombatInputSchema.parse({ ...base, units });
}
