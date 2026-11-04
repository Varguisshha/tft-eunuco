import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import {
  getTraitDefinition,
  traitDisplayName,
  characterPresentation,
  FLORIN_TRAITS,
} from '@tft/game-data';
import { AffinityBand } from './AffinityBand';
import { AffinityDetails } from './AffinityDetails';
import { synergyLabel } from './uiLabels';
import { CharacterSpecialization } from '../game/CharacterSpecialization';
import { p13tFixture } from '../development/p13tFixture';
import { LocalSession } from './LocalSession';
import { UnitInspector } from './UnitInspector';
it('current FLORIN labels show exact ¡Me Fuí! without mutating the historical identifier or mechanics', () => {
  const historic = getTraitDefinition('mano_de_obra', 'f0p11h-1')!,
    before = JSON.stringify(FLORIN_TRAITS);
  expect(historic.id).toBe('mano_de_obra');
  expect(traitDisplayName(historic)).toBe('¡Me Fuí!');
  expect(synergyLabel('mano_de_obra')).toBe('¡Me Fuí!');
  for (const html of [
    renderToStaticMarkup(
      createElement(AffinityBand, { ids: ['mano_de_obra'], catalog: 'f0p11h-1' }),
    ),
    renderToStaticMarkup(
      createElement(AffinityDetails, {
        ids: ['mano_de_obra'],
        catalog: 'f0p11h-1',
        contributors: [],
      }),
    ),
  ]) {
    expect(html).toContain('¡Me Fuí!');
    expect(html).not.toContain('Mano de Obra');
  }
  const specialization = renderToStaticMarkup(
    createElement(CharacterSpecialization, { id: 'florin', tooltip: false }),
  );
  expect(specialization).toContain('¡Me Fuí!');
  expect(specialization).not.toContain('Mano de Obra');
  expect(JSON.stringify(FLORIN_TRAITS)).toBe(before);
});
it('PEIBOL is explicitly AD only in P13T; COSMIN and historical provisional roles stay pending', () => {
  expect(characterPresentation('peibol', 'f0p13t-1')).toMatchObject({
    combatRole: 'marksman',
    primaryDamageType: 'physical',
  });
  expect(characterPresentation('peibol').combatRole).toBeNull();
  expect(characterPresentation('cosmin', 'f0p13t-1').combatRole).toBeNull();
});
it('PEIBOL inspector presents its real skills instead of claiming they are pending', () => {
  const session = new LocalSession(p13tFixture());
  session.select('p13t-1');
  const html = renderToStaticMarkup(
    createElement(UnitInspector, { session, view: session.getSnapshot() }),
  );
  expect(html).toContain('habilidades disponibles');
  expect(html).toContain('PLATITA LOW ELO');
  expect(html).toContain('HEADSHOT');
  expect(html).not.toContain('Solo ataques básicos');
});
