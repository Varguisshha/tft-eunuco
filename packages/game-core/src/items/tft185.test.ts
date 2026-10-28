import { it, expect, vi } from 'vitest';
import {
  TFT185_ITEM_CATALOG as catalog,
  TFT185_REFERENCE,
  TFT185_PENDING,
  P11B_ECONOMY_CONFIG,
} from '@tft/game-data';
import { DEFAULT_OVERTIME, type CombatInput } from '@tft/shared';
import { createMatch, commandFor, applyMatchAction } from '../match/engine';
import { grantItemInstances, grantDevelopmentRemover, allItemInstances } from './inventory';
import { unit, act } from './fixture.test-support';
import { scaledOwnedProfile } from '../match/selectors';
import { ItemEffectExecutor } from '../combat/item-effects';
import { effectiveStat } from '../combat/math';
import { CombatEngine, runCombat } from '../combat/engine';
import { validateMatchState } from '../match/invariants';
function setup(definitionId = 'dolea') {
  const s = createMatch(42, P11B_ECONOMY_CONFIG);
  unit(s, 'holder', 1, 0, definitionId);
  return s;
}
function battle(source: string): CombatInput {
  let s = setup();
  const item = catalog.definitions.find((d) => d.content?.sourceRecordId === source)!;
  grantItemInstances(s, 'sample', [item.id]);
  s = act(s, { type: 'equip_item', unitId: 'holder', itemId: allItemInstances(s)[0]!.id });
  const profile = scaledOwnedProfile(s.units[0]!, s.config, s.items, 1, 42),
    enemy = structuredClone(profile);
  delete enemy.itemLoadout;
  delete enemy.initialItemModifiers;
  enemy.stats.maxHp = 20000;
  enemy.stats.attack = 60;
  enemy.itemRole = 'tank';
  profile.traits = [];
  enemy.traits = [];
  return {
    protocolVersion: 3,
    rulesVersion: 'f0p11b-1',
    combatId: 'tft185-test',
    seed: 42,
    maxTicks: 200,
    overtime: DEFAULT_OVERTIME,
    obstacles: [],
    traits: [],
    units: [
      { id: 'holder', definitionId: 'dolea', owner: 'south', position: { q: 0, r: 4 }, profile },
      {
        id: 'enemy',
        definitionId: 'dolea',
        owner: 'north',
        position: { q: 0, r: 3 },
        profile: enemy,
      },
    ],
  };
}
it('freezes 8 components, 36 independent unordered recipes and explicit pending evidence instead of silently enabling guesses', () => {
  expect(catalog.definitions).toHaveLength(44);
  expect(catalog.recipes).toHaveLength(36);
  expect(new Set(catalog.recipes.map((r) => r.id)).size).toBe(36);
  expect(TFT185_REFERENCE.version).toBe('tft-18.5-2026-10-27');
  expect(Object.keys(TFT185_PENDING)).toHaveLength(6);
  for (const r of TFT185_REFERENCE.records) {
    const d = catalog.definitions.find((d) => d.content?.sourceRecordId === r.recordId)!;
    expect(d.content?.visibleName).toBe(r.nameEs);
    expect(d.availability).toBe(TFT185_PENDING[r.recordId] ? 'planned' : 'available');
  }
});
it.each(
  TFT185_REFERENCE.records
    .filter((r) => r.components.length === 2)
    .map((r) => [r.nameEs, r.recordId] as const),
)('%s: recipe lineage, official name, availability and deterministic execution', (name, source) => {
  const d = catalog.definitions.find((d) => d.content?.sourceRecordId === source)!;
  expect(d.kind).toBe('completed');
  if (d.kind !== 'completed') throw Error('not completed');
  let s = setup();
  grantItemInstances(s, 'components', d.recipe);
  const [a, b] = s.items!.components;
  const before = structuredClone(s);
  const result = applyMatchAction(
    s,
    commandFor(s, { type: 'combine_components', firstId: a!.id, secondId: b!.id }),
  );
  if (TFT185_PENDING[source]) {
    expect(result.ok).toBe(false);
    expect(result.state).toEqual(before);
    expect(allItemInstances(result.state)).toHaveLength(2);
    return;
  }
  expect(result.ok).toBe(true);
  s = result.state;
  expect(s.items!.completed[0]!.definitionId).toBe(d.id);
  expect(s.items!.crafts[0]!.origin).toMatchObject({ kind: 'recipe', consumed: [a!.id, b!.id] });
  expect(allItemInstances(s)).toHaveLength(1);
  validateMatchState(s);
  const input = battle(source);
  const replay = runCombat(input);
  expect(runCombat(input)).toEqual(replay);
  expect(replay.result.tick).toBeGreaterThan(0);
  expect(replay.events.some((e) => e.type === 'damage')).toBe(true);
  expect(d.content?.visibleName).toBe(name);
});
it('applies official 18.2 / 18.4 / 27 October overlays rather than stale Hextech parameters', () => {
  const p = (id: string) =>
    TFT185_REFERENCE.records.find((r) => r.recordId === `TFT_Item_${id}`)!.parameters;
  expect(p('Bloodthirster')).toMatchObject({
    AD: 0.18,
    AP: 18,
    HealthThreshold: 50,
    ShieldHealthPercent: 30,
  });
  expect(p('GuardianAngel')).toMatchObject({ HealthThreshold: 40, MissingHealthRestore: 0.15 });
  expect(p('UnstableConcoction')).toMatchObject({
    AD_NotStatBar: 0.18,
    AP_NotStatBar: 18,
    StatOmnivamp_NotStatBar: 0.12,
  });
  expect(p('Crownguard').ShieldBonusAP).toBe(20);
  expect(p('Redemption').VerifiedDurability).toBe(0.1);
});
it('Tear regenerates mana over time, not initial mana, with no duplicated component bonus', () => {
  const input = battle('TFT_Item_TearOfTheGoddess');
  const holder = input.units[0]!;
  expect(holder.profile.stats.startingMana).toBe(0);
  holder.profile.stats.attackSpeedMilli = 1;
  input.units[1]!.profile.stats.attackSpeedMilli = 1;
  holder.position = { q: -1, r: 7 };
  input.units[1]!.position = { q: 3, r: 0 };
  holder.profile.stats.moveTicks = 20;
  input.units[1]!.profile.stats.moveTicks = 20;
  const replay = runCombat({ ...input, maxTicks: 21 });
  const income = replay.events.filter(
    (e) => e.type === 'mana_gain' && e.payload.unitId === 'holder',
  );
  expect(
    income.flatMap((e) => (e.type === 'mana_gain' ? [[e.tick, e.payload.amount]] : [])),
  ).toEqual([
    [10, 1],
    [20, 1],
  ]);
});
it('Guinsoo uses time, Kraken uses attacks, Quicksilver has a bounded immunity and time stacks', () => {
  for (const [source, kind, firstTick] of [
    ['GuinsoosRageblade', 'stat_stacks', 10],
    ['RunaansHurricane', 'stat_stacks', 2],
    ['Quicksilver', 'stat_stacks', 10],
  ] as const) {
    const replay = runCombat(battle(`TFT_Item_${source}`));
    const signals = replay.events.filter(
      (e) => e.type === 'item_effect' && e.payload.operation === kind,
    );
    expect(signals.length).toBeGreaterThan(1);
    expect(signals[0]!.tick).toBeGreaterThanOrEqual(firstTick);
    if (source === 'GuinsoosRageblade' || source === 'Quicksilver')
      expect(signals.every((e) => e.tick % 10 === 0)).toBe(true);
    if (source === 'Quicksilver') {
      const immunity = replay.events.find(
        (e) => e.type === 'status_apply' && e.payload.status.group === 'item-cc',
      );
      expect(immunity?.type === 'status_apply' ? immunity.payload.status.expiresTick : null).toBe(
        180,
      );
    }
  }
});
it('remover returns an intact crafted item once, never dismantles it, and failed operations preserve the consumable', () => {
  let s = setup();
  s.development = { version: 1, tainted: true, healthAdjustments: [] };
  const d = catalog.definitions.find((d) => d.content?.sourceRecordId === 'TFT_Item_Deathblade')!;
  if (d.kind !== 'completed') throw Error('completed');
  grantItemInstances(s, 'pair', d.recipe);
  s = act(s, {
    type: 'combine_components',
    firstId: s.items!.components[0]!.id,
    secondId: s.items!.components[1]!.id,
  });
  const item = s.items!.completed[0]!;
  s = act(s, { type: 'equip_item', itemId: item.id, unitId: 'holder' });
  grantDevelopmentRemover(s, 'fixture');
  grantDevelopmentRemover(s, 'fixture');
  expect(s.items!.removers!.issued).toHaveLength(1);
  const removerId = s.items!.removers!.issued[0]!.id,
    before = structuredClone(s);
  const bad = applyMatchAction(
    s,
    commandFor(s, { type: 'remove_unit_items', removerId, unitId: 'foreign' }),
  );
  expect(bad.ok).toBe(false);
  expect(bad.state).toEqual(before);
  s = act(s, { type: 'remove_unit_items', removerId, unitId: 'holder' });
  expect(s.units[0]!.equipment).toBeUndefined();
  expect(s.items!.completed).toEqual([item]);
  expect(s.items!.components).toHaveLength(0);
  expect(s.items!.removers!.consumed).toEqual([
    { id: removerId, unitId: 'holder', returnedIds: [item.id] },
  ]);
  const used = applyMatchAction(
    s,
    commandFor(s, { type: 'remove_unit_items', removerId, unitId: 'holder' }),
  );
  expect(used.ok).toBe(false);
  expect(used.state).toEqual(s);
  validateMatchState(s);
});
it('does not issue competitive removers or mutate frozen combat equipment', () => {
  let s = setup();
  expect(() => grantDevelopmentRemover(s, 'not-authorized')).toThrow();
  s.development = { version: 1, tainted: true, healthAdjustments: [] };
  grantDevelopmentRemover(s, 'fixture');
  grantItemInstances(s, 'component', ['component-ad']);
  s = act(s, { type: 'equip_item', unitId: 'holder', itemId: s.items!.components[0]!.id });
  s = act(s, { type: 'move_unit', unitId: 'holder', to: { kind: 'board', hex: { q: 0, r: 4 } } });
  s = act(s, { type: 'start_combat' });
  const before = structuredClone(s);
  const result = applyMatchAction(
    s,
    commandFor(s, {
      type: 'remove_unit_items',
      unitId: 'holder',
      removerId: s.items!.removers!.issued[0]!.id,
    }),
  );
  expect(result.ok).toBe(false);
  expect(result.state).toEqual(before);
  expect(s.items!.removers!.consumed).toHaveLength(0);
  expect(() => new CombatEngine(s.combat!.input)).not.toThrow();
});

