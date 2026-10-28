import { it, expect } from 'vitest';
import {
  P11K_ECONOMY_CONFIG,
  P11H_ECONOMY_CONFIG,
  P11G_ECONOMY_CONFIG,
  P11H_ITEM_CATALOG,
} from '@tft/game-data';
import { createMatch, applyMatchAction, commandFor } from '../match/engine';
import { validateMatchState } from '../match/invariants';
import { unit, act } from './fixture.test-support';
import { grantItemInstances, allItemInstances, grantConfiguredRemovers } from './inventory';
const complete = P11H_ITEM_CATALOG.definitions.find(
  (d) => d.content?.sourceRecordId === 'TFT_Item_Deathblade',
)!;
function fixture() {
  let s = createMatch(42, P11K_ECONOMY_CONFIG);
  unit(s, 'holder', 2, 0, 'dolea');
  grantItemInstances(s, 'item', [complete.id]);
  s = act(s, { type: 'equip_item', unitId: 'holder', itemId: allItemInstances(s)[0]!.id });
  return s;
}
it('grants exactly one initial consumable with deterministic lineage, without replacing a component or modifying historical games', () => {
  const s = createMatch(42, P11K_ECONOMY_CONFIG),
    again = createMatch(42, P11K_ECONOMY_CONFIG);
  expect(s).toEqual(again);
  expect(s.items!.removers!.issued).toHaveLength(1);
  expect(s.items!.removers!.issued[0]!.grantId).toBe('initial-p11k-0');
  expect(s.items!.components).toEqual([]);
  expect(s.items!.distributions).toEqual([]);
  const before = structuredClone(s);
  grantConfiguredRemovers(s);
  expect(s).toEqual(before);
  for (const c of [P11H_ECONOMY_CONFIG, P11G_ECONOMY_CONFIG])
    expect(createMatch(42, c).items!.removers).toBeUndefined();
  expect(validateMatchState(JSON.parse(JSON.stringify(s)))).toEqual(s);
});
it('returns intact items into pending when full, consumes once, preserves stars and unit and rejects retries atomically', () => {
  let s = fixture();
  const id = s.items!.removers!.issued[0]!.id,
    item = structuredClone(s.units[0]!.equipment![0]!);
  grantItemInstances(s, 'fill', Array(16).fill(complete.id));
  s = act(s, { type: 'remove_unit_items', unitId: 'holder', removerId: id });
  expect(s.units[0]!.equipment).toBeUndefined();
  expect(s.units[0]!.stars).toBe(2);
  expect(s.items!.pending).toContainEqual(item);
  expect(s.items!.removers!.consumed).toEqual([{ id, unitId: 'holder', returnedIds: [item.id] }]);
  const before = structuredClone(s);
  grantConfiguredRemovers(s);
  expect(s).toEqual(before);
  expect(
    applyMatchAction(
      s,
      commandFor(s, { type: 'remove_unit_items', unitId: 'holder', removerId: id }),
    ).ok,
  ).toBe(false);
  expect(s).toEqual(before);
});
it('accepts a combat bench remover, rejects active-board and frozen ghost contributors, and leaves the ongoing replay untouched', () => {
  const s = fixture();
  s.phase = 'combat';
  s.combat = { input: { units: [] } } as unknown as NonNullable<typeof s.combat>;
  const id = s.items!.removers!.issued[0]!.id,
    cmd = { type: 'remove_unit_items' as const, unitId: 'holder', removerId: id };
  // applyItemCommand is also checked by full match-command tests below in authoritative 2/3/4-player games.
  const before = structuredClone(s.combat);
  const clone = structuredClone(s);
  applyItemCommand(clone, cmd);
  expect(clone.combat).toEqual(before);
  expect(clone.items!.removers!.consumed).toHaveLength(1);
  for (const frozen of [false, true]) {
    const rejected = structuredClone(s);
    if (frozen)
      rejected.combat!.input.units = [{ id: 'holder' }] as NonNullable<
        typeof rejected.combat
      >['input']['units'];
    else rejected.units[0]!.location = { kind: 'board', hex: { q: 0, r: 4 } };
    const original = structuredClone(rejected);
    expect(() => applyItemCommand(rejected, cmd)).toThrow();
    expect(rejected).toEqual(original);
  }
});
import { applyItemCommand } from './inventory';
it('does not consume on missing owner, empty equipment, invalid phase or absent consumable', () => {
  const s = fixture(),
    id = s.items!.removers!.issued[0]!.id;
  for (const change of [
    (x: typeof s) => {
      x.units = [];
    },
    (x: typeof s) => {
      delete x.units[0]!.equipment;
    },
    (x: typeof s) => {
      x.phase = 'resolution';
    },
    (x: typeof s) => {
      x.items!.removers!.consumed.push({
        id,
        unitId: 'holder',
        returnedIds: [x.units[0]!.equipment![0]!.id],
      });
    },
  ]) {
    const candidate = structuredClone(s);
    change(candidate);
    const before = structuredClone(candidate);
    expect(() =>
      applyItemCommand(candidate, { type: 'remove_unit_items', unitId: 'holder', removerId: id }),
    ).toThrow();
    expect(candidate).toEqual(before);
  }
});
it('does not change gold, shop randomness or initial components compared with H', () => {
  const next = createMatch(999, P11K_ECONOMY_CONFIG),
    historical = createMatch(999, P11H_ECONOMY_CONFIG);
  delete next.config.removerPolicy;
  delete next.items!.removers;
  expect(next).toEqual(historical);
});
it('keeps returned equipment owned exactly once through subsequent fusion and sale without reissuing the consumable', () => {
  let s = createMatch(42, P11K_ECONOMY_CONFIG);
  for (let n = 0; n < 3; n++) unit(s, `copy-${n}`, 1, n, 'dolea');
  grantItemInstances(s, 'fusion-item', [complete.id]);
  const item = allItemInstances(s)[0]!;
  s = act(s, { type: 'equip_item', unitId: 'copy-0', itemId: item.id });
  const removerId = s.items!.removers!.issued[0]!.id;
  s = act(s, { type: 'remove_unit_items', unitId: 'copy-0', removerId });
  s = act(s, { type: 'buy_unit', offerId: s.shop.find(Boolean)!.id });
  const combined = s.units.find((u) => u.definitionId === 'dolea' && u.stars === 2)!;
  expect(combined).toBeTruthy();
  s = act(s, { type: 'sell_unit', unitId: combined.id });
  expect(allItemInstances(s).filter((i) => i.id === item.id)).toHaveLength(1);
  expect(s.items!.removers!.issued).toHaveLength(1);
  expect(s.items!.removers!.consumed).toHaveLength(1);
});
it('returns equipment safely at the global 4096-item limit without loss or duplication', () => {
  let s = fixture();
  const id = s.items!.removers!.issued[0]!.id,
    item = s.units[0]!.equipment![0]!;
  grantItemInstances(s, 'fill', Array(16).fill(complete.id));
  for (let n = 0; n < 127; n++) grantItemInstances(s, `pending-${n}`, Array(32).fill(complete.id));
  grantItemInstances(s, 'pending-last', Array(15).fill(complete.id));
  expect(allItemInstances(s)).toHaveLength(4096);
  expect(s.items!.pending).toHaveLength(4079);
  validateMatchState(s);
  const before = structuredClone(s);
  expect(() => grantItemInstances(s, 'over-capacity', [complete.id])).toThrow('item-capacity');
  expect(s).toEqual(before);
  expect(s.items!.removers!.consumed).toHaveLength(0);
  s = act(s, { type: 'remove_unit_items', unitId: 'holder', removerId: id });
  expect(s.items!.pending).toHaveLength(4080);
  expect(allItemInstances(s)).toHaveLength(4096);
  expect(allItemInstances(s).filter((i) => i.id === item.id)).toHaveLength(1);
  expect(s.items!.removers!.consumed).toHaveLength(1);
});
it.each([
  'TFT_Item_SteraksGage',
  'TFT_Item_ThiefsGloves',
  'TFT_Item_PowerGauntlet',
  'TFT_Item_HextechGunblade',
])('P11K keeps %s blocked without consuming components or the new consumable', (record) => {
  const d = P11H_ITEM_CATALOG.definitions.find((d) => d.content?.sourceRecordId === record)!;
  expect(d.availability).not.toBe('available');
  if (d.kind !== 'completed') throw Error('completed');
  const s = createMatch(42, P11K_ECONOMY_CONFIG);
  grantItemInstances(s, 'blocked-recipe', d.recipe);
  const before = structuredClone(s),
    [a, b] = s.items!.components;
  const result = applyMatchAction(
    s,
    commandFor(s, { type: 'combine_components', firstId: a!.id, secondId: b!.id }),
  );
  expect(result.ok).toBe(false);
  expect(s).toEqual(before);
  expect(s.items!.removers!.consumed).toEqual([]);
});
