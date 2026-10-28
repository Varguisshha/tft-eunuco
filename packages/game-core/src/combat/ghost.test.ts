import { it, expect } from 'vitest';
import {
  DEFAULT_OVERTIME,
  CombatInputSchema,
  reversePerspective,
  type CombatInput,
  type DamageType,
} from '@tft/shared';
import { P12B_ECONOMY_CONFIG, P11H_ITEM_CATALOG, traitsFor } from '@tft/game-data';
import { createMatch } from '../match/engine';
import { scaledOwnedProfile, scaledProfile } from '../match/selectors';
import { unit, act } from '../items/fixture.test-support';
import { grantItemInstances } from '../items/inventory';
import { withGhostArmy } from './ghost';
import { runCombat } from './engine';
function input(): CombatInput {
  const profile = scaledProfile('dolea', 1, P12B_ECONOMY_CONFIG);
  profile.ability = null;
  profile.passive = null;
  delete profile.championAbility;
  profile.traits = [];
  profile.stats.maxMana = 0;
  profile.stats.startingMana = 0;
  profile.stats.maxHp = 100000;
  profile.stats.attack = 100;
  profile.stats.critChanceMilli = 0;
  return {
    protocolVersion: 3,
    rulesVersion: 'f0p11h-1',
    combatId: 'ghost-test',
    seed: 42,
    maxTicks: 100,
    overtime: DEFAULT_OVERTIME,
    obstacles: [],
    traits: [],
    units: [
      {
        id: 'human',
        definitionId: 'dolea',
        owner: 'south',
        position: { q: 0, r: 4 },
        profile: structuredClone(profile),
      },
      {
        id: 'source',
        definitionId: 'dolea',
        owner: 'north',
        position: { q: 0, r: 3 },
        profile: structuredClone(profile),
      },
    ],
  };
}
function compare(i: CombatInput) {
  const g = withGhostArmy(i, 'owner', 'human-player'),
    control = structuredClone(g);
  delete control.ghost;
  return { g, a: runCombat(g), b: runCombat(control) };
}
it.each([25, 0, -50])(
  '80%% only outgoing after resistance %i; shield, incoming, attack and HP unchanged',
  (armor) => {
    const i = input();
    for (const u of i.units) u.profile.stats.armor = armor;
    const { g, a, b } = compare(i),
      id = g.ghost!.units[0]!.unitId;
    const before = b.events.filter((e) => e.type === 'damage'),
      after = a.events.filter((e) => e.type === 'damage');
    expect(before.length).toBeGreaterThan(4);
    expect(after).toHaveLength(before.length);
    for (let x = 0; x < before.length; x++) {
      const p = before[x]!.payload,
        q = after[x]!.payload;
      expect(q.amount).toBe(p.sourceId === id ? Math.floor(p.amount * 0.8) : p.amount);
      expect(q.accounting!.requested + q.accounting!.defenseAmplification).toBe(
        q.amount + q.absorbed + q.accounting!.mitigated + q.accounting!.overkill,
      );
    }
    expect(g.units[1]!.profile.stats).toEqual(i.units[1]!.profile.stats);
    expect(runCombat(a.input)).toEqual(a);
    expect(reversePerspective(reversePerspective(a))).toEqual(a);
  },
);
it.each(['physical', 'magic', 'true'] as DamageType[])(
  'ability %s uses the same one-time multiplier',
  (damageType) => {
    const i = input(),
      p = i.units[1]!.profile;
    p.stats.maxMana = 10;
    p.stats.startingMana = 10;
    p.ability = {
      id: 'spell',
      name: 'Test',
      manaCost: 10,
      castTicks: 1,
      effects: [{ kind: 'damage', target: 'target', radius: 0, amount: 100, damageType }],
    };
    const { g, a, b } = compare(i),
      id = g.ghost!.units[0]!.unitId;
    const find = (r: typeof a) =>
      r.events
        .filter((e) => e.type === 'damage')
        .find((e) => e.payload.sourceId === id && e.payload.cause === 'ability');
    expect(find(a)).toBeDefined();
    expect(find(a)!.payload.amount).toBe(Math.floor(find(b)!.payload.amount * 0.8));
  },
);
it('ranged impacts reduce only at damage resolution, never both launch and impact', () => {
  const i = input();
  i.units[1]!.profile.stats.range = 3;
  i.units[1]!.position = { q: 0, r: 1 };
  const { g, a, b } = compare(i),
    id = g.ghost!.units[0]!.unitId;
  expect(a.events.some((e) => e.type === 'projectile_launch' && e.payload.sourceId === id)).toBe(
    true,
  );
  const first = (r: typeof a) =>
    r.events.filter((e) => e.type === 'damage').find((e) => e.payload.sourceId === id)!;
  expect(first(a).payload.amount).toBe(Math.floor(first(b).payload.amount * 0.8));
});
it.each(['TFT_Item_RedBuff', 'TFT_Item_BrambleVest', 'TFT_Item_IonicSpark', 'TFT_Item_Redemption'])(
  'clone equipment %s keeps its profile and executes with consistent accounting',
  (record) => {
    let s = createMatch(42, P12B_ECONOMY_CONFIG);
    unit(s, 'holder', 1, 0, 'jaramillo');
    const d = P11H_ITEM_CATALOG.definitions.find((d) => d.content?.sourceRecordId === record)!;
    grantItemInstances(s, 'g', [d.id]);
    s = act(s, { type: 'equip_item', unitId: 'holder', itemId: s.items!.completed[0]!.id });
    const i = input();
    i.traits = [...traitsFor(s.config.catalog)];
    i.units[1]!.definitionId = 'jaramillo';
    i.units[1]!.profile = scaledOwnedProfile(s.units[0]!, s.config, s.items, 1, 42);
    i.units[1]!.profile.stats.maxHp = 100000;
    i.units[1]!.profile.stats.critChanceMilli = 0;
    if (record === 'TFT_Item_IonicSpark') {
      i.units[0]!.profile = scaledProfile('dolea', 1, P12B_ECONOMY_CONFIG);
      i.units[0]!.profile.stats.maxHp = 100000;
      i.units[0]!.profile.championAbility!.active!.initialMana = i.units[0]!.profile.stats.maxMana;
      i.units[0]!.profile.stats.startingMana = i.units[0]!.profile.stats.maxMana;
    }
    i.units.push({ ...structuredClone(i.units[0]!), id: 'secondary', position: { q: 1, r: 4 } });
    const { g, a, b } = compare(i),
      id = g.ghost!.units[0]!.unitId;
    const first = (r: typeof a) =>
      r.events
        .filter((e) => e.type === 'damage')
        .find((e) => e.payload.sourceId === id && e.payload.itemSource);
    if (record !== 'TFT_Item_Redemption') {
      expect(first(a)).toBeDefined();
      expect(first(a)!.payload.amount + first(a)!.payload.absorbed).toBe(
        Math.floor((first(b)!.payload.amount + first(b)!.payload.absorbed) * 0.8),
      );
    } else {
      const heal = (r: typeof a) =>
        r.events.filter((e) => e.type === 'heal').find((e) => e.payload.itemSource);
      expect(heal(a)).toBeDefined();
      expect(heal(a)!.payload.accounting!.requested).toBe(heal(b)!.payload.accounting!.requested);
    }
    expect(runCombat(a.input)).toEqual(a);
  },
);
it('rejects self-clones, aliases and provenance spoofing, even before engine execution', () => {
  expect(() => withGhostArmy(input(), 'same', 'same')).toThrow();
  const g = withGhostArmy(input(), 'owner', 'real');
  expect(() => withGhostArmy(g, 'owner', 'real')).toThrow();
  g.ghost!.units[0]!.sourceUnitId = g.ghost!.units[0]!.unitId;
  expect(CombatInputSchema.safeParse(g).success).toBe(false);
});
it('shield grants and stun duration remain unchanged; damage goes through the shield at 80%', () => {
  const i = input(),
    p = i.units[1]!.profile;
  p.stats.maxMana = 10;
  p.stats.startingMana = 10;
  p.ability = {
    id: 'support',
    name: 'Test',
    manaCost: 10,
    castTicks: 1,
    effects: [
      { kind: 'shield', target: 'self', radius: 0, amount: 100, duration: 30 },
      { kind: 'stun', target: 'target', radius: 0, duration: 10 },
    ],
  };
  const { a, b } = compare(i);
  const statuses = (r: typeof a) =>
    r.events
      .filter((e) => e.type === 'shield_apply' || e.type === 'status_apply')
      .map((e) => e.payload.status);
  expect(statuses(a)).toEqual(statuses(b));
  expect(statuses(a).some((s) => s.kind === 'shield')).toBe(true);
  expect(statuses(a).some((s) => s.kind === 'stun')).toBe(true);
  expect(a.events.some((e) => e.type === 'damage' && e.payload.absorbed > 0)).toBe(true);
});
it('clone Overtime and a simultaneous timeout restore/replay independently at the unchanged 450 tick cap', () => {
  const i = input();
  i.maxTicks = 450;
  for (const u of i.units) {
    u.profile.stats.maxHp = 1000000;
    u.profile.stats.attack = 0;
  }
  const { a, b } = compare(i);
  expect(a.result.outcome).toBe('double_loss');
  expect(a.result.tick).toBe(450);
  expect(a.events.some((e) => e.type === 'overtime_start')).toBe(true);
  expect(b.result).toEqual(a.result);
  expect(runCombat(a.input)).toEqual(a);
});
it('seven-unit clone preserves every full army profile and has an independent reproducible trace', () => {
  const i = input(),
    original = i.units;
  i.units = Array.from({ length: 14 }, (_, n) => ({
    ...structuredClone(original[n < 7 ? 0 : 1]!),
    id: `army-${n}`,
    position: { q: (n % 7) - Math.floor((n < 7 ? 4 : 3) / 2), r: n < 7 ? 4 : 3 },
  }));
  const frozen = structuredClone(i),
    g = withGhostArmy(i, 'owner', 'real');
  expect(g.ghost!.units).toHaveLength(7);
  expect(i).toEqual(frozen);
  expect(g.units.filter((u) => u.owner === 'north').map((u) => u.profile)).toEqual(
    i.units.filter((u) => u.owner === 'north').map((u) => u.profile),
  );
  const replay = runCombat(g);
  expect(runCombat(g)).toEqual(replay);
});
