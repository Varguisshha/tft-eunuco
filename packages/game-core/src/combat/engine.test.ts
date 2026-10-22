import { describe, expect, it } from 'vitest';
import {
  CombatBatchSchema,
  CombatEventV3Schema,
  CombatInputSchema,
  CombatStateSchema,
  type CombatAbility,
} from '@tft/shared';
import { createCombatInput } from '@tft/game-data';
import { CombatEngine, runCombat } from './engine';
import { effectiveStat, mitigateDamage, randomUint32 } from './math';
import { BOARD_HEXES } from '../hex';
import { duel, input, spec } from './fixtures.test-support';
const ability = (effects: CombatAbility['effects'], castTicks = 1): CombatAbility => ({
  id: 'test',
  name: 'Test',
  manaCost: 10,
  castTicks,
  effects,
});
const castStats = { maxMana: 10, startingMana: 10, attack: 0, attackSpeedMilli: 1 };
describe('reproducible authority', () => {
  it('repeats exact bytes without modifying input, and ignores input unit order', () => {
    const setup = input(duel());
    const before = JSON.stringify(setup);
    const a = runCombat(setup),
      b = runCombat(JSON.parse(before));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(setup)).toBe(before);
    expect(runCombat({ ...setup, units: [...setup.units].reverse() }).events).toEqual(a.events);
  });
  it('uses validated uint32 seeds including zero and a known Mulberry32 vector', () => {
    expect(randomUint32(0)).toEqual({ state: 1831565813, value: 1144304738 });
    expect(() => randomUint32(-1)).toThrow();
    const a = runCombat(input(duel(), { seed: 1 })),
      b = runCombat(input(duel(), { seed: 2 }));
    expect(a.events.filter((e) => e.type === 'damage')).not.toEqual(
      b.events.filter((e) => e.type === 'damage'),
    );
  });
  it('validates versions, seed, overlaps and bounded duration', () => {
    const setup = input(duel());
    for (const patch of [
      { seed: 2 ** 32 },
      { rulesVersion: 'future' },
      { protocolVersion: 4 },
      { maxTicks: 451 },
    ])
      expect(CombatInputSchema.safeParse({ ...setup, ...patch }).success).toBe(false);
    expect(CombatInputSchema.safeParse({ ...setup, obstacles: [{ q: 0, r: 4 }] }).success).toBe(
      false,
    );
  });
  it('finishes empty/one-sided combat immediately and does nothing after end', () => {
    expect(runCombat(input([])).result).toEqual({
      outcome: 'double_loss',
      winner: null,
      reason: 'empty',
      tick: 0,
    });
    const engine = new CombatEngine(input([duel()[0]!]));
    const before = engine.snapshot();
    expect(before.result?.winner).toBe('south');
    expect(engine.step()).toEqual([]);
    expect(engine.snapshot()).toEqual(before);
  });
  it('stops unreachable combat at the exact time limit without actions after combat_end', () => {
    const replay = runCombat(
      input([spec('a', 'south', { q: 0, r: 5 }), spec('b', 'north', { q: 0, r: 1 })], {
        maxTicks: 12,
        obstacles: BOARD_HEXES.filter((h) => h.r === 3),
      }),
    );
    expect(replay.result).toEqual({
      outcome: 'double_loss',
      winner: null,
      reason: 'timeout',
      tick: 12,
    });
    expect(replay.events.at(-1)?.type).toBe('combat_end');
    expect(replay.snapshots.at(-1)?.units.every((u) => u.action === null)).toBe(true);
  });
  it('returns detached snapshots and ordered, serializable protocol batches', () => {
    const engine = new CombatEngine(input(duel()));
    const first = engine.snapshot();
    first.units[0]!.hp = 1;
    expect(engine.snapshot().units[0]!.hp).toBe(1000);
    const replay = runCombat(input(duel(), { maxTicks: 15 }));
    for (const e of replay.events)
      expect(CombatEventV3Schema.parse(JSON.parse(JSON.stringify(e)))).toEqual(e);
    for (const state of replay.snapshots)
      expect(CombatStateSchema.safeParse(state).success).toBe(true);
    const batch = {
      protocolVersion: 3,
      rulesVersion: 'f0p3.1-1',
      fromTick: 0,
      toTick: 15,
      events: replay.events,
      snapshots: replay.snapshots,
    };
    expect(CombatBatchSchema.safeParse(batch).success).toBe(true);
    expect(
      CombatBatchSchema.safeParse({ ...batch, events: [...replay.events].reverse() }).success,
    ).toBe(false);
  });
});
describe('attacks, impacts and cadence', () => {
  it('resolves melee at release, with no projectile', () => {
    const replay = runCombat(input(duel(), { maxTicks: 5 }));
    expect(replay.events.find((e) => e.type === 'attack_start')?.tick).toBe(1);
    expect(replay.events.find((e) => e.type === 'damage')?.tick).toBe(3);
    expect(replay.events.some((e) => e.type === 'projectile_launch')).toBe(false);
  });
  it('delays ranged damage until the projectile arrives', () => {
    const replay = runCombat(
      input(
        [
          spec('a', 'south', { q: 0, r: 4 }, { range: 3 }),
          spec('b', 'north', { q: 0, r: 1 }, { range: 3 }),
        ],
        { maxTicks: 8 },
      ),
    );
    const launch = replay.events.find((e) => e.type === 'projectile_launch')!;
    expect(launch.type).toBe('projectile_launch');
    if (launch.type === 'projectile_launch') {
      expect(launch.tick).toBe(3);
      expect(launch.payload.impactTick).toBe(5);
      expect(replay.events.find((e) => e.type === 'damage')?.tick).toBe(launch.payload.impactTick);
    }
  });
  it('accumulates fractional attack speeds without per-attack rounding drift', () => {
    const units = duel();
    units[0]!.profile.stats.attackSpeedMilli = 1500;
    units[0]!.profile.stats.attack = 0;
    units[1]!.profile.stats.attack = 0;
    const replay = runCombat(input(units, { maxTicks: 30 }));
    expect(
      replay.events
        .filter((e) => e.type === 'attack_start')
        .filter((e) => e.payload.unitId === 'a')
        .map((e) => e.tick),
    ).toEqual([1, 8, 15, 21, 28]);
  });
  it('commits simultaneous lethal melee impacts before death settlement', () => {
    const units = duel().map((u) => ({
      ...u,
      profile: { ...u.profile, stats: { ...u.profile.stats, maxHp: 10, attack: 100 } },
    }));
    const replay = runCombat(input(units));
    expect(replay.result).toEqual({
      outcome: 'double_loss',
      winner: null,
      reason: 'elimination',
      tick: 3,
    });
    expect(replay.events.filter((e) => e.type === 'unit_death')).toHaveLength(2);
    const firstDeath = replay.events.findIndex((e) => e.type === 'unit_death');
    expect(
      replay.events
        .slice(firstDeath)
        .filter((e) => e.type === 'attack_start' || e.type === 'damage'),
    ).toHaveLength(0);
  });
  it('does not attack outside range and replaces a dead target', () => {
    const replay = runCombat(
      input(
        [
          spec('a', 'south', { q: 0, r: 4 }, { attack: 300 }),
          spec('b', 'north', { q: 0, r: 3 }, { maxHp: 10, attack: 0 }),
          spec('c', 'north', { q: 3, r: 0 }, { attack: 0 }),
        ],
        { maxTicks: 40 },
      ),
    );
    const starts = replay.events
      .filter((e) => e.type === 'attack_start')
      .filter((e) => e.payload.unitId === 'a');
    expect(starts[0]?.payload.targetId).toBe('b');
    expect(starts.some((e) => e.payload.targetId === 'c')).toBe(true);
    for (const e of starts) {
      const snapshot = replay.snapshots[e.tick]!;
      const a = snapshot.units.find((u) => u.id === 'a')!;
      const b = snapshot.units.find((u) => u.id === e.payload.targetId)!;
      const dq = a.position.q - b.position.q,
        dr = a.position.r - b.position.r;
      expect((Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2).toBeLessThanOrEqual(
        a.profile.stats.range,
      );
    }
  });
});
describe('mitigation', () => {
  it.each([
    ['physical', 100, 0, 50],
    ['magic', 0, 100, 50],
    ['true', 1000, 1000, 100],
    ['physical', -100, 0, 150],
    ['magic', 0, -100, 150],
  ] as const)('%s damage respects resistance and negative defenses', (type, armor, mr, expected) =>
    expect(mitigateDamage(100, type, armor, mr)).toBe(expected),
  );
  it('clamps extreme finite values and rejects non-finite statistics', () => {
    expect(mitigateDamage(100, 'physical', 1e100, 0)).toBe(1);
    expect(mitigateDamage(100, 'physical', -1e100, 0)).toBe(199);
    expect(mitigateDamage(-10, 'true', 0, 0)).toBe(0);
    expect(() => mitigateDamage(NaN, 'magic', 0, 0)).toThrow();
  });
});
describe('data-driven effects', () => {
  it('gains capped mana and spends it on automatic casts', () => {
    const spell = ability([
      { kind: 'damage', target: 'target', radius: 0, amount: 60, damageType: 'magic' },
    ]);
    const replay = runCombat(
      input(
        [
          spec('a', 'south', { q: 0, r: 4 }, { maxMana: 10 }, spell),
          spec('b', 'north', { q: 0, r: 3 }, { attack: 0 }),
        ],
        { maxTicks: 10 },
      ),
    );
    expect(
      replay.events.some(
        (e) => e.type === 'mana_gain' && e.payload.unitId === 'a' && e.payload.manaAfter === 10,
      ),
    ).toBe(true);
    const cast = replay.events.find(
      (e) => e.type === 'ability_cast' && e.payload.stage === 'start',
    );
    expect(cast?.type === 'ability_cast' && cast.payload.manaAfter).toBe(0);
    expect(replay.events.some((e) => e.type === 'damage' && e.payload.cause === 'ability')).toBe(
      true,
    );
  });
  it('heals without overheal and applies independent shields with expiration', () => {
    const spell = ability(
      [
        { kind: 'heal', target: 'self', radius: 0, amount: 5000 },
        { kind: 'shield', target: 'self', radius: 0, amount: 100, duration: 3 },
      ],
      4,
    );
    const replay = runCombat(
      input(
        [spec('a', 'south', { q: 0, r: 4 }, castStats, spell), spec('b', 'north', { q: 0, r: 3 })],
        { maxTicks: 9 },
      ),
    );
    const heal = replay.events.find((e) => e.type === 'heal');
    expect(heal?.type === 'heal' && heal.payload.hpAfter).toBe(1000);
    expect(replay.events.some((e) => e.type === 'shield_apply')).toBe(true);
    expect(
      replay.events.some((e) => e.type === 'status_expire' && e.payload.reason === 'duration'),
    ).toBe(true);
  });
  it('absorbs damage with passive shields and consumes them before HP', () => {
    const units = duel();
    units[0]!.profile.passive = {
      id: 'passive',
      trigger: 'combat_start',
      effects: [{ kind: 'shield', target: 'self', radius: 0, amount: 20, duration: 10 }],
    };
    const replay = runCombat(input(units, { maxTicks: 5 }));
    expect(replay.events.find((e) => e.type === 'shield_apply')?.tick).toBe(0);
    const damage = replay.events.find((e) => e.type === 'damage' && e.payload.targetId === 'a');
    expect(damage?.type === 'damage' && damage.payload.absorbed).toBe(20);
    expect(
      replay.events.some((e) => e.type === 'status_expire' && e.payload.reason === 'consumed'),
    ).toBe(true);
  });
  it('stuns, interrupts casts without refunds and resumes after expiry', () => {
    const stun = ability([{ kind: 'stun', target: 'target', radius: 0, duration: 4 }]);
    const slow = ability(
      [{ kind: 'damage', target: 'target', radius: 0, amount: 999, damageType: 'true' }],
      5,
    );
    const replay = runCombat(
      input(
        [
          spec('a', 'south', { q: 0, r: 4 }, castStats, stun),
          spec('b', 'north', { q: 0, r: 3 }, castStats, slow),
        ],
        { maxTicks: 10 },
      ),
    );
    expect(
      replay.events.some(
        (e) =>
          e.type === 'action_cancel' && e.payload.unitId === 'b' && e.payload.reason === 'stun',
      ),
    ).toBe(true);
    expect(
      replay.events.some(
        (e) =>
          e.type === 'ability_cast' && e.payload.unitId === 'b' && e.payload.stage === 'resolve',
      ),
    ).toBe(false);
    expect(replay.snapshots[5]!.units.find((u) => u.id === 'b')?.mana).toBe(0);
    expect(
      replay.events.some(
        (e) => e.type === 'attack_start' && e.payload.unitId === 'b' && e.tick >= 6,
      ),
    ).toBe(true);
    expect(
      replay.events.some(
        (e) => e.type === 'attack_start' && e.payload.unitId === 'b' && e.tick < 6,
      ),
    ).toBe(false);
  });
  it('stacks temporary stat modifiers additively and removes each on expiry', () => {
    const buff = ability([
      { kind: 'modifier', target: 'self', radius: 0, stat: 'attack', amount: 20, duration: 2 },
      { kind: 'modifier', target: 'self', radius: 0, stat: 'attack', amount: 10, duration: 4 },
    ]);
    const replay = runCombat(
      input(
        [
          spec(
            'a',
            'south',
            { q: 0, r: 4 },
            { ...castStats, maxMana: 50, startingMana: 50 },
            { ...buff, manaCost: 50 },
          ),
          spec('b', 'north', { q: 0, r: 3 }, { attack: 0 }),
        ],
        { maxTicks: 7 },
      ),
    );
    expect(effectiveStat(replay.snapshots[2]!.units[0]!, 'attack')).toBe(30);
    expect(effectiveStat(replay.snapshots[4]!.units[0]!, 'attack')).toBe(10);
    expect(effectiveStat(replay.snapshots[6]!.units[0]!, 'attack')).toBe(0);
  });
  it('applies area damage only to enemies in radius', () => {
    const aoe = ability([
      { kind: 'damage', target: 'enemies', radius: 1, amount: 75, damageType: 'true' },
    ]);
    const replay = runCombat(
      input(
        [
          spec('a', 'south', { q: 0, r: 4 }, { ...castStats, range: 3 }, aoe),
          spec('b', 'north', { q: 0, r: 3 }, { attack: 0 }),
          spec('c', 'north', { q: 1, r: 3 }, { attack: 0 }),
          spec('d', 'north', { q: 3, r: 0 }, { attack: 0 }),
        ],
        { maxTicks: 3 }, // v3 terminal tick has no actions; include the tick-2 impact.
      ),
    );
    expect(
      replay.events
        .filter((e) => e.type === 'damage')
        .filter((e) => e.payload.cause === 'ability')
        .map((e) => e.payload.targetId),
    ).toEqual(['b', 'c']);
  });
  it('runs the four catalog profiles in a complete local duel', () => {
    const ids = ['test-k01', 'test-v02', 'test-r03', 'test-m04'];
    const board = {
      units: ids.flatMap((definitionId, i) => [
        { id: `s${i}`, definitionId, owner: 'south' as const, position: { q: i - 2, r: 6 } },
        { id: `n${i}`, definitionId, owner: 'north' as const, position: { q: i, r: 1 } },
      ]),
    };
    const replay = runCombat(createCombatInput(board, 42));
    expect(replay.result.tick).toBeLessThanOrEqual(450);
    expect(
      CombatBatchSchema.safeParse({
        protocolVersion: 3,
        rulesVersion: 'f0p3.1-1',
        fromTick: 0,
        toTick: replay.result.tick,
        events: replay.events,
        snapshots: replay.snapshots,
      }).success,
    ).toBe(true);
    for (const type of [
      'move_start',
      'move_end',
      'attack_start',
      'projectile_launch',
      'damage',
      'heal',
      'shield_apply',
      'mana_gain',
      'ability_cast',
      'status_apply',
      'status_expire',
      'unit_death',
      'combat_end',
    ])
      expect(replay.events.some((e) => e.type === type)).toBe(true);
  });
});

describe('committed actions and reservations', () => {
  it('keeps an airborne projectile after its source dies while the duel continues', () => {
    const replay = runCombat(
      input(
        [
          spec('a', 'south', { q: 0, r: 4 }, { maxHp: 10, range: 3 }),
          spec('b', 'north', { q: 0, r: 3 }, { attack: 100 }),
          spec('c', 'south', { q: 3, r: 7 }, { attack: 0 }),
        ],
        { maxTicks: 6 },
      ),
    );
    expect(
      replay.events.some(
        (e) => e.type === 'unit_death' && e.payload.unitId === 'a' && e.tick === 3,
      ),
    ).toBe(true);
    expect(
      replay.events.some((e) => e.type === 'damage' && e.payload.sourceId === 'a' && e.tick === 5),
    ).toBe(true);
    expect(
      replay.events.some(
        (e) => e.type === 'attack_start' && e.payload.unitId === 'a' && e.tick > 3,
      ),
    ).toBe(false);
  });
  it('cancels movement on stun and releases the reserved destination', () => {
    const stun = ability([{ kind: 'stun', target: 'target', radius: 0, duration: 3 }]);
    const replay = runCombat(
      input(
        [
          spec('a', 'south', { q: 0, r: 4 }, { moveTicks: 10 }),
          spec('b', 'north', { q: 0, r: 1 }, { ...castStats, range: 3 }, stun),
        ],
        { maxTicks: 6 },
      ),
    );
    expect(replay.snapshots[1]!.units[0]!.action?.kind).toBe('move');
    expect(
      replay.events.some(
        (e) =>
          e.type === 'action_cancel' &&
          e.payload.unitId === 'a' &&
          e.payload.action === 'move' &&
          e.payload.reason === 'stun',
      ),
    ).toBe(true);
    expect(replay.snapshots[2]!.units[0]!.action).toBeNull();
    expect(replay.snapshots[2]!.units[0]!.position).toEqual({ q: 0, r: 4 });
    expect(replay.snapshots[5]!.units[0]!.action?.kind).toBe('move');
  });
  it('stacks shields and consumes the earliest expiration first', () => {
    const units = duel();
    units[1]!.profile.stats.attack = 40;
    units[0]!.profile.passive = {
      id: 'layers',
      trigger: 'combat_start',
      effects: [
        { kind: 'shield', target: 'self', radius: 0, amount: 100, duration: 20 },
        { kind: 'shield', target: 'self', radius: 0, amount: 20, duration: 10 },
      ],
    };
    const replay = runCombat(input(units, { maxTicks: 4 })); // Include tick-3 impact before terminal check.
    const hit = replay.events.find((e) => e.type === 'damage' && e.payload.targetId === 'a');
    expect(hit?.type === 'damage' && hit.payload.amount).toBe(0);
    expect(replay.snapshots[3]!.units[0]!.hp).toBe(1000);
    expect(
      replay.events.some(
        (e) =>
          e.type === 'status_expire' &&
          e.payload.statusId === 'effect-1' &&
          e.payload.reason === 'consumed',
      ),
    ).toBe(true);
    expect(replay.snapshots[3]!.units[0]!.statuses.map((s) => s.id)).toEqual(['effect-0']);
  });
});
