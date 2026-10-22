import { describe, expect, it } from 'vitest';
import {
  CombatBatchSchema,
  CombatEventV3Schema,
  CombatInputSchema,
  DEFAULT_OVERTIME,
  LegacyCombatV2,
  OvertimeConfigSchema,
  type CombatAbility,
} from '@tft/shared';
import { CombatEngine, runCombat } from './engine';
import { overtimeModifiers } from './overtime';
import { duel, input, spec } from './fixtures.test-support';
const idle = () =>
  duel().map((u) => ({
    ...u,
    profile: { ...u.profile, stats: { ...u.profile.stats, attack: 0, maxHp: 100000 } },
  }));
const flat = {
  damageMilli: [1000, 1000],
  attackSpeedMilli: [1000, 1000],
  healMilli: [1000, 1000],
  shieldMilli: [1000, 1000],
} as typeof DEFAULT_OVERTIME;
const through = (end: number) => runCombat(input(idle(), { maxTicks: end }));
describe('overtime boundaries and protocol', () => {
  it('starts once at tick 300 before all other events, never at 299', () => {
    const engine = new CombatEngine(input(idle(), { maxTicks: 450 }));
    for (let i = 0; i < 299; i++) engine.step();
    expect(engine.allEvents().some((e) => e.type === 'overtime_start')).toBe(false);
    const events = engine.step();
    expect(events[0]).toMatchObject({
      protocolVersion: 3,
      tick: 300,
      order: 0,
      type: 'overtime_start',
      payload: { startTick: 300, endTick: 450, modifiers: DEFAULT_OVERTIME },
    });
    while (!engine.snapshot().result) engine.step();
    expect(engine.allEvents().filter((e) => e.type === 'overtime_start')).toHaveLength(1);
    const before = engine.allEvents();
    engine.step();
    expect(engine.allEvents()).toEqual(before);
  });
  it('never emits overtime if combat already ended, including terminal tick 300', () => {
    expect(through(300).events.some((e) => e.type === 'overtime_start')).toBe(false);
    const units = duel();
    units[0]!.profile.stats.attack = 100000;
    expect(
      runCombat(input(units, { maxTicks: 450 })).events.some((e) => e.type === 'overtime_start'),
    ).toBe(false);
  });
  it('executes tick 449, but tick 450 only cancels pending actions and ends', () => {
    const units = idle();
    units.forEach((u) => (u.profile.stats.attackSpeedMilli = 5000));
    const r = runCombat(input(units, { maxTicks: 450 }));
    expect(r.result).toEqual({
      outcome: 'double_loss',
      winner: null,
      reason: 'timeout',
      tick: 450,
    });
    expect(r.snapshots).toHaveLength(451);
    expect(r.events.some((e) => e.tick === 449 && e.type === 'damage')).toBe(true);
    expect(
      r.events
        .filter((e) => e.tick === 450)
        .every((e) => e.type === 'action_cancel' || e.type === 'combat_end'),
    ).toBe(true);
    expect(r.snapshots[450]!.rngState).toBe(r.snapshots[449]!.rngState);
    expect(r.events.at(-1)?.type).toBe('combat_end');
  });
  it('keeps historical v2 validators isolated and rejects mixed versions', () => {
    const legacy = {
      protocolVersion: 2,
      tick: 300,
      order: 0,
      type: 'combat_end',
      payload: { winner: null, reason: 'timeout', tick: 300 },
    };
    expect(LegacyCombatV2.CombatEventV2Schema.safeParse(legacy).success).toBe(true);
    expect(CombatEventV3Schema.safeParse(legacy).success).toBe(false);
    const event = through(450).events.find((e) => e.type === 'overtime_start')!;
    expect(CombatEventV3Schema.safeParse(event).success).toBe(true);
    expect(LegacyCombatV2.CombatEventV2Schema.safeParse(event).success).toBe(false);
    expect(
      CombatEventV3Schema.safeParse({ ...event, payload: { ...event.payload, startTick: 299 } })
        .success,
    ).toBe(false);
  });
  it('serializes the complete v3 trace with strict ordering and reproducible bytes', () => {
    const setup = input(idle(), { maxTicks: 450 });
    const before = JSON.stringify(setup);
    const a = runCombat(setup),
      b = runCombat(JSON.parse(before));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(setup)).toBe(before);
    expect(
      CombatBatchSchema.safeParse({
        protocolVersion: 3,
        rulesVersion: 'f0p3.1-1',
        fromTick: 0,
        toTick: 450,
        events: a.events,
        snapshots: a.snapshots,
      }).success,
    ).toBe(true);
  });
});
describe('integer overtime modifiers', () => {
  it.each([
    [299, 1000, 1000, 1000],
    [300, 1250, 1200, 800],
    [374, 1622, 1473, 601],
    [449, 2000, 1750, 400],
    [450, 2000, 1750, 400],
  ])('has exact multipliers at tick %i', (tick, damageMilli, attackSpeedMilli, support) => {
    expect(overtimeModifiers(tick)).toEqual({
      damageMilli,
      attackSpeedMilli,
      healMilli: support,
      shieldMilli: support,
    });
  });
  it('is monotonic for all ticks and rejects invalid configurations', () => {
    for (let t = 300; t < 449; t++) {
      const a = overtimeModifiers(t),
        b = overtimeModifiers(t + 1);
      expect(b.damageMilli).toBeGreaterThanOrEqual(a.damageMilli);
      expect(b.attackSpeedMilli).toBeGreaterThanOrEqual(a.attackSpeedMilli);
      expect(b.healMilli).toBeLessThanOrEqual(a.healMilli);
    }
    for (const damageMilli of [
      [2000, 1250],
      [NaN, 2000],
      [1000, Infinity],
      [1000, 4001],
    ])
      expect(OvertimeConfigSchema.safeParse({ ...DEFAULT_OVERTIME, damageMilli }).success).toBe(
        false,
      );
    expect(() => overtimeModifiers(-1)).toThrow();
    expect(CombatInputSchema.safeParse({ ...input(idle()), maxTicks: 451 }).success).toBe(false);
  });
  it('amplifies attack and ability damage at impact without mutating profiles', () => {
    const units = idle();
    units[0]!.profile.stats.attack = 100;
    const setup = input(units, {
      maxTicks: 450,
      overtime: { ...DEFAULT_OVERTIME, attackSpeedMilli: [1000, 1000] },
    });
    const a = runCombat(setup),
      b = runCombat({ ...setup, overtime: flat });
    for (const hit of a.events
      .filter((e) => e.type === 'damage')
      .filter((e) => e.payload.sourceId === 'a')) {
      const base = b.events.find(
        (e) => e.type === 'damage' && e.tick === hit.tick && e.payload.sourceId === 'a',
      );
      if (base?.type !== 'damage') throw new Error('Missing paired impact');
      expect(hit.payload.amount).toBe(
        Math.floor((base.payload.amount * overtimeModifiers(hit.tick).damageMilli) / 1000),
      );
    }
    expect(setup.units[0]!.profile.stats.attack).toBe(100);
  });
  it('preserves fractional charge every tick at 1.5 attacks/s through overtime', () => {
    const units = idle();
    units.forEach((u) => {
      u.profile.stats.attackSpeedMilli = 1500;
      u.profile.stats.attackWindupTicks = 1;
    });
    const replay = runCombat(input(units, { maxTicks: 450 }));
    let charge = 10000;
    const expected: number[] = [];
    for (let t = 1; t < 450; t++) {
      if (charge < 10000)
        charge += Math.floor((1500 * overtimeModifiers(t).attackSpeedMilli) / 1000);
      if (charge >= 10000) {
        expected.push(t);
        charge -= 10000;
      }
    }
    expect(
      replay.events
        .filter((e) => e.type === 'attack_start' && e.payload.unitId === 'a')
        .map((e) => e.tick),
    ).toEqual(expected);
    expect(replay.snapshots[449]!.units[0]!.attackCharge).toBe(charge);
  });
  it('reduces healing and new shields but never retroactively shrinks existing layers', () => {
    const ability: CombatAbility = {
      id: 'support',
      name: 'Support',
      manaCost: 1,
      castTicks: 1,
      effects: [
        { kind: 'heal', target: 'self', radius: 0, amount: 100 },
        { kind: 'shield', target: 'self', radius: 0, amount: 100, duration: 450 },
        { kind: 'damage', target: 'target', radius: 0, amount: 100, damageType: 'true' },
      ],
    };
    const units = [
      spec(
        'a',
        'south',
        { q: 0, r: 4 },
        { maxHp: 100000, attack: 10, maxMana: 1, startingMana: 1 },
        ability,
      ),
      spec('b', 'north', { q: 0, r: 3 }, { maxHp: 100000, attack: 120 }),
    ];
    const r = runCombat(input(units, { maxTicks: 450 }));
    const heals = r.events.filter((e) => e.type === 'heal').filter((e) => e.tick >= 300);
    expect(heals.length).toBeGreaterThan(0);
    heals.forEach((e) =>
      expect(e.payload.amount).toBeLessThanOrEqual(
        Math.floor((100 * overtimeModifiers(e.tick).healMilli) / 1000),
      ),
    );
    const shields = r.events.filter((e) => e.type === 'shield_apply').filter((e) => e.tick >= 300);
    expect(shields.length).toBeGreaterThan(0);
    shields.forEach((e) =>
      expect(e.payload.status.amount).toBe(
        Math.floor((100 * overtimeModifiers(e.tick).shieldMilli) / 1000),
      ),
    );
    const abilityHits = r.events
      .filter((e) => e.type === 'damage')
      .filter((e) => e.payload.cause === 'ability' && e.tick >= 300);
    expect(abilityHits.length).toBeGreaterThan(0);
    abilityHits.forEach((e) =>
      expect(e.payload.amount).toBe(
        Math.floor((100 * overtimeModifiers(e.tick).damageMilli) / 1000),
      ),
    );
    const passive = idle();
    passive[0]!.profile.passive = {
      id: 'old-shield',
      trigger: 'combat_start',
      effects: [{ kind: 'shield', target: 'self', radius: 0, amount: 500, duration: 450 }],
    };
    const persistent = runCombat(input(passive, { maxTicks: 450 }));
    for (const tick of [299, 300, 449, 450])
      expect(persistent.snapshots[tick]!.units[0]!.statuses[0]!.amount).toBe(500);
  });
  it('allows a natural elimination during overtime and simultaneous elimination remains double loss', () => {
    const units = idle();
    units[0]!.profile.stats.attack = 100;
    units[1]!.profile.stats.maxHp = 4000;
    const r = runCombat(input(units, { maxTicks: 450 }));
    expect(r.result).toMatchObject({ outcome: 'win', winner: 'south', reason: 'elimination' });
    expect(r.result.tick).toBeGreaterThanOrEqual(300);
    expect(r.result.tick).toBeLessThan(450);
    const mutual = duel();
    mutual.forEach((u) => {
      u.profile.stats.maxHp = 10;
      u.profile.stats.attack = 100;
    });
    const m = runCombat(input(mutual, { maxTicks: 450 }));
    expect(m.result).toEqual({
      outcome: 'double_loss',
      winner: null,
      reason: 'elimination',
      tick: 3,
    });
    expect(m.events.filter((e) => e.type === 'unit_death')).toHaveLength(2);
  });
});
it('uses the impact multiplier for projectiles crossing 300 and discards impacts due at 450', () => {
  const units = idle();
  Object.assign(units[0]!.profile.stats, { attack: 100, range: 3, attackWindupTicks: 7 });
  const replay = runCombat(
    input(units, {
      maxTicks: 450,
      overtime: { ...DEFAULT_OVERTIME, attackSpeedMilli: [1000, 1000] },
    }),
  );
  const launch = replay.events
    .filter((e) => e.type === 'projectile_launch')
    .find((e) => e.payload.sourceId === 'a' && e.payload.impactTick === 300)!;
  const hit = replay.events
    .filter((e) => e.type === 'damage')
    .find((e) => e.payload.sourceId === 'a' && e.tick === 300)!;
  expect(launch.tick).toBe(298);
  expect(hit.payload.amount).toBe(Math.floor((launch.payload.rawDamage * 1250) / 1000));
  expect(replay.snapshots[449]!.projectiles.some((p) => p.impactTick === 450)).toBe(true);
  expect(replay.snapshots[450]!.projectiles).toEqual([]);
  expect(replay.events.some((e) => e.tick === 450 && e.type === 'damage')).toBe(false);
});
it('bounds charge and amounts for the maximum supported overtime configuration', () => {
  const units = idle();
  units.forEach((u) =>
    Object.assign(u.profile.stats, { attackSpeedMilli: 5000, attackWindupTicks: 1 }),
  );
  const replay = runCombat(
    input(units, {
      maxTicks: 450,
      overtime: {
        damageMilli: [4000, 4000],
        attackSpeedMilli: [4000, 4000],
        healMilli: [0, 0],
        shieldMilli: [0, 0],
      },
    }),
  );
  expect(
    replay.snapshots.every((s) =>
      s.units.every((u) => Number.isSafeInteger(u.attackCharge) && u.attackCharge <= 29999),
    ),
  ).toBe(true);
  expect(replay.result.tick).toBe(450);
});
it('rejects an overtime event at an incorrect envelope tick or order', () => {
  const e = through(450).events.find((e) => e.type === 'overtime_start')!;
  expect(CombatEventV3Schema.safeParse({ ...e, tick: 299 }).success).toBe(false);
  expect(CombatEventV3Schema.safeParse({ ...e, order: 1 }).success).toBe(false);
});
