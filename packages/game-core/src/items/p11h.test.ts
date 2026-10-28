import { it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import {
  P11H_ITEM_CATALOG as catalog,
  P11H_ECONOMY_CONFIG,
  P11G_ECONOMY_CONFIG,
  TFT185_ITEM_CATALOG,
  itemPresentation,
} from '@tft/game-data';
import { DEFAULT_OVERTIME, type CombatInput } from '@tft/shared';
import { createMatch, applyMatchAction, commandFor } from '../match/engine';
import { unit, act } from './fixture.test-support';
import { grantItemInstances, allItemInstances } from './inventory';
import { scaledOwnedProfile } from '../match/selectors';
import { ItemEffectExecutor } from '../combat/item-effects';
import { runCombat, CombatEngine } from '../combat/engine';
export function itemBattle(source: string, champion = 'dolea'): CombatInput {
  let s = createMatch(42, P11H_ECONOMY_CONFIG);
  unit(s, 'holder', 1, 0, champion);
  const d = catalog.definitions.find((d) => d.content?.sourceRecordId === source)!;
  grantItemInstances(s, 'sample', [d.id]);
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
    rulesVersion: 'f0p11h-1',
    combatId: 'p11h-item',
    seed: 42,
    maxTicks: 200,
    overtime: DEFAULT_OVERTIME,
    obstacles: [],
    traits: [],
    units: [
      { id: 'holder', definitionId: champion, owner: 'south', position: { q: 0, r: 4 }, profile },
      {
        id: 'enemy',
        definitionId: champion,
        owner: 'north',
        position: { q: 0, r: 3 },
        profile: enemy,
      },
    ],
  };
}
it('preserves G economy fields, eight components, 36 recipes and the historical catalog', () => {
  expect(
    catalog.definitions.filter((d) => d.kind === 'completed' && d.availability === 'available'),
  ).toHaveLength(32);
  expect(catalog.definitions.filter((d) => d.availability !== 'available')).toHaveLength(4);
  expect(catalog.recipes).toEqual(TFT185_ITEM_CATALOG.recipes);
  expect({
    ...P11H_ECONOMY_CONFIG,
    catalog: P11G_ECONOMY_CONFIG.catalog,
    itemCatalog: P11G_ECONOMY_CONFIG.itemCatalog,
  }).toEqual(P11G_ECONOMY_CONFIG);
  expect(
    TFT185_ITEM_CATALOG.definitions.filter((d) => d.availability !== 'available'),
  ).toHaveLength(6);
  expect(createHash('sha256').update(JSON.stringify(TFT185_ITEM_CATALOG)).digest('hex')).toBe(
    '4f87656f93e8785d464cc927aeb69d6110a74f9bcd218c5abab4aaea6bcc01a0',
  );
});
it.each(
  catalog.definitions
    .filter((d) => d.kind === 'completed')
    .map((d) => [d.content!.visibleName, d.content!.sourceRecordId, d] as const),
)('%s: recipe, conservation, real combat/replay or explicit rejection', (name, source, d) => {
  if (d.kind !== 'completed') throw Error('recipe');
  const s = createMatch(42, P11H_ECONOMY_CONFIG);
  unit(s, 'holder', 1, 0, 'dolea');
  grantItemInstances(s, 'pair', d.recipe);
  const before = structuredClone(s),
    [a, b] = s.items!.components;
  const out = applyMatchAction(
    s,
    commandFor(s, { type: 'combine_components', firstId: a!.id, secondId: b!.id }),
  );
  const description = itemPresentation(d);
  expect(description.name).toBe(name);
  expect(description.stats).toBeTruthy();
  expect(description.passive.length > 0 || d.effects.length === 0).toBe(true);
  expect(description.restrictions.length).toBeGreaterThan(0);
  if (d.availability !== 'available') {
    expect(out.ok).toBe(false);
    expect(out.state).toEqual(before);
    expect(() => grantItemInstances(s, 'blocked', [d.id])).toThrow();
    expect(description.available).toBe(false);
    expect(description.pending.join()).toBeTruthy();
    return;
  }
  expect(out.ok).toBe(true);
  expect(allItemInstances(out.state)).toHaveLength(1);
  expect(out.state.items!.crafts[0]!.origin).toMatchObject({
    kind: 'recipe',
    consumed: [a!.id, b!.id],
  });
  const input = itemBattle(source),
    replay = runCombat(input);
  expect(runCombat(input)).toEqual(replay);
  expect(replay.events.some((e) => e.type === 'damage')).toBe(true);
  expect(replay.result.tick).toBeGreaterThan(0);
});
it('describes actual mana spent, missing-health heal and both shield endings', () => {
  const configured = structuredClone(catalog.definitions.find((d) => d.kind === 'completed')!);
  configured.content!.visibleDescription = 'Descripción personalizada del catálogo.';
  expect(itemPresentation(configured).passive).toEqual(['Descripción personalizada del catálogo.']);
  const describe = (id: string) =>
    itemPresentation(
      catalog.definitions.find((d) => d.content?.sourceRecordId === `TFT_Item_${id}`)!,
    ).passive.join(' ');
  expect(describe('IonicSpark')).toContain('maná gastado');
  expect(describe('IonicSpark')).not.toContain('maná máximo');
  expect(describe('GuardianAngel')).toContain('15 % de la vida perdida');
  expect(describe('Crownguard')).toContain('rotura o expiración');
});
it.each(['TFT_Item_InfinityEdge', 'TFT_Item_JeweledGauntlet'])(
  '%s never overrides an explicit canCrit:false',
  (source) => {
    const input = itemBattle(source, 'vargas');
    input.units[0]!.profile.stats.critChanceMilli = 1000;
    const damage = runCombat(input).events.filter(
      (e) =>
        e.type === 'damage' && e.payload.sourceId === 'holder' && e.payload.cause === 'ability',
    );
    expect(damage.length).toBeGreaterThan(0);
    expect(damage.every((e) => e.type === 'damage' && !e.payload.critical)).toBe(true);
  },
);
it('Giant Slayer adds15%base +15%only to tank roles and leaves true damage unchanged', () => {
  const engine = new CombatEngine(itemBattle('TFT_Item_MadredsBloodrazor'));
  const runtime = engine as unknown as {
    state: import('@tft/shared').CombatState;
    items: ItemEffectExecutor;
  };
  const holder = runtime.state.units.find((u) => u.id === 'holder')!,
    enemy = runtime.state.units.find((u) => u.id === 'enemy')!;
  expect(
    (engine as unknown as { items: ItemEffectExecutor }).items.outgoingDamage(
      holder,
      enemy,
      1000,
      'physical',
    ),
  ).toBe(1300);
  enemy.profile.itemRole = 'fighter';
  expect(
    (engine as unknown as { items: ItemEffectExecutor }).items.outgoingDamage(
      holder,
      enemy,
      1000,
      'magic',
    ),
  ).toBe(1150);
  expect(
    (engine as unknown as { items: ItemEffectExecutor }).items.outgoingDamage(
      holder,
      enemy,
      1000,
      'true',
    ),
  ).toBe(1000);
});
it('Red Buff has3%base,45%AS,burn1%,wound33%,5s, no secondary proc recursion', () => {
  const d = catalog.definitions.find(
    (d) => d.content?.sourceRecordId === 'TFT_Item_RapidFireCannon',
  )!;
  expect(d.bonuses).toContainEqual({
    stat: 'attackSpeedMilli',
    mode: 'percent_milli',
    amount: 450,
  });
  if (d.kind !== 'completed') throw Error('item');
  expect(
    d.effects.find((e) => e.implementation !== 'reserved' && e.operation.kind === 'damage_amp'),
  ).toMatchObject({ operation: { ratioMilli: 30 } });
  expect(
    d.effects.find((e) => e.implementation !== 'reserved' && e.operation.kind === 'burn_wound'),
  ).toMatchObject({
    durationTicks: 50,
    operation: { burnPerSecondMilli: 10, woundMilli: 330, tickIntervalTicks: 10 },
  });
  const replay = runCombat(itemBattle('TFT_Item_RapidFireCannon'));
  expect(replay.events.filter((e) => e.type === 'item_effect').length).toBeLessThan(200);
  expect(replay.events.some((e) => e.type === 'damage' && e.payload.damageType === 'true')).toBe(
    true,
  );
});
it('Edge of Night H preserves burn while cleansing control; shield instance cannot grant Crownguard AP twice', () => {
  const engine = new CombatEngine(itemBattle('TFT_Item_GuardianAngel'));
  const runtime = engine as unknown as {
    state: import('@tft/shared').CombatState;
    items: ItemEffectExecutor;
  };
  const u = runtime.state.units.find((u) => u.id === 'holder')!;
  const status = {
    id: 'test-burn',
    kind: 'modifier' as const,
    sourceId: 'enemy',
    appliedTick: 0,
    expiresTick: 50,
    group: 'item-burn' as const,
    amount: 10,
    stat: null,
  };
  u.statuses.push(status, { ...status, id: 'test-stun', kind: 'stun', group: undefined });
  u.hp = 1;
  runtime.items.afterDamage(
    runtime.state.units.find((x) => x.id === 'enemy')!,
    u,
    1,
    0,
    'physical',
    'attack',
  );
  expect(u.statuses.some((s) => s.id === 'test-burn')).toBe(true);
  expect(u.statuses.some((s) => s.id === 'test-stun')).toBe(false);
  expect(u.statuses.some((s) => s.group === 'item-untargetable')).toBe(true);
  expect(u.hp).toBeGreaterThan(1);
  const crown = runCombat(itemBattle('TFT_Item_Crownguard'));
  const ap = crown.events.filter(
    (e) => e.type === 'item_effect' && e.payload.operation === 'ability_power',
  );
  expect(ap.length).toBeLessThanOrEqual(1);
});
