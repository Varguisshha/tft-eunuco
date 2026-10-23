import {
  CombatInputSchema,
  MECHANICS_RULES,
  type CombatInput,
  type CombatEffect,
  type PassiveRule,
  type StackDefinition,
  type TraitDefinition,
} from '@tft/shared';
import { createStatsScenario } from './statsScenarios';
export const MECHANICS_SCENARIOS = [
  'stack-cycle',
  'kill-marks',
  'periodic-credit',
  'environment-credit',
  'simultaneous-credit',
  'progress-2',
  'progress-4',
  'progress-6',
  'progress-team',
  'free-repeat',
  'jump-chain',
  'jump-blocked',
  'jump-cancel',
  'dolea-mechanics',
] as const;
export type MechanicsScenario = (typeof MECHANICS_SCENARIOS)[number];
export const mechanicRule = (
  id: string,
  trigger: PassiveRule['trigger'],
  effects: CombatEffect[],
): PassiveRule => ({ id, trigger, conditions: [], effects, maxActivations: 450, cooldownTicks: 0 });
const modifier = (
  stat: 'attack' | 'abilityPower' | 'attackSpeedMilli',
  amount: number,
  duration: number | null = null,
): CombatEffect => ({
  kind: 'modifier',
  target: 'self',
  radius: 0,
  stat,
  amount,
  mode: 'percent_milli',
  duration,
  key: `bonus-${stat}`,
  stacking: 'refresh',
});
export const cycleStack: StackDefinition = {
  version: 1,
  id: 'tempo',
  name: 'Pulso de prueba',
  trigger: { kind: 'attack_hit', every: 1 },
  conditions: [],
  maxStacks: 5,
  durationTicks: 60,
  refresh: 'on_gain',
  consumption: 'threshold',
  reset: 'combat',
  modifiers: [{ stat: 'attackSpeedMilli', mode: 'percent_milli', amount: 40 }],
  thresholds: [
    {
      id: 'cycle',
      count: 5,
      consume: 5,
      repeatable: true,
      effects: [
        {
          kind: 'heal',
          target: 'self',
          radius: 0,
          amount: 0,
          scaling: { stat: 'maxHp', basis: 'source', ratioMilli: 50 },
        },
        modifier('attackSpeedMilli', 200, 30),
      ],
    },
  ],
};
const principal = (rules: PassiveRule[]) => ({
  id: 'mechanics-fixture',
  name: 'Diagnóstico',
  description: 'Solo arena técnica',
  icon: 'unknown',
  version: 1 as const,
  type: 'passive' as const,
  passive: { name: 'Diagnóstico', description: 'Prueba del motor', rules },
});
export function createMechanicsScenario(scenario: MechanicsScenario, seed: number): CombatInput {
  const input = createStatsScenario(
    scenario === 'dolea-mechanics' ? 'dolea-advanced' : 'basic-normal',
    seed,
  );
  input.rulesVersion = MECHANICS_RULES;
  input.combatId = `diagnostic-${scenario}-${seed}`;
  if (scenario === 'dolea-mechanics') return CombatInputSchema.parse(input);
  const source = input.units[0]!,
    target = input.units[1]!;
  source.id = 'mechanics-source';
  target.id = 'mechanics-target';
  source.profile.stats.maxMana = 0;
  source.profile.stats.startingMana = 0;
  Object.assign(source.profile.stats, {
    maxHp: 1500,
    range: 1,
    attack: 60,
    attackSpeedMilli: 1000,
  });
  Object.assign(target.profile.stats, {
    maxHp: 20000,
    armor: 0,
    magicResist: 0,
    attack: 30,
    range: 14,
  });
  const cloneTarget = (id: string, q: number, r: number, hp = 70) => ({
    ...structuredClone(target),
    id,
    position: { q, r },
    profile: {
      ...structuredClone(target.profile),
      stats: { ...target.profile.stats, maxHp: hp, attack: 0, attackSpeedMilli: 1 },
    },
  });
  if (scenario === 'stack-cycle')
    source.profile.mechanics = { version: 1, stacks: [structuredClone(cycleStack)] };
  if (scenario === 'kill-marks') {
    source.profile.mechanics = {
      version: 1,
      stacks: [
        {
          ...structuredClone(cycleStack),
          id: 'marks',
          name: 'Marcas de prueba',
          trigger: { kind: 'kill' },
          maxStacks: 10,
          durationTicks: null,
          consumption: 'none',
          modifiers: [{ stat: 'attack', mode: 'flat', amount: 5 }],
          thresholds: [
            {
              id: 'mark-two',
              count: 2,
              consume: 0,
              repeatable: false,
              effects: [modifier('abilityPower', 200)],
            },
          ],
        },
      ],
    };
    const unique: TraitDefinition = {
      id: 'unique-diagnostic',
      name: 'Marca singular',
      description: 'Diagnóstico 1/1. La membresía y las eliminaciones se cuentan por separado.',
      icon: 'trait-unknown',
      version: 1,
      visual: { tone: 'jade', provisional: true },
      stacking: 'highest',
      recipients: 'members',
      thresholds: [{ count: 1, description: 'Escudo tras eliminar.', bonuses: [], effects: [] }],
      progress: {
        version: 1,
        scope: 'unit',
        rules: [
          {
            ...mechanicRule('kill-support', { kind: 'kill' }, [
              { kind: 'heal', target: 'self', radius: 0, amount: 50 },
              { kind: 'shield', target: 'self', radius: 0, amount: 50, duration: 30 },
            ]),
            memberThreshold: 1,
          },
        ],
      },
    };
    source.profile.traits = [unique.id];
    input.traits = [unique];
    source.profile.stats.attack = 100;
    source.profile.stats.range = 14;
    target.position = { q: 4, r: 3 };
    input.units = [
      source,
      cloneTarget('victim-a', 0, 3),
      cloneTarget('victim-b', 2, 3),
      cloneTarget('victim-c', 3, 3),
      target,
    ];
  }
  if (scenario === 'periodic-credit' || scenario === 'environment-credit') {
    source.profile.stats.attack = 0;
    target.profile.stats.maxHp = 180;
    source.profile.passive = {
      id: 'periodic-diagnostic',
      trigger: 'combat_start',
      effects: [
        {
          kind: 'periodic',
          target: 'target',
          radius: 0,
          amount: 60,
          damageType: 'true',
          intervalTicks: 3,
          duration: 20,
          responsible: scenario === 'environment-credit' ? 'none' : 'source',
        },
      ],
    };
    // A start passive targets enemies explicitly, rather than the caster's self placeholder.
    source.profile.passive.effects[0] = {
      ...source.profile.passive.effects[0]!,
      target: 'enemies',
      radius: 14,
    };
  }
  if (scenario === 'simultaneous-credit')
    for (const unit of input.units)
      Object.assign(unit.profile.stats, {
        maxHp: 50,
        attack: 100,
        armor: 0,
        range: 1,
        attackWindupTicks: 2,
      });
  if (scenario.startsWith('progress-') || scenario === 'free-repeat') {
    const members = scenario === 'progress-2' ? 2 : scenario === 'progress-4' ? 4 : 6;
    const template = structuredClone(source);
    const trait: TraitDefinition = {
      id: 'progress-diagnostic',
      name: 'Cadencia de prueba',
      description:
        'Miembros únicos; progreso separado. Contador ' +
        (scenario === 'progress-team' ? 'compartido por equipo.' : 'individual por unidad.'),
      icon: 'trait-unknown',
      version: 1,
      visual: { tone: 'jade', provisional: true },
      stacking: 'cumulative',
      recipients: 'members',
      thresholds: [
        {
          count: 2,
          description: '+10% AD inicial',
          bonuses: [{ stat: 'attack', mode: 'percent_milli', amount: 100 }],
          effects: [],
        },
        { count: 4, description: 'Cura al lanzar', bonuses: [], effects: [] },
        { count: 6, description: 'Potencia cada tercer lanzamiento', bonuses: [], effects: [] },
      ],
      progress: {
        version: 1,
        scope: scenario === 'progress-team' ? 'team' : 'unit',
        rules: [
          {
            ...mechanicRule('cast-heal', { kind: 'ability_cast' }, [
              { kind: 'heal', target: 'self', radius: 0, amount: 50 },
            ]),
            memberThreshold: 4,
          },
          {
            ...mechanicRule('third-cast', { kind: 'ability_cast', every: 3 }, [
              {
                kind: 'ability_empower',
                target: 'self',
                radius: 0,
                powerMilli: 1500,
                extraEffects: [
                  { kind: 'shield', target: 'self', radius: 0, amount: 30, duration: 20 },
                ],
              },
            ]),
            memberThreshold: 6,
          },
        ],
      },
    };
    input.traits = [trait];
    const allies = [];
    for (let i = 0; i < members; i++) {
      const unit =
        i === 0
          ? source
          : {
              ...structuredClone(template),
              id: `member-${i}`,
              definitionId: `fixture-member-${i}`,
              position: { q: i - 3, r: 5 },
            };
      unit.profile.traits = [trait.id];
      Object.assign(unit.profile.stats, { range: 14, attack: 20, maxMana: 10, startingMana: 10 });
      unit.profile.ability = {
        id: 'diagnostic-cast',
        name: 'Pulso técnico',
        manaCost: 10,
        castTicks: 2,
        effects: [
          {
            kind: 'damage',
            target: 'target',
            radius: 0,
            amount: 10,
            damageType: 'magic',
            powerScaling: { version: 1, adRatioMilli: 500, apRatioMilli: 500 },
          },
        ],
      };
      if (scenario === 'free-repeat') {
        const legacy = unit.profile.ability;
        unit.profile.ability = null;
        unit.profile.championAbility = {
          ...principal([
            mechanicRule('repeat-third', { kind: 'ability_cast', every: 3 }, [
              {
                kind: 'ability_repeat',
                target: 'self',
                radius: 0,
                maxChain: 4,
                allowSourceProcs: true,
                grantMana: false,
                countAsCast: false,
                delayTicks: 2,
                targetPolicy: 'same_or_nearest',
                powerMilli: 1250,
                extraEffects: [],
              },
            ]),
          ]),
          type: 'mixed',
          active: {
            name: legacy.name,
            description: 'Solo diagnóstico',
            manaCost: 10,
            initialMana: 10,
            castTicks: 2,
            targeting: 'current_enemy',
            conditions: [],
            effects: legacy.effects,
            animation: 'ability',
            manaConsumption: 'on_start',
            priority: 'before_attack',
            interrupts: 'stun_or_death',
          },
        };
      }
      allies.push(unit);
    }
    target.profile.stats.maxHp = 100000;
    input.units = [...allies, target];
  }
  if (scenario.startsWith('jump-')) {
    source.profile.stats.attack = 100;
    source.profile.stats.critChanceMilli = 1000;
    source.profile.championAbility = principal([
      mechanicRule('kill-jump', { kind: 'kill' }, [
        {
          kind: 'jump',
          target: 'self',
          radius: 0,
          maxChain: 8,
          allowSourceProcs: true,
          grantMana: false,
          duration: 3,
          immediateAttack: true,
          allowKillChain: true,
          retarget: 'cancel',
        },
      ]),
    ]);
    const enemies = [
      cloneTarget('victim-a', 0, 3),
      cloneTarget('victim-b', 2, 2),
      cloneTarget('victim-c', 3, 1),
      cloneTarget('victim-d', 4, 0),
      cloneTarget('victim-e', 0, 1),
      cloneTarget('victim-f', -1, 2),
    ];
    input.units = [source, ...enemies];
    if (scenario === 'jump-blocked') {
      input.units = [source, enemies[0]!, cloneTarget('far-victim', 5, 2)];
      input.obstacles = [
        { q: 5, r: 1 },
        { q: 6, r: 1 },
        { q: 4, r: 2 },
        { q: 4, r: 3 },
        { q: 5, r: 3 },
      ];
    }
    if (scenario === 'jump-cancel') {
      const caster = cloneTarget('stunner', 3, 4, 3000);
      caster.profile.stats.attack = 0;
      caster.profile.passive = {
        id: 'interrupt',
        trigger: 'combat_start',
        effects: [
          {
            kind: 'periodic',
            target: 'enemies',
            radius: 14,
            amount: 0,
            damageType: 'true',
            duration: 30,
            intervalTicks: 4,
            responsible: 'source',
          },
        ],
      };
      caster.profile.stats.maxMana = 1;
      caster.profile.stats.startingMana = 1;
      caster.profile.ability = {
        id: 'interrupt',
        name: 'Interrupción',
        manaCost: 1,
        castTicks: 5,
        effects: [{ kind: 'stun', target: 'enemies', radius: 14, duration: 10 }],
      };
      input.units.push(caster);
    }
  }
  return CombatInputSchema.parse(input);
}
