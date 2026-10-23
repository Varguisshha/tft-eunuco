import { describe, it, expect } from 'vitest';
import {
  ADVANCED_COMBAT_RULES,
  ADVANCED_STATS_DEFAULTS,
  CombatInputSchema,
  CombatStatsSchema,
  EffectSchema,
  CombatEventV3Schema,
  CombatStateSchema,
  type CombatInput,
  type CombatEffect,
  type CombatUnit,
} from '@tft/shared';
import {
  createStatsScenario,
  createAbilityScenario,
  ADVANCED_ECONOMY_CONFIG,
  CURRENT_ECONOMY_CONFIG,
  STATS_SCENARIOS,
} from '@tft/game-data';
import { runCombat, CombatEngine } from './engine';
import { effectiveStat, randomUint32 } from './math';
import { criticalRoll, effectAmount, combatStatsView } from './stats';
import { scaledProfile, formationProfiles } from '../match/selectors';
import { createMatch } from '../match/engine';
const sourceId = 'stats-source';
const fixture = (name: Parameters<typeof createStatsScenario>[0] = 'basic-normal') =>
  createStatsScenario(name, 42);
const sourceAt = (trace: ReturnType<typeof runCombat>, tick: number) =>
  trace.snapshots[tick]!.units.find((u) => u.id === sourceId)!;
const hit = (trace: ReturnType<typeof runCombat>, cause: 'attack' | 'ability' = 'attack') =>
  trace.events.find(
    (e) => e.type === 'damage' && e.payload.sourceId === sourceId && e.payload.cause === cause,
  )!;
const modifier = (
  stat: 'attack' | 'abilityPower' | 'attackSpeedMilli' | 'critChanceMilli' | 'critMultiplierMilli',
  amount: number,
  mode: 'flat' | 'percent_milli' = 'flat',
  duration: number | null = 20,
): CombatEffect => ({ kind: 'modifier', target: 'self', radius: 0, stat, amount, mode, duration });
function passive(input: CombatInput, effects: CombatEffect[]) {
  input.units[0]!.profile.passive = { id: 'diagnostic-passive', trigger: 'combat_start', effects };
}
function runtimeModifier(
  u: CombatUnit,
  stat: Parameters<typeof modifier>[0],
  amount: number,
  mode: 'flat' | 'percent_milli' = 'flat',
) {
  u.statuses.push({
    id: `test-${u.statuses.length}`,
    sourceId: 'test',
    kind: 'modifier',
    stat,
    amount,
    mode,
    origin: 'active',
    expiresTick: 20,
  });
}

