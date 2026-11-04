import { expect, it } from 'vitest';
import { P13U_TRAITS, P13U_ECONOMY_CONFIG, P13S_TRAITS, matchCatalog } from '@tft/game-data';
import { CombatInputSchema, type CombatInput } from '@tft/shared';
import { CombatEngine, runCombat } from './engine';
import { effectiveStat } from './math';
import { scaledProfile } from '../match/selectors';
export function synergyFixture(trait: string, n: number, seed = 4): CombatInput {
  const profile = scaledProfile('cosmin', 1, P13U_ECONOMY_CONFIG);
  profile.traits = [trait];
  profile.passive = null;
  delete profile.championAbility;
  delete profile.mechanics;
  profile.ability = null;
  profile.stats = {
    ...profile.stats,
    maxHp: 1000,
    attack: 100,
    range: 14,
    armor: 0,
    magicResist: 0,
    critChanceMilli: 0,
    critMultiplierMilli: 1500,
    attackSpeedMilli: 1000,
  };
  return CombatInputSchema.parse({
    protocolVersion: 3,
    rulesVersion: 'f0p13u-1',
    combatId: 'final-synergies',
    seed,
    maxTicks: 80,
    traits: P13U_TRAITS,
    obstacles: [],
    units: [
      ...Array.from({ length: n }, (_, i) => ({
        id: `ally-${i}`,
        definitionId: `fixture-member-${i}`,
        owner: 'south',
        position: { q: i - 2, r: 4 },
        profile: structuredClone(profile),
      })),
      {
        id: 'foe',
        definitionId: 'cosmin',
        owner: 'north',
        position: { q: 0, r: 2 },
        profile: {
          ...structuredClone(profile),
          traits: [],
          stats: { ...profile.stats, maxHp: 100000, attack: 100 },
        },
      },
    ],
  });
}
it.each([
  [2, 900, 120],
  [4, 820, 140],
  [6, 750, 160],
])('Fumón %i sacrifices HP once and gains AD, without legacy smoke', (n, hp, ad) => {
  const input = synergyFixture('fumon', n),
    engine = new CombatEngine(input),
    unit = engine.snapshot().units.find((u) => u.id === 'ally-0')!;
  expect(unit.hp).toBe(hp);
  expect(effectiveStat(unit, 'maxHp')).toBe(hp);
  expect(effectiveStat(unit, 'attack')).toBe(ad);
  expect(unit.profile.stats.maxHp).toBe(1000);
  expect(input.units[0]!.profile.stats.attack).toBe(100);
  const replay = runCombat(input);
  expect(
    replay.events.some(
      (e) => e.type === 'status_apply' && e.payload.status.group === 'armor-reduction',
    ),
  ).toBe(false);
  expect(runCombat(input)).toEqual(replay);
});
it.each([
  [2, 1100, 0],
  [4, 1200, 10],
  [6, 1300, 20],
])('Gym %i applies health and armor to members only', (n, hp, armor) => {
  const state = new CombatEngine(synergyFixture('gym', n)).snapshot(),
    u = state.units[0]!;
  expect(u.hp).toBe(hp);
  expect(effectiveStat(u, 'armor')).toBe(armor);
  expect(state.units.find((u) => u.id === 'foe')!.hp).toBe(100000);
});
it('all twenty definitions have executable tiers; provisional membership keeps all 34 identities', () => {
  expect(P13U_TRAITS).toHaveLength(20);
  expect(
    P13U_TRAITS.every(
      (t) =>
        t.planning?.effectState === 'implemented' &&
        t.thresholds.every((x) => x.effectState === 'implemented'),
    ),
  ).toBe(true);
  expect(matchCatalog(P13U_ECONOMY_CONFIG)).toHaveLength(34);
  expect(matchCatalog(P13U_ECONOMY_CONFIG).filter((u) => u.synergies.includes('mus'))).toHaveLength(
    4,
  );
  expect(P13S_TRAITS.find((t) => t.id === 'fumon')!.thresholds[0]!.description).toContain(
    'armadura',
  );
});
it.each([2, 4, 6])(
  'Blackhaus %i cannot be selected during stealth and becomes targetable afterwards',
  (n) => {
    const r = runCombat(synergyFixture('blackhaus', n));
    expect(
      r.events
        .filter((e) => e.type === 'attack_start' && e.payload.unitId === 'foe')
        .every((e) => e.tick >= [20, 30, 40][n / 2 - 1]!),
    ).toBe(true);
    expect(r.events.some((e) => e.type === 'damage' && e.payload.sourceId === 'foe')).toBe(true);
  },
);
it('UPM summons one provisional ally with its own attacks and spell, without entering the shop/pool', () => {
  const i = synergyFixture('upm', 2);
  i.maxTicks = 450;
  i.units.at(-1)!.profile.stats.attack = 100;
  const r = runCombat(i),
    spawns = r.events.filter((e) => e.type === 'unit_spawn');
  expect(spawns).toHaveLength(1);
  expect(spawns[0]!.payload.unit.definitionId).toBe('carrasco');
  expect(r.events.some((e) => e.type === 'damage' && e.payload.sourceId === 'carrasco-south')).toBe(
    true,
  );
  expect(
    r.events.some((e) => e.type === 'ability_cast' && e.payload.unitId === 'carrasco-south'),
  ).toBe(true);
  expect(i.units.some((u) => u.definitionId === 'carrasco')).toBe(false);
  expect(runCombat(i)).toEqual(r);
});
it('Ruman Trinity distributes a bounded share without recursive damage amplification', () => {
  const r = runCombat(synergyFixture('ruman_trinity', 3));
  const hits = r.events.filter((e) => e.type === 'damage' && e.payload.sourceId === 'foe');
  expect(hits.some((e) => e.type === 'damage' && e.payload.damageType === 'true')).toBe(true);
  expect(
    hits
      .filter((e) => e.type === 'damage' && e.payload.damageType === 'true')
      .every((e) => e.type === 'damage' && e.payload.amount <= 6),
  ).toBe(true);
  expect(hits.length).toBeLessThan(100);
});
it('Pancho protects a nearby ally and transfer remains bounded by its HP', () => {
  const i = synergyFixture('pancho', 2);
  i.units.push({
    ...structuredClone(i.units[0]!),
    id: '0-protected',
    definitionId: 'fixture-member-protected',
    position: { q: -1, r: 3 },
    profile: { ...structuredClone(i.units[0]!.profile), traits: [] },
  });
  i.units.find((u) => u.id === 'ally-0')!.position = { q: -1, r: 4 };
  i.units.find((u) => u.id === 'ally-1')!.position = { q: 0, r: 4 };
  i.units.find((u) => u.id === 'foe')!.position = { q: -1, r: 2 };
  const r = runCombat(i);
  expect(
    r.events.some(
      (e) =>
        e.type === 'damage' &&
        e.payload.damageType === 'true' &&
        e.payload.targetId.startsWith('ally-'),
    ),
  ).toBe(true);
  expect(r.snapshots.every((s) => s.units.every((u) => u.hp >= 0))).toBe(true);
});
it('Perdidos tier five receives the provisional third bonus and attack speed', () => {
  const u = new CombatEngine(synergyFixture('perdidos_por_el_mundo', 5)).snapshot().units[0]!;
  expect(effectiveStat(u, 'maxHp')).toBe(1150);
  expect(effectiveStat(u, 'attackSpeedMilli')).toBe(1100);
  expect(u.statuses.some((s) => s.key === 'lost-0')).toBe(true);
  expect(u.statuses.some((s) => s.key === 'lost-1')).toBe(true);
});
it('Lencería grants the initial team shield and Mus grants a shield after four confirmed basics', () => {
  const l = runCombat(synergyFixture('lenceria', 2));
  expect(l.events.filter((e) => e.type === 'shield_apply')).toHaveLength(2);
  const m = runCombat(synergyFixture('mus', 2));
  expect(m.events.some((e) => e.type === 'shield_apply')).toBe(true);
});
it('Valo adds crit chance and multiplier while Pardillo has seeded reductions/healing', () => {
  const u = new CombatEngine(synergyFixture('valo', 6)).snapshot().units[0]!;
  expect(effectiveStat(u, 'critChanceMilli')).toBe(300);
  expect(effectiveStat(u, 'critMultiplierMilli')).toBe(2100);
  const r = runCombat(synergyFixture('pardillo', 6));
  expect(r.events.some((e) => e.type === 'heal' && e.payload.amount > 0)).toBe(true);
  expect(runCombat(r.input)).toEqual(r);
});
it('Rata and PSOE emit combat gold only for real enemy eliminations, never living targets', () => {
  let awarded = false;
  for (let seed = 1; seed <= 15; seed++) {
    const i = synergyFixture('rata', 6, seed);
    i.units.at(-1)!.profile.stats.maxHp = 1;
    const r = runCombat(i),
      gold = r.events.filter((e) => e.type === 'synergy_gold');
    expect(gold.length).toBeLessThanOrEqual(1);
    for (const e of gold) {
      expect(e.payload.amount).toBe(2);
      expect(e.payload.targetId).toBe('foe');
      awarded = true;
    }
  }
  expect(awarded).toBe(true);
});
it('PSOE selects three distinct measures once per side and replays identically', () => {
  const i = synergyFixture('psoe', 6),
    r = runCombat(i);
  expect(runCombat(i)).toEqual(r);
  const u = r.snapshots[0]!.units[0]!;
  expect(u.statuses.filter((s) => s.key?.startsWith('measure-'))).toHaveLength(3);
  expect(
    new Set(u.statuses.filter((s) => s.key?.startsWith('measure-')).map((s) => s.key)).size,
  ).toBe(3);
});

