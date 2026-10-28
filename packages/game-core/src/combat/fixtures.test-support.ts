import {
  COMBAT_PROTOCOL,
  COMBAT_RULES,
  CombatInputSchema,
  type CombatAbility,
  type CombatStats,
  type CombatInput,
  type HexCoord,
  type Side,
} from '@tft/shared';
export function spec(
  id: string,
  owner: Side,
  position: HexCoord,
  stats: Partial<CombatStats> = {},
  ability: CombatAbility | null = null,
): CombatInput['units'][number] {
  return {
    id,
    definitionId: 'test-k01',
    owner,
    position,
    profile: {
      stats: {
        maxHp: 1000,
        attack: 40,
        armor: 0,
        magicResist: 0,
        attackSpeedMilli: 1000,
        range: 1,
        maxMana: 50,
        startingMana: 0,
        moveTicks: 3,
        attackWindupTicks: 2,
        ...stats,
      },
      ability,
      passive: null,
    },
  };
}
export function input(
  units: CombatInput['units'],
  options: Partial<Omit<CombatInput, 'units'>> = {},
): CombatInput {
  return CombatInputSchema.parse({
    protocolVersion: COMBAT_PROTOCOL,
    rulesVersion: COMBAT_RULES,
    seed: 42,
    maxTicks: 80,
    obstacles: [],
    units,
    ...options,
  });
}
export const duel = () => [spec('a', 'south', { q: 0, r: 4 }), spec('b', 'north', { q: 0, r: 3 })];
