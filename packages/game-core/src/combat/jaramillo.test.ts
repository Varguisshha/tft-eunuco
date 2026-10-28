import { describe, expect, it } from 'vitest';
import {
  JARAMILLO_ECONOMY_CONFIG,
  VARGAS_ECONOMY_CONFIG,
  matchCatalog,
  traitsFor,
} from '@tft/game-data';
import {
  CombatInputSchema,
  CombatStateSchema,
  CombatEventV3Schema,
  DEFAULT_OVERTIME,
  type CombatInput,
  type OwnedUnit,
} from '@tft/shared';
import { scaledProfile, scaledOwnedProfile, matchTraits } from '../match/selectors';
import { createMatch } from '../match/engine';
import { awardRoundProgress, clearMatchProgress, mergeUnitProgress } from '../match/progress';
import { runCombat } from './engine';
import { effectiveStat } from './math';
const config = JARAMILLO_ECONOMY_CONFIG;
function fixture(stars: 1 | 2 | 3 = 1): CombatInput {
  const profile = scaledProfile('jaramillo', stars, config);
  profile.stats.startingMana = 70;
  profile.championAbility!.active!.initialMana = 70;
  const target = scaledProfile('jaramillo', 1, config);
  delete target.championAbility;
  target.stats.maxHp = 100000;
  target.stats.attackSpeedMilli = 1;
  target.stats.attack = 0;
  target.stats.armor = 100;
  return {
    combatId: 'jaramillo-test',
    protocolVersion: 3,
    rulesVersion: 'f0p6c-1',
    seed: 42,
    maxTicks: 60,
    overtime: DEFAULT_OVERTIME,
    obstacles: [],
    traits: [...traitsFor(config.catalog)],
    units: [
      {
        id: 'source',
        definitionId: 'jaramillo',
        owner: 'south',
        position: { q: 2, r: 4 },
        profile,
      },
      {
        id: 'target',
        definitionId: 'dummy',
        owner: 'north',
        position: { q: 2, r: 2 },
        profile: target,
      },
    ],
  };
}
describe('P6C composite logical effects', () => {
  it('adds only Jaramillo and preserves prior economy', () => {
    expect(config).toEqual({ ...VARGAS_ECONOMY_CONFIG, catalog: 'f0p6c' });
    expect(matchCatalog(config)).toHaveLength(matchCatalog(VARGAS_ECONOMY_CONFIG).length + 1);
    expect(scaledProfile('jaramillo', 1, config).stats).toMatchObject({
      maxHp: 550,
      attack: 48,
      range: 3,
      attackSpeedMilli: 750,
    });
  });
  it.each([1, 2, 3] as const)(
    'star %s commits one projectile and one physical spell hit',
    (stars) => {
      const input = fixture(stars),
        trace = runCombat(input);
      const launch = trace.events.find(
        (e) => e.type === 'projectile_launch' && e.payload.cause === 'ability',
      )!;
      if (launch.type !== 'projectile_launch') throw new Error('Missing projectile');
      const hits = trace.events.filter(
        (e) => e.type === 'damage' && e.payload.projectileId === launch.payload.id,
      );
      expect(hits).toHaveLength(1);
      const hit = hits[0]!;
      if (hit.type !== 'damage') throw new Error('Missing hit');
      expect(hit.tick).toBe(launch.payload.impactTick);
      expect(hit.payload.amount).toBe(
        Math.floor(
          Math.floor(
            (input.units[0]!.profile.stats.attack * [1600, 2400, 4000][stars - 1]!) / 1000,
          ) / 2,
        ),
      );
      const unit = trace.snapshots[hit.tick]!.units.find((u) => u.id === 'target')!;
      expect(effectiveStat(unit, 'armor')).toBe([85, 80, 70][stars - 1]);
      expect(unit.statuses.find((s) => s.group === 'armor-reduction')!.expiresTick).toBe(
        hit.tick + 40,
      );
      expect(runCombat(input)).toEqual(trace);
      for (const state of trace.snapshots) expect(CombatStateSchema.parse(state)).toEqual(state);
      for (const e of trace.events) expect(CombatEventV3Schema.parse(e)).toEqual(e);
    },
  );
  it('drops a committed projectile when its target has died, without a second hit', () => {
    const input = fixture();
    input.units[1]!.profile.stats.maxHp = 20;
    const ally = structuredClone(input.units[0]!);
    ally.id = 'killer';
    ally.definitionId = 'synthetic-killer';
    ally.position = { q: 1, r: 4 };
    delete ally.profile.championAbility;
    ally.profile.stats.startingMana = 0;
    ally.profile.stats.maxMana = 0;
    ally.profile.stats.attack = 1000;
    input.units.push(ally, {
      ...structuredClone(input.units[1]!),
      id: 'reserve',
      position: { q: 6, r: 0 },
      profile: {
        ...structuredClone(input.units[1]!.profile),
        stats: { ...input.units[1]!.profile.stats, maxHp: 100000 },
      },
    });
    const trace = runCombat(input);
    const launch = trace.events.find(
      (e) =>
        e.type === 'projectile_launch' &&
        e.payload.cause === 'ability' &&
        e.payload.targetId === 'target',
    );
    expect(launch).toBeDefined();
    if (launch?.type !== 'projectile_launch') throw Error('Missing launch');
    expect(
      trace.events.some(
        (e) =>
          e.type === 'unit_death' &&
          e.payload.unitId === 'target' &&
          e.tick < launch.payload.impactTick,
      ),
    ).toBe(true);
    expect(
      trace.events.filter(
        (e) => e.type === 'damage' && e.payload.projectileId === launch.payload.id,
      ),
    ).toHaveLength(0);
  });
  it('equal Humo refreshes one status with a fresh 30-tick duration', () => {
    const input = fixture();
    const source = input.units[0]!;
    source.profile.stats.startingMana = 0;
    source.profile.championAbility!.active!.initialMana = 0;
    source.profile.stats.maxMana = 0;
    delete source.profile.championAbility;
    source.profile.traits = ['fumon'];
    const ally = structuredClone(source);
    ally.id = 'synthetic-member';
    ally.definitionId = 'synthetic-member';
    ally.position = { q: 1, r: 4 };
    input.units.push(ally);
    const trace = runCombat(input);
    const statuses = trace.snapshots.flatMap((s) => s.units.filter((u) => u.id === 'target'));
    expect(statuses.some((u) => u.statuses.some((s) => s.group === 'armor-reduction'))).toBe(true);
    for (const u of statuses)
      expect(u.statuses.filter((s) => s.group === 'armor-reduction')).toHaveLength(
        u.statuses.some((s) => s.group === 'armor-reduction') ? 1 : 0,
      );
    const applied = trace.events.filter(
      (e) => e.type === 'status_apply' && e.payload.status.group === 'armor-reduction',
    );
    expect(applied.length).toBeGreaterThan(2);
    for (const event of applied)
      if (event.type === 'status_apply')
        expect(event.payload.status.expiresTick).toBe(event.tick + 30);
    expect(
      trace.events.some((e) => e.type === 'status_expire' && e.payload.reason === 'consumed'),
    ).toBe(true);
  });
  it('rejects composite mechanics in historical combat rules', () => {
    const input = fixture();
    input.rulesVersion = 'f0p6b3-1';
    expect(() => CombatInputSchema.parse(input)).toThrow();
  });
  it('strongest armor reduction wins and other modifiers remain independent', () => {
    const unit = runCombat(fixture()).snapshots[0]!.units[1]!;
    unit.profile.stats.armor = 100;
    unit.statuses = [80, 150, 300].map((amount, i) => ({
      id: `s${i}`,
      sourceId: 'source',
      kind: 'modifier',
      stat: 'armor',
      mode: 'percent_milli',
      group: 'armor-reduction',
      amount,
      expiresTick: 40,
    }));
    expect(effectiveStat(unit, 'armor')).toBe(70);
    unit.statuses.pop();
    expect(effectiveStat(unit, 'armor')).toBe(85);
    unit.statuses.pop();
    expect(effectiveStat(unit, 'armor')).toBe(92);
  });
});
describe('P6C per-instance progress', () => {
  const owned = (id: string, bench = false): OwnedUnit => ({
    id,
    definitionId: 'jaramillo',
    stars: 1,
    location: bench ? { kind: 'bench', slot: 0 } : { kind: 'board', hex: { q: 0, r: 4 } },
  });
  function state() {
    const s = createMatch(42, config);
    s.units = [owned('source'), owned('bench', true)];
    s.combat = {
      input: fixture(),
      result: { outcome: 'win', winner: 'south', reason: 'elimination', tick: 5 },
      bank: 0,
    } as NonNullable<typeof s.combat>;
    return s;
  }
  it('awards participants only, once per round, caps at eight and scales AD once', () => {
    const s = state();
    for (let round = 1; round <= 12; round++) {
      s.round = round;
      awardRoundProgress(s);
      awardRoundProgress(s);
    }
    expect(s.units[0]!.progress!.stacks[0]!.count).toBe(8);
    expect(s.units[1]!.progress).toBeUndefined();
    expect(scaledOwnedProfile(s.units[0]!, config).stats.attack).toBe(59);
    s.units[0]!.location = { kind: 'bench', slot: 1 };
    expect(scaledOwnedProfile(s.units[0]!, config).stats.attack).toBe(59);
    clearMatchProgress(s);
    expect(s.units.every((u) => !u.progress)).toBe(true);
  });
  it('excludes ghost rounds, losses and draws', () => {
    const s = state();
    awardRoundProgress(s, false);
    expect(s.units[0]!.progress).toBeUndefined();
    for (const winner of ['north', null] as const) {
      s.combat!.result!.winner = winner;
      awardRoundProgress(s);
      expect(s.units[0]!.progress).toBeUndefined();
    }
  });
  it('diagnostic development wins never grant persistent progress', () => {
    const s = state();
    s.development = { tainted: true, version: 1, healthAdjustments: [] };
    awardRoundProgress(s);
    expect(s.units.every((u) => !u.progress)).toBe(true);
  });
  it('fusion retains maximum and survivor identity', () => {
    const copies = [owned('a'), owned('b'), owned('c')];
    copies.forEach(
      (u, i) =>
        (u.progress = {
          version: 1,
          stacks: [{ id: 'kilometros', count: [2, 7, 4][i]!, lastRound: 8 }],
        }),
    );
    mergeUnitProgress(copies[0]!, copies, config);
    expect(copies[0]).toMatchObject({ id: 'a', progress: { stacks: [{ count: 7 }] } });
  });
  it('Hortaleza counts distinct deployed members; Fumón remains at one', () => {
    const s = state();
    s.units.push({
      ...owned('dolea'),
      definitionId: 'dolea',
      location: { kind: 'board', hex: { q: 1, r: 4 } },
    });
    expect(matchTraits(s).find((t) => t.trait.id === 'hortaleza')).toMatchObject({
      count: 2,
      active: true,
    });
    expect(matchTraits(s).find((t) => t.trait.id === 'fumon')).toMatchObject({
      count: 1,
      active: false,
    });
  });
});