it('Perdidos draws one shared team benefit at tier two rather than different benefits per copy', () => {
  const state = new CombatEngine(synergyFixture('perdidos_por_el_mundo', 2)).snapshot();
  const members = state.units.filter((u) => u.owner === 'south');
  expect(
    members.map((u) => u.statuses.filter((s) => s.key?.startsWith('lost-')).map((s) => s.key)),
  ).toEqual([
    members[0]!.statuses.filter((s) => s.key?.startsWith('lost-')).map((s) => s.key),
    members[0]!.statuses.filter((s) => s.key?.startsWith('lost-')).map((s) => s.key),
  ]);
});

it('CARRASCO has its own movement/cast profile, inherits team bonuses and cannot duplicate a board ID', () => {
  const input = synergyFixture('upm', 2);
  input.maxTicks = 450;
  input.units[0]!.id = 'carrasco-south';
  input.units[0]!.definitionId = 'dolea';
  input.units[1]!.definitionId = 'jaramillo';
  for (const u of input.units.filter((u) => u.owner === 'south')) {
    u.profile.traits = ['upm', 'hortaleza'];
    u.profile.stats.moveTicks = 9;
    u.profile.stats.attackWindupTicks = 8;
  }
  const replay = runCombat(input),
    spawn = replay.events.find((e) => e.type === 'unit_spawn');
  expect(spawn?.type).toBe('unit_spawn');
  if (spawn?.type !== 'unit_spawn') throw Error('No summon');
  const u = spawn.payload.unit;
  expect(u.id).toBe('carrasco-south-1');
  expect(u.profile.stats.moveTicks).toBe(4);
  expect(u.profile.stats.attackWindupTicks).toBe(3);
  expect(effectiveStat(u, 'armor')).toBe(38);
  expect(effectiveStat(u, 'attack')).toBe(57);
  expect(
    replay.snapshots.every((s) => new Set(s.units.map((u) => u.id)).size === s.units.length),
  ).toBe(true);
});

