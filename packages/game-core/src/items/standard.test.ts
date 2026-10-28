import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  ITEM_CATALOG,
  STANDARD_ITEM_CATALOG as catalog,
  STANDARD_LAB_ITEM_CATALOG as lab,
  STANDARD_ITEMS_ECONOMY_CONFIG as config,
  ITEM_BALANCE_REFERENCE as reference,
  ITEM_DROP_DESIGN,
  resolveItemCatalog,
  recipeKey,
  validateItemCatalog,
  itemDescription,
  traitsFor,
} from '@tft/game-data';
import { ItemBonusSchema, DEFAULT_OVERTIME, type ItemBonus } from '@tft/shared';
import { createMatch, applyMatchAction, commandFor } from '../match/engine';
import { grantItemInstances } from './inventory';
import { validateMatchState } from '../match/invariants';
import { applyDevelopmentItems } from '../development/items';
import { scaledOwnedProfile, equippedStatsPreview } from '../match/selectors';
import { runCombat } from '../combat/engine';
import { act, unit } from './fixture.test-support';
const components = catalog.definitions.filter((d) => d.kind === 'component');
const completed = catalog.definitions.filter((d) => d.kind === 'completed');
const expected: Record<string, ItemBonus> = {
  ad: { stat: 'attack', mode: 'percent_milli', amount: 100 },
  attack_speed: { stat: 'attackSpeedMilli', mode: 'percent_milli', amount: 100 },
  ap: { stat: 'abilityPower', mode: 'flat', amount: 10 },
  mana: { stat: 'startingMana', mode: 'flat', amount: 15 },
  armor: { stat: 'armor', mode: 'flat', amount: 20 },
  magic_resist: { stat: 'magicResist', mode: 'flat', amount: 20 },
  health: { stat: 'maxHp', mode: 'flat', amount: 150 },
  critical: { stat: 'critChanceMilli', mode: 'flat', amount: 200 },
};
it.each(components)('component $category has frozen units, presentation and value', (d) => {
  expect(d.bonuses).toEqual([expected[d.category]]);
  expect(d.content).toMatchObject({
    definition: 'complete',
    combat: 'compatible',
    visibleName: null,
  });
  expect(itemDescription(d)).not.toMatch(/undefined|NaN|pendiente/);
  expect(d.icon).toMatch(/^forge-/);
});
it('freezes exactly eight components and 36 distinct unordered results', () => {
  expect(components).toHaveLength(8);
  expect(completed).toHaveLength(36);
  expect(new Set(catalog.recipes.map((r) => r.resultId)).size).toBe(36);
  expect(catalog.recipes.filter((r) => r.components[0] === r.components[1])).toHaveLength(8);
  for (const a of components)
    for (const b of components) {
      expect(catalog.recipes.filter((r) => r.id === recipeKey(a.id, b.id))).toHaveLength(1);
      expect(recipeKey(a.id, b.id)).toBe(recipeKey(b.id, a.id));
    }
  expect(ITEM_DROP_DESIGN.enabled).toBe(false);
});
describe.each(completed)('standard definition $id', (d) => {
  it('matches source, complete recipe, restrictions and declared statistical totals', () => {
    const source = reference.records.find((r) => r.recordId === d.content!.sourceRecordId)!;
    expect(source.components).toHaveLength(2);
    expect(catalog.recipes.find((r) => r.resultId === d.id)?.components).toEqual(d.recipe);
    expect(d.stacking).toBe(source.unique ? 'unique' : 'stack');
    expect(d.availability).toBe('planned');
    expect(d.content!.competitive).toBe(false);
    expect(d.content!.definition).toBe('complete');
    expect(d.content!.internalName).toBe(d.id);
    expect(d.content!.visibleName).toBeNull();
    expect(d.content!.accessibleLabel.length).toBeGreaterThan(10);
    expect(itemDescription(d)).toContain('No disponible');
    expect(itemDescription(d)).not.toMatch(/undefined|NaN/);
    const params = source.parameters as Record<string, number>;
    for (const [key, stat, mode, scale] of [
      ['AD', 'attack', 'percent_milli', 1000],
      ['AS', 'attackSpeedMilli', 'percent_milli', 10],
      ['AP', 'abilityPower', 'flat', 1],
      ['Mana', 'startingMana', 'flat', 1],
      ['CritChance', 'critChanceMilli', 'flat', 10],
      ['Health', 'maxHp', 'flat', 1],
      ['Armor', 'armor', 'flat', 1],
      ['MagicResist', 'magicResist', 'flat', 1],
    ] as const) {
      if (params[key] !== undefined)
        expect(d.bonuses).toContainEqual({ stat, mode, amount: Math.round(params[key]! * scale) });
    }
    expect([...d.content!.usedParameters, ...d.content!.uninterpretedParameters].sort()).toEqual(
      Object.keys(source.parameters).sort(),
    );
    expect(new Set(d.effects.map((e) => e.id)).size).toBe(d.effects.length);
    for (const effect of d.effects) {
      expect(effect.implementation).toBe('reserved-design-v2');
    }
  });
  it('rejects crafting, automatic equipment combination and granting atomically in normal play', () => {
    let s = createMatch(42, config);
    unit(s);
    grantItemInstances(s, 'pair', d.recipe);
    const before = structuredClone(s);
    const ids = s.items!.components.map((i) => i.id);
    const attempt = applyMatchAction(
      s,
      commandFor(s, { type: 'combine_components', firstId: ids[0]!, secondId: ids[1]! }),
    );
    expect(attempt).toMatchObject({ ok: false, error: 'item-unavailable', state: before });
    expect(() => grantItemInstances(s, 'forbidden', [d.id])).toThrow('item-unavailable');
    expect(s).toEqual(before);
    s = act(s, { type: 'equip_item', unitId: 'unit-a', itemId: ids[0]! });
    const equipped = structuredClone(s);
    expect(
      applyMatchAction(s, commandFor(s, { type: 'equip_item', unitId: 'unit-a', itemId: ids[1]! })),
    ).toMatchObject({ ok: false, error: 'item-unavailable', state: equipped });
  });
});
it('retains original catalogs and refuses unknown or crossed versions', () => {
  expect(ITEM_CATALOG.definitions.every((d) => d.bonuses.length === 0)).toBe(true);
  expect(ITEM_CATALOG.recipes.every((r) => r.resultId === null)).toBe(true);
  expect(() => resolveItemCatalog('f0p8b-future')).toThrow();
  const s = createMatch(42, config);
  s.items!.catalogVersion = ITEM_CATALOG.version;
  expect(() => validateMatchState(s)).toThrow();
  s.items!.catalogVersion = lab.version;
  expect(() => validateMatchState(s)).toThrow();
  expect(validateItemCatalog(JSON.parse(JSON.stringify(catalog)))).toEqual(catalog);
  const corrupted = structuredClone(catalog);
  corrupted.recipes[0]!.resultId = null;
  expect(() => validateItemCatalog(corrupted)).toThrow();
  const enabled = structuredClone(catalog);
  enabled.definitions.find((d) => d.id === 'item-forge-health--health')!.availability = 'available';
  expect(() => validateItemCatalog(enabled)).toThrow('Competitive completed items disabled');
  expect(
    ItemBonusSchema.safeParse({ stat: 'startingMana', mode: 'percent_milli', amount: 100 }).success,
  ).toBe(false);
});
it('pins reference facts independently of formatting and records obsolete uninterpreted fields', () => {
  expect(reference.patch).toBe('14.1');
  expect(reference.records).toHaveLength(44);
  expect(reference.sourceUrl).toBe('https://raw.communitydragon.org/14.1/cdragon/tft/en_us.json');
  expect(reference.upstreamSha256).toBe(
    'ae6d4bde7f591194b599caa120ca36ccc592bb5d9942ae703a47bd0cd0f7cb56',
  );
  expect(createHash('sha256').update(JSON.stringify(reference)).digest('hex')).toBe(
    '77f6e396d0ee3f9da8ff491e702ac87258122d85e95aa15d4a3d2e6b940f40a8',
  );
  for (const [source, key] of [
    ['IonicSpark', 'Damage'],
    ['RapidFireCannon', 'HexRangeIncrease'],
    ['Crownguard', 'ChillDuration'],
  ])
    expect(
      completed.find((d) => d.content!.sourceRecordId === `TFT_Item_${source}`)!.content!
        .uninterpretedParameters,
    ).toContain(key);
});
it('laboratory enables only the complete static health item with exact HP formula and lineage', () => {
  let s = createMatch(42, config);
  s.development = { version: 1, tainted: true, healthAdjustments: [] };
  s = applyDevelopmentItems(s, { type: 'standard_item_catalog' });
  unit(s);
  expect(
    lab.definitions
      .filter((d) => d.kind === 'completed' && d.availability === 'available')
      .map((d) => d.id),
  ).toEqual(['item-forge-health--health']);
  grantItemInstances(s, 'two', ['component-health', 'component-health']);
  const [a, b] = s.items!.components;
  expect(
    applyMatchAction(
      s,
      commandFor(s, { type: 'combine_components', firstId: a!.id, secondId: a!.id }),
    ).ok,
  ).toBe(false);
  s = act(s, { type: 'combine_components', firstId: b!.id, secondId: a!.id });
  expect(s.items!.crafts[0]!.origin).toMatchObject({
    kind: 'recipe',
    recipeId: 'health+health',
    consumed: [a!.id, b!.id],
  });
  s = act(s, { type: 'equip_item', unitId: 'unit-a', itemId: s.items!.completed[0]!.id });
  const base = scaledOwnedProfile(s.units[0]!, s.config),
    profile = scaledOwnedProfile(s.units[0]!, s.config, s.items);
  expect(equippedStatsPreview(profile).maxHp).toBe(
    base.stats.maxHp + 600 + Math.floor(base.stats.maxHp * 0.08),
  );
  expect(validateMatchState(JSON.parse(JSON.stringify(s)))).toEqual(s);
  s = act(s, { type: 'sell_unit', unitId: 'unit-a' });
  expect(s.items!.completed).toHaveLength(1);
  expect(s.items!.crafts).toHaveLength(1);
});
it.each(['dolea', 'vargas', 'jaramillo'])(
  'applies initial mana once for %s, without changing mana maximum or cast reset',
  (definitionId) => {
    let s = createMatch(42, config);
    unit(s, 'carrier', 2, 0, definitionId);
    grantItemInstances(s, 'mana', ['component-mana']);
    s = act(s, { type: 'equip_item', unitId: 'carrier', itemId: s.items!.components[0]!.id });
    const base = scaledOwnedProfile(s.units[0]!, s.config),
      profile = scaledOwnedProfile(s.units[0]!, s.config, s.items);
    expect(profile.stats.startingMana).toBe(
      Math.min(base.stats.maxMana, base.stats.startingMana + 15),
    );
    expect(profile.stats.maxMana).toBe(base.stats.maxMana);
    expect(base).toEqual(scaledOwnedProfile(s.units[0]!, s.config));
    expect(profile.initialItemModifiers).toBeUndefined();
    const input = {
      protocolVersion: 3 as const,
      rulesVersion: 'f0p6c-1' as const,
      combatId: 'p8b-mana',
      seed: 42,
      maxTicks: 150,
      overtime: DEFAULT_OVERTIME,
      obstacles: [],
      traits: [...traitsFor('f0p6c')],
      units: [
        { id: 'carrier', definitionId, owner: 'south' as const, position: { q: 0, r: 4 }, profile },
        {
          id: 'target',
          definitionId,
          owner: 'north' as const,
          position: { q: 0, r: 3 },
          profile: base,
        },
      ],
    };
    const battle = runCombat(input);
    expect(runCombat(input)).toEqual(battle);
    const casts = battle.events.filter(
      (e) => e.type === 'ability_cast' && e.payload.unitId === 'carrier',
    );
    expect(casts.length).toBeGreaterThan(0);
    for (const event of casts)
      if (event.type === 'ability_cast') expect(event.payload.manaAfter).toBe(0);
    expect(battle.snapshots[0]!.units.find((u) => u.id === 'carrier')!.mana).toBe(
      profile.stats.startingMana,
    );
  },
);
it.each(['dolea', 'vargas', 'jaramillo'])(
  'composes AD percent after star and permanent scaling for %s',
  (definitionId) => {
    let s = createMatch(42, config);
    unit(s, 'carrier', 2, 0, definitionId);
    if (definitionId === 'jaramillo')
      s.units[0]!.progress = { version: 1, stacks: [{ id: 'kilometros', count: 2, lastRound: 1 }] };
    grantItemInstances(s, 'ad', ['component-ad']);
    s = act(s, { type: 'equip_item', unitId: 'carrier', itemId: s.items!.components[0]!.id });
    const base = scaledOwnedProfile(s.units[0]!, s.config),
      profile = scaledOwnedProfile(s.units[0]!, s.config, s.items);
    expect(equippedStatsPreview(profile).attack).toBe(Math.floor(base.stats.attack * 1.1));
    expect(profile.stats.attack).toBe(base.stats.attack);
  },
);

