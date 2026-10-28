import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { validateMatchState } from '@tft/game-core';
import { characterRecord, getTraitDefinition } from '@tft/game-data';
import { createRosterReference } from '../development/rosterReference';
import { RosterGallery } from '../development/RosterGallery';
import { AffinityDetails } from './AffinityDetails';
import { LocalSession } from './LocalSession';
import { LocalGame } from './LocalGame';
vi.mock('../game/GameCanvas', () => ({ GameCanvas: () => null }));
it('renders five conserved modern cards with complete accessible affiliations and inspector, preserving read-only selection', () => {
  const c = createRosterReference(),
    state = c.coordinator.getMatch();
  expect(validateMatchState(state)).toEqual(state);
  const session = new LocalSession(state, undefined, c.coordinator);
  const render = () =>
    renderToStaticMarkup(
      createElement(LocalGame, { session, onNew: () => {}, onReplace: () => {} }),
    );
  const closed = render();
  expect(closed.match(/multi-affinity-card/g)).toHaveLength(5);
  expect(closed).not.toContain('Llama de Pádel');
  expect(closed).toContain('Efectos pendientes');
  const before = structuredClone(state);
  for (const id of ['dolea', 'vargas', 'florin', 'jaramillo']) {
    session.select(state.units.find((u) => u.definitionId === id)!.id);
    const html = render();
    expect(html).toContain('Lista completa de afinidades');
    for (const trait of characterRecord(id)!.synergies)
      expect(html).toContain(getTraitDefinition(trait, 'f0p10a-1')!.name);
    expect(html).toContain('Miembros:');
    expect(html).toContain('Siguiente:');
    expect(html).toContain('Efecto implementado');
  }
  expect(state).toEqual(before);
  c.dispose();
});
it('shows all 34 entries and every one of Peibol’s eight affinities without making drafts purchasable', () => {
  const gallery = renderToStaticMarkup(createElement(RosterGallery));
  expect(gallery.match(/data-roster-id=/g)).toHaveLength(34);
  expect(gallery).toContain('30 borradores');
  expect(gallery).not.toContain('Generar personaje');
  const html = renderToStaticMarkup(
    createElement(AffinityDetails, { ids: characterRecord('peibol')!.synergies, contributors: [] }),
  );
  expect(html.match(/<details/g)).toHaveLength(8);
  expect(html).toContain('Jew');
  expect(html).toContain('Atributo único');
  expect(html).toContain('Efectos pendientes. No concede bonificaciones.');
});
it('inspects inherited local AI safely and counts the selected side rather than the player formation', () => {
  const c = createRosterReference(),
    session = new LocalSession(c.coordinator.getMatch(), undefined, c.coordinator);
  const rival = session.getSnapshot().board.units.find((u) => u.owner === 'north')!;
  session.select(rival.id);
  const html = renderToStaticMarkup(
    createElement(LocalGame, { session, onNew: () => {}, onReplace: () => {} }),
  );
  expect(html).toContain('Sin afiliaciones competitivas en esta versión.');
  expect(session.affinityContributors('north').every((u) => u.traits.length === 0)).toBe(true);
  expect(session.affinityContributors('south')).toHaveLength(4);
  c.dispose();
});
