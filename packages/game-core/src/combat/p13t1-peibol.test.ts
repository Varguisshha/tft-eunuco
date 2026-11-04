import { expect, it } from 'vitest';
import { CombatInputSchema, type CombatInput, type CombatProfile } from '@tft/shared';
import { P13T1_ECONOMY_CONFIG } from '@tft/game-data';
import { scaledProfile } from '../match/selectors';
import { runCombat } from './engine';
import { effectiveStat } from './math';
import { withGhostArmy } from './ghost';
function input(stars: 1 | 2 | 3 = 1, passiveOnly = false): CombatInput {
  const p = scaledProfile('peibol', stars, P13T1_ECONOMY_CONFIG);
  p.traits = [];
  p.stats = {
    ...p.stats,
    maxHp: 10000,
    attack: 100,
    critChanceMilli: 0,
    attackSpeedMilli: 1000,
    armor: 0,
    magicResist: 0,
  };
  if (passiveOnly) {
    const a = p.championAbility!;
    p.championAbility = {
      version: 1,
      id: a.id,
      name: a.name,
      icon: a.icon,
      description: a.description,
      type: 'passive',
      passive: a.passive!,
    };
    p.stats.maxMana = 0;
  }
  const foe: CombatProfile = {
    stats: { ...p.stats, attack: 0, range: 1, maxMana: 0, startingMana: 0, maxHp: 10000 },
    starLevel: 1,
    ability: null,
    passive: null,
    traits: [],
  };
  return CombatInputSchema.parse({
    protocolVersion: 3,
    rulesVersion: 'f0p13t-1',
    combatId: 'p13t1-peibol',
    seed: 42,
    maxTicks: 200,
    units: [
      {
        id: 'source',
        definitionId: 'peibol',
        owner: 'south',
        position: { q: 0, r: 4 },
        profile: p,
      },
      { id: 'foe', definitionId: 'cosmin', owner: 'north', position: { q: 0, r: 1 }, profile: foe },
    ],
    traits: [],
    obstacles: [],
  });
}
it('confirmed hits alone grant charges 1–5, never beyond +20% AS; fifth lethal hit grants Smurf and expires after 40 ticks', () => {
  const base = input(1, true),
    baseline = runCombat(base);
  const first = baseline.events
    .filter(
      (e) => e.type === 'damage' && e.payload.sourceId === 'source' && e.payload.cause === 'attack',
    )
    .slice(0, 5);
  const hp = first.reduce((sum, e) => sum + (e.type === 'damage' ? e.payload.amount : 0), 0);
  base.units[1]!.profile.stats.maxHp = hp;
  base.units.push({
    ...structuredClone(base.units[1]!),
    id: 'second',
    position: { q: 4, r: 0 },
    profile: {
      ...structuredClone(base.units[1]!.profile),
      stats: { ...base.units[1]!.profile.stats, maxHp: 100000 },
    },
  });
  const r = runCombat(base),
    gain = r.events.filter((e) => e.type === 'stack_gain' && e.payload.stackId === 'ego-p13t');
  expect(gain.slice(0, 5).map((e) => (e.type === 'stack_gain' ? e.payload.count : 0))).toEqual([
    1, 2, 3, 4, 5,
  ]);
  const buff = r.events.find(
    (e) => e.type === 'status_apply' && e.payload.status.key === 'modo-smurf-p13t',
  );
  expect(buff).toBeDefined();
  if (buff?.type !== 'status_apply') throw Error('No Smurf');
  const confirms = r.events.filter(
    (e) => e.type === 'attack_confirmed' && e.payload.targetId === 'foe',
  );
  expect(confirms).toHaveLength(5);
  expect(buff.tick).toBe(confirms[4]!.tick);
  expect(buff.payload.status).toMatchObject({ amount: 200, expiresTick: buff.tick + 40 });
  expect(
    r.events.some(
      (e) =>
        e.type === 'status_expire' &&
        e.payload.statusId === buff.payload.status.id &&
        e.tick === buff.tick + 40,
    ),
  ).toBe(true);
  expect(
    Math.max(
      ...r.snapshots.map((s) =>
        effectiveStat(s.units.find((u) => u.id === 'source')!, 'attackSpeedMilli'),
      ),
    ),
  ).toBeLessThanOrEqual(1200);
  expect(runCombat(base)).toEqual(r);
});
function caster(i: CombatInput, damage: number, castTicks: number) {
  const profile = structuredClone(i.units[1]!.profile);
  profile.stats = { ...profile.stats, attack: 0, range: 14, maxMana: 1, startingMana: 1 };
  profile.ability = {
    id: 'controlled-hit',
    name: 'Controlled hit',
    manaCost: 1,
    castTicks,
    effects: [
      { kind: 'damage', target: 'target', radius: 0, amount: damage, damageType: 'physical' },
    ],
  };
  i.units.push({
    id: 'ally',
    definitionId: 'cosmin',
    owner: 'south',
    position: { q: 1, r: 4 },
    profile,
  });
}
it('stun cancels windup without charge; a target killed during flight gives no Ego', () => {
  const i = input(1, true),
    foe = i.units[1]!.profile;
  foe.stats = { ...foe.stats, maxMana: 1, startingMana: 1, range: 14 };
  foe.ability = {
    id: 'controlled-stun',
    name: 'Controlled stun',
    manaCost: 1,
    castTicks: 1,
    effects: [{ kind: 'stun', target: 'target', radius: 0, duration: 10 }],
  };
  const r = runCombat(i),
    cancel = r.events.find(
      (e) =>
        e.type === 'action_cancel' && e.payload.unitId === 'source' && e.payload.reason === 'stun',
    );
  expect(cancel).toBeDefined();
  expect(r.events.some((e) => e.type === 'stack_gain' && e.tick <= cancel!.tick)).toBe(false);
  const dead = input(1, true);
  dead.units[1]!.profile.stats.range = 14;
  caster(dead, 100000, 3);
  const d = runCombat(dead);
  expect(
    d.events.some((e) => e.type === 'projectile_launch' && e.payload.sourceId === 'source'),
  ).toBe(true);
  expect(d.events.some((e) => e.type === 'attack_confirmed' && e.payload.unitId === 'source')).toBe(
    false,
  );
  expect(d.events.some((e) => e.type === 'stack_gain' && e.payload.stackId === 'ego-p13t')).toBe(
    false,
  );
});
it.each([1, 2, 3] as const)(
  'HEADSHOT %i★ reads HP at impact, strictly below 35%; a shield never grants a lethal refund',
  (stars) => {
    for (const hp of [3500, 3499]) {
      const i = input(stars),
        p = i.units[0]!.profile;
      p.stats.startingMana = 70;
      p.championAbility!.active!.initialMana = 70;
      caster(i, 10000 - hp, 4);
      const r = runCombat(i),
        launch = r.events.find(
          (e) =>
            e.type === 'projectile_launch' &&
            e.payload.sourceId === 'source' &&
            e.payload.cause === 'ability',
        )!;
      const damage = r.events.find(
        (e) =>
          e.type === 'damage' && e.payload.sourceId === 'source' && e.payload.cause === 'ability',
      );
      expect(damage!.tick).toBeGreaterThan(5);
      expect(launch.tick).toBeLessThan(5);
      expect(damage?.type === 'damage' && damage.payload.accounting?.requested).toBe(
        Math.floor([220, 330, 500][stars - 1]! * (hp < 3500 ? 1.25 : 1)),
      );
    }
    const i = input(stars);
    i.units[0]!.profile.stats.startingMana = 70;
    i.units[0]!.profile.championAbility!.active!.initialMana = 70;
    i.maxTicks = 9;
    i.units[1]!.profile.passive = {
      id: 'controlled-shield',
      trigger: 'combat_start',
      effects: [{ kind: 'shield', target: 'self', radius: 0, amount: 1000, duration: 100 }],
    };
    const r = runCombat(i);
    expect(
      r.events.some(
        (e) =>
          e.type === 'damage' &&
          e.payload.sourceId === 'source' &&
          e.payload.cause === 'ability' &&
          e.payload.absorbed > 0,
      ),
    ).toBe(true);
    expect(
      r.events.some(
        (e) => e.type === 'mana_gain' && e.payload.unitId === 'source' && e.payload.amount === 25,
      ),
    ).toBe(false);
    const ghost = runCombat(withGhostArmy(i, 'owner', 'real'));
    expect(ghost.input.ghost?.damageMultiplierMilli).toBe(800);
    expect(runCombat(ghost.input)).toEqual(ghost);
  },
);
it('an old-target projectile that lands after a real targeting change cannot replenish Ego', () => {
  const i = input(1, true);
  i.units[1]!.profile.stats.range = 14;
  i.units.push({
    ...structuredClone(i.units[1]!),
    id: 'zzsecond',
    position: { q: 2, r: 1 },
    profile: {
      ...structuredClone(i.units[1]!.profile),
      stats: { ...i.units[1]!.profile.stats, range: 1, moveTicks: 3 },
    },
  });
  const r = runCombat(i),
    launch = r.events.find(
      (e) =>
        e.type === 'projectile_launch' &&
        e.payload.sourceId === 'source' &&
        e.payload.targetId === 'foe',
    );
  expect(launch).toBeDefined();
  if (launch?.type !== 'projectile_launch') throw Error('No flight');
  const before = r.snapshots[launch.payload.impactTick - 1]!.units.find((u) => u.id === 'source')!;
  expect(before.targetId).toBe('zzsecond');
  const hit = r.events.find(
    (e) => e.type === 'damage' && e.payload.projectileId === launch.payload.id,
  );
  expect(hit).toBeDefined();
  expect(
    r.snapshots[launch.payload.impactTick]!.units.find(
      (u) => u.id === 'source',
    )!.mechanics!.stacks.find((s) => s.definitionId === 'ego-p13t')!.count,
  ).toBe(0);
});
it('a second qualified elimination refreshes one Smurf buff rather than stacking AD', () => {
  const i = input(1, true);
  i.units[0]!.profile.stats.attackSpeedMilli = 3000;
  i.units[1]!.profile.stats.range = 14;
  const baseline = runCombat(i),
    damage = baseline.events
      .filter(
        (e) =>
          e.type === 'damage' && e.payload.sourceId === 'source' && e.payload.cause === 'attack',
      )
      .slice(0, 5);
  i.units[1]!.profile.stats.maxHp = damage.reduce(
    (s, e) => s + (e.type === 'damage' ? e.payload.amount : 0),
    0,
  );
  for (const [id, hp, q, r] of [
    ['second', 700, 1, 1],
    ['third', 100000, 3, 0],
  ] as const)
    i.units.push({
      ...structuredClone(i.units[1]!),
      id,
      position: { q, r },
      profile: {
        ...structuredClone(i.units[1]!.profile),
        stats: { ...i.units[1]!.profile.stats, maxHp: hp },
      },
    });
  const trace = runCombat(i),
    buffs = trace.events.filter(
      (e) => e.type === 'status_apply' && e.payload.status.key === 'modo-smurf-p13t',
    );
  expect(buffs).toHaveLength(2);
  expect(buffs[1]!.tick).toBeLessThan(buffs[0]!.tick + 40);
  for (const s of trace.snapshots)
    expect(
      s.units.find((u) => u.id === 'source')!.statuses.filter((s) => s.key === 'modo-smurf-p13t')
        .length,
    ).toBeLessThanOrEqual(1);
});

