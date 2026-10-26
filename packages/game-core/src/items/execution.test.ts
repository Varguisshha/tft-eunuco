import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { describe, it, expect } from 'vitest';
import {
  EXECUTABLE_ITEM_CATALOG as catalog,
  STANDARD_ITEM_CATALOG as old,
  EFFECT_ITEMS_ECONOMY_CONFIG as config,
} from '@tft/game-data';
import {
  CombatStateSchema,
  CombatEventV3Schema,
  type CombatState,
  type CombatUnit,
  type CombatEffect,
  type CombatEventV3,
  type PlannedItemEffect,
  type DamageType,
} from '@tft/shared';
import { createMatch, applyMatchAction, commandFor } from '../match/engine';
import { unit, act } from './fixture.test-support';
import { grantItemInstances } from './inventory';
import { runCombat, CombatEngine } from '../combat/engine';
import { effectiveStat, shieldTotal } from '../combat/math';
import type { ItemEffectExecutor } from '../combat/item-effects';
const completed = catalog.definitions.filter((d) => d.kind === 'completed');
if (process.env.P8C_METRICS === '1')
  writeFileSync('/tmp/p8c-catalog.json', JSON.stringify(completed, null, 2));
const definition = (name: string) => {
  const d = completed.find((d) => d.content!.sourceRecordId === `TFT_Item_${name}`)!;
  return {
    ...d,
    effects: d.effects.filter((e): e is PlannedItemEffect => e.implementation === 'executable-v1'),
  };
};
import { battle, stressBattle } from './execution.test-support';
// Test-only access to logical signals. No mocks: damage, healing and statuses run in CombatEngine.
interface Internals {
  state: CombatState;
  events: CombatEventV3[];
  items: ItemEffectExecutor;
  damage: (
    s: CombatUnit,
    t: CombatUnit,
    n: number,
    type: DamageType,
    cause: 'attack' | 'ability',
  ) => void;
  resolveEffects: (
    tasks: {
      source: CombatUnit;
      target: CombatUnit;
      effect: CombatEffect;
      cause: 'ability';
      origin?: 'active';
    }[],
  ) => void;
  settleDeaths: () => void;
}
function rig(name: string | string[], back = false) {
  const names = typeof name === 'string' ? [name] : name;
  const input = battle(names.map((n) => definition(n).id));
  input.maxTicks = 450;
  input.traits = [];
  for (const s of input.units) {
    delete s.profile.championAbility;
    delete s.profile.mechanics;
    delete s.profile.traits;
    s.profile.passive = null;
    s.profile.ability = null;
    s.profile.stats = {
      ...s.profile.stats,
      maxHp: 10000,
      attack: 100,
      armor: 0,
      magicResist: 0,
      critChanceMilli: 0,
      abilityPower: 0,
      attackSpeedMilli: 1000,
      maxMana: 100,
      startingMana: 0,
    };
  }
  if (back) input.units[0]!.position = { q: 0, r: 7 };
  const engine = new CombatEngine(input),
    h = engine as unknown as Internals,
    a = h.state.units[0]!,
    b = h.state.units[1]!,
    c = h.state.units[2]!;
  const fx = (effect: CombatEffect, target = a) =>
    h.resolveEffects([{ source: a, target, effect, cause: 'ability', origin: 'active' }]);
  const hit = (
    n = 100,
    target = a,
    source = b,
    type: DamageType = 'true',
    cause: 'attack' | 'ability' = 'attack',
  ) => h.damage(source, target, n, type, cause);
  const at = (tick: number) => {
    h.state.tick = tick;
    h.items.tick();
  };
  return { engine, h, a, b, c, fx, hit, at };
}
describe.each(completed)('$content.sourceRecordId', (d) => {
  it('preserves its frozen recipe, bonuses, restrictions and copy policy', () => {
    const before = old.definitions.find((x) => x.id === d.id)!;
    expect(d.bonuses).toEqual(before.bonuses);
    if (before.kind !== 'completed') throw Error();
    expect(d.recipe).toEqual(before.recipe);
    expect(d.restrictions).toEqual(before.restrictions);
    expect(d.stacking).toEqual(before.stacking);
    let s = createMatch(42, config);
    unit(s, 'a');
    grantItemInstances(s, 'pair', d.recipe);
    s = act(s, {
      type: 'combine_components',
      firstId: s.items!.components[0]!.id,
      secondId: s.items!.components[1]!.id,
    });
    expect(s.items!.completed[0]!.definitionId).toBe(d.id);
    s = act(s, { type: 'equip_item', unitId: 'a', itemId: s.items!.completed[0]!.id });
    grantItemInstances(s, 'copy', [d.id]);
    const outcome = applyMatchAction(
      s,
      commandFor(s, { type: 'equip_item', unitId: 'a', itemId: s.items!.completed.at(-1)!.id }),
    );
    expect(outcome.ok).toBe(d.stacking !== 'unique' && d.content!.slotCost === 1);
  });
  it('applies every declared base bonus exactly once in effective statistics', () => {
    const { a } = rig(d.content!.sourceRecordId.replace('TFT_Item_', ''));
    a.statuses = a.statuses.filter((s) => !s.itemSource);
    for (const stat of [
      'maxHp',
      'attack',
      'attackSpeedMilli',
      'abilityPower',
      'armor',
      'magicResist',
      'critChanceMilli',
      'critMultiplierMilli',
    ] as const) {
      const base = a.profile.stats[stat] ?? 0;
      const flat = d.bonuses
        .filter((b) => b.stat === stat && b.mode === 'flat')
        .reduce((n, b) => n + b.amount, 0);
      const percent = d.bonuses
        .filter((b) => b.stat === stat && b.mode === 'percent_milli')
        .reduce((n, b) => n + b.amount, 0);
      const expected = base + flat + Math.floor((base * percent) / 1000);
      expect(effectiveStat(a, stat)).toBe(expected);
      expect(effectiveStat(a, stat)).toBe(expected);
    }
    const prepared = battle([d.id]).units[0]!.profile;
    expect(prepared.stats.startingMana).toBe(
      Math.min(
        prepared.stats.maxMana,
        d.bonuses.filter((b) => b.stat === 'startingMana').reduce((n, b) => n + b.amount, 0),
      ),
    );
  });
  it('runs full deterministic combats and validates all states/events', () => {
    const input = battle([d.id]);
    const one = runCombat(input),
      two = runCombat(input);
    expect(one).toEqual(two);
    for (const frame of one.snapshots)
      expect(CombatStateSchema.safeParse(frame).success).toBe(true);
    for (const e of one.events)
      expect(CombatEventV3Schema.safeParse(e).success, JSON.stringify(e)).toBe(true);
    expect(one.events.some((e) => e.type === 'damage')).toBe(true);
  });
});
it.each(['Deathblade', 'RabadonsDeathcap', 'MadredsBloodrazor'])(
  '%s amplifies actual damage, true damage stays unchanged',
  (name) => {
    const { a, b, hit } = rig(name);
    const d = definition(name);
    const o = d.effects[0]!.operation;
    if (o.kind !== 'damage_amp') throw Error();
    hit(1000, b, a, 'physical');
    expect(10000 - b.hp).toBe(1000 + o.ratioMilli);
    const before = b.hp;
    hit(100, b, a);
    expect(before - b.hp).toBe(100);
  },
);
it.each(['InfinityEdge', 'JeweledGauntlet'])(
  '%s permits active ability critical and double grants only the bonus',
  (name) => {
    const { a, b, fx } = rig(name);
    a.profile.stats.critChanceMilli = 1000;
    fx({ kind: 'damage', target: 'target', radius: 0, amount: 100, damageType: 'physical' }, b);
    expect(10000 - b.hp).toBe(150);
    const both = rig(['InfinityEdge', 'JeweledGauntlet']);
    expect(effectiveStat(both.a, 'critMultiplierMilli')).toBe(1600);
  },
);
it('Warmog adds max health exactly once across repeated stat reads', () => {
  const { a } = rig('WarmogsArmor');
  const hp = a.hp;
  for (let i = 0; i < 100; i++) expect(effectiveStat(a, 'maxHp')).toBe(hp);
  expect(hp).toBeGreaterThan(10000);
});
it('Steadfast threshold creates a single shield and permanent resists; lethal damage cannot save or resurrect', () => {
  const { a, hit, h } = rig('FrozenHeart');
  const max = a.hp;
  hit(Math.ceil(max * 0.65));
  expect(shieldTotal(a)).toBeGreaterThan(0);
  const armor = effectiveStat(a, 'armor');
  hit(10);
  expect(effectiveStat(a, 'armor')).toBe(armor);
  expect(a.statuses.filter((s) => s.kind === 'shield')).toHaveLength(1);
  const lethal = rig('FrozenHeart');
  lethal.hit(100000);
  lethal.h.settleDeaths();
  expect(lethal.a.hp).toBe(0);
  expect(shieldTotal(lethal.a)).toBe(0);
  expect(h.events.filter((e) => e.type === 'shield_apply')).toHaveLength(1);
});
it('Sterak increases maximum and current HP by the same delta only once', () => {
  const { a, hit } = rig('SteraksGage');
  const max = a.hp;
  hit(Math.ceil(max * 0.65));
  const next = effectiveStat(a, 'maxHp');
  expect(next).toBe(max + 2000);
  expect(a.hp).toBe(max - Math.ceil(max * 0.65) + 2000);
  hit(1);
  expect(effectiveStat(a, 'maxHp')).toBe(next);
  expect(effectiveStat(a, 'attack')).toBe(150);
});
it.each(['Redemption', 'DragonsClaw'])(
  '%s heals at the configured interval, with an actual cap',
  (name) => {
    const { a, at } = rig(name);
    a.hp = 1000;
    const d = definition(name),
      e = d.effects.find((e) => e.operation.kind === 'heal')!;
    const o = e.operation;
    if (o.kind !== 'heal') throw Error();
    at(e.intervalTicks! - 1);
    expect(a.hp).toBe(1000);
    at(e.intervalTicks!);
    expect(a.hp).toBe(
      1000 +
        Math.floor(
          Math.min(
            o.cap ?? 1000000,
            ((o.basis === 'missing_hp'
              ? effectiveStat(a, 'maxHp') - 1000
              : effectiveStat(a, 'maxHp')) *
              o.ratioMilli) /
              1000,
          ),
        ),
    );
  },
);
it('Guardbreaker activates only on absorbed damage, refreshes then expires', () => {
  const { a, b, h, hit } = rig('PowerGauntlet');
  hit(10, b, a);
  expect(a.statuses.some((s) => s.group === 'item-amp')).toBe(false);
  b.statuses.push({
    id: 'test-shield',
    kind: 'shield',
    sourceId: b.id,
    amount: 1000,
    stat: null,
    expiresTick: 20,
  });
  hit(10, b, a);
  const s = a.statuses.find((s) => s.group === 'item-amp')!;
  expect(s.amount).toBe(250);
  expect(s.expiresTick).toBe(30);
  h.state.tick = 5;
  hit(10, b, a);
  expect(a.statuses.filter((s) => s.group === 'item-amp')).toHaveLength(1);
  expect(a.statuses.find((s) => s.group === 'item-amp')!.expiresTick).toBe(35);
});
it('Gargoyle follows living enemies targeting the holder without permanent accumulation', () => {
  const { a, b, c, h } = rig('GargoyleStoneplate');
  const base = effectiveStat(a, 'armor');
  b.targetId = a.id;
  c.targetId = a.id;
  h.items.refreshAuras();
  expect(effectiveStat(a, 'armor') - base).toBe(20);
  b.targetId = null;
  h.items.refreshAuras();
  expect(effectiveStat(a, 'armor') - base).toBe(10);
  c.hp = 0;
  h.items.refreshAuras();
  expect(effectiveStat(a, 'armor')).toBe(base);
});
it('Bramble reduces attacks and retaliates at most once per cooldown, never recursively', () => {
  const { a, b, h, hit } = rig('BrambleVest');
  const before = a.hp;
  hit(100, a, b, 'physical');
  expect(before - a.hp).toBe(59);
  expect(b.hp).toBe(9900);
  const count = h.events.length;
  hit(100, a, b, 'physical');
  expect(b.hp).toBe(9900);
  expect(h.events.length - count).toBeLessThan(5);
  h.state.tick = 20;
  hit(100, a, b, 'physical');
  expect(b.hp).toBe(9800);
});
it.each(['IonicSpark', 'SpectralGauntlet'])(
  '%s aura enters, leaves and dies with its source',
  (name) => {
    const { a, b, h } = rig(name);
    const e = definition(name).effects.find((e) => e.trigger === 'aura')!;
    const o = e.operation;
    if (o.kind !== 'resistance_reduction') throw Error();
    b.profile.stats[o.stat] = 100;
    h.items.refreshAuras();
    expect(effectiveStat(b, o.stat)).toBe(100 - o.ratioMilli / 10);
    b.position = { q: 6, r: 0 };
    h.items.refreshAuras();
    expect(effectiveStat(b, o.stat)).toBe(100);
    b.position = { q: 0, r: 3 };
    h.items.refreshAuras();
    a.hp = 0;
    h.items.refreshAuras();
    expect(effectiveStat(b, o.stat)).toBe(100);
  },
);
it('Ionic punishment applies once per logical cast, with caster max mana and aura mitigation', () => {
  const { a, b, h } = rig('IonicSpark');
  h.items.cast(b, a);
  expect(b.hp).toBe(9840);
  expect(h.events.filter((e) => e.type === 'damage' && e.payload.itemSource)).toHaveLength(1);
});
it.each(['RedBuff', 'Morellonomicon', 'RapidFireCannon'])(
  '%s burns independently of refresh cadence and wounds healing',
  (name) => {
    const { a, b, h, hit, at, fx } = rig(name);
    if (name === 'RedBuff') at(20);
    else hit(10, b, a, 'physical');
    const burn = b.statuses.find((s) => s.group === 'item-burn')!;
    expect(burn.amount).toBe(10);
    const due = burn.nextTick!;
    const before = b.hp;
    at(due);
    expect(before - b.hp).toBe(100);
    const wound = b.statuses.find((s) => s.group === 'item-wound')!;
    expect(wound.amount).toBe(330);
    b.hp = 1000;
    fx({ kind: 'heal', target: 'target', radius: 0, amount: 1000 }, b);
    expect(b.hp).toBe(1670);
    if (name !== 'RedBuff') {
      const next = burn.nextTick;
      hit(1, b, a, 'physical');
      expect(b.statuses.filter((s) => s.group === 'item-burn')).toHaveLength(1);
      expect(b.statuses.find((s) => s.group === 'item-burn')!.nextTick).toBe(next);
    }
    expect(
      h.events.filter(
        (e) => e.type === 'damage' && e.payload.itemSource?.damageClass === 'periodic',
      ),
    ).toHaveLength(1);
  },
);
it('Hand of Justice chooses one repeatable round bonus and heals only actual HP damage', () => {
  const first = rig('UnstableConcoction'),
    second = rig('UnstableConcoction');
  expect(first.h.state.items).toEqual(second.h.state.items);
  first.a.hp = 100;
  first.b.hp = 10;
  first.hit(1000, first.b, first.a, 'true');
  expect(first.a.hp).toBe(first.h.state.items!.entries[0]!.chosen[0] === 'omnivamp' ? 103 : 101);
});
it.each(['Bloodthirster', 'HextechGunblade'])(
  '%s heals from HP lost, excluding shields and overkill',
  (name) => {
    const { a, b, c, h, hit } = rig(name);
    c.owner = a.owner;
    c.hp = 1;
    a.hp = 1000;
    b.hp = 100;
    hit(1000, b, a, 'true');
    expect(a.hp).toBe(name === 'Bloodthirster' ? 1020 : 1022);
    if (name === 'HextechGunblade') expect(c.hp).toBe(23);
    const heals = h.events.filter((e) => e.type === 'heal');
    expect(heals.every((e) => !!e.payload.itemSource)).toBe(true);
  },
);
it('Edge of Night cleanses harmful states once and blocks targeting without damage immunity', () => {
  const { a, b, h, hit } = rig('GuardianAngel');
  a.statuses.push({
    id: 'stun',
    sourceId: b.id,
    kind: 'stun',
    stat: null,
    amount: 0,
    expiresTick: 100,
  });
  hit(7000);
  expect(a.statuses.some((s) => s.kind === 'stun')).toBe(false);
  expect(h.items.untargetable(a)).toBe(true);
  expect(h.items.immune(a)).toBe(false);
  const hp = a.hp;
  hit(100);
  expect(a.hp).toBe(hp - 100);
  expect(a.statuses.filter((s) => s.group === 'item-untargetable')).toHaveLength(1);
});
it('Guinsoo and Titan stack independently, Titan caps at 25 and grants resists only at cap', () => {
  const { a, b, h } = rig(['GuinsoosRageblade', 'TitansResolve']);
  const armor = effectiveStat(a, 'armor');
  for (let i = 0; i < 24; i++) h.items.attack(a, b);
  expect(effectiveStat(a, 'armor')).toBe(armor);
  h.items.attack(a, b);
  expect(effectiveStat(a, 'armor')).toBe(armor + 20);
  for (let i = 0; i < 40; i++) h.items.attack(a, b);
  expect(effectiveStat(a, 'abilityPower')).toBe(60);
  expect(effectiveStat(a, 'attackSpeedMilli')).toBe(4500);
  expect(
    h.state.items!.entries.find((r) => r.definitionId === definition('TitansResolve').id)!.counts[
      'effect-1'
    ],
  ).toBe(25);
});
it('Runaan launches one secondary projectile with explicit causal metadata and no critical, mana or recursive attack', () => {
  const { a, b, c, h, engine } = rig('RunaansHurricane');
  h.items.attack(a, b);
  expect(h.state.projectiles).toHaveLength(1);
  const p = h.state.projectiles[0]!;
  expect(p.targetId).toBe(c.id);
  expect(p.rawDamage).toBe(62);
  expect(p.itemSource).toMatchObject({
    definitionId: definition('RunaansHurricane').id,
    damageClass: 'secondary',
    trigger: 'attack_release',
  });
  h.state.tick = p.impactTick - 1;
  engine.step();
  expect(c.hp).toBe(9938);
  expect(a.mana).toBe(0);
  expect(h.events.filter((e) => e.type === 'projectile_launch')).toHaveLength(1);
});
it('Archangel adds exactly 30 AP each 50 ticks', () => {
  const { a, at } = rig('ArchangelsStaff');
  const ap = effectiveStat(a, 'abilityPower');
  at(49);
  expect(effectiveStat(a, 'abilityPower')).toBe(ap);
  at(50);
  expect(effectiveStat(a, 'abilityPower')).toBe(ap + 30);
  at(100);
  expect(effectiveStat(a, 'abilityPower')).toBe(ap + 60);
});
it('Shojin adds five mana per release without refilling starting mana', () => {
  const { a, b, h } = rig('SpearOfShojin');
  a.mana = 0;
  h.items.attack(a, b);
  expect(a.mana).toBe(5);
  h.items.attack(a, b);
  expect(a.mana).toBe(10);
});
it('Nashor refreshes one timed attack-speed modifier after casting', () => {
  const { a, b, h } = rig('Leviathan');
  const base = effectiveStat(a, 'attackSpeedMilli');
  h.items.cast(a, b);
  expect(effectiveStat(a, 'attackSpeedMilli')).toBe(base + 400);
  h.state.tick = 10;
  h.items.cast(a, b);
  expect(effectiveStat(a, 'attackSpeedMilli')).toBe(base + 400);
  expect(a.statuses.find((s) => s.stat === 'attackSpeedMilli' && s.key)!.expiresTick).toBe(60);
});
it.each(['break', 'duration'])('Crownguard gives AP once on shield %s', (reason) => {
  const { a, h, hit, engine } = rig('Crownguard');
  const ap = effectiveStat(a, 'abilityPower');
  const shield = a.statuses.find((s) => s.kind === 'shield')!;
  if (reason === 'break') hit(shield.amount);
  else {
    h.state.tick = shield.expiresTick! - 1;
    engine.step();
  }
  expect(effectiveStat(a, 'abilityPower')).toBe(ap + 35);
  h.items.expired(a, shield, 'consumed');
  expect(effectiveStat(a, 'abilityPower')).toBe(ap + 35);
});
it('Adaptive helm fixes row role at start, granting front-hit or back-periodic mana', () => {
  const front = rig('AdaptiveHelm'),
    back = rig('AdaptiveHelm', true);
  expect(effectiveStat(front.a, 'armor')).toBe(40);
  expect(effectiveStat(back.a, 'abilityPower')).toBe(35);
  front.a.mana = 0;
  front.hit(10);
  expect(front.a.mana).toBe(6);
  back.a.mana = 0;
  back.at(30);
  expect(back.a.mana).toBe(10);
});
it('Blue reduces active maximum once, and takedown includes damage contributors only', () => {
  const { a, b, c, h, hit } = rig('BlueBuff');
  a.profile.ability = {
    id: 'active',
    name: 'Active',
    manaCost: 100,
    castTicks: 1,
    effects: [{ kind: 'damage', target: 'target', radius: 0, amount: 10, damageType: 'physical' }],
  }; // inactive units keep their mana by policy
  c.owner = a.owner;
  hit(10, b, a);
  hit(10000, b, c);
  expect(a.statuses.find((s) => s.group === 'item-amp')!.amount).toBe(80);
  expect(a.statuses.find((s) => s.group === 'item-amp')!.expiresTick).toBe(80);
  h.items.afterDamage(c, b, 0, 0, 'true', 'ability');
  expect(a.statuses.filter((s) => s.group === 'item-amp')).toHaveLength(1);
  const input = battle([definition('BlueBuff').id]);
  const e = new CombatEngine(input);
  expect(e.snapshot().units[0]!.profile.stats.maxMana).toBe(
    input.units[0]!.profile.stats.maxMana - 10,
  );
});
it('Last Whisper reduces physical resistance once, refreshes duration and does not stack copies', () => {
  const { a, b, h, hit } = rig('LastWhisper');
  b.profile.stats.armor = 100;
  hit(100, b, a, 'physical');
  expect(effectiveStat(b, 'armor')).toBe(70);
  h.state.tick = 5;
  hit(100, b, a, 'physical');
  expect(effectiveStat(b, 'armor')).toBe(70);
  expect(b.statuses.find((s) => s.group === 'armor-reduction')!.expiresTick).toBe(35);
});
it('Steadfast Heart switches damage reduction at HP threshold, never amplifies true damage', () => {
  const { a, b, hit } = rig('NightHarvester');
  const before = a.hp;
  hit(1000, a, b, 'magic');
  expect(before - a.hp).toBe(850);
  a.hp = 1000;
  hit(100, a, b, 'magic');
  expect(a.hp).toBe(908);
});
it('Quicksilver blocks stuns until tick 140, accumulates six times and retains gained speed', () => {
  const { a, h, at, fx, engine } = rig('Quicksilver');
  const base = effectiveStat(a, 'attackSpeedMilli');
  fx({ kind: 'stun', target: 'self', radius: 0, duration: 10 });
  expect(a.statuses.some((s) => s.kind === 'stun')).toBe(false);
  for (let t = 20; t <= 140; t += 20) at(t);
  expect(effectiveStat(a, 'attackSpeedMilli')).toBe(base + 240);
  h.state.tick = 139;
  engine.step();
  expect(h.items.immune(a)).toBe(false);
  fx({ kind: 'stun', target: 'self', radius: 0, duration: 10 });
  expect(a.statuses.some((s) => s.kind === 'stun')).toBe(true);
});
it('Statikk chains on third attack only, to up to four distinct living enemies', () => {
  const { a, b, c, h } = rig('StatikkShiv');
  h.items.attack(a, b);
  h.items.attack(a, b);
  expect(b.hp).toBe(10000);
  h.items.attack(a, b);
  expect(b.hp).toBe(9970);
  expect(c.hp).toBe(9970);
  expect(h.events.filter((e) => e.type === 'damage' && e.payload.itemSource)).toHaveLength(2);
  expect(b.statuses.find((s) => s.group === 'magic-reduction')!.amount).toBe(300);
});
it('Thief uses exactly three slots and selects two distinct available items without itself', () => {
  const { h } = rig('ThiefsGloves');
  const chosen = h.state.items!.entries[0]!.chosen;
  expect(new Set(chosen).size).toBe(2);
  expect(chosen).not.toContain(definition('ThiefsGloves').id);
  expect(h.state.items!.entries).toHaveLength(3);
  expect(() => battle([definition('ThiefsGloves').id, definition('WarmogsArmor').id])).toThrow(
    'item-slots-full',
  );
});

