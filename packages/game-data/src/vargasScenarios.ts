import { CombatInputSchema, CHARACTER_RULES, type CombatInput } from '@tft/shared';
import { VARGAS_COMBAT_PROFILES } from './combat';
import { VARGAS_TRAITS } from './abilities';
import { createMechanicsScenario } from './mechanicsScenarios';
export const VARGAS_SCENARIOS = [
  'vargas-1',
  'vargas-2',
  'vargas-3',
  'upm-2',
  'upm-4',
  'upm-6',
  'depredador-10',
] as const;
export type VargasScenario = (typeof VARGAS_SCENARIOS)[number];
/** Synthetic diagnostics only. No fictional members are inserted in the playable roster. */
export function createVargasScenario(name: VargasScenario, seed: number): CombatInput {
  if (name.startsWith('upm-')) {
    const input = createMechanicsScenario(
      name.replace('upm', 'progress') as 'progress-2' | 'progress-4' | 'progress-6',
      seed,
    );
    input.rulesVersion = CHARACTER_RULES;
    input.combatId = `b3-${name}-${seed}`;
    input.traits = structuredClone(VARGAS_TRAITS);
    for (const unit of input.units) if (unit.owner === 'south') unit.profile.traits = ['upm'];
    return CombatInputSchema.parse(input);
  }
  const input = createMechanicsScenario('stack-cycle', seed);
  input.rulesVersion = CHARACTER_RULES;
  input.combatId = `b3-${name}-${seed}`;
  input.traits = structuredClone(VARGAS_TRAITS);
  const source = input.units[0]!,
    target = input.units[1]!;
  source.id = 'diagnostic-vargas';
  source.definitionId = 'vargas';
  source.profile = structuredClone(VARGAS_COMBAT_PROFILES.vargas!);
  source.position = { q: 0, r: 4 };
  target.position = { q: 0, r: 3 };
  target.profile.stats.range = 1;
  const stars = name === 'vargas-2' ? 2 : name === 'vargas-3' ? 3 : 1;
  source.profile.starLevel = stars;
  const scale = [1000, 1800, 3240][stars - 1]!;
  source.profile.stats.maxHp = Math.floor((source.profile.stats.maxHp * scale) / 1000);
  source.profile.stats.attack = Math.floor((source.profile.stats.attack * scale) / 1000);
  target.profile.stats.maxHp = 20000;
  target.profile.stats.attack = 10;
  target.profile.stats.armor = 0;
  if (name === 'depredador-10') {
    const cells = [
      { q: 0, r: 3 },
      { q: 2, r: 3 },
      { q: 3, r: 2 },
      { q: 4, r: 1 },
      { q: 5, r: 0 },
      { q: 1, r: 1 },
      { q: 0, r: 1 },
      { q: -1, r: 2 },
      { q: -1, r: 3 },
      { q: 3, r: 0 },
    ];
    input.units = [
      source,
      ...cells.map((position, i) => ({
        ...structuredClone(target),
        id: `prey-${i}`,
        definitionId: 'test-v02',
        position,
        profile: {
          ...structuredClone(target.profile),
          stats: {
            ...target.profile.stats,
            maxHp: i === 9 ? 4000 : 1,
            attack: i === 9 ? 10 : 0,
            attackSpeedMilli: 800,
          },
        },
      })),
    ];
  }
  return CombatInputSchema.parse(input);
}