it('Warmog multiplies flat HP once; Blue multiplies AD/AP from all sources once', () => {
  const warm = new CombatEngine(battle('TFT_Item_WarmogsArmor'))
    .snapshot()
    .units.find((u) => u.id === 'holder')!;
  expect(warm.hp).toBe(Math.floor((warm.profile.stats.maxHp + 500) * 1.18));
  const input = battle('TFT_Item_BlueBuff');
  input.units[0]!.profile.initialItemModifiers!.push(
    { id: 'external-ad', sourceId: 'trait-test', stat: 'attack', mode: 'flat', amount: 20 },
    { id: 'external-ap', sourceId: 'trait-test', stat: 'abilityPower', mode: 'flat', amount: 10 },
  );
  const blue = new CombatEngine(input).snapshot().units.find((u) => u.id === 'holder')!;
  const stat = (s: 'attack' | 'abilityPower') => {
    const base = blue.profile.stats[s] ?? 0,
      mod = blue.statuses.filter((m) => m.stat === s);
    return Math.floor(
      (base +
        mod.filter((m) => m.mode === 'flat').reduce((n, m) => n + m.amount, 0) +
        Math.floor(
          (base * mod.filter((m) => m.mode === 'percent_milli').reduce((n, m) => n + m.amount, 0)) /
            1000,
        )) *
        1.1,
    );
  };
  expect(effectiveStat(blue, 'attack')).toBe(stat('attack'));
  expect(effectiveStat(blue, 'abilityPower')).toBe(stat('abilityPower'));
});
it('Adaptive Helm chooses role rather than board row and amplifies fractional mana with integer carry', () => {
  for (const role of ['tank', 'fighter', 'caster', 'assassin', 'marksman', 'specialist'] as const) {
    const input = battle('TFT_Item_AdaptiveHelm');
    input.units[0]!.profile.itemRole = role;
    input.units[0]!.position = { q: -2, r: 7 };
    const u = new CombatEngine(input).snapshot().units.find((u) => u.id === 'holder')!;
    expect(effectiveStat(u, 'armor') - u.profile.stats.armor).toBe(
      ['tank', 'fighter'].includes(role) ? 30 : 0,
    );
    expect(effectiveStat(u, 'magicResist') - u.profile.stats.magicResist).toBe(
      ['tank', 'fighter'].includes(role) ? 50 : 20,
    );
    expect(effectiveStat(u, 'manaRegenMilli')).toBe(3000);
  }
});
it('precision duplicates add damage amplification instead of old critical damage', () => {
  const input = battle('TFT_Item_InfinityEdge');
  const profile = input.units[0]!.profile;
  profile.itemLoadout!.instances.push({
    ...profile.itemLoadout!.instances[0]!,
    instanceId: 'second-precision',
  });
  const u = new CombatEngine(input).snapshot().units.find((u) => u.id === 'holder')!;
  expect(u.statuses.filter((s) => s.group === 'item-amp').reduce((n, s) => n + s.amount, 0)).toBe(
    100,
  );
  expect(effectiveStat(u, 'critMultiplierMilli')).toBe(profile.stats.critMultiplierMilli);
});
it('Archangel grants exactly 20 AP per five seconds and Shojin grants five attack mana', () => {
  const replay = runCombat({ ...battle('TFT_Item_ArchangelsStaff'), maxTicks: 101 });
  const ap = replay.events.filter(
    (e) => e.type === 'item_effect' && e.payload.operation === 'ability_power',
  );
  expect(ap.map((e) => e.tick)).toEqual([50, 100]);
  const spear = runCombat(battle('TFT_Item_SpearOfShojin'));
  expect(
    spear.events.some((e) => e.type === 'item_effect' && e.payload.operation === 'attack_mana'),
  ).toBe(true);
  expect(
    spear.events.some(
      (e) => e.type === 'mana_gain' && e.payload.unitId === 'holder' && e.payload.amount === 5,
    ),
  ).toBe(true);
});
it('Sunfire applies nonstacking 1% burn and 33% wound for ten seconds every two seconds', () => {
  const replay = runCombat(battle('TFT_Item_RedBuff'));
  const burn = replay.events.find(
    (e) => e.type === 'status_apply' && e.payload.status.group === 'item-burn',
  );
  expect(burn?.type).toBe('status_apply');
  if (burn?.type !== 'status_apply') throw Error('burn');
  expect(burn.payload.status.amount).toBe(10);
  expect(burn.payload.status.expiresTick! - burn.tick).toBe(100);
  expect(burn.tick).toBe(20);
  const wound = replay.events.find(
    (e) => e.type === 'status_apply' && e.payload.status.group === 'item-wound',
  );
  expect(wound?.type === 'status_apply' ? wound.payload.status.amount : null).toBe(330);
});
it('Morello, Last Whisper and Void Staff apply the documented duration and strongest reduction', () => {
  for (const [item, group, amount, duration] of [
    ['Morellonomicon', 'item-wound', 330, 100],
    ['LastWhisper', 'armor-reduction', 300, 30],
    ['StatikkShiv', 'magic-reduction', 300, 50],
  ] as const) {
    const replay = runCombat(battle(`TFT_Item_${item}`));
    const e = replay.events.find(
      (e) => e.type === 'status_apply' && e.payload.status.group === group,
    );
    expect(e?.type).toBe('status_apply');
    if (e?.type !== 'status_apply') throw Error('status');
    expect(e.payload.status.amount).toBe(amount);
    expect(e.payload.status.expiresTick! - e.tick).toBe(duration);
  }
});
it('Crownguard starts with 25% HP for eight seconds, then grants 20 AP only once', () => {
  const replay = runCombat(battle('TFT_Item_Crownguard'));
  const shield = replay.events.find(
    (e) => e.type === 'shield_apply' && !!e.payload.status.itemSource,
  );
  expect(shield?.type).toBe('shield_apply');
  if (shield?.type !== 'shield_apply') throw Error('shield');
  expect(shield.payload.status.expiresTick).toBe(80);
  const grant = replay.events.filter(
    (e) => e.type === 'item_effect' && e.payload.operation === 'ability_power',
  );
  expect(grant).toHaveLength(1);
  expect(grant[0]!.tick).toBeLessThanOrEqual(80);
});
it('removed equipment goes to pending if the bag is full without deleting or duplicating it', () => {
  let s = setup();
  s.development = { version: 1, tainted: true, healthAdjustments: [] };
  grantItemInstances(s, 'equip', ['component-ad']);
  s = act(s, { type: 'equip_item', unitId: 'holder', itemId: s.items!.components[0]!.id });
  const id = s.units[0]!.equipment![0]!.id;
  const capacity = catalog.policy.componentCapacity;
  for (let n = 0; n < capacity; n += 32)
    grantItemInstances(s, `full-${n}`, Array(Math.min(32, capacity - n)).fill('component-ap'));
  grantDevelopmentRemover(s, 'fixture');
  s = act(s, {
    type: 'remove_unit_items',
    unitId: 'holder',
    removerId: s.items!.removers!.issued[0]!.id,
  });
  expect(s.items!.components).toHaveLength(capacity);
  expect(s.items!.pending.some((i) => i.id === id)).toBe(true);
  expect(allItemInstances(s)).toHaveLength(capacity + 1);
  validateMatchState(s);
});

