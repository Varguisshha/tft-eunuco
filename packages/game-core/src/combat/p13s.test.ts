import { expect, it } from 'vitest';
import {
  P13S_TRAITS,
  P13S_ECONOMY_CONFIG,
  P12F_ECONOMY_CONFIG,
  P11_TRAITS,
  HORTALEZA_CONTRIBUTIONS,
} from '@tft/game-data';
import { CombatInputSchema, type CombatInput } from '@tft/shared';
import { runCombat } from './engine';
import { effectiveStat } from './math';
import { scaledProfile } from '../match/selectors';
import { carrascoScaling } from './synergies';
import { withGhostArmy } from './ghost';
function input(ids = ['dolea', 'jaramillo'], stars: 1 | 2 | 3 = 1): CombatInput {
  const units = ids.map((definitionId, i) => ({
    id: `ally-${i}`,
    definitionId,
    owner: 'south' as const,
    position: { q: (i % 7) - Math.floor((4 + Math.floor(i / 7)) / 2), r: 4 + Math.floor(i / 7) },
    profile: scaledProfile(definitionId, stars, P13S_ECONOMY_CONFIG),
  }));
  const p = scaledProfile('cosmin', 1, P13S_ECONOMY_CONFIG);
  p.stats = {
    ...p.stats,
    maxHp: 100000,
    attack: 12,
    range: 14,
    critChanceMilli: 0,
    armor: 0,
    magicResist: 0,
  };
  p.traits = [];
  return CombatInputSchema.parse({
    protocolVersion: 3,
    rulesVersion: 'f0p13s-1',
    combatId: 'p13s-test',
    seed: 4,
    maxTicks: 450,
    traits: P13S_TRAITS,
    obstacles: [],
    units: [
      ...units,
      { id: 'foe', definitionId: 'cosmin', owner: 'north', position: { q: 0, r: 2 }, profile: p },
    ],
  });
}
it.each([1, 2, 3] as const)(
  'UPM %i★ freezes contribution mean, aggregates HP loss and records competitive summon blockade without invented units',
  (stars) => {
    const i = input(['dolea', 'vargas'], stars);
    i.units.at(-1)!.profile.stats.attack = 500;
    const r = runCombat(i),
      t = r.snapshots[0]!.synergies!.teams[0]!;
    expect(t.scaling).toEqual(carrascoScaling(t.starSum, t.count));
    expect(t.starSum).toBe(stars * 2);
    expect(t.count).toBe(2);
    expect(t.thresholdMilli).toBe(500);
    expect(t.level).toBe(1);
    expect(carrascoScaling(t.starSum, t.count)).toEqual({
      maxHp: 1000 + 120 * (stars - 1),
      attack: 1000 + 80 * (stars - 1),
      armor: 1000 + 50 * (stars - 1),
      magicResist: 1000 + 50 * (stars - 1),
    });
    expect(r.snapshots.at(-1)!.synergies!.teams[0]!.triggered).toBe(true);
    expect(r.snapshots.at(-1)!.synergies!.teams[0]!.lostHp).toBe(
      r.events.reduce(
        (n, e) =>
          n +
          (e.type === 'damage' && t.memberIds.includes(e.payload.targetId) ? e.payload.amount : 0),
        0,
      ),
    );
    expect(r.snapshots.at(-1)!.units).toHaveLength(3);
    expect(runCombat(i)).toEqual(r);
  },
);
it('Hortaleza sums only distinct deployed members, scales team contributions once and preserves old catalogs', () => {
  const i = input(['jaramillo', 'cosmin', 'dolea']);
  i.units.push({ ...structuredClone(i.units[0]!), id: 'duplicate', position: { q: 1, r: 5 } });
  const r = runCombat(i),
    u = r.snapshots[0]!.units.find((u) => u.id === 'ally-0')!;
  expect(effectiveStat(u, 'attack')).toBe(Math.floor(u.profile.stats.attack * 1.06));
  expect(effectiveStat(u, 'armor')).toBe(u.profile.stats.armor + 9);
  const historic = structuredClone(i);
  historic.rulesVersion = 'f0p11h-1';
  historic.traits = [...P11_TRAITS];
  expect(runCombat(historic).snapshots[0]!.synergies).toBeUndefined();
  expect(Object.keys(HORTALEZA_CONTRIBUTIONS)).toHaveLength(12);
  expect(P12F_ECONOMY_CONFIG.synergyPolicy).toBeUndefined();
});
it.each([
  [2, 60, 150, 0],
  [4, 40, 250, 100],
  [6, 30, 400, 200],
])(
  'Shisheros %i members: exact tick %i release, reduction, no attacks/casts, permanent buffs',
  (n, ticks, power, speed) => {
    const ids = P13S_TRAITS.find((t) => t.id === 'shisheros')!.planning!.members.slice(0, n);
    const i = input(ids);
    const r = runCombat(i),
      unitId = 'ally-0';
    expect(
      r.events
        .filter((e) => e.type === 'attack_start' || e.type === 'ability_cast')
        .filter((e) => e.payload.unitId === unitId)
        .every((e) => e.tick >= ticks),
    ).toBe(true);
    const before = r.snapshots[ticks - 1]!.units.find((u) => u.id === unitId)!,
      after = r.snapshots[ticks]!.units.find((u) => u.id === unitId)!;
    expect(before.statuses.some((s) => s.key === 'p13s-shisha-attack')).toBe(false);
    expect(after.statuses.find((s) => s.key === 'p13s-shisha-attack')!.amount).toBe(power);
    expect(after.statuses.find((s) => s.key === 'p13s-shisha-attack')!.expiresTick).toBeNull();
    expect(after.statuses.find((s) => s.key === 'p13s-shisha-attackSpeedMilli')?.amount ?? 0).toBe(
      speed,
    );
    expect(r.events.some((e) => e.type === 'overtime_start')).toBe(true);
    expect(runCombat(i).events).toEqual(r.events);
  },
);
it('death while channeling never grants a completion bonus; channels do not suppress targeting or death', () => {
  const i = input(['jota', 'focho']);
  i.units.at(-1)!.profile.stats.attack = 100000;
  const r = runCombat(i);
  expect(
    r.events.some((e) => e.type === 'unit_death' && e.payload.unitId === 'ally-0' && e.tick < 60),
  ).toBe(true);
  expect(
    r.events.some(
      (e) =>
        e.type === 'status_apply' &&
        e.payload.unitId === 'ally-0' &&
        e.payload.status.key === 'p13s-shisha-attack',
    ),
  ).toBe(false);
});
it('P13S clone provenance and support bonuses remain deterministic with independent IDs', () => {
  const i = input(['alfredo-pocho', 'manuel']);
  for (const u of i.units.filter((u) => u.owner === 'south')) u.owner = 'north';
  i.units.at(-1)!.owner = 'south';
  const g = withGhostArmy(i, 'source-player', 'real-player'),
    r = runCombat(g);
  expect(r.input.ghost!.damageMultiplierMilli).toBe(800);
  expect(runCombat(g)).toEqual(r);
});
it('Hortaleza support scales the real shield executor once; Shisheros reduction is applied before shields with integer rounding', () => {
  const support = input(['alfredo-pocho', 'manuel']);
  support.units[0]!.profile.passive = {
    id: 'support-fixture',
    trigger: 'combat_start',
    effects: [{ kind: 'shield', target: 'self', radius: 0, amount: 100, duration: 450 }],
  };
  const trace = runCombat(support);
  expect(
    trace.events.find((e) => e.type === 'shield_apply' && e.payload.unitId === 'ally-0')?.payload,
  ).toMatchObject({ status: { amount: 105 } });
  const shisha = input(['jota', 'focho']);
  for (const u of shisha.units.filter((u) => u.owner === 'south')) u.profile.stats.maxHp = 100000;
  shisha.units.at(-1)!.profile.stats.attack = 100;
  const r = runCombat(shisha),
    hit = r.events.find((e) => e.type === 'damage' && e.payload.sourceId === 'foe' && e.tick < 60)!;
  if (hit.type !== 'damage') throw Error('Missing damage evidence');
  const unit = r.snapshots[0]!.units.find((u) => u.id === hit.payload.targetId)!;
  const armor = effectiveStat(unit, 'armor'),
    raw = hit.payload.accounting!.requested;
  const mitigated = Math.max(1, Math.floor((raw * 100) / (100 + armor)));
  expect(hit.payload.amount + hit.payload.absorbed).toBe(Math.floor((mitigated * 700) / 1000));
});

