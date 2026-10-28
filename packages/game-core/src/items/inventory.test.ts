import { describe, it, expect } from 'vitest';
import { commandFor, applyMatchAction, combine } from '../match/engine';
import { validateMatchState } from '../match/invariants';
import { applyDevelopmentItems } from '../development/items';
import { grantItemInstances, allItemInstances, inspectItem } from './inventory';
import { fixture, unit, grant, act } from './fixture.test-support';
describe('P8A inventory and equipment', () => {
  it('grants uniquely, orders stably, serializes and makes internal grant IDs idempotent', () => {
    let s = fixture();
    s = grant(s, ['component-ad', 'component-ap'], 'g');
    const before = structuredClone(s);
    grantItemInstances(s, 'g', ['component-ad', 'component-ap']);
    expect(s).toEqual(before);
    expect(() => grantItemInstances(s, 'g', ['component-armor'])).toThrow('item-request-conflict');
    expect(validateMatchState(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(s.items!.components[0]!.id).not.toBe(s.items!.components[1]!.id);
    s = act(s, { type: 'move_item', itemId: s.items!.components[1]!.id, toIndex: 0 });
    expect(s.items!.components[0]!.definitionId).toBe('component-ap');
  });
  it('uses pending overflow and claims only when capacity is available', () => {
    let s = fixture();
    unit(s);
    s = grant(s, Array(17).fill('component-ad'));
    expect(s.items!.components).toHaveLength(16);
    expect(s.items!.pending).toHaveLength(1);
    const pending = s.items!.pending[0]!;
    expect(
      applyMatchAction(s, commandFor(s, { type: 'move_item', itemId: pending.id, toIndex: 0 })),
    ).toMatchObject({ ok: false, error: 'item-capacity', state: s });
    s = act(s, { type: 'equip_item', itemId: s.items!.components[0]!.id, unitId: 'unit-a' });
    s = act(s, { type: 'move_item', itemId: pending.id, toIndex: 3 });
    expect(s.items!.pending).toEqual([]);
    expect(s.items!.components[3]!.id).toBe(pending.id);
  });
  it('combines exactly two components, symmetrically, and never consumes the same instance twice', () => {
    let s = fixture();
    s = grant(s, ['component-ad', 'component-ad']);
    const [a, b] = s.items!.components;
    const invalid = applyMatchAction(
      s,
      commandFor(s, { type: 'combine_components', firstId: a!.id, secondId: a!.id }),
    );
    expect(invalid).toMatchObject({ ok: false, error: 'invalid-recipe', state: s });
    const forward = act(s, { type: 'combine_components', firstId: a!.id, secondId: b!.id });
    const reverse = act(s, { type: 'combine_components', firstId: b!.id, secondId: a!.id });
    expect(forward).toEqual({ ...reverse, history: forward.history });
    expect(forward.items!.components).toEqual([]);
    expect(forward.items!.completed).toHaveLength(1);
    expect(forward.items!.crafts).toHaveLength(1);
  });
  it('keeps incomplete competitive recipes atomic', () => {
    const s = fixture(false);
    grantItemInstances(s, 'foundation', ['component-ad', 'component-ap']);
    const before = structuredClone(s);
    const result = applyMatchAction(
      s,
      commandFor(s, {
        type: 'combine_components',
        firstId: s.items!.components[0]!.id,
        secondId: s.items!.components[1]!.id,
      }),
    );
    expect(result).toMatchObject({ ok: false, error: 'recipe-unavailable' });
    expect(result.state).toEqual(before);
  });
  it('equips three completed objects and rejects a fourth without changing either location', () => {
    let s = fixture();
    unit(s);
    s = grant(s, Array(4).fill('diagnostic-double-ad'));
    for (let i = 0; i < 3; i++)
      s = act(s, { type: 'equip_item', itemId: s.items!.completed[0]!.id, unitId: 'unit-a' });
    const before = structuredClone(s),
      result = applyMatchAction(
        s,
        commandFor(s, { type: 'equip_item', itemId: s.items!.completed[0]!.id, unitId: 'unit-a' }),
      );
    expect(result).toMatchObject({ ok: false, error: 'item-slots-full' });
    expect(result.state).toEqual(before);
    expect(s.units[0]!.equipment).toHaveLength(3);
  });
  it('auto-completes a second component in the same slot and rejects unresolved combinations', () => {
    let s = fixture();
    unit(s);
    s = grant(s, ['component-ad', 'component-ad', 'component-ap']);
    s = act(s, { type: 'equip_item', itemId: s.items!.components[0]!.id, unitId: 'unit-a' });
    s = act(s, { type: 'equip_item', itemId: s.items!.components[0]!.id, unitId: 'unit-a' });
    expect(s.units[0]!.equipment).toHaveLength(1);
    expect(s.units[0]!.equipment![0]!.definitionId).toBe('diagnostic-double-ad');
    s = act(s, { type: 'equip_item', itemId: s.items!.components[0]!.id, unitId: 'unit-a' });
    s = grant(s, ['component-ap']);
    const out = applyMatchAction(
      s,
      commandFor(s, { type: 'equip_item', itemId: s.items!.components[0]!.id, unitId: 'unit-a' }),
    );
    expect(out).toMatchObject({ ok: false, error: 'recipe-unavailable', state: s });
  });
  it('enforces unique item policy, allowed unequip and strict normal removal policy', () => {
    let s = fixture();
    unit(s);
    s = grant(s, ['diagnostic-ad-speed', 'diagnostic-ad-speed']);
    s = act(s, { type: 'equip_item', itemId: s.items!.completed[0]!.id, unitId: 'unit-a' });
    expect(
      applyMatchAction(
        s,
        commandFor(s, { type: 'equip_item', itemId: s.items!.completed[0]!.id, unitId: 'unit-a' }),
      ),
    ).toMatchObject({ ok: false, error: 'item-restricted' });
    const equipped = s.units[0]!.equipment![0]!.id;
    s = act(s, { type: 'unequip_item', itemId: equipped, unitId: 'unit-a' });
    expect(s.items!.completed.map((i) => i.id)).toContain(equipped);
    let normal = fixture(false);
    unit(normal);
    grantItemInstances(normal, 'g', ['component-ad']);
    normal = act(normal, {
      type: 'equip_item',
      itemId: normal.items!.components[0]!.id,
      unitId: 'unit-a',
    });
    expect(
      applyMatchAction(
        normal,
        commandFor(normal, {
          type: 'unequip_item',
          itemId: normal.units[0]!.equipment![0]!.id,
          unitId: 'unit-a',
        }),
      ),
    ).toMatchObject({ ok: false, error: 'unequip-forbidden' });
  });
  it('rejects foreign units, unknown instances, duplicate intents and wrong phases', () => {
    let s = fixture();
    unit(s);
    s = grant(s, ['diagnostic-double-ad']);
    const id = s.items!.completed[0]!.id;
    expect(
      applyMatchAction(s, commandFor(s, { type: 'equip_item', itemId: id, unitId: 'foreign' })),
    ).toMatchObject({ ok: false, error: 'item-owner' });
    expect(
      applyMatchAction(
        s,
        commandFor(s, { type: 'equip_item', itemId: 'missing', unitId: 'unit-a' }),
      ),
    ).toMatchObject({ ok: false, error: 'missing-item' });
    const action = commandFor(s, { type: 'equip_item', itemId: id, unitId: 'unit-a' });
    const result = applyMatchAction(s, action);
    expect(result.ok).toBe(true);
    expect(applyMatchAction(result.state, action)).toMatchObject({
      ok: false,
      error: 'stale-action',
    });
    s = act(s, { type: 'move_unit', unitId: 'unit-a', to: { kind: 'board', hex: { q: 0, r: 4 } } });
    s = act(s, { type: 'start_combat' });
    expect(
      applyMatchAction(s, commandFor(s, { type: 'equip_item', itemId: id, unitId: 'unit-a' })),
    ).toMatchObject({ ok: false, error: 'wrong-phase' });
  });
  it.each(['duplicate', 'owner', 'lost', 'sequence', 'journal'] as const)(
    'rejects corrupt %s snapshots',
    (kind) => {
      let s = fixture();
      unit(s);
      s = grant(s, ['component-ad']);
      if (kind === 'duplicate') s.units[0]!.equipment = [structuredClone(s.items!.components[0]!)];
      if (kind === 'owner')
        s.items!.components[0]!.ownerId = '00000000-0000-4000-8000-000000000002';
      if (kind === 'lost') s.items!.components = [];
      if (kind === 'sequence') s.items!.nextInstance = 0;
      if (kind === 'journal') s.items!.grants = [];
      expect(() => validateMatchState(s)).toThrow();
    },
  );
  it('returns equipment on sale, including full bags, without changing the existing sale price', () => {
    let s = fixture();
    unit(s);
    s = grant(s, ['diagnostic-double-ad']);
    s = act(s, { type: 'equip_item', itemId: s.items!.completed[0]!.id, unitId: 'unit-a' });
    s = grant(s, Array(16).fill('diagnostic-double-ad'));
    const before = s.gold,
      id = s.units[0]!.equipment![0]!.id;
    s = act(s, { type: 'sell_unit', unitId: 'unit-a' });
    expect(s.gold).toBe(before + 2);
    expect(s.items!.pending.map((i) => i.id)).toContain(id);
    expect(allItemInstances(s)).toHaveLength(17);
    expect(s.units).toEqual([]);
  });
  it.each([1, 2] as const)(
    'preserves deterministic equipment and overflow in %s★ fusion',
    (stars) => {
      let s = fixture();
      for (let i = 0; i < 3; i++) unit(s, `unit-${i}`, stars, i);
      s = grant(s, Array(6).fill('diagnostic-double-ad'));
      for (let i = 0; i < 6; i++)
        s = act(s, {
          type: 'equip_item',
          itemId: s.items!.completed[0]!.id,
          unitId: `unit-${Math.floor(i / 2)}`,
        });
      const ids = allItemInstances(s)
        .map((i) => i.id)
        .sort();
      combine(s);
      s = validateMatchState(s);
      expect(s.units).toHaveLength(1);
      expect(s.units[0]).toMatchObject({ id: 'unit-0', stars: stars + 1 });
      expect(s.units[0]!.equipment).toHaveLength(3);
      expect(s.items!.completed).toHaveLength(3);
      expect(
        allItemInstances(s)
          .map((i) => i.id)
          .sort(),
      ).toEqual(ids);
    },
  );
  it('cascades nine copies into 3★ and retains all item identities', () => {
    let s = fixture();
    for (let i = 0; i < 9; i++) unit(s, `copy-${i}`, 1, i);
    s = grant(s, Array(9).fill('diagnostic-double-ad'));
    for (let i = 0; i < 9; i++)
      s = act(s, { type: 'equip_item', itemId: s.items!.completed[0]!.id, unitId: `copy-${i}` });
    combine(s);
    expect(validateMatchState(s).units[0]).toMatchObject({ id: 'copy-0', stars: 3 });
    expect(allItemInstances(s)).toHaveLength(9);
  });
  it('provides honest inspection and local-only clearing with retained issuance history', () => {
    let s = fixture();
    s = grant(s, ['diagnostic-double-ad']);
    expect(inspectItem(s, s.items!.completed[0]!.id)).toMatchObject({
      description: '+20 AD',
      location: 'inventory',
    });
    s = applyDevelopmentItems(s, { type: 'clear_items' });
    expect(allItemInstances(s)).toEqual([]);
    expect(s.items!.retired).toHaveLength(1);
    expect(s.items!.grants).toHaveLength(1);
    expect(() =>
      applyDevelopmentItems(fixture(false), { type: 'diagnostic_item_catalog' }),
    ).toThrow();
  });
});

it('returns fusion overflow to pending when the completed bag is full', () => {
  let s = fixture();
  for (let i = 0; i < 3; i++) unit(s, `full-${i}`, 1, i);
  s = grant(s, Array(6).fill('diagnostic-double-ad'));
  for (let i = 0; i < 6; i++)
    s = act(s, {
      type: 'equip_item',
      itemId: s.items!.completed[0]!.id,
      unitId: `full-${Math.floor(i / 2)}`,
    });
  s = grant(s, Array(16).fill('diagnostic-double-ad'));
  const identities = allItemInstances(s)
    .map((i) => i.id)
    .sort();
  combine(s);
  s = validateMatchState(s);
  expect(s.units[0]!.equipment).toHaveLength(3);
  expect(s.items!.completed).toHaveLength(16);
  expect(s.items!.pending).toHaveLength(3);
  expect(
    allItemInstances(s)
      .map((i) => i.id)
      .sort(),
  ).toEqual(identities);
});
it('isolated end-to-end: craft, three slots, purchase fusion, sale and snapshot recovery conserve every item', () => {
  let s = fixture();
  unit(s, 'survivor', 1, 0);
  unit(s, 'consumed', 1, 1);
  s = grant(s, [
    'component-ad',
    'component-ad',
    'diagnostic-double-ad',
    'diagnostic-double-ad',
    'diagnostic-double-ad',
  ]);
  s = act(s, {
    type: 'combine_components',
    firstId: s.items!.components[0]!.id,
    secondId: s.items!.components[1]!.id,
  });
  for (let i = 0; i < 3; i++)
    s = act(s, { type: 'equip_item', itemId: s.items!.completed[0]!.id, unitId: 'survivor' });
  s = act(s, { type: 'equip_item', itemId: s.items!.completed[0]!.id, unitId: 'consumed' });
  s = act(s, { type: 'move_unit', unitId: 'survivor', to: { kind: 'board', hex: { q: 0, r: 4 } } });
  const ids = allItemInstances(s)
      .map((i) => i.id)
      .sort(),
    offer = s.shop.find((o) => o?.definitionId === 'jaramillo')!;
  s = act(s, { type: 'buy_unit', offerId: offer.id });
  expect(s.units).toHaveLength(1);
  expect(s.units[0]).toMatchObject({ id: 'survivor', stars: 2 });
  expect(s.items!.completed).toHaveLength(1);
  s = act(s, { type: 'sell_unit', unitId: 'survivor' });
  s = validateMatchState(JSON.parse(JSON.stringify(s)));
  expect(s.items!.completed).toHaveLength(4);
  expect(
    allItemInstances(s)
      .map((i) => i.id)
      .sort(),
  ).toEqual(ids);
  expect(s.items!.crafts).toHaveLength(1);
  expect(s.items!.components).toEqual([]);
});

it('automatic completion preserves the occupied component slot even when all three slots are full', () => {
  let s = fixture();
  unit(s);
  s = grant(s, ['component-ad', 'component-ad', 'diagnostic-double-ad', 'diagnostic-double-ad']);
  s = act(s, { type: 'equip_item', itemId: s.items!.components[0]!.id, unitId: 'unit-a' });
  for (let i = 0; i < 2; i++)
    s = act(s, { type: 'equip_item', itemId: s.items!.completed[0]!.id, unitId: 'unit-a' });
  const stable = s.units[0]!.equipment!.slice(1).map((i) => i.id);
  s = act(s, { type: 'equip_item', itemId: s.items!.components[0]!.id, unitId: 'unit-a' });
  expect(s.units[0]!.equipment).toHaveLength(3);
  expect(s.units[0]!.equipment![0]!.kind).toBe('completed');
  expect(s.units[0]!.equipment!.slice(1).map((i) => i.id)).toEqual(stable);
  expect(s.items!.components).toEqual([]);
});
