import { expect, it } from 'vitest';
import { P12D_ECONOMY_CONFIG, P12F_ECONOMY_CONFIG, P11H_ITEM_CATALOG } from '@tft/game-data';
import { createMatch, applyMatchAction, commandFor } from '../match/engine';
import { canUseCombatEconomy } from '../match/combat-economy';
import { validateMatchState } from '../match/invariants';
import { unit, act } from './fixture.test-support';
import { grantItemInstances, applyItemCommand } from './inventory';
function fixture(config = P12F_ECONOMY_CONFIG) {
  let s = createMatch(42, config);
  unit(s, 'board', 1, 0, 'dolea');
  unit(s, 'bench', 1, 1, 'jaramillo');
  grantItemInstances(s, 'p12f-components', [
    'component-ad',
    'component-ad',
    'component-attack_speed',
    'component-attack_speed',
  ]);
  s = act(s, { type: 'move_unit', unitId: 'board', to: { kind: 'board', hex: { q: -2, r: 4 } } });
  return act(s, { type: 'start_combat_auto' });
}
it('crafts, equips a bench component, auto-combines there and persists without modifying frozen combat', () => {
  let s = fixture();
  const frozen = structuredClone(s.combat),
    initial = structuredClone(s);
  const [a, b, c, d] = s.items!.components;
  s = act(s, { type: 'combine_components', firstId: a!.id, secondId: b!.id });
  const crafted = s.items!.completed[0]!;
  s = act(s, { type: 'equip_item', unitId: 'bench', itemId: crafted.id });
  s = act(s, { type: 'equip_item', unitId: 'bench', itemId: c!.id });
  s = act(s, { type: 'equip_item', unitId: 'bench', itemId: d!.id });
  expect(s.units.find((u) => u.id === 'bench')!.equipment).toHaveLength(2);
  expect(s.items!.crafts).toHaveLength(2);
  expect(s.combat).toEqual(frozen);
  expect(initial.items!.components).toHaveLength(4);
  expect(validateMatchState(JSON.parse(JSON.stringify(s)))).toEqual(s);
  const before = structuredClone(s);
  expect(
    applyMatchAction(
      s,
      commandFor(s, { type: 'combine_components', firstId: a!.id, secondId: b!.id }),
    ).ok,
  ).toBe(false);
  expect(s).toEqual(before);
});
it('buys during combat and equips the new bench unit; denies deployed, foreign, clone and frozen-contributor IDs', () => {
  let s = fixture();
  const frozen = structuredClone(s.combat);
  const before = new Set(s.units.map((u) => u.id));
  s = act(s, { type: 'buy_unit', offerId: s.shop.find(Boolean)!.id });
  const bought = s.units.find((u) => !before.has(u.id))!;
  expect(bought.location.kind).toBe('bench');
  s = act(s, { type: 'equip_item', unitId: bought.id, itemId: s.items!.components[0]!.id });
  expect(s.combat).toEqual(frozen);
  for (const id of ['board', 'foreign', 'ghost:bench']) {
    const original = structuredClone(s),
      cmd = { type: 'equip_item' as const, unitId: id, itemId: s.items!.components[0]!.id };
    expect(canUseCombatEconomy(s, cmd)).toBe(false);
    expect(applyMatchAction(s, commandFor(s, cmd)).ok).toBe(false);
    expect(s).toEqual(original);
  }
  const falseBench = structuredClone(s);
  falseBench.units.find((u) => u.id === 'board')!.location = { kind: 'bench', slot: 7 };
  const cmd = {
    type: 'equip_item' as const,
    unitId: 'board',
    itemId: falseBench.items!.components[0]!.id,
  };
  expect(canUseCombatEconomy(falseBench, cmd)).toBe(false);
  expect(() => applyItemCommand(falseBench, cmd)).toThrow('item-restricted');
});
it('retains historical P12D permissions and denies resolution for the new policy', () => {
  const old = fixture(P12D_ECONOMY_CONFIG),
    modern = fixture();
  const command = {
    type: 'combine_components' as const,
    firstId: old.items!.components[0]!.id,
    secondId: old.items!.components[1]!.id,
  };
  expect(applyMatchAction(old, commandFor(old, command))).toMatchObject({
    ok: false,
    error: 'wrong-phase',
  });
  expect(canUseCombatEconomy(modern, command)).toBe(true);
  modern.phase = 'resolution';
  expect(canUseCombatEconomy(modern, command)).toBe(false);
});
it('blocked recipes and the fourth slot reject atomically during combat', () => {
  let s = fixture();
  const blocked = P11H_ITEM_CATALOG.recipes.find(
    (r) =>
      P11H_ITEM_CATALOG.definitions.find((d) => d.id === r.resultId)?.availability !== 'available',
  )!;
  grantItemInstances(s, 'blocked-pair', [...blocked.components]);
  const [a, b] = s.items!.components.slice(-2),
    before = structuredClone(s);
  expect(
    applyMatchAction(
      s,
      commandFor(s, { type: 'combine_components', firstId: a!.id, secondId: b!.id }),
    ).ok,
  ).toBe(false);
  expect(s).toEqual(before);
  const full = P11H_ITEM_CATALOG.definitions.find(
    (d) => d.content?.sourceRecordId === 'TFT_Item_Deathblade',
  )!;
  grantItemInstances(s, 'four-items', [full.id, full.id, full.id, full.id]);
  const ids = s.items!.completed.map((i) => i.id);
  for (const id of ids.slice(0, 3)) s = act(s, { type: 'equip_item', unitId: 'bench', itemId: id });
  const original = structuredClone(s);
  expect(
    applyMatchAction(s, commandFor(s, { type: 'equip_item', unitId: 'bench', itemId: ids[3]! })),
  ).toMatchObject({ ok: false, error: 'item-slots-full' });
  expect(s).toEqual(original);
});
