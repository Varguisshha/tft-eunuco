import { FLORIN_TUNING } from './florin';
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
export const CATALOG_F0P41: readonly UnitDefinition[] = [
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
export const VARGAS_ROSTER: readonly UnitDefinition[] = [
  ...CHARACTER_ROSTER,
  {
    id: 'vargas',
    name: 'VARGAS',
    role: 'assassin',
    cost: 3,
    synergies: ['upm', 'el-depredador'],
    activeAbilityId: 'copita-perhaps',
    passiveAbilityId: 'copita-perhaps',
    spriteId: 'vargas',
  },
];
export const JARAMILLO_ROSTER: readonly UnitDefinition[] = [
  ...VARGAS_ROSTER,
  {
    id: 'jaramillo',
    name: 'JARAMILLO',
    role: 'ranger',
    cost: 2,
    synergies: ['hortaleza', 'fumon'],
    activeAbilityId: 'cortina-de-humo',
    passiveAbilityId: 'cortina-de-humo',
    spriteId: 'jaramillo',
  },
];
export const FLORIN_ROSTER: readonly UnitDefinition[] = [
  ...JARAMILLO_ROSTER,
  {
    id: 'florin',
    name: 'FLORIN',
    role: 'striker',
    cost: FLORIN_TUNING.cost,
    synergies: ['ruman_trinity', 'perdidos_por_el_mundo', 'mano_de_obra'],
    activeAbilityId: 'pisoton-carmesi',
    passiveAbilityId: 'suela-reforzada',
    spriteId: 'florin',
  },
];