describe('advanced contracts and neutral defaults', () => {
  it('requires explicit defaults only in the new rules and preserves old schema bytes', () => {
    const old = createAbilityScenario('ability-1', 42);
    expect(old.units[0]!.profile.stats).not.toHaveProperty('abilityPower');
    expect(CombatStatsSchema.parse(old.units[0]!.profile.stats)).toEqual(
      old.units[0]!.profile.stats,
    );
    const current = fixture();
    expect(current.rulesVersion).toBe(ADVANCED_COMBAT_RULES);
    expect(current.units[0]!.profile.stats).toMatchObject({
      ...ADVANCED_STATS_DEFAULTS,
      abilityPower: 80,
    });
    const missing = structuredClone(current);
    delete missing.units[0]!.profile.stats.abilityPower;
    expect(CombatInputSchema.safeParse(missing).success).toBe(false);
    const wrong = structuredClone(current);
    wrong.rulesVersion = 'f0p6a-1';
    expect(CombatInputSchema.safeParse(wrong).success).toBe(false);
  });
  it.each([NaN, Infinity, -1, 1001, 0.5])('rejects invalid crit chance %s', (value) => {
    const input = fixture();
    input.units[0]!.profile.stats.critChanceMilli = value;
    expect(CombatInputSchema.safeParse(input).success).toBe(false);
  });
  it.each([NaN, Infinity, -1, 1000001, 0.5])('rejects invalid AP %s', (value) => {
    const input = fixture();
    input.units[0]!.profile.stats.abilityPower = value;
    expect(CombatInputSchema.safeParse(input).success).toBe(false);
  });
  it('requires stable refresh keys in new rules while retaining historically accepted effects', () => {
    const input = fixture();
    passive(input, [{ ...modifier('attack', 20), stacking: 'refresh' }]);
    expect(CombatInputSchema.safeParse(input).success).toBe(false);
    const old = createAbilityScenario('ability-1', 42);
    old.units[0]!.profile.championAbility!.passive!.rules[0]!.effects[0]!.stacking = 'refresh';
    delete old.units[0]!.profile.championAbility!.passive!.rules[0]!.effects[0]!.key;
    expect(CombatInputSchema.safeParse(old).success).toBe(true);
  });
  it.each([999, 5001, Infinity])('rejects invalid multiplier %s', (value) => {
    const input = fixture();
    input.units[0]!.profile.stats.critMultiplierMilli = value;
    expect(CombatInputSchema.safeParse(input).success).toBe(false);
  });
  it('validates power ratios, star tuples, duplicate scaling and support crit exclusion', () => {
    const effect = {
      kind: 'damage',
      target: 'target',
      radius: 0,
      amount: 1,
      damageType: 'physical',
      powerScaling: { version: 1, adRatioMilli: [2800, 4200, 7000], apRatioMilli: 0 },
    };
    expect(EffectSchema.safeParse(effect).success).toBe(true);
    expect(
      EffectSchema.safeParse({
        ...effect,
        powerScaling: { version: 1, adRatioMilli: 10001, apRatioMilli: 0 },
      }).success,
    ).toBe(false);
    expect(
      EffectSchema.safeParse({
        ...effect,
        powerScaling: { version: 1, adRatioMilli: [1, 2], apRatioMilli: 0 },
      }).success,
    ).toBe(false);
    expect(
      EffectSchema.safeParse({
        ...effect,
        scaling: { stat: 'attack', basis: 'source', ratioMilli: 1000 },
      }).success,
    ).toBe(false);
    expect(
      EffectSchema.safeParse({ ...effect, amountByStars: [1, 2, 3], starScaling: 'stat' }).success,
    ).toBe(false);
    expect(
      EffectSchema.safeParse({ kind: 'heal', target: 'self', radius: 0, amount: 1, canCrit: true })
        .success,
    ).toBe(false);
    expect(
      EffectSchema.safeParse({
        kind: 'shield',
        target: 'self',
        radius: 0,
        amount: 1,
        duration: 5,
        canCrit: true,
      }).success,
    ).toBe(false);
    expect(EffectSchema.safeParse(modifier('attack', -1001, 'percent_milli')).success).toBe(false);
  });
  it('refuses modern effect semantics under old rules, including trait effects', () => {
    const old = createAbilityScenario('ability-1', 42);
    const e = old.units[0]!.profile.championAbility!.active!.effects[0]!;
    if (e.kind !== 'damage') throw Error();
    e.canCrit = false;
    expect(CombatInputSchema.safeParse(old).success).toBe(false);
    delete e.canCrit;
    old.traits![0]!.thresholds[0]!.effects = [modifier('attack', 10, 'flat', null)];
    expect(CombatInputSchema.safeParse(old).success).toBe(false);
  });
});

