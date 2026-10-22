import type { UnitDefinition } from '@tft/shared';
export const UNIT_DEFINITIONS = [
  {
    id: 'test-k01',
    name: 'K-01',
    role: 'vanguard',
    cost: 1,
    synergies: ['test-alloy'],
    activeAbilityId: null,
    passiveAbilityId: null,
    spriteId: 'placeholder-vanguard',
  },
  {
    id: 'test-v02',
    name: 'V-02',
    role: 'striker',
    cost: 2,
    synergies: ['test-pulse'],
    activeAbilityId: null,
    passiveAbilityId: null,
    spriteId: 'placeholder-striker',
  },
  {
    id: 'test-r03',
    name: 'R-03',
    role: 'ranger',
    cost: 2,
    synergies: ['test-alloy', 'test-pulse'],
    activeAbilityId: null,
    passiveAbilityId: null,
    spriteId: 'placeholder-ranger',
  },
  {
    id: 'test-m04',
    name: 'M-04',
    role: 'support',
    cost: 3,
    synergies: ['test-pulse'],
    activeAbilityId: null,
    passiveAbilityId: null,
    spriteId: 'placeholder-support',
  },
] as const satisfies readonly UnitDefinition[];
export function getUnitDefinition(id: string): UnitDefinition | undefined {
  return UNIT_DEFINITIONS.find((unit) => unit.id === id);
}