it('Blackhaus four boosts only the first confirmed basic by fifty percent', () => {
  const r = runCombat(synergyFixture('blackhaus', 4));
  const damage = r.events.flatMap((e) =>
    e.type === 'damage' && e.payload.sourceId === 'ally-0' ? [e.payload.amount] : [],
  );
  expect(damage.length).toBeGreaterThan(1);
  expect(damage[0]).toBeGreaterThanOrEqual(142);
  expect(damage[0]).toBeLessThanOrEqual(157);
  expect(damage.slice(1).every((n) => n >= 95 && n <= 105)).toBe(true);
});
it('Valo Headshot multiplies the critical hit rather than replacing it with a normal attack bonus', () => {
  let headshot = false;
  for (let seed = 1; seed <= 5; seed++) {
    const input = synergyFixture('valo', 2, seed);
    for (const u of input.units.filter((u) => u.owner === 'south'))
      u.profile.stats.critChanceMilli = 1000;
    const damage = runCombat(input).events.flatMap((e) =>
      e.type === 'damage' && e.payload.sourceId.startsWith('ally-') ? [e.payload] : [],
    );
    expect(
      damage.every(
        (d) =>
          d.critical &&
          ((d.amount >= 161 && d.amount <= 178) || (d.amount >= 241 && d.amount <= 267)),
      ),
    ).toBe(true);
    headshot ||= damage.some((d) => d.amount >= 241);
  }
  expect(headshot).toBe(true);
});
it('shared damage accounts for the original hit once, without increasing its HP loss', () => {
  const r = runCombat(synergyFixture('ruman_trinity', 3));
  const events = r.events.flatMap((e) =>
    e.type === 'damage' && e.payload.sourceId === 'foe' ? [{ tick: e.tick, ...e.payload }] : [],
  );
  for (const tick of new Set(events.map((e) => e.tick))) {
    const group = events.filter((e) => e.tick === tick),
      primary = group.find((e) => e.damageType === 'physical');
    expect(primary).toBeDefined();
    expect(group.reduce((n, e) => n + e.amount, 0)).toBe(primary!.accounting!.requested);
  }
});