describe('effective sources, composition and lifetime', () => {
  it('adds flat and base-relative percentages from identifiable sources without mutating base', () => {
    const input = fixture('modifiers'),
      trace = runCombat(input),
      u = sourceAt(trace, 4);
    expect(effectiveStat(u, 'attack')).toBe(135);
    expect(effectiveStat(u, 'abilityPower')).toBe(110);
    expect(u.profile.stats.attack).toBe(100);
    expect(u.profile.stats.abilityPower).toBe(80);
    expect(
      u.statuses
        .filter((s) => s.kind === 'modifier')
        .every((s) => s.origin === 'active' && s.sourceId === u.id),
    ).toBe(true);
    expect(effectiveStat(sourceAt(trace, 24), 'attack')).toBe(100);
    expect(effectiveStat(sourceAt(trace, 24), 'abilityPower')).toBe(110);
    expect(
      sourceAt(trace, 100).statuses.some(
        (s) => s.stat === 'abilityPower' && s.expiresTick === null,
      ),
    ).toBe(true);
  });
  it('clamps each effective statistic after composing all sources', () => {
    const u = sourceAt(runCombat(fixture()), 0);
    runtimeModifier(u, 'abilityPower', -1000);
    runtimeModifier(u, 'attack', -1000);
    runtimeModifier(u, 'attackSpeedMilli', 10000);
    runtimeModifier(u, 'critChanceMilli', 2000);
    runtimeModifier(u, 'critMultiplierMilli', -5000);
    expect(combatStatsView(u)).toMatchObject({
      attack: 0,
      abilityPower: 0,
      attackSpeedMilli: 5000,
      critChanceMilli: 1000,
      critMultiplierMilli: 1000,
    });
  });
  it('refreshes one source/key without accumulating its amount and preserves base', () => {
    const input = fixture();
    const p = input.units[0]!.profile;
    p.stats.maxMana = 0;
    p.championAbility = {
      id: 'test-refresh',
      name: 'Test',
      description: 'Test',
      icon: 'unknown',
      version: 1,
      type: 'passive',
      passive: {
        name: 'Test',
        description: 'Test',
        rules: [
          {
            id: 'on-attack',
            trigger: { kind: 'attack', every: 1 },
            conditions: [],
            maxActivations: 3,
            cooldownTicks: 0,
            effects: [{ ...modifier('attack', 20), key: 'ad', stacking: 'refresh' }],
          },
        ],
      },
    };
    const t = runCombat(input),
      u = sourceAt(t, 13);
    expect(u.statuses.filter((s) => s.key === 'ad')).toHaveLength(1);
    expect(effectiveStat(u, 'attack')).toBe(120);
    expect(u.profile.stats.attack).toBe(100);
    expect(effectiveStat(sourceAt(t, 100), 'attack')).toBe(100);
  });
  it('keeps trait sources outside the base profile, recalculates fresh and never star-multiplies them', () => {
    const input = createStatsScenario('dolea-advanced', 42);
    const companion = structuredClone(input.units[0]!);
    companion.id = 'companion';
    companion.definitionId = 'test-k01';
    companion.position = { q: 1, r: 4 };
    input.units.push(companion);
    const before = JSON.stringify(input),
      t = runCombat(input),
      u = t.snapshots[0]!.units.find((u) => u.id === 'diagnostic-dolea')!;
    expect(u.profile.stats.maxHp).toBe(600);
    expect(effectiveStat(u, 'maxHp')).toBe(700);
    expect(u.hp).toBe(700);
    expect(effectiveStat(u, 'attackSpeedMilli')).toBe(896);
    expect(u.statuses.some((s) => s.origin === 'trait' && s.expiresTick === null)).toBe(true);
    expect(runCombat(input)).toEqual(t);
    expect(JSON.stringify(input)).toBe(before);
    const match = createMatch(42, ADVANCED_ECONOMY_CONFIG);
    match.units = [
      {
        id: 'one',
        definitionId: 'dolea',
        stars: 2,
        location: { kind: 'board', hex: { q: 0, r: 4 } },
      },
    ];
    expect(formationProfiles(match)[0]!.profile.stats).toMatchObject({
      maxHp: 1080,
      attack: 72,
      abilityPower: 0,
    });
  });
});