it('HEADSHOT consumes 70 mana and refunds exactly 25 once for its lethal projectile', () => {
  const i = input(1);
  i.maxTicks = 12;
  i.units[0]!.profile.stats.startingMana = 70;
  i.units[0]!.profile.championAbility!.active!.initialMana = 70;
  i.units[1]!.profile.stats.maxHp = 100;
  i.units.push({
    ...structuredClone(i.units[1]!),
    id: 'second',
    position: { q: 3, r: 1 },
    profile: {
      ...structuredClone(i.units[1]!.profile),
      stats: { ...i.units[1]!.profile.stats, maxHp: 100000 },
    },
  });
  const r = runCombat(i);
  expect(r.snapshots[1]!.units.find((u) => u.id === 'source')!.mana).toBe(0);
  const refunds = r.events.filter(
    (e) => e.type === 'mana_gain' && e.payload.unitId === 'source' && e.payload.amount === 25,
  );
  expect(refunds).toHaveLength(1);
  const spell = r.events.filter(
    (e) => e.type === 'damage' && e.payload.sourceId === 'source' && e.payload.cause === 'ability',
  );
  expect(spell).toHaveLength(1);
  expect(refunds[0]!.tick).toBe(spell[0]!.tick);
  expect(runCombat(r.input)).toEqual(r);
});