it.each([
  [2, 1, 500],
  [4, 2, 400],
  [6, 3, 300],
  [8, 4, 250],
])(
  'UPM %i identities freeze summon level %i and HP-loss threshold %i; tier eight remains reserved in matches',
  (count, level, threshold) => {
    const upm = P13S_TRAITS.find((t) => t.id === 'upm')!,
      i = input(upm.planning!.members.slice(0, count));
    i.maxTicks = 1;
    const t = runCombat(i).snapshots[0]!.synergies!.teams.find((t) => t.side === 'south')!;
    expect(t.level).toBe(level);
    expect(t.thresholdMilli).toBe(threshold);
    expect(t.scaling).toEqual({ maxHp: 1000, attack: 1000, armor: 1000, magicResist: 1000 });
    expect(upm.thresholds.at(-1)!.availability).toBe('reserved');
    expect(upm.thresholds.at(-1)!.count).toBe(8);
  },
);
it('mixed-star contribution mean is frozen before deaths; channel control does not reset elapsed time', () => {
  const i = input(['dolea', 'vargas']);
  i.units[0]!.profile.starLevel = 1;
  i.units[1]!.profile.starLevel = 3;
  i.maxTicks = 1;
  const t = runCombat(i).snapshots[0]!.synergies!.teams[0]!;
  expect(t.starSum / t.count).toBe(2);
  expect(t.scaling).toEqual({ maxHp: 1120, attack: 1080, armor: 1050, magicResist: 1050 });
  const c = input(['jota', 'focho']);
  c.units.at(-1)!.profile.passive = {
    id: 'stun-channel-fixture',
    trigger: 'combat_start',
    effects: [{ kind: 'stun', target: 'enemies', radius: 14, duration: 80 }],
  };
  const r = runCombat(c),
    u = r.snapshots[60]!.units.find((u) => u.id === 'ally-0')!;
  expect(u.statuses.some((s) => s.kind === 'stun')).toBe(true);
  expect(u.statuses.find((s) => s.key === 'p13s-shisha-attack')!.amount).toBe(150);
  expect(
    r.events
      .filter((e) => e.type === 'attack_start' && e.payload.unitId === 'ally-0')
      .every((e) => e.tick >= 80),
  ).toBe(true);
});