describe('AD/AP power is independent of damage type', () => {
  it.each([
    ['physical-ad', 145],
    ['magic-ap', 113],
    ['physical-ap', 85],
    ['magic-ad', 193],
    ['mixed', 130],
  ] as const)('%s resolves expected mitigated damage %s', (scenario, expected) => {
    const t = runCombat(fixture(scenario)),
      event = hit(t, 'ability');
    expect(event.type === 'damage' && event.payload.amount).toBe(expected);
    expect(event.type === 'damage' && event.payload.critical).toBe(false);
  });
  it('floors once after mixed fractional terms and reuses power for heal/shield', () => {
    const u = sourceAt(runCombat(fixture()), 0);
    u.profile.stats.attack = 3;
    u.profile.stats.abilityPower = 3;
    const power = { version: 1 as const, adRatioMilli: 500, apRatioMilli: 500 };
    for (const kind of ['damage', 'heal', 'shield'] as const) {
      const e = EffectSchema.parse({
        kind,
        target: 'self',
        radius: 0,
        amount: 1,
        powerScaling: power,
        ...(kind === 'damage' ? { damageType: 'physical' } : {}),
        ...(kind === 'shield' ? { duration: 10 } : {}),
      });
      expect(effectAmount(e, u, u)).toBe(4);
    }
  });
  it.each([1, 2, 3] as const)(
    'selects star %s coefficients/flat amounts once, while AP remains neutral',
    (stars) => {
      const profile = scaledProfile('dolea', stars, ADVANCED_ECONOMY_CONFIG);
      expect(profile.stats.maxHp).toBe([600, 1080, 1944][stars - 1]);
      expect(profile.stats.attack).toBe([40, 72, 129][stars - 1]);
      expect(profile.stats.abilityPower).toBe(0);
      expect(profile.starLevel).toBe(stars);
      const u = sourceAt(runCombat(fixture()), 0);
      u.profile.starLevel = stars;
      u.profile.stats.attack = [100, 180, 324][stars - 1]!;
      const e = EffectSchema.parse({
        kind: 'damage',
        target: 'target',
        radius: 0,
        amount: 0,
        amountByStars: [10, 20, 30],
        damageType: 'physical',
        powerScaling: { version: 1, adRatioMilli: [2800, 4200, 7000], apRatioMilli: 0 },
      });
      expect(effectAmount(e, u, u)).toBe([290, 776, 2298][stars - 1]);
      const old = scaledProfile('dolea', stars, CURRENT_ECONOMY_CONFIG);
      expect(old.stats).not.toHaveProperty('abilityPower');
    },
  );
  it('uses effective AD/AP after modifiers and supports real healing/shield events', () => {
    const u = sourceAt(runCombat(fixture('modifiers')), 4);
    expect(
      effectAmount(
        EffectSchema.parse({
          kind: 'heal',
          target: 'self',
          radius: 0,
          amount: 10,
          powerScaling: { version: 1, adRatioMilli: 1000, apRatioMilli: 1000 },
        }),
        u,
        u,
      ),
    ).toBe(255);
    const t = runCombat(fixture('support'));
    expect(t.events.some((e) => e.type === 'heal' && e.payload.amount > 0)).toBe(true);
    expect(t.events.some((e) => e.type === 'shield_apply' && e.payload.status.amount === 100)).toBe(
      true,
    );
  });
});

