import {
  CombatInputSchema,
  CombatProfileSchema,
  COMBAT_PROTOCOL,
  COMBAT_RULES,
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
export const COMBAT_PROFILES: Readonly<Record<string, CombatProfile>> = {
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
export function createCombatInput(board: BoardState, seed: number): CombatInput {
  return CombatInputSchema.parse({
    protocolVersion: COMBAT_PROTOCOL,
    rulesVersion: COMBAT_RULES,
    seed,
    maxTicks: MAX_COMBAT_TICKS,
    obstacles: [],
    units: board.units.map((u) => {
      const profile = COMBAT_PROFILES[u.definitionId];
      if (!profile) throw new Error(`Unknown combat profile: ${u.definitionId}`);
      return { ...u, profile };
    }),
  });
}
