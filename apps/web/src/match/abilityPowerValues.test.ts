import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { scaledProfile, effectAmount } from '@tft/game-core';
import { P11H_ECONOMY_CONFIG } from '@tft/game-data';
import type { CombatEffect } from '@tft/shared';
import { abilityValues, passiveValueEffects } from './abilityPowerValues';
import { AbilityValues } from './AbilityValues';
import { UnitInspector } from './UnitInspector';
import { LocalSession } from './LocalSession';
import { createP11HReference } from '../development/p11hReference';
vi.mock('../game/GameCanvas', () => ({ GameCanvas: () => null }));
it.each(['vargas', 'jaramillo', 'florin', 'dolea'])(
  '%s values equal the engine for every star and reflect current AD/AP/HP without mutating the catalogue',
  (id) => {
    for (const stars of [1, 2, 3] as const) {
      const p = scaledProfile(id, stars, P11H_ECONOMY_CONFIG);
      p.stats.attack += 23;
      p.stats.abilityPower = 81;
      p.stats.maxHp += 125;
      const before = structuredClone(p),
        source = { profile: p, statuses: [] };
      const effects = [...p.championAbility!.active!.effects, ...passiveValueEffects(p)];
      const numeric = effects.filter((e) => ['damage', 'heal', 'shield'].includes(e.kind));
      const values = abilityValues(p, effects);
      expect(values.map((v) => v.value)).toEqual(
        numeric.map((e) => effectAmount(e, source, source)),
      );
      expect(p).toEqual(before);
      expect(renderToStaticMarkup(createElement(AbilityValues, { profile: p }))).toContain(
        'antes de resistencias',
      );
    }
  },
);
it('supports AP and combined ratios with the engine floor, and does not invent a target-dependent value', () => {
  const p = scaledProfile('vargas', 1, P11H_ECONOMY_CONFIG);
  p.stats.attack = 79;
  p.stats.abilityPower = 31;
  const mixed: CombatEffect = {
    kind: 'damage',
    target: 'target',
    radius: 0,
    amount: 10,
    damageType: 'magic',
    powerScaling: { version: 1, adRatioMilli: 500, apRatioMilli: 1250 },
  };
  expect(abilityValues(p, [mixed])).toEqual([
    { label: 'Daño mágico', value: 88, formula: '10 + 50% AD + 125% AP' },
  ]);
  expect(
    abilityValues(p, [
      {
        kind: 'heal',
        target: 'self',
        radius: 0,
        amount: 0,
        scaling: { stat: 'maxHp', basis: 'target', ratioMilli: 100 },
      },
    ])[0],
  ).toMatchObject({ value: null, formula: '10% vida máxima del objetivo' });
});
it('shows the actual 280% AD of Vargas, fixed Dolea damage, and HP shields/healing without attributing AP scaling', () => {
  const v = scaledProfile('vargas', 1, P11H_ECONOMY_CONFIG);
  v.stats.attack = 78;
  expect(abilityValues(v, v.championAbility!.active!.effects)[0]).toMatchObject({
    value: 218,
    formula: '280% AD',
  });
  expect(abilityValues(v, passiveValueEffects(v))[0]).toMatchObject({ formula: '5% vida máxima' });
  const d = scaledProfile('dolea', 2, P11H_ECONOMY_CONFIG);
  expect(abilityValues(d, d.championAbility!.active!.effects)[0]).toMatchObject({
    value: 180,
    formula: '180 fijo',
  });
  expect(abilityValues(d, passiveValueEffects(d))[0]).toMatchObject({ formula: '12% vida máxima' });
  expect(renderToStaticMarkup(createElement(AbilityValues, { profile: v }))).toContain(
    'excluyendo escudos y exceso',
  );
});
it('updates inspector values after effective stats change and keeps skill conditions without internal progress UI', () => {
  const c = createP11HReference();
  const session = new LocalSession(c.coordinator.getMatch(), undefined, c.coordinator);
  const unit = session.getMatch().units.find((u) => u.definitionId === 'vargas')!;
  session.select(unit.id);
  const a = renderToStaticMarkup(
    createElement(UnitInspector, { session, view: session.getSnapshot() }),
  );
  expect(a).toContain('Descripción y escalado de la habilidad');
  expect(a).toContain('280% AD');
  expect(a).toContain('sin crítico.');
  expect(a).toContain('ability-prose');
  expect(a).toContain('Escalado por estrellas');
  expect(a).not.toContain('Progreso de combate');
  const profile = session.inspection()!.profile;
  const before = abilityValues(profile, profile.championAbility!.active!.effects)[0]!.value;
  profile.stats.attack += 100;
  expect(abilityValues(profile, profile.championAbility!.active!.effects)[0]!.value).toBe(
    before! + 280,
  );
  c.dispose();
});
