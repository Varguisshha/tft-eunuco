import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { P13T1_ECONOMY_CONFIG, P13T_ECONOMY_CONFIG } from '@tft/game-data';
import { DevelopmentController } from '@tft/game-core/development';
import { LocalSession } from './LocalSession';
import { UnitInspector } from './UnitInspector';
import { TraitRail } from './hud/TraitRail';
import { p13t1Fixture } from '../development/p13t1Fixture';
import { localEconomyConfig } from '../localConfig';
it.each([1, 2, 3] as const)(
  'PEIBOL %i★ has real AD skill, inline values, role and existing star table',
  (stars) => {
    const s = new LocalSession(p13t1Fixture(stars));
    s.select('p13t-1');
    const html = renderToStaticMarkup(
      createElement(UnitInspector, { session: s, view: s.getSnapshot() }),
    );
    expect(html).toContain('Tirador AD');
    expect(html).toContain('PLATITA LOW ELO');
    expect(html).toContain('HEADSHOT');
    expect(html).toContain('ability-inline-value');
    for (const absent of [
      'Especialización pendiente',
      'Parámetros temporales',
      'Solo ataques básicos',
      'Sin habilidad configurada',
    ])
      expect(html).not.toContain(absent);
    const rail = renderToStaticMarkup(createElement(TraitRail, { state: s.getMatch() }));
    expect(rail).toMatch(/is-active[^>]*data-tone[^>]*data-trait-id="jew"/);
    expect(rail).not.toContain('Jew Atributo único · Efecto pendiente');
  },
);
it('new normal and DEV entrypoints share the preset, explicit old presets keep old behavior', () => {
  expect(localEconomyConfig('p13t1')).toEqual(P13T1_ECONOMY_CONFIG);
  expect(localEconomyConfig('p13t')).toEqual(P13T_ECONOMY_CONFIG);
  const c = new DevelopmentController({ now: () => 0 }, 42, undefined, localEconomyConfig('p13t1'));
  expect(c.coordinator.getMatch().config).toEqual(P13T1_ECONOMY_CONFIG);
  c.dispose();
});
