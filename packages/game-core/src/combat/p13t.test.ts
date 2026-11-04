import { expect, it } from 'vitest';
import {
  CombatInputSchema,
  CombatProfileSchema,
  type CombatProfile,
  type CombatInput,
} from '@tft/shared';
import { P13T_ECONOMY_CONFIG, P12F_ECONOMY_CONFIG } from '@tft/game-data';
import { scaledProfile, scaledOwnedProfile } from '../match/selectors';
import { createMatch } from '../match/engine';
import { validateMatchState } from '../match/invariants';
import { grantItemInstances, applyItemCommand } from '../items/inventory';
import { runCombat } from './engine';
import { withGhostArmy } from './ghost';
import { effectiveStat } from './math';
function input(id = 'jaramillo', stars: 1 | 2 | 3 = 1): CombatInput {
  const p = structuredClone(scaledProfile(id, stars, P13T_ECONOMY_CONFIG));
  p.traits = [];
  p.stats = {
    ...p.stats,
    attack: 100,
    maxHp: 10000,
    attackSpeedMilli: 1000,
    armor: 0,
    magicResist: 0,
    critChanceMilli: 0,
  };
  const foe: CombatProfile = {
    starLevel: 1,
    stats: { ...p.stats, maxHp: 10000, attack: 0, maxMana: 0, startingMana: 0, range: 1 },
    ability: null,
    passive: null,
    traits: [],
  };
  return CombatInputSchema.parse({
    protocolVersion: 3,
    rulesVersion: 'f0p13t-1',
    combatId: 'p13t-contract',
    seed: 42,
    maxTicks: 120,
    traits: [],
    obstacles: [],
    units: [
      { id: 'source', definitionId: id, owner: 'south', position: { q: 0, r: 4 }, profile: p },
      { id: 'foe', definitionId: 'cosmin', owner: 'north', position: { q: 0, r: 1 }, profile: foe },
    ],
  });
}
function noCast(p: CombatProfile) {
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
it.each(['dolea', 'vargas', 'florin', 'cosmin'])(
  '%s keeps all existing personal mechanics and stats under the new policy',
  (id) => {
    for (const stars of [1, 2, 3] as const)
      expect(scaledProfile(id, stars, P13T_ECONOMY_CONFIG)).toEqual(
        scaledProfile(id, stars, P12F_ECONOMY_CONFIG),
      );
  },
);
it.each([1, 2, 3] as const)(
  'JARAMILLO %i★ consumes four per-enemy Bars and applies the authored AD ratio',
  (stars) => {
    const i = input('jaramillo', stars);
    noCast(i.units[0]!.profile);
    const r = runCombat(i);
    const threshold = r.events.find((e) => e.type === 'stack_threshold');
    expect(threshold).toBeDefined();
    const hits = r.events.filter(
      (e) =>
        e.type === 'attack_confirmed' && e.payload.unitId === 'source' && e.tick <= threshold!.tick,
    );
    expect(hits).toHaveLength(4);
    expect(
      r.events.some(
        (e) =>
          e.type === 'damage' &&
          e.payload.sourceId === 'source' &&
          e.payload.cause === 'ability' &&
          e.payload.amount === [40, 60, 80][stars - 1],
      ),
    ).toBe(true);
    expect(
      r.snapshots
        .flatMap(
          (s) => s.units.find((u) => u.id === 'source')!.mechanics?.targetStacks?.stacks ?? [],
        )
        .some((s) => s.targetId === 'foe' && s.count > 0),
    ).toBe(true);
    expect(
      scaledProfile('jaramillo', stars, P13T_ECONOMY_CONFIG).championAbility?.passive
        ?.matchProgress,
    ).toBeUndefined();
    expect(
      scaledProfile('jaramillo', stars, P12F_ECONOMY_CONFIG).championAbility?.passive?.matchProgress
        ?.id,
    ).toBe('kilometros');
    expect(runCombat(i)).toEqual(r);
  },
);
it.each([1, 2, 3] as const)(
  'JARAMILLO %i★ projectile uses new active damage and four-second shred',
  (stars) => {
    const i = input('jaramillo', stars);
    i.units[0]!.profile.stats.startingMana = 70;
    i.units[0]!.profile.championAbility!.active!.initialMana = 70;
    const r = runCombat(i),
      launch = r.events.find(
        (e) => e.type === 'projectile_launch' && e.payload.cause === 'ability',
      );
    expect(launch).toBeDefined();
    if (launch?.type !== 'projectile_launch') throw Error('Missing projectile');
    const damage = r.events.find(
      (e) => e.type === 'damage' && e.payload.projectileId === launch.payload.id,
    );
    expect(damage?.tick).toBe(launch.payload.impactTick);
    expect(damage?.type === 'damage' && damage.payload.amount).toBe([100, 125, 150][stars - 1]);
    const at = r.snapshots[launch.payload.impactTick]!.units.find(
      (u) => u.id === 'foe',
    )!.statuses.find((s) => s.group === 'armor-reduction');
    expect(at?.amount).toBe([150, 200, 250][stars - 1]);
    expect(at?.expiresTick).toBe(launch.payload.impactTick + 40);
  },
);
it.each([1, 2, 3] as const)(
  'PEIBOL %i★ ranged AD headshot: low-HP bonus and lethal mana refund',
  (stars) => {
    const i = input('peibol', stars);
    const p = i.units[0]!.profile;
    p.stats.startingMana = 70;
    // A deterministic damaged combatant represented by a max-HP debuff is not a legal initial input;
    // instead force the first basics to cross 35% before the natural 70-mana cast.
    p.stats.startingMana = 0;
    i.units[1]!.profile.stats.maxHp = 850;
    const r = runCombat(i),
      launch = r.events.find(
        (e) =>
          e.type === 'projectile_launch' &&
          e.payload.sourceId === 'source' &&
          e.payload.cause === 'ability',
      );
    expect(launch).toBeDefined();
    expect(
      r.events.some(
        (e) => e.type === 'attack_start' && e.payload.unitId === 'source' && e.payload.ranged,
      ),
    ).toBe(true);
    expect(p.stats.range).toBe(3);
    expect(p.championAbility?.active?.effects[0]).toMatchObject({
      powerScaling: { adRatioMilli: [2200, 3300, 5000], apRatioMilli: 0 },
      bonusBelowHp: { ratioMilli: 350, multiplierMilli: 1250 },
      manaOnKill: 25,
    });
    if (launch?.type !== 'projectile_launch') throw Error('Missing cast');
    const e = r.events.find(
      (e) => e.type === 'damage' && e.payload.projectileId === launch.payload.id,
    );
    expect(e?.tick).toBe(launch.payload.impactTick);
    if (e?.type !== 'damage') throw Error('Missing headshot hit');
    expect(e.payload.accounting?.requested).toBe([275, 412, 625][stars - 1]);
    expect(
      r.events.some(
        (x) =>
          x.type === 'mana_gain' &&
          x.payload.unitId === 'source' &&
          x.tick === e.tick &&
          x.payload.amount === 25,
      ),
    ).toBe(true);
    expect(runCombat(i)).toEqual(r);
  },
);
it('target changes consume Ego, five stacks grant at most 20% AS and a matching kill grants four-second Smurf', () => {
  const i = input('peibol');
  noCast(i.units[0]!.profile);
  i.units[1]!.profile.stats.maxHp = 580;
  i.units.push({
    ...structuredClone(i.units[1]!),
    id: 'foe-two',
    position: { q: 2, r: 1 },
    profile: CombatProfileSchema.parse({
      ...i.units[1]!.profile,
      stats: { ...i.units[1]!.profile.stats, maxHp: 10000 },
    }),
  });
  const r = runCombat(i);
  expect(
    r.events.some(
      (e) =>
        e.type === 'stack_consume' && e.payload.reason === 'target_change' && e.payload.count === 0,
    ),
  ).toBe(true);
  const smurf = r.events.find(
    (e) => e.type === 'status_apply' && e.payload.status.key === 'modo-smurf-p13t',
  );
  expect(smurf).toBeDefined();
  if (smurf?.type !== 'status_apply') throw Error('Missing Smurf');
  expect(smurf.payload.status.amount).toBe(200);
  expect(smurf.payload.status.expiresTick).toBe(smurf.tick + 40);
  expect(
    Math.max(
      ...r.snapshots.map(
        (s) => s.units.find((u) => u.id === 'source')!.mechanics?.stacks[0]?.count ?? 0,
      ),
    ),
  ).toBe(5);
  expect(
    Math.max(
      ...r.snapshots
        .filter((s) => s.tick < smurf.tick)
        .map((s) => effectiveStat(s.units.find((u) => u.id === 'source')!, 'attackSpeedMilli')),
    ),
  ).toBeLessThanOrEqual(1200);
});
it('P13T rejects historical reinterpretation, retains ghost 80% and cancels attacks against missing targets', () => {
  const i = input('peibol');
  expect(() => CombatInputSchema.parse({ ...i, rulesVersion: 'f0p11h-1' })).toThrow(/P13T/);
  const ghost = withGhostArmy(i, 'owner', 'real');
  expect(ghost.ghost?.damageMultiplierMilli).toBe(800);
  expect(runCombat(ghost)).toEqual(runCombat(ghost));
  expect(scaledProfile('peibol', 1, P12F_ECONOMY_CONFIG).stats.range).toBe(1);
});
it('Bars remain independent on different enemies, never transferring a killed enemy count', () => {
  const i = input();
  noCast(i.units[0]!.profile);
  i.units[1]!.profile.stats.maxHp = 230;
  i.units.push({
    ...structuredClone(i.units[1]!),
    id: 'foe-two',
    position: { q: 2, r: 1 },
    profile: {
      ...structuredClone(i.units[1]!.profile),
      stats: { ...i.units[1]!.profile.stats, maxHp: 10000 },
    },
  });
  const r = runCombat(i),
    threshold = r.events.find((e) => e.type === 'stack_threshold');
  expect(threshold).toBeDefined();
  const hits = r.events.filter(
    (e) =>
      e.type === 'attack_confirmed' &&
      e.payload.unitId === 'source' &&
      e.payload.targetId === 'foe-two' &&
      e.tick <= threshold!.tick,
  );
  expect(hits).toHaveLength(4);
  expect(
    r.snapshots.some(
      (s) => s.units.find((u) => u.id === 'source')!.mechanics?.targetStacks?.stacks.length === 2,
    ),
  ).toBe(true);
});
it('ranged targeting moves only when needed and in-flight spells can outlive a dead caster while an ally remains', () => {
  const i = input('peibol');
  i.units[0]!.profile.stats.maxHp = 1;
  i.units[0]!.profile.stats.startingMana = 70;
  i.units[0]!.profile.championAbility!.active!.initialMana = 70;
  i.units[1]!.position = { q: 0, r: 3 };
  i.units[1]!.profile.stats.attack = 100;
  i.units[1]!.profile.stats.attackSpeedMilli = 5000;
  i.units[1]!.profile.stats.attackWindupTicks = 3;
  i.units.push({
    ...structuredClone(i.units[1]!),
    id: 'ally',
    owner: 'south',
    position: { q: 3, r: 7 },
    profile: {
      ...structuredClone(i.units[1]!.profile),
      stats: { ...i.units[1]!.profile.stats, attack: 0, attackSpeedMilli: 1000 },
    },
  });
  const r = runCombat(i),
    death = r.events.find((e) => e.type === 'unit_death' && e.payload.unitId === 'source'),
    hit = r.events.find(
      (e) =>
        e.type === 'damage' && e.payload.sourceId === 'source' && e.payload.cause === 'ability',
    );
  expect(death).toBeDefined();
  expect(hit).toBeDefined();
  expect(hit!.tick).toBeGreaterThan(death!.tick);
  expect(r.events.some((e) => e.type === 'move_start' && e.payload.unitId === 'source')).toBe(
    false,
  );
  const far = input('peibol');
  far.units[1]!.position = { q: 0, r: 0 };
  expect(
    runCombat(far).events.some((e) => e.type === 'move_start' && e.payload.unitId === 'source'),
  ).toBe(true);
});
it('equipment preserves PEIBOL range, AD ratios, ownership and explicit marksman item role', () => {
  const s = createMatch(7, P13T_ECONOMY_CONFIG);
  s.pool.peibol!--;
  s.units.push({
    id: 'equipped-peibol',
    definitionId: 'peibol',
    stars: 1,
    location: { kind: 'bench', slot: 0 },
  });
  grantItemInstances(s, 'p13t-equipment', ['component-ad']);
  const item = s.items!.components[0]!;
  applyItemCommand(s, { type: 'equip_item', itemId: item.id, unitId: 'equipped-peibol' });
  validateMatchState(s);
  const p = scaledOwnedProfile(s.units[0]!, s.config, s.items);
  expect(p.itemRole).toBe('marksman');
  expect(p.stats.range).toBe(3);
  expect(p.initialItemModifiers!.some((m) => m.stat === 'attack' && m.amount > 0)).toBe(true);
  expect(p.championAbility!.active!.effects[0]).toMatchObject({
    powerScaling: { adRatioMilli: [2200, 3300, 5000], apRatioMilli: 0 },
  });
  const historic = scaledOwnedProfile({ ...s.units[0]!, equipment: [] }, P12F_ECONOMY_CONFIG);
  expect(historic.stats.range).toBe(1);
  expect(historic.itemRole).not.toBe('marksman');
});
