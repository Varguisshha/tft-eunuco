import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { it, expect, vi } from 'vitest';
import { createP11BReference } from '../development/p11bReference';
import { LocalSession } from './LocalSession';
import { LocalGame } from './LocalGame';
import { itemInteraction, equipmentCommand } from './items/itemInteraction';
vi.mock('../game/GameCanvas', () => ({ GameCanvas: () => null }));
it('P11B renders a single vertical inventory with quantities, original icons and a usable remover without old tabs', () => {
  const c = createP11BReference(),
    session = new LocalSession(c.coordinator.getMatch(), undefined, c.coordinator);
  const render = () =>
    renderToStaticMarkup(
      createElement(LocalGame, { session, onNew: () => {}, onReplace: () => {} }),
    );
  const html = render();
  expect(html).toContain('item-vertical');
  expect(html).not.toContain('item-tabs');
  expect(html).not.toContain('role="tab"');
  expect(html).toContain('Bandeja vertical de objetos');
  expect(html).toContain('Removedor de objetos, cantidad 1');
  expect(html).toContain('Espadón');
  expect(html.match(/multi-affinity-card/g)).toHaveLength(5);
  const unit = session.getMatch().units.find((u) => u.definitionId === 'dolea')!,
    remover = session.getMatch().items!.removers!.issued[0]!.id,
    ui = itemInteraction(session),
    off = ui.subscribe(() => {});
  session.select(unit.id);
  ui.select(remover);
  expect(equipmentCommand(session.getMatch(), unit.id, remover)).toEqual({
    type: 'remove_unit_items',
    unitId: unit.id,
    removerId: remover,
  });
  expect(render()).toContain('Retirar de DOLEA');
  expect(ui.equip(unit.id)).toBe(true);
  expect(ui.getSnapshot().outcome).toBe('success');
  expect(session.getMatch().units.find((u) => u.id === unit.id)!.equipment).toBeUndefined();
  expect(session.getMatch().items!.removers!.consumed).toHaveLength(1);
  expect(render()).toContain('Removedor de objetos, cantidad 0');
  off();
  c.dispose();
});
