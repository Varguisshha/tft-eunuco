import { CombatInputSchema, type CombatInput } from '@tft/shared';
import { createCombatInput } from './combat';
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