it('caps critical probability and attack speed without converting overflow', () => {
  let s = createMatch(42, config);
  unit(s);
  grantItemInstances(s, 'crit', ['component-critical']);
  s = act(s, { type: 'equip_item', unitId: 'unit-a', itemId: s.items!.components[0]!.id });
  const profile = scaledOwnedProfile(s.units[0]!, s.config, s.items);
  profile.stats.critChanceMilli = 900;
  const stats = equippedStatsPreview(profile);
  expect(stats.critChanceMilli).toBe(1000);
  expect(stats.critMultiplierMilli).toBe(profile.stats.critMultiplierMilli);
  profile.stats.attackSpeedMilli = 5000;
  profile.initialItemModifiers = [
    { id: 'speed', sourceId: 'item', stat: 'attackSpeedMilli', mode: 'percent_milli', amount: 100 },
  ];
  expect(equippedStatsPreview(profile).attackSpeedMilli).toBe(5000);
});

// Independent reference assertions: catch wrong units, stale parameters and swapped effects.
const expectedOperations: Record<string, unknown[]> = {
  'ad--ad': [{ kind: 'damage_amp', ratioMilli: 80 }],
  'ad--attack_speed': [{ kind: 'damage_amp', ratioMilli: 250, targetMaxHpAbove: 1600 }],
  'ad--ap': [{ kind: 'omnivamp', ratioMilli: 220, alsoHealLowestHpAlly: true }],
  'ad--mana': [{ kind: 'attack_mana', amount: 5 }],
  'ad--armor': [
    {
      kind: 'untargetable_cleanse',
      healthThresholdMilli: 600,
      untargetableTicks: 10,
      oncePerCombat: true,
    },
    { kind: 'attack_speed', ratioMilli: 150 },
  ],
  'ad--magic_resist': [
    { kind: 'omnivamp', ratioMilli: 200, alsoHealLowestHpAlly: false },
    { kind: 'shield', maxHpRatioMilli: 250, healthThresholdMilli: 400, oncePerCombat: true },
  ],
  'ad--health': [
    {
      kind: 'health_ad_surge',
      healthThresholdMilli: 600,
      maxHpRatioMilli: 200,
      adRatioMilli: 350,
      oncePerCombat: true,
    },
  ],
  'ad--critical': [{ kind: 'ability_critical', alreadyCriticalBonusMilli: 100 }],
  'attack_speed--attack_speed': [
    { kind: 'damage_amp', ratioMilli: 60 },
    {
      kind: 'burn_wound',
      burnPerSecondMilli: 10,
      woundMilli: 330,
      damageType: 'true',
      tickIntervalTicks: 10,
    },
  ],
  'ap--attack_speed': [{ kind: 'attack_speed_stacks', perStackMilli: 50, stackCap: null }],
  'attack_speed--mana': [
    { kind: 'chain_magic', everyAttacks: 3, damage: 30, targets: 4, shredMilli: 300 },
  ],
  'armor--attack_speed': [
    {
      kind: 'dual_power_stacks',
      adPerStackMilli: 20,
      apPerStack: 2,
      stackCap: 25,
      armorAtCap: 20,
      magicResistAtCap: 20,
    },
  ],
  'attack_speed--magic_resist': [
    {
      kind: 'secondary_bolt',
      adRatioMilli: 500,
      additionalTargets: 1,
      damageType: 'physical',
      sourceProcs: 'disabled-pending-validation',
    },
  ],
  'attack_speed--health': [{ kind: 'attack_speed', ratioMilli: 400 }],
  'attack_speed--critical': [{ kind: 'resistance_reduction', stat: 'armor', ratioMilli: 300 }],
  'ap--ap': [{ kind: 'damage_amp', ratioMilli: 200 }],
  'ap--mana': [{ kind: 'ability_power', amount: 30 }],
  'ap--armor': [
    { kind: 'shield', maxHpRatioMilli: 300, oncePerCombat: true },
    { kind: 'ability_power', amount: 35 },
  ],
  'ap--magic_resist': [
    { kind: 'resistance_reduction', stat: 'magicResist', ratioMilli: 300, radius: 2 },
    { kind: 'cast_punishment', targetMaxManaRatioMilli: 1600, radius: 2, damageType: 'magic' },
  ],
  'ap--health': [
    {
      kind: 'burn_wound',
      burnPerSecondMilli: 10,
      woundMilli: 330,
      damageType: 'true',
      tickIntervalTicks: 10,
    },
  ],
  'ap--critical': [{ kind: 'ability_critical', alreadyCriticalBonusMilli: 100 }],
  'mana--mana': [
    { kind: 'max_mana_reduction', amount: 10, minimumMana: 'requires-specification' },
    { kind: 'damage_amp', ratioMilli: 80 },
  ],
  'armor--mana': [
    { kind: 'shield', maxHpRatioMilli: 250, healthThresholdMilli: 400, oncePerCombat: true },
    { kind: 'resists', armor: 20, magicResist: 20 },
  ],
  'magic_resist--mana': [
    {
      kind: 'positional_bonuses',
      frontRows: 2,
      frontArmor: 40,
      frontMagicResist: 40,
      frontManaPerAttackReceived: 1,
      backAp: 20,
      backMana: 10,
      backIntervalTicks: 30,
    },
  ],
  'health--mana': [
    { kind: 'heal', basis: 'missing_hp', ratioMilli: 150, cap: 1000, radius: 1 },
    { kind: 'damage_reduction', ratioMilli: 100, damageClass: 'all' },
  ],
  'critical--mana': [
    { kind: 'omnivamp', ratioMilli: 150, alsoHealLowestHpAlly: false },
    {
      kind: 'round_random_bonus',
      adMilli: 150,
      ap: 15,
      omnivampMilli: 150,
      weights: 'requires-specification',
    },
  ],
  'armor--armor': [
    { kind: 'damage_reduction', ratioMilli: 80, damageClass: 'attacks' },
    { kind: 'retaliation', damage: 100, damageType: 'magic', radius: 1 },
  ],
  'armor--magic_resist': [
    { kind: 'targeting_resists', armorPerEnemy: 10, magicResistPerEnemy: 10 },
  ],
  'armor--health': [
    {
      kind: 'burn_wound',
      burnPerSecondMilli: 10,
      woundMilli: 330,
      damageType: 'true',
      radius: 2,
      tickIntervalTicks: 10,
    },
  ],
  'armor--critical': [
    {
      kind: 'damage_reduction',
      ratioMilli: 80,
      damageClass: 'all',
      healthAboveMilli: 500,
      aboveThresholdRatioMilli: 150,
    },
  ],
  'magic_resist--magic_resist': [{ kind: 'heal', basis: 'max_hp', ratioMilli: 50, cap: null }],
  'health--magic_resist': [
    { kind: 'resistance_reduction', stat: 'armor', ratioMilli: 300, radius: 2 },
    { kind: 'resists', armor: 25, magicResist: 25 },
  ],
  'critical--magic_resist': [
    { kind: 'crowd_control_immunity' },
    { kind: 'attack_speed_stacks', perStackMilli: 40, stackCap: null },
  ],
  'health--health': [],
  'critical--health': [{ kind: 'damage_amp', ratioMilli: 250 }],
  'critical--critical': [
    { kind: 'random_items', count: 2, slotCost: 3, pool: 'requires-specification' },
  ],
};
it.each(completed)('preserves frozen mechanics and units of $id', (d) => {
  expect(
    d.effects.map((e) => (e.implementation === 'reserved-design-v2' ? e.operation : null)),
  ).toEqual(expectedOperations[d.id.replace('item-forge-', '')]);
});
it('preserves effect timing and activation direction without implicit approximations', () => {
  const effects = (suffix: string) =>
    completed.find((d) => d.id === `item-forge-${suffix}`)!.effects;
  expect(effects('armor--armor')[1]).toMatchObject({
    trigger: 'received_attack',
    cooldownTicks: 20,
  });
  expect(effects('ap--magic_resist')[0]).toMatchObject({ trigger: 'aura' });
  expect(effects('armor--health')[0]).toMatchObject({
    trigger: 'periodic',
    intervalTicks: 20,
    durationTicks: 100,
    operation: { tickIntervalTicks: 10 },
  });
  expect(effects('attack_speed--attack_speed')[1]).toMatchObject({
    trigger: 'attack_or_ability_damage',
    durationTicks: 50,
  });
  expect(effects('ap--health')[0]).toMatchObject({ durationTicks: 100 });
  expect(effects('armor--mana')[0]).toMatchObject({ durationTicks: 50 });
  expect(effects('ap--armor')[0]).toMatchObject({ durationTicks: 80 });
  expect(effects('ap--mana')[0]).toMatchObject({ intervalTicks: 50, stacking: 'add' });
  expect(effects('critical--magic_resist')[1]).toMatchObject({
    intervalTicks: 20,
    condition: { duringFirstTicks: 140 },
  });
  expect(effects('mana--mana')[1]).toMatchObject({ trigger: 'takedown', durationTicks: 80 });
});
