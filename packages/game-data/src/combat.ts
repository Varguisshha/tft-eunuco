import { DOLEA_ABILITY, TRAIT_DEFINITIONS } from './abilities';
import {
  ADVANCED_STATS_DEFAULTS,
  ADVANCED_COMBAT_RULES,
  COMBAT_RULES,
  CombatInputSchema,
  CombatProfileSchema,
  COMBAT_PROTOCOL,
  CURRENT_COMBAT_RULES,
  MAX_COMBAT_TICKS,
  type BoardState,
  type CombatInput,
  type CombatProfile,
} from '@tft/shared';
const base = {
  maxHp: 280,
  attack: 45,
  armor: 15,
  magicResist: 15,
  attackSpeedMilli: 1000,
  range: 1,
  maxMana: 50,
  startingMana: 0,
  moveTicks: 3,
  attackWindupTicks: 2,
};
const REFERENCE_PROFILES: Readonly<Record<string, CombatProfile>> = {
  'test-k01': CombatProfileSchema.parse({
    stats: {
      ...base,
      maxHp: 520,
      attack: 35,
      armor: 45,
      magicResist: 30,
      attackSpeedMilli: 750,
      moveTicks: 4,
    },
    ability: {
      id: 'test-bastion',
      name: 'Bastión de prueba',
      manaCost: 50,
      castTicks: 3,
      effects: [
        { kind: 'shield', target: 'self', radius: 0, amount: 110, duration: 40 },
        { kind: 'heal', target: 'self', radius: 0, amount: 50 },
        { kind: 'modifier', target: 'self', radius: 0, stat: 'armor', amount: 25, duration: 30 },
      ],
    },
    passive: {
      id: 'test-plating',
      trigger: 'combat_start',
      effects: [{ kind: 'shield', target: 'self', radius: 0, amount: 35, duration: 40 }],
    },
  }),
  'test-v02': CombatProfileSchema.parse({
    stats: { ...base, maxHp: 340, attack: 58, attackSpeedMilli: 1250, maxMana: 40 },
    ability: {
      id: 'test-overdrive',
      name: 'Impulso de prueba',
      manaCost: 40,
      castTicks: 3,
      effects: [
        { kind: 'damage', target: 'target', radius: 0, amount: 85, damageType: 'true' },
        { kind: 'modifier', target: 'self', radius: 0, stat: 'attack', amount: 20, duration: 25 },
      ],
    },
    passive: null,
  }),
  'test-r03': CombatProfileSchema.parse({
    stats: { ...base, maxHp: 240, attack: 42, armor: 10, range: 3, attackSpeedMilli: 1500 },
    ability: {
      id: 'test-volley',
      name: 'Descarga de prueba',
      manaCost: 50,
      castTicks: 3,
      effects: [
        { kind: 'damage', target: 'enemies', radius: 1, amount: 70, damageType: 'physical' },
        { kind: 'stun', target: 'target', radius: 0, duration: 8 },
      ],
    },
    passive: null,
  }),
  'test-m04': CombatProfileSchema.parse({
    stats: {
      ...base,
      maxHp: 260,
      attack: 30,
      armor: 5,
      magicResist: 25,
      range: 3,
      attackSpeedMilli: 850,
      maxMana: 60,
      startingMana: 35,
    },
    ability: {
      id: 'test-pulse',
      name: 'Pulso de prueba',
      manaCost: 60,
      castTicks: 5,
      effects: [
        { kind: 'damage', target: 'enemies', radius: 1, amount: 115, damageType: 'magic' },
        { kind: 'heal', target: 'allies', radius: 2, amount: 55 },
        { kind: 'stun', target: 'enemies', radius: 1, duration: 5 },
      ],
    },
    passive: null,
  }),
};
// Provisional cost-2 melee tank, reusing the existing technical ability/passive.
const tank = REFERENCE_PROFILES['test-k01']!;
export const COMBAT_PROFILES: Readonly<Record<string, CombatProfile>> = {
  ...REFERENCE_PROFILES,
  dolea: CombatProfileSchema.parse({
    ...tank,
    stats: {
      ...tank.stats,
      maxHp: 600,
      attack: 40,
      armor: 45,
      magicResist: 35,
      attackSpeedMilli: 800,
    },
  }),
};
/** New rule catalog; historical profiles above are immutable replay inputs. */
export const CURRENT_COMBAT_PROFILES: Readonly<Record<string, CombatProfile>> = {
  ...COMBAT_PROFILES,
  dolea: CombatProfileSchema.parse({
    stats: { ...COMBAT_PROFILES.dolea!.stats, maxMana: 70, startingMana: 0 },
    ability: null,
    passive: null,
    championAbility: DOLEA_ABILITY,
    traits: ['hortaleza', 'llama-de-padel'],
  }),
};
export function createCombatInput(board: BoardState, seed: number): CombatInput {
  return CombatInputSchema.parse({
    protocolVersion: COMBAT_PROTOCOL,
    rulesVersion: CURRENT_COMBAT_RULES,
    traits: TRAIT_DEFINITIONS,
    seed,
    maxTicks: MAX_COMBAT_TICKS,
    obstacles: [],
    units: board.units.map((u) => {
      const profile = CURRENT_COMBAT_PROFILES[u.definitionId];
      if (!profile) throw new Error(`Unknown combat profile: ${u.definitionId}`);
      return { ...u, profile };
    }),
  });
}

/** Explicit opt-in catalog: neutral additions, historical profile objects above stay unchanged. */
export const ADVANCED_COMBAT_PROFILES: Readonly<Record<string, CombatProfile>> = Object.fromEntries(
  Object.entries(CURRENT_COMBAT_PROFILES).map(([id, profile]) => [
    id,
    CombatProfileSchema.parse({
      ...structuredClone(profile),
      starLevel: 1,
      stats: { ...profile.stats, ...ADVANCED_STATS_DEFAULTS },
    }),
  ]),
);
export function createAdvancedCombatInput(board: BoardState, seed: number): CombatInput {
  const input = createCombatInput(board, seed);
  return CombatInputSchema.parse({
    ...input,
    rulesVersion: ADVANCED_COMBAT_RULES,
    units: board.units.map((u) => {
      const profile = ADVANCED_COMBAT_PROFILES[u.definitionId];
      if (!profile) throw new Error(`Unknown combat profile: ${u.definitionId}`);
      return { ...u, profile };
    }),
  });
}
export const hasTraits = (catalog: string | undefined) =>
  catalog === 'f0p6a' || catalog === 'f0p6b1';
export const combatRulesFor = (catalog: string | undefined) =>
  catalog === 'f0p6b1'
    ? ADVANCED_COMBAT_RULES
    : hasTraits(catalog)
      ? CURRENT_COMBAT_RULES
      : COMBAT_RULES;
