import { it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createItemHudReference } from '../../development/neonReference';
import { LocalSession } from '../LocalSession';
import {
  ItemInteraction,
  previewItemCommand,
  recipeOptions,
  DeliveryTracker,
} from './itemInteraction';
import { ItemHud, EquipmentSlots } from './ItemHud';
import { ItemIcon, ITEM_GLYPHS } from './ItemIcon';
import { resolveItemCatalog } from '@tft/game-data';
function fixture(mode: Parameters<typeof createItemHudReference>[0] = 'components') {
  const dev = createItemHudReference(mode);
  const session = new LocalSession(dev.coordinator.getMatch(), undefined, dev.coordinator);
  const ui = new ItemInteraction(session);
  ui.subscribe(() => {});
  return { dev, session, ui };
}
it('renders the private inventory entry and eight original component glyphs with fallback', () => {
  const { session } = fixture();
  expect(renderToStaticMarkup(createElement(ItemHud, { session }))).toContain(
    'Inventario de objetos',
  );
  expect(Object.keys(ITEM_GLYPHS)).toHaveLength(8);
  expect(renderToStaticMarkup(createElement(ItemIcon, { definition: undefined }))).toContain(
    '<svg',
  );
});
it('previews eight recipes without consuming anything and combines exactly two real instances', () => {
  const { session, ui } = fixture();
  const s = session.getMatch();
  const before = JSON.stringify(s.items);
  const recipes = recipeOptions(s, s.items!.components[0]!.definitionId);
  expect(recipes).toHaveLength(8);
  expect(JSON.stringify(s.items)).toBe(before);
  const r = recipes[0]!;
  expect(ui.combine(r.first!.id, r.second!.id)).toBe(true);
  expect(session.getMatch().items!.components).toHaveLength(14);
  expect(session.getMatch().items!.completed).toHaveLength(1);
  expect(ui.getSnapshot().outcome).toBe('success');
  expect(ui.combine(r.first!.id, r.second!.id)).toBe(false);
  expect(session.getMatch().items!.completed).toHaveLength(1);
});
it.each(['dolea', 'vargas', 'jaramillo', 'florin'])(
  'equips and auto-combines on %s via the same commands as drag and click',
  (id) => {
    const { session, ui } = fixture();
    const unit = session.getMatch().units.find((u) => u.definitionId === id)!;
    const [a, b] = session.getMatch().items!.components;
    expect(ui.equip(unit.id, a!.id)).toBe(true);
    expect(ui.combine(a!.id, b!.id)).toBe(true);
    const equipment = session.getMatch().units.find((u) => u.id === unit.id)!.equipment!;
    expect(equipment).toHaveLength(1);
    expect(equipment[0]!.kind).toBe('completed');
    expect(session.getMatch().items!.components).toHaveLength(14);
  },
);
it('shows three slots, rejects a fourth and returns equipment on sale', () => {
  const { session, ui } = fixture('all');
  const unit = session.getMatch().units.find((u) => u.definitionId === 'florin')!;
  const items = session
    .getMatch()
    .items!.completed.filter((i) => i.definitionId !== 'item-forge-critical--critical')
    .slice(0, 4);
  for (const i of items.slice(0, 3)) expect(ui.equip(unit.id, i.id)).toBe(true);
  expect(ui.equip(unit.id, items[3]!.id)).toBe(false);
  expect(ui.getSnapshot().status).toContain('tres');
  const u = session.getMatch().units.find((u) => u.id === unit.id)!;
  expect(
    renderToStaticMarkup(
      createElement(EquipmentSlots, { session, unitId: u.id, items: u.equipment! }),
    ),
  ).toContain('Objetos · 3/3');
  expect(session.dispatch({ type: 'sell_unit', unitId: u.id })).toBe(true);
  expect(session.getMatch().items!.completed.some((i) => i.id === items[0]!.id)).toBe(true);
});
it('recovers pending items only when authoritative capacity permits', () => {
  const { session, ui } = fixture('full');
  const pending = session.getMatch().items!.pending.find((i) => i.kind === 'component')!;
  expect(ui.submit({ type: 'move_item', itemId: pending.id, toIndex: 0 })).toBe(false);
  const a = session.getMatch().items!.components[0]!,
    b = session.getMatch().items!.components[1]!;
  ui.combine(a.id, b.id);
  expect(ui.submit({ type: 'move_item', itemId: pending.id, toIndex: 0 })).toBe(true);
  expect(session.getMatch().items!.pending.some((i) => i.id === pending.id)).toBe(false);
});
it('rejects foreign units, unavailable phase and duplicate instance without mutation', () => {
  const { session, ui } = fixture();
  const s = session.getMatch(),
    id = s.items!.components[0]!.id,
    before = JSON.stringify(s);
  expect(ui.equip('rival', id)).toBe(false);
  expect(
    previewItemCommand(
      { ...s, phase: 'combat' },
      { type: 'equip_item', itemId: id, unitId: s.units[0]!.id },
    ),
  ).not.toBeNull();
  expect(ui.combine(id, id)).toBe(false);
  expect(JSON.stringify(s)).toBe(before);
});
it('deduplicates round notifications independently from inventory commands', () => {
  const tracker = new DeliveryTracker();
  expect(tracker.observe(['r3'])).toEqual(['r3']);
  expect(tracker.observe(['r3'])).toEqual([]);
  expect(tracker.observe(['r3', 'r6'])).toEqual(['r6']);
});
it('resolves all 36 original pair glyphs from the active catalog', () => {
  const { session } = fixture();
  const c = resolveItemCatalog(session.getMatch().items!.catalogVersion);
  const icons = c.definitions
    .filter((d) => d.kind === 'completed')
    .map((d) => renderToStaticMarkup(createElement(ItemIcon, { definition: d })));
  expect(icons).toHaveLength(36);
  expect(new Set(icons).size).toBe(36);
});

it.each(['two', 'three'] as const)('renders valid distribution fixture %s', (mode) => {
  const { session } = fixture(mode);
  expect(session.getMatch().items!.distributions[0]!.quantity).toBe(mode === 'two' ? 2 : 3);
});
