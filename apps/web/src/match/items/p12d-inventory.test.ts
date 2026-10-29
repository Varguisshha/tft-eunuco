import { expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMatch, grantItemInstances } from '@tft/game-core';
import { P12D_ECONOMY_CONFIG, P11H_ITEM_CATALOG } from '@tft/game-data';
import { LocalSession } from '../LocalSession';
import { ItemHud } from './ItemHud';
import { itemInteraction } from './itemInteraction';
it('renders each real identical component/completed/pending instance exactly once and keeps its own selection identity', () => {
  const s = createMatch(42, P12D_ECONOMY_CONFIG),
    full = P11H_ITEM_CATALOG.definitions.find(
      (d) => d.kind === 'completed' && d.availability === 'available',
    )!.id;
  grantItemInstances(s, 'duplicates', [
    'component-ad',
    'component-ad',
    'component-attack_speed',
    'component-attack_speed',
    'component-attack_speed',
    full,
    full,
  ]);
  grantItemInstances(s, 'overflow', Array(18).fill('component-ad'));
  const session = new LocalSession(s),
    ui = itemInteraction(session),
    items = [...s.items!.components, ...s.items!.completed, ...s.items!.pending];
  const html = renderToStaticMarkup(createElement(ItemHud, { session }));
  expect(html.match(/data-item-instance=/g)).toHaveLength(items.length);
  for (const item of items) expect(html.split(`data-item-instance="${item.id}"`)).toHaveLength(2);
  const duplicate = s.items!.components.filter((i) => i.definitionId === 'component-ad');
  ui.select(duplicate[1]!.id);
  const selected = renderToStaticMarkup(createElement(ItemHud, { session }));
  expect(selected).toContain(`data-item-instance="${duplicate[1]!.id}"`);
  expect(selected.match(/aria-pressed="true"/g)).toHaveLength(1);
  expect(ui.getSnapshot().selected).toBe(duplicate[1]!.id);
  expect(session.getMatch().items).toEqual(s.items);
});
