import { it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createP11KReference } from '../../development/p11hReference';
import { LocalSession } from '../LocalSession';
import { ItemHud } from './ItemHud';
import { itemInteraction, previewItemCommand, equipmentCommand } from './itemInteraction';
it('renders the single competitive-origin remover, quantity and draggable selection without a DEV grant', () => {
  const c = createP11KReference(),
    session = new LocalSession(c.coordinator.getMatch()),
    ui = itemInteraction(session);
  const issued = session.getMatch().items!.removers!.issued;
  expect(issued).toHaveLength(1);
  expect(issued[0]!.grantId).toBe('initial-p11k-0');
  const html = renderToStaticMarkup(createElement(ItemHud, { session }));
  expect(html).toContain('Removedor de objetos, cantidad 1');
  expect(html).toContain('draggable="true"');
  expect(html).toContain('solo banquillo');
  ui.select(issued[0]!.id);
  expect(ui.getSnapshot().selected).toBe(issued[0]!.id);
  c.dispose();
});
it('submits a valid combat-bench removal from the same interaction controller and reports confirmation, while refusing a board target', () => {
  const c = createP11KReference(),
    session = new LocalSession(c.coordinator.getMatch()),
    ui = itemInteraction(session);
  const off = ui.subscribe(() => {}),
    state = session.getMatch(),
    bench = state.units.find((u) => u.location.kind === 'bench')!,
    board = state.units.find((u) => u.definitionId === 'dolea')!,
    id = state.items!.removers!.issued[0]!.id;
  expect(session.dispatch({ type: 'start_combat_auto' })).toBe(true);
  const frozen = structuredClone(session.getMatch().combat!);
  ui.select(id);
  expect(
    previewItemCommand(session.getMatch(), equipmentCommand(session.getMatch(), board.id, id)),
  ).not.toBeNull();
  expect(ui.equip(board.id)).toBe(false);
  expect(session.getMatch().items!.removers!.consumed).toHaveLength(0);
  expect(
    previewItemCommand(session.getMatch(), equipmentCommand(session.getMatch(), bench.id, id)),
  ).toBeNull();
  expect(ui.equip(bench.id)).toBe(true);
  expect(ui.getSnapshot().outcome).toBe('success');
  expect(ui.getSnapshot().selected).toBeNull();
  expect(session.getMatch().items!.removers!.consumed).toHaveLength(1);
  expect(session.getMatch().combat).toEqual(frozen);
  expect(renderToStaticMarkup(createElement(ItemHud, { session }))).toContain(
    'Confirmado · inventario actualizado.',
  );
  off();
  c.dispose();
});
