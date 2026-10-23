import type { UnitDefinition } from '@tft/shared';
export const UNIT_DEFINITIONS = [
  {
    id: 'test-k01',
    name: 'K-01',
    role: 'vanguard',
    cost: 1,
    synergies: ['test-alloy'],
    activeAbilityId: 'test-bastion',
    passiveAbilityId: 'test-plating',
    spriteId: 'placeholder-vanguard',
  },
  {
    id: 'test-v02',
    name: 'V-02',
    role: 'striker',
    cost: 2,
    synergies: ['test-pulse'],
    activeAbilityId: 'test-overdrive',
    passiveAbilityId: null,
    spriteId: 'placeholder-striker',
  },
  {
    id: 'test-r03',
    name: 'R-03',
    role: 'ranger',
    cost: 2,
    synergies: ['test-alloy', 'test-pulse'],
    activeAbilityId: 'test-volley',
    passiveAbilityId: null,
    spriteId: 'placeholder-ranger',
  },
  {
    id: 'test-m04',
    name: 'M-04',
    role: 'support',
    cost: 3,
    synergies: ['test-pulse'],
    activeAbilityId: 'test-pulse',
    passiveAbilityId: null,
    spriteId: 'placeholder-support',
  },
] as const satisfies readonly UnitDefinition[];
/** Frozen four-unit catalog for historical saves and the original Arena demo. */
const CATALOG_F0P41: readonly UnitDefinition[] = [
  ...UNIT_DEFINITIONS,
  {
    id: 'dolea',
    name: 'DOLEA',
    role: 'vanguard',
    cost: 2,
    synergies: ['prototype-neutral'],
    activeAbilityId: 'test-bastion',
    passiveAbilityId: 'test-plating',
    spriteId: 'dolea',
  },
];
export const CHARACTER_ROSTER: readonly UnitDefinition[] = CATALOG_F0P41.map((d) =>
  d.id === 'dolea'
    ? {
        ...d,
        synergies: ['hortaleza', 'llama-de-padel'],
        activeAbilityId: 'volumen-sucio',
        passiveAbilityId: 'volumen-sucio',
      }
    : d,
);
export function matchCatalog(config: {
  catalog?: 'f0p4.1' | 'f0p6a' | 'f0p6b1' | undefined;
}): readonly UnitDefinition[] {
  if (config.catalog === 'f0p6a' || config.catalog === 'f0p6b1') return CHARACTER_ROSTER;
  return config.catalog === 'f0p4.1' ? CATALOG_F0P41 : UNIT_DEFINITIONS;
}
export function getUnitDefinition(id: string): UnitDefinition | undefined {
  return CHARACTER_ROSTER.find((unit) => unit.id === id);
}
export * from './combat';
export * from './economy';

export * from './combatScenarios';

export * from './abilities';
export * from './statsScenarios';
