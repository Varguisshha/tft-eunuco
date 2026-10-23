import {
  ADVANCED_COMBAT_RULES,
  ADVANCED_STATS_DEFAULTS,
  CombatInputSchema,
  type CombatEffect,
  type CombatInput,
} from '@tft/shared';
import { createAbilityScenario } from './combatScenarios';
import { createAdvancedCombatInput, ADVANCED_COMBAT_PROFILES } from './combat';
export const STATS_SCENARIOS = [
  'basic-normal',
  'basic-critical',
  'physical-ad',
  'magic-ap',
  'physical-ap',
  'magic-ad',
  'mixed',
  'modifiers',
  'speed-stack',
  'support',
  'stats-overtime',
  'dolea-advanced',
] as const;
export type StatsScenario = (typeof STATS_SCENARIOS)[number];
/** Only technical Arena fixtures. Never enters catalog, shop, pool or local opponents. */
export function createStatsScenario(scenario: StatsScenario, seed: number): CombatInput {
  if (scenario === 'dolea-advanced') {
    const input = createAbilityScenario('ability-1', seed);
    return CombatInputSchema.parse({
      ...input,
      rulesVersion: ADVANCED_COMBAT_RULES,
      units: input.units.map((u) => ({
        ...u,
        profile: {
          ...u.profile,
          starLevel: 1,
          stats: { ...u.profile.stats, ...ADVANCED_STATS_DEFAULTS },
        },
      })),
    });
  }
  const input = createAdvancedCombatInput({ units: [] }, seed);
  const source = structuredClone(ADVANCED_COMBAT_PROFILES['test-v02']!);
  const target = structuredClone(ADVANCED_COMBAT_PROFILES['test-v02']!);
  for (const p of [source, target]) {
    p.ability = null;
    p.passive = null;
  }
  Object.assign(source.stats, {
    maxHp: 1000,
    attack: 100,
    abilityPower: 80,
    armor: 0,
    magicResist: 0,
    attackSpeedMilli: 1000,
    maxMana: 100,
    startingMana: 0,
  });
  Object.assign(target.stats, {
    maxHp: 10000,
    attack: 0,
    armor: 100,
    magicResist: 50,
    attackSpeedMilli: 1000,
    maxMana: 0,
    startingMana: 0,
  });
  const effects: CombatEffect[] = [];
  const modifier = (
    stat: 'attack' | 'abilityPower' | 'attackSpeedMilli',
    amount: number,
    mode: 'flat' | 'percent_milli',
    duration: number | null,
    key: string,
  ): CombatEffect => ({
    kind: 'modifier',
    target: 'self',
    radius: 0,
    stat,
    amount,
    mode,
    duration,
    key,
    stacking: 'refresh',
  });
  if (scenario === 'basic-critical') source.stats.critChanceMilli = 1000;
  if (['physical-ad', 'magic-ap', 'physical-ap', 'magic-ad', 'mixed'].includes(scenario)) {
    effects.push({
      kind: 'damage',
      target: 'target',
      radius: 0,
      amount: 10,
      damageType: scenario.startsWith('magic') ? 'magic' : 'physical',
      powerScaling: {
        version: 1,
        adRatioMilli: scenario.endsWith('-ad') ? 2800 : scenario === 'mixed' ? 1500 : 0,
        apRatioMilli: scenario.endsWith('-ap') ? 2000 : scenario === 'mixed' ? 1250 : 0,
      },
    });
  }
  if (scenario === 'modifiers')
    effects.push(
      modifier('attack', 20, 'flat', 20, 'ad-flat'),
      modifier('attack', 150, 'percent_milli', 20, 'ad-percent'),
      modifier('abilityPower', 30, 'flat', null, 'ap-flat'),
    );
  if (scenario === 'speed-stack' || scenario === 'stats-overtime') {
    source.passive = {
      id: 'stats-sources',
      trigger: 'combat_start',
      effects: [modifier('attackSpeedMilli', 120, 'percent_milli', null, 'speed-passive')],
    };
    effects.push(modifier('attackSpeedMilli', 250, 'percent_milli', 40, 'speed-active'));
    source.traits = ['stats-speed'];
    input.traits = [
      {
        id: 'stats-speed',
        name: 'Fuente de diagnóstico',
        description: 'Solo escenario técnico.',
        icon: 'trait-unknown',
        version: 1,
        visual: { tone: 'jade', provisional: true },
        stacking: 'highest',
        recipients: 'members',
        thresholds: [
          {
            count: 1,
            description: '+12% velocidad',
            bonuses: [{ stat: 'attackSpeedMilli', mode: 'percent_milli', amount: 120 }],
            effects: [],
          },
        ],
      },
    ];
    if (scenario === 'stats-overtime') source.stats.maxHp = 10000;
  }
  if (scenario === 'support') {
    target.stats.attack = 40;
    effects.push(
      {
        kind: 'heal',
        target: 'self',
        radius: 0,
        amount: 10,
        powerScaling: { version: 1, adRatioMilli: 500, apRatioMilli: 500 },
      },
      {
        kind: 'shield',
        target: 'self',
        radius: 0,
        amount: 10,
        duration: 20,
        powerScaling: { version: 1, adRatioMilli: 500, apRatioMilli: 500 },
      },
    );
  }
  if (effects.length) {
    source.stats.startingMana = 100;
    source.ability = {
      id: 'stats-ability',
      name: 'Efectos de diagnóstico',
      manaCost: 100,
      castTicks: 3,
      effects,
    };
  }
  return CombatInputSchema.parse({
    ...input,
    units: [
      {
        id: 'stats-source',
        definitionId: 'test-v02',
        owner: 'south',
        position: { q: 0, r: 4 },
        profile: source,
      },
      {
        id: 'stats-target',
        definitionId: 'test-v02',
        owner: 'north',
        position: { q: 0, r: 3 },
        profile: target,
      },
    ],
  });
}