describe('additional composition invariants', () => {
  it('rounds the sum of percentage sources once, including negative fractions', () => {
    const u = sourceAt(runCombat(fixture()), 0);
    u.profile.stats.abilityPower = 3;
    runtimeModifier(u, 'abilityPower', 500, 'percent_milli');
    runtimeModifier(u, 'abilityPower', 500, 'percent_milli');
    expect(effectiveStat(u, 'abilityPower')).toBe(6);
    u.statuses = [];
    runtimeModifier(u, 'abilityPower', -500, 'percent_milli');
    expect(effectiveStat(u, 'abilityPower')).toBe(1);
  });
  it('does not reroll or recalculate a basic critical when crit stats change during its windup', () => {
    const input = fixture('basic-critical');
    input.units[0]!.profile.stats.attackWindupTicks = 6;
    const p = input.units[0]!.profile;
    p.stats.maxMana = 0;
    p.championAbility = {
      id: 'change-critical',
      name: 'Test',
      description: 'Test',
      icon: 'unknown',
      version: 1,
      type: 'passive',
      passive: {
        name: 'Test',
        description: 'Test',
        rules: [
          {
            id: 'drop',
            trigger: { kind: 'damage_received' },
            conditions: [],
            effects: [modifier('critChanceMilli', -1000), modifier('critMultiplierMilli', 1000)],
            maxActivations: 1,
            cooldownTicks: 0,
          },
        ],
      },
    };
    input.units[1]!.profile.stats.attack = 1;
    const t = runCombat(input),
      started = sourceAt(t, 1).action!;
    if (started.kind !== 'attack') throw Error();
    expect(effectiveStat(sourceAt(t, 3), 'critChanceMilli')).toBe(0);
    expect(hit(t)).toMatchObject({
      payload: { critical: true, amount: Math.floor(started.rawDamage / 2) },
    });
  });
});

describe('deterministic critical hits', () => {
  it.each([0, 1000])(
    'chance %s consumes no extra PRNG, records boolean and scales before mitigation',
    (chance) => {
      const input = fixture();
      input.units[0]!.profile.stats.critChanceMilli = chance;
      const t = runCombat(input),
        event = hit(t),
        action = sourceAt(t, 1).action!;
      const variation = Math.floor((100 * (950 + (randomUint32(42).value % 101))) / 1000);
      expect(action.kind === 'attack' && action.rawDamage).toBe(
        chance ? Math.floor(variation * 1.5) : variation,
      );
      expect(event.type === 'damage' && event.payload.amount).toBe(
        Math.floor((chance ? Math.floor(variation * 1.5) : variation) / 2),
      );
      expect(event.type === 'damage' && event.payload.critical).toBe(chance === 1000);
      const other = fixture();
      other.units[0]!.profile.stats.critChanceMilli = chance === 0 ? 1000 : 0;
      expect(sourceAt(runCombat(other), 1).profile.stats.attack).toBe(100);
      expect(t.snapshots[1]!.rngState).toBe(runCombat(other).snapshots[1]!.rngState);
    },
  );
  it('intermediate chance draws once and reproduces hits, state and serialization', () => {
    const input = fixture();
    input.units[0]!.profile.stats.critChanceMilli = 500;
    input.maxTicks = 100;
    const before = JSON.stringify(input),
      t = runCombat(input);
    const hits = t.events.filter((e) => e.type === 'damage' && e.payload.sourceId === sourceId);
    expect(hits.some((e) => e.type === 'damage' && e.payload.critical)).toBe(true);
    expect(hits.some((e) => e.type === 'damage' && !e.payload.critical)).toBe(true);
    expect(runCombat(JSON.parse(JSON.stringify(input)))).toEqual(t);
    expect(JSON.stringify(input)).toBe(before);
    const u = sourceAt(t, 0),
      roll = criticalRoll(u, 100, 42);
    expect(roll.rngState).toBe(randomUint32(42).state);
    for (const event of t.events) expect(CombatEventV3Schema.parse(event)).toEqual(event);
    for (const s of t.snapshots) expect(CombatStateSchema.parse(s)).toEqual(s);
  });
  it.each([false, true])(
    'ability permission %s is explicit; mitigation follows crit',
    (allowed) => {
      const input = fixture('physical-ad');
      input.units[0]!.profile.stats.critChanceMilli = 1000;
      const effect = input.units[0]!.profile.ability!.effects[0]!;
      if (effect.kind !== 'damage') throw Error();
      effect.canCrit = allowed;
      const event = hit(runCombat(input), 'ability');
      expect(event.type === 'damage' && event.payload.amount).toBe(allowed ? 217 : 145);
      expect(event.type === 'damage' && event.payload.critical).toBe(allowed);
    },
  );
  it('abilities without permission stay noncritical even at 100%', () => {
    const input = fixture('physical-ad');
    input.units[0]!.profile.stats.critChanceMilli = 1000;
    expect(hit(runCombat(input), 'ability')).toMatchObject({
      payload: { critical: false, amount: 145 },
    });
  });
  it('retains rolled critical metadata across windup, ranged flight and JSON roundtrip', () => {
    const input = fixture('basic-critical');
    input.units[0]!.profile.stats.range = 3;
    input.units[0]!.profile.stats.attackWindupTicks = 5;
    const t = runCombat(input),
      projectile = t.events.find((e) => e.type === 'projectile_launch');
    expect(projectile).toMatchObject({ payload: { critical: true } });
    expect(hit(t)).toMatchObject({ payload: { critical: true } });
    expect(sourceAt(t, 1).action).toMatchObject({ critical: true });
    expect(runCombat(JSON.parse(JSON.stringify(input)))).toEqual(t);
  });
  it('uses configured multiplier and effective clamps', () => {
    const u = sourceAt(runCombat(fixture('basic-critical')), 0);
    u.profile.stats.critMultiplierMilli = 2000;
    expect(criticalRoll(u, 101, 0)).toMatchObject({ critical: true, amount: 202, rngState: 0 });
    runtimeModifier(u, 'critMultiplierMilli', 10000);
    expect(criticalRoll(u, 1000000, 0).amount).toBe(1000000);
  });
});