describe('FUMÓN synthetic threshold coverage', () => {
  it.each([2, 3])(
    '%s distinct members apply one strongest reduction and no recursive bonus',
    (count) => {
      const input = fixture();
      input.units[0]!.profile.stats.startingMana = 0;
      input.units[0]!.profile.championAbility!.active!.initialMana = 0;
      input.units[0]!.profile.traits = ['fumon'];
      for (let i = 1; i < count; i++)
        input.units.push({
          ...structuredClone(input.units[0]!),
          id: `member-${i}`,
          definitionId: `synthetic-${i}`,
          position: { q: 2 - i, r: 4 },
        });
      const trace = runCombat(input);
      const target = trace.snapshots
        .find((s) =>
          s.units
            .find((u) => u.id === 'target')!
            .statuses.some((s) => s.group === 'armor-reduction'),
        )!
        .units.find((u) => u.id === 'target')!;
      expect(effectiveStat(target, 'armor')).toBe(count === 2 ? 92 : 85);
      const bonus = trace.events.filter(
        (e) => e.type === 'damage' && e.payload.cause === 'ability' && !e.payload.projectileId,
      );
      expect(bonus).toHaveLength(count === 3 ? 1 : 0);
      if (count === 3)
        expect(
          trace.snapshots.at(-1)!.units.find((u) => u.id === 'target')!.receivedEffects,
        ).toEqual(['fumon-first-smoke']);
      expect(trace.events.length).toBeLessThan(1000);
    },
  );
});
