import { expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMatch, grantItemInstances } from '@tft/game-core';
import { P12F_ECONOMY_CONFIG, P11H_ITEM_CATALOG } from '@tft/game-data';
import { unit, act } from '../../../../../packages/game-core/src/items/fixture.test-support';
import { LocalSession } from '../LocalSession';
import { ItemHud, RecipeBar } from './ItemHud';
import { itemInteraction } from './itemInteraction';
import { TraitRail } from '../hud/TraitRail';
it('previews the actual recipe before commit and clears it without consuming components', () => {
  const state = createMatch(42, P12F_ECONOMY_CONFIG);
  grantItemInstances(state, 'preview', ['component-ad', 'component-attack_speed']);
  const session = new LocalSession(state),
    c = itemInteraction(session),
    [a, b] = state.items!.components,
    before = structuredClone(state);
  c.select(a!.id, true);
  c.previewCombination(b!.id);
  const html = renderToStaticMarkup(createElement(RecipeBar, { session }));
  expect(html).toContain('Vista previa de receta');
  expect(html.match(/class="item-icon"/g)).toHaveLength(3);
  expect(html).toContain('Suelta para fabricar');
  expect(state).toEqual(before);
  c.endDrag();
  expect(renderToStaticMarkup(createElement(RecipeBar, { session }))).toBe('');
});
it('describes blocked recipe without an optimistic item, and stacks only real remover stock', () => {
  const state = createMatch(42, {
    ...P12F_ECONOMY_CONFIG,
    removerPolicy: { ...P12F_ECONOMY_CONFIG.removerPolicy!, initialQuantity: 2 },
  });
  const blocked = P11H_ITEM_CATALOG.recipes.find(
    (r) =>
      P11H_ITEM_CATALOG.definitions.find((d) => d.id === r.resultId)?.availability !== 'available',
  )!;
  grantItemInstances(state, 'blocked', [...blocked.components]);
  const session = new LocalSession(state),
    c = itemInteraction(session),
    [a, b] = state.items!.components;
  c.select(a!.id, true);
  c.previewCombination(b!.id);
  expect(renderToStaticMarkup(createElement(RecipeBar, { session }))).toContain('Bloqueado');
  const html = renderToStaticMarkup(createElement(ItemHud, { session }));
  expect(html.match(/data-item-instance=/g)).toHaveLength(2);
  expect(html.match(/data-remover-instance=/g)).toHaveLength(1);
  expect(html).toContain('cantidad 2');
});
it('shows roster identities, owned/bench/deployed states and truthful provisional roles without changing trait priority', () => {
  let s = createMatch(42, P12F_ECONOMY_CONFIG);
  unit(s, 'dolea', 1, 0, 'dolea');
  unit(s, 'other', 1, 1, 'florin');
  s = act(s, { type: 'move_unit', unitId: 'dolea', to: { kind: 'board', hex: { q: 0, r: 4 } } });
  const html = renderToStaticMarkup(createElement(TraitRail, { state: s }));
  expect(html).toContain('Personajes de');
  expect(html).toContain('Desplegado');
  expect(html).toContain('Sin poseer');
  expect(html).toContain('Especialización pendiente');
  expect(html).toContain('data-presence="deployed"');
  expect(html).toContain('data-character-portrait');
  expect(html).not.toContain('pixel-unit');
  expect(html).toContain('Sin retrato');
});