describe('speed sources, charge and overtime', () => {
  it('combines base + trait + passive + active, expires active and applies overtime last', () => {
    const t = runCombat(fixture('speed-stack'));
    expect(effectiveStat(sourceAt(t, 0), 'attackSpeedMilli')).toBe(1240);
    expect(effectiveStat(sourceAt(t, 4), 'attackSpeedMilli')).toBe(1490);
    expect(effectiveStat(sourceAt(t, 44), 'attackSpeedMilli')).toBe(1240);
    const u = sourceAt(t, 300);
    expect(combatStatsView(u, 300).attackSpeedMilli).toBe(
      Math.floor(effectiveStat(u, 'attackSpeedMilli') * 1.2),
    );
    expect(u.profile.stats.attackSpeedMilli).toBe(1000);
  });
  it('preserves fractional cadence and leftover charge', () => {
    const input = fixture();
    input.units[0]!.profile.stats.attackSpeedMilli = 1500;
    input.maxTicks = 40;
    const starts = runCombat(input)
      .events.filter((e) => e.type === 'attack_start' && e.payload.unitId === sourceId)
      .map((e) => e.tick);
    expect(starts).toEqual([1, 8, 15, 21, 28, 35]);
  });
  it('preserves progress when an attack-trigger bonus appears and expires, without changing committed raw damage', () => {
    const input = fixture(),
      p = input.units[0]!.profile;
    p.stats.maxMana = 0;
    p.championAbility = {
      id: 'progress',
      name: 'Progress',
      description: 'Test',
      icon: 'unknown',
      version: 1,
      type: 'passive',
      passive: {
        name: 'Progress',
        description: 'Test',
        rules: [
          {
            id: 'once',
            trigger: { kind: 'attack', every: 1 },
            conditions: [],
            effects: [
              modifier('attackSpeedMilli', 500, 'flat', 4),
              modifier('attack', 100, 'flat', 4),
            ],
            maxActivations: 1,
            cooldownTicks: 0,
          },
        ],
      },
    };
    const t = runCombat(input);
    expect(sourceAt(t, 3).attackCharge).toBe(2000);
    expect(sourceAt(t, 6).attackCharge).toBe(6500);
    expect(sourceAt(t, 7).attackCharge).toBe(7500);
    expect(sourceAt(t, 10).attackCharge).toBe(500);
    expect(
      t.events
        .filter((e) => e.type === 'attack_start' && e.payload.unitId === sourceId)
        .slice(0, 2)
        .map((e) => e.tick),
    ).toEqual([1, 10]);
    const committed = sourceAt(t, 1).action!;
    if (committed.kind !== 'attack') throw Error();
    expect(hit(t)).toMatchObject({ payload: { amount: Math.floor(committed.rawDamage / 2) } });
  });
  it('remains bounded to one new attack per unit/tick at simultaneous caps', () => {
    const input = fixture();
    input.units[0]!.profile.stats.attackSpeedMilli = 5000;
    passive(input, [modifier('attackSpeedMilli', 10000)]);
    const t = runCombat(input),
      starts = t.events.filter((e) => e.type === 'attack_start' && e.payload.unitId === sourceId);
    expect(new Set(starts.map((e) => e.tick)).size).toBe(starts.length);
    expect(t.snapshots.every((s) => s.units.every((u) => u.attackCharge <= 29999))).toBe(true);
  });
});