it.each(['dolea', 'vargas', 'jaramillo'])(
  '%s keeps its base definition and deterministic character mechanics with three items',
  (champion) => {
    const input = battle(
        ['Bloodthirster', 'RunaansHurricane', 'LastWhisper'].map((n) => definition(n).id),
        champion,
      ),
      copy = structuredClone(input);
    const a = runCombat(input),
      b = runCombat(input);
    expect(input).toEqual(copy);
    expect(a).toEqual(b);
    expect(a.events.some((e) => e.type === 'damage' && e.payload.itemSource)).toBe(true);
    const earned = a.events.filter((e) => e.type === 'kill_attributed');
    expect(new Set(earned.map((e) => e.payload.victimId)).size).toBe(earned.length);
  },
);
it.each([
  'PowerGauntlet',
  'Leviathan',
  'LastWhisper',
  'RedBuff',
  'Morellonomicon',
  'RapidFireCannon',
  'FrozenHeart',
  'GuardianAngel',
  'SpectralGauntlet',
  'BlueBuff',
])('%s expires temporary statuses exactly at the boundary', (name) => {
  const { a, b, c, h, hit, at, engine } = rig(name);
  if (name === 'PowerGauntlet') {
    b.statuses.push({
      id: 'test',
      kind: 'shield',
      sourceId: b.id,
      stat: null,
      amount: 1000,
      expiresTick: 100,
    });
    hit(1, b, a);
  }
  if (name === 'Leviathan') h.items.cast(a, b);
  if (['LastWhisper', 'Morellonomicon', 'RapidFireCannon'].includes(name)) hit(1, b, a, 'physical');
  if (name === 'RedBuff') at(20);
  if (['FrozenHeart', 'GuardianAngel'].includes(name)) hit(Math.ceil(a.hp * 0.7));
  if (name === 'BlueBuff') {
    c.owner = a.owner;
    hit(10, b, a);
    hit(100000, b, c);
  }
  const status = h.state.units
    .flatMap((u) => u.statuses)
    .find((s) => s.itemSource && s.expiresTick !== null)!;
  expect(status).toBeTruthy();
  // Stop new activations while advancing the real expiry pipeline.
  for (const u of h.state.units) {
    u.action = null;
    u.profile.stats.attack = 0;
    u.attackCharge = 0;
    u.statuses.push({
      id: `hold-${u.id}`,
      kind: 'stun',
      sourceId: u.id,
      stat: null,
      amount: 0,
      expiresTick: 450,
    });
  }
  h.state.tick = status.expiresTick! - 1;
  engine.step();
  expect(
    h.events.some(
      (e) =>
        e.type === 'status_expire' &&
        e.payload.statusId === status.id &&
        e.payload.reason === 'duration',
    ),
  ).toBe(true);
  expect(h.state.units.flatMap((u) => u.statuses).some((s) => s.id === status.id)).toBe(false);
});
it('two lifesteal copies heal independently; two burn sources do not duplicate periodic damage', () => {
  const { a, b, hit, h } = rig(['Bloodthirster', 'Bloodthirster']);
  a.hp = 1000;
  hit(100, b, a);
  expect(a.hp).toBe(1040);
  expect(h.events.filter((e) => e.type === 'heal')).toHaveLength(2);
  const burn = rig(['Morellonomicon', 'RapidFireCannon']);
  burn.hit(1, burn.b, burn.a, 'physical');
  expect(burn.b.statuses.filter((s) => s.group === 'item-burn')).toHaveLength(1);
  const hp = burn.b.hp;
  burn.at(10);
  expect(hp - burn.b.hp).toBe(100);
});
it('invalid duplicate identities, three-slot overflow and old-rule loadouts are rejected at the logical boundary', () => {
  const input = battle([definition('WarmogsArmor').id]);
  const instances = input.units[0]!.profile.itemLoadout!.instances;
  instances.push({ ...instances[0]! });
  expect(() => new CombatEngine(input)).toThrow('Duplicate equipped instance');
  instances.pop();
  input.rulesVersion = 'f0p6b3-1';
  expect(() => new CombatEngine(input)).toThrow();
});
it('random item rolls across seeds and rounds always preserve distinct eligible identities', () => {
  for (let seed = 0; seed < 30; seed++) {
    const input = battle([definition('ThiefsGloves').id]);
    input.seed = seed;
    input.units[0]!.profile.itemLoadout!.seed = seed;
    input.units[0]!.profile.itemLoadout!.round = seed + 1;
    const a = new CombatEngine(input).snapshot(),
      b = new CombatEngine(input).snapshot();
    expect(a).toEqual(b);
    const entries = a.items!.entries;
    expect(entries).toHaveLength(3);
    expect(new Set(entries.map((e) => e.instanceId)).size).toBe(3);
    expect(new Set(entries[0]!.chosen).size).toBe(2);
    expect(
      entries[0]!.chosen.every((id) =>
        completed.some((d) => d.id === id && d.availability === 'available'),
      ),
    ).toBe(true);
  }
});
it('full 7v7 equipped formations remain bounded, deterministic and measurable', () => {
  const input = stressBattle();
  const heap = process.memoryUsage().heapUsed,
    start = performance.now(),
    replay = runCombat(input),
    ms = performance.now() - start;
  expect(runCombat(input)).toEqual(replay);
  const perTick = new Map<number, number>();
  for (const e of replay.events) perTick.set(e.tick, (perTick.get(e.tick) ?? 0) + 1);
  const serialized = JSON.stringify(replay);
  const metrics = {
    replayBytes: Buffer.byteLength(serialized),
    compressedReplayBytes: gzipSync(serialized).length,
    milliseconds: Math.round(ms),
    heapDeltaBytes: process.memoryUsage().heapUsed - heap,
    events: replay.events.length,
    maxEventsPerTick: Math.max(...perTick.values()),
    derived: replay.events.filter((e) => e.type === 'item_effect').length,
    maxProjectiles: Math.max(...replay.snapshots.map((s) => s.projectiles.length)),
    maxAuras: Math.max(
      ...replay.snapshots.map(
        (s) =>
          s.units
            .flatMap((u) => u.statuses)
            .filter((s) => ['armor-reduction', 'magic-reduction'].includes(s.group ?? '')).length,
      ),
    ),
    traceBytes: Buffer.byteLength(JSON.stringify(replay.events)),
    maxSnapshotBytes: Math.max(
      ...replay.snapshots.map((s) => Buffer.byteLength(JSON.stringify(s))),
    ),
    ticks: replay.result.tick,
  };
  if (process.env.P8C_METRICS === '1')
    writeFileSync('/tmp/p8c-stress.json', JSON.stringify(metrics, null, 2));
  expect(metrics.milliseconds).toBeLessThan(5000);
  expect(metrics.maxEventsPerTick).toBeLessThan(1500);
  expect(metrics.maxProjectiles).toBeLessThan(100);
  expect(metrics.replayBytes * 2).toBeLessThan(128 * 1024 * 1024);
  expect(Math.ceil((metrics.compressedReplayBytes * 2 * 4) / 3)).toBeLessThan(12 * 1024 * 1024);
  expect(replay.events.some((e) => e.type === 'mechanics_limit')).toBe(false);
});

it('defensive retaliation resolves before source healing regardless of equipped-entry order', () => {
  for (const reverse of [false, true]) {
    const { a, b, h, hit } = rig('Bloodthirster');
    const defensive = rig('BrambleVest').h.state.items!.entries[0]!;
    h.state.items!.entries.push({ ...defensive, unitId: b.id, instanceId: 'defender-bramble' });
    if (reverse) h.state.items!.entries.reverse();
    a.hp = 70;
    hit(100, b, a, 'physical');
    expect(a.hp).toBe(0);
    expect(h.events.filter((e) => e.type === 'heal' && e.payload.targetId === a.id)).toHaveLength(
      0,
    );
  }
});
