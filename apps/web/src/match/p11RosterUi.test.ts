import { it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createP11Reference } from '../development/p11Reference';
import { LocalSession } from './LocalSession';
import { LocalGame } from './LocalGame';
import { getTraitDefinition, matchCatalog } from '@tft/game-data';
vi.mock('../game/GameCanvas', () => ({ GameCanvas: () => null }));
it('P11A can buy and inspect the eight-affinity provisional without losing the HUD', () => {
  const c = createP11Reference(),
    state = c.coordinator.getMatch();
  const s = new LocalSession(state, undefined, c.coordinator);
  const offer = state.shop.find((o) => o?.definitionId === 'peibol')!;
  expect(s.dispatch({ type: 'buy_unit', offerId: offer.id })).toBe(true);
  expect(s.selected()?.definitionId).toBe('peibol');
  const html = renderToStaticMarkup(
    createElement(LocalGame, { session: s, onNew: () => {}, onReplace: () => {} }),
  );
  expect(html).toContain('Parámetros temporales');
  expect(html).toContain('Sinergias');
  for (const d of matchCatalog(state.config))
    for (const id of d.synergies)
      expect(getTraitDefinition(id, state.config.catalog)).toBeDefined();
  expect(html.match(/multi-affinity-card/g)).toHaveLength(5);
  c.dispose();
});