describe('overtime power integration', () => {
  it('applies overtime at ranged impact after a committed critical, then mitigates', () => {
    const input = fixture('basic-critical');
    input.units[0]!.profile.stats.range = 3;
    input.units[0]!.profile.stats.attackWindupTicks = 1;
    passive(input, [{ kind: 'stun', target: 'self', radius: 0, duration: 297 }]);
    const t = runCombat(input),
      action = sourceAt(t, 297).action!;
    if (action.kind !== 'attack') throw Error();
    const event = hit(t);
    expect(event.tick).toBe(300);
    expect(event).toMatchObject({
      payload: { critical: true, amount: Math.floor(Math.floor(action.rawDamage * 1.25) / 2) },
    });
  });
  it('scales AD/AP healing and new shields with their own overtime support modifier', () => {
    const input = fixture('support');
    input.units[0]!.profile.stats.maxHp = 10000;
    passive(input, [{ kind: 'stun', target: 'self', radius: 0, duration: 297 }]);
    const t = runCombat(input);
    expect(t.events.find((e) => e.type === 'heal')).toMatchObject({
      tick: 300,
      payload: { amount: 80 },
    });
    expect(t.events.find((e) => e.type === 'shield_apply')).toMatchObject({
      tick: 300,
      payload: { status: { amount: 80 } },
    });
  });
});

describe('existing content and runnable diagnostics', () => {
  it('keeps DOLEA HP, shields, mana, damage and RNG equivalent under neutral advanced defaults', () => {
    const old = runCombat(createAbilityScenario('ability-1', 42)),
      current = runCombat(fixture('dolea-advanced'));
    expect(current.result).toEqual(old.result);
    const significant = (t: typeof old) =>
      t.snapshots.map((s) => ({
        tick: s.tick,
        rng: s.rngState,
        units: s.units.map((u) => ({
          id: u.id,
          hp: u.hp,
          mana: u.mana,
          charge: u.attackCharge,
          death: u.deathTick,
        })),
      }));
    expect(significant(current)).toEqual(significant(old));
    expect(current.events.filter((e) => e.type === 'shield_apply').map((e) => e.payload)).toEqual(
      old.events.filter((e) => e.type === 'shield_apply').map((e) => e.payload),
    );
  });
  it.each(STATS_SCENARIOS)('diagnostic %s validates, terminates and reproduces', (scenario) => {
    const input = fixture(scenario),
      engine = new CombatEngine(input),
      t = runCombat(input);
    expect(t.result.tick).toBeLessThanOrEqual(450);
    expect(engine.snapshot().rulesVersion).toBe(ADVANCED_COMBAT_RULES);
    expect(runCombat(input)).toEqual(t);
  });
});