it.each([
  ['TFT_Item_RabadonsDeathcap', 'abilityPower', 55],
  ['TFT_Item_Deathblade', 'attack', 550],
  ['TFT_Item_InfinityEdge', 'critChanceMilli', 350],
  ['TFT_Item_JeweledGauntlet', 'critChanceMilli', 350],
] as const)(
  '%s: initial bonus is applied once and every precision source is explicit',
  (source, stat, amount) => {
    const u = new CombatEngine(battle(source)).snapshot().units.find((u) => u.id === 'holder')!;
    if (stat === 'attack')
      expect(effectiveStat(u, stat)).toBe(Math.floor(u.profile.stats.attack * 1.55));
    else expect(effectiveStat(u, stat)).toBe((u.profile.stats[stat] ?? 0) + amount);
  },
);
it('Bramble retaliation is magic, adjacent, capped at one trigger per two seconds', () => {
  const replay = runCombat(battle('TFT_Item_BrambleVest'));
  const triggers = replay.events.filter(
    (e) => e.type === 'item_effect' && e.payload.operation === 'retaliation',
  );
  expect(triggers.length).toBeGreaterThan(1);
  const ticks = [...new Set(triggers.map((e) => e.tick))];
  for (let i = 1; i < ticks.length; i++)
    expect(ticks[i]! - ticks[i - 1]!).toBeGreaterThanOrEqual(20);
  const damage = replay.events.filter(
    (e) =>
      e.type === 'damage' &&
      e.payload.itemSource?.definitionId ===
        catalog.definitions.find((d) => d.content?.sourceRecordId === 'TFT_Item_BrambleVest')!.id,
  );
  expect(damage.length).toBeGreaterThan(0);
  expect(damage.every((e) => e.type === 'damage' && e.payload.damageType === 'magic')).toBe(true);
});
it('Spirit Visage heals 2% missing HP per second with 250 cap; Dragon heals 2.5% max HP every two seconds', () => {
  for (const source of ['Redemption', 'DragonsClaw']) {
    const input = battle(`TFT_Item_${source}`),
      replay = runCombat(input),
      max = effectiveStat(replay.snapshots[0]!.units.find((u) => u.id === 'holder')!, 'maxHp');
    const heals = replay.events.filter(
      (e) => e.type === 'heal' && e.payload.itemSource && e.payload.targetId === 'holder',
    );
    expect(heals.length).toBeGreaterThan(0);
    for (const e of heals) {
      if (e.type !== 'heal') continue;
      expect(e.tick % (source === 'Redemption' ? 10 : 20)).toBe(0);
      const before = e.payload.hpAfter - e.payload.amount;
      const requested =
        source === 'Redemption'
          ? Math.min(250, Math.floor((max - before) * 0.02))
          : Math.floor(max * 0.025);
      expect(e.payload.amount).toBe(Math.min(max - before, requested));
    }
  }
});
it('Vow gives 20 initial mana and its 40% lifeline; Bloodthirster uses the 18.2 50% lifeline', () => {
  for (const [source, threshold, shieldRatio, duration] of [
    ['FrozenHeart', 400, 200, 600],
    ['Bloodthirster', 500, 300, 50],
  ] as const) {
    const input = battle(`TFT_Item_${source}`);
    input.units[0]!.profile.stats.maxHp = 400;
    const replay = runCombat(input),
      item = catalog.definitions.find((d) => d.content?.sourceRecordId === `TFT_Item_${source}`)!;
    const shield = replay.events.find(
      (e) => e.type === 'shield_apply' && e.payload.status.itemSource?.definitionId === item.id,
    );
    expect(shield?.type).toBe('shield_apply');
    if (shield?.type !== 'shield_apply') throw Error('lifeline');
    expect(shield.payload.status.expiresTick! - shield.tick).toBe(duration);
    expect(shield.payload.status.amount).toBe(Math.floor((400 * shieldRatio) / 1000));
    const previous = replay.events
      .filter(
        (e) =>
          e.type === 'damage' &&
          e.payload.targetId === 'holder' &&
          e.order < shield.order &&
          e.tick === shield.tick,
      )
      .at(-1);
    expect(previous?.type === 'damage' ? previous.payload.hpAfter : 401).toBeLessThanOrEqual(
      (400 * threshold) / 1000,
    );
    if (source === 'FrozenHeart')
      expect(
        replay.events.some(
          (e) =>
            e.type === 'mana_gain' &&
            e.tick === 0 &&
            e.payload.unitId === 'holder' &&
            e.payload.amount === 20,
        ),
      ).toBe(true);
  }
});
it('Hand of Justice changes its power immediately across the 50% health boundary', () => {
  const input = battle('TFT_Item_UnstableConcoction');
  input.units[0]!.profile.stats.maxHp = 800;
  const replay = runCombat(input);
  let sawLow = false;
  for (const snapshot of replay.snapshots) {
    const u = snapshot.units.find((u) => u.id === 'holder')!;
    if (u.hp <= 0) continue;
    const high = u.hp * 1000 > effectiveStat(u, 'maxHp') * 500;
    if (!high) sawLow = true;
    expect(effectiveStat(u, 'abilityPower')).toBe(
      (u.profile.stats.abilityPower ?? 0) + (high ? 36 : 18),
    );
  }
  expect(sawLow).toBe(true);
});
it('Nashor grants two attack mana or four on critical attacks, without a cast-speed buff', () => {
  for (const critical of [false, true]) {
    const input = battle('TFT_Item_Leviathan');
    const u = input.units[0]!;
    u.profile.stats.critChanceMilli = critical ? 1000 : 0;
    u.profile.initialItemModifiers = u.profile.initialItemModifiers!.filter(
      (m) => m.stat !== 'critChanceMilli',
    );
    const replay = runCombat(input);
    expect(
      replay.events.some(
        (e) =>
          e.type === 'mana_gain' &&
          e.payload.unitId === 'holder' &&
          e.payload.amount === (critical ? 4 : 2),
      ),
    ).toBe(true);
    expect(
      replay.events.some((e) => e.type === 'item_effect' && e.payload.operation === 'attack_speed'),
    ).toBe(false);
  }
});
it('Ionic and Evenshroud auras affect only enemies within two hexes; Evenshroud resists end after 15 s', () => {
  for (const [source, group] of [
    ['IonicSpark', 'magic-reduction'],
    ['SpectralGauntlet', 'armor-reduction'],
  ] as const) {
    const near = battle(`TFT_Item_${source}`),
      engine = new CombatEngine(near),
      enemy = engine.snapshot().units.find((u) => u.id === 'enemy')!;
    expect(enemy.statuses.some((s) => s.group === group && s.amount === 300)).toBe(true);
    const far = structuredClone(near);
    far.units[1]!.position = { q: 3, r: 0 };
    expect(
      new CombatEngine(far)
        .snapshot()
        .units.find((u) => u.id === 'enemy')!
        .statuses.some((s) => s.group === group),
    ).toBe(false);
    if (source === 'SpectralGauntlet') {
      const own = engine.snapshot().units.find((u) => u.id === 'holder')!;
      expect(
        own.statuses.some((s) => s.stat === 'armor' && s.amount === 15 && s.expiresTick === 150),
      ).toBe(true);
    }
  }
});
it('Gargoyle tracks each live enemy target and Titan caps at 25 with damage amp and control immunity', () => {
  const garg = runCombat({ ...battle('TFT_Item_GargoyleStoneplate'), maxTicks: 10 });
  const u = garg.snapshots.at(-1)!.units.find((u) => u.id === 'holder')!;
  expect(effectiveStat(u, 'armor')).toBe(u.profile.stats.armor + 35);
  expect(effectiveStat(u, 'magicResist')).toBe(u.profile.stats.magicResist + 35);
  const titan = battle('TFT_Item_TitansResolve');
  titan.units[0]!.profile.stats.maxHp = 20000;
  const replay = runCombat({ ...titan, maxTicks: 300 }),
    last = replay.snapshots.at(-1)!.units.find((u) => u.id === 'holder')!;
  expect(last.statuses.some((s) => s.group === 'item-cc' && s.expiresTick === null)).toBe(true);
  expect(last.statuses.some((s) => s.group === 'item-amp' && s.amount === 100)).toBe(true);
  expect(effectiveStat(last, 'abilityPower')).toBe((last.profile.stats.abilityPower ?? 0) + 50);
});
it('Steadfast changes durability at 50% HP; Edge cleanses once at 40% with one-second untargetability', () => {
  const input = battle('TFT_Item_GuardianAngel');
  input.units[0]!.profile.stats.maxHp = 400;
  const replay = runCombat(input);
  const invis = replay.events.filter(
    (e) => e.type === 'status_apply' && e.payload.status.group === 'item-untargetable',
  );
  expect(invis).toHaveLength(1);
  if (invis[0]?.type !== 'status_apply') throw Error('untargetable');
  expect(invis[0].payload.status.expiresTick! - invis[0].tick).toBe(10);
  const d = catalog.definitions.find(
    (d) => d.content?.sourceRecordId === 'TFT_Item_NightHarvester',
  )!;
  if (d.kind !== 'completed') throw Error('completed');
  expect(
    d.effects.some(
      (e) =>
        e.implementation === 'executable-v1' &&
        e.operation.kind === 'damage_reduction' &&
        e.operation.healthAboveMilli === 500 &&
        e.operation.ratioMilli === 50 &&
        e.operation.aboveThresholdRatioMilli === 150,
    ),
  ).toBe(true);
});
it('Ionic uses mana actually spent, including zero-cost additional casts, never maximum capacity as a substitute', () => {
  const input = battle('TFT_Item_IonicSpark'),
    state = new CombatEngine(input).snapshot(),
    damage = vi.fn();
  const holder = state.units.find((u) => u.id === 'holder')!,
    caster = state.units.find((u) => u.id === 'enemy')!;
  const executor = new ItemEffectExecutor({
    input,
    state: () => state,
    parentEvent: () => null,
    emit: () => ({}) as never,
    effect: () => {},
    damage,
    mana: () => {},
    cancel: () => {},
  });
  executor.cast(caster, holder, 0);
  expect(damage.mock.calls.at(-1)![2]).toBe(0);
  executor.cast(caster, holder, 30);
  expect(damage.mock.calls.at(-1)![2]).toBe(45);
});
