import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { scaledProfile } from '@tft/game-core';
import { P11H_ECONOMY_CONFIG } from '@tft/game-data';
import { AbilityValues } from './AbilityValues';
import { abilityValues, passiveValueEffects } from './abilityPowerValues';
function render(id: string, star: 1 | 2 | 3, passive = false) {
  const profile = scaledProfile(id, star, P11H_ECONOMY_CONFIG);
  profile.stats.attack = 78;
  profile.stats.abilityPower = 123;
  profile.stats.maxHp = 1000;
  const before = structuredClone(profile);
  const html = renderToStaticMarkup(
    createElement(AbilityValues, {
      profile,
      definitionId: id,
      config: P11H_ECONOMY_CONFIG,
      passive,
    }),
  );
  expect(profile).toEqual(before);
  return {
    html,
    profile,
    prose: html.match(/<p class="ability-prose">(.*?)<\/p>/s)![1]!.replace(/<[^>]+>/g, ''),
  };
}
it.each(['vargas', 'jaramillo', 'florin', 'dolea'])(
  '%s places computed amounts in its active and passive prose for all three stars without changing rules',
  (id) => {
    for (const star of [1, 2, 3] as const)
      for (const passive of [false, true]) {
        const { html, profile, prose } = render(id, star, passive);
        const effects = passive
          ? passiveValueEffects(profile)
          : profile.championAbility!.active!.effects;
        for (const value of abilityValues(profile, effects))
          if (value.value !== null) expect(prose).toContain(value.value.toLocaleString('es-ES'));
        expect(html).toContain('ability-scaling-icon');
        expect(html).toContain('Escalado por estrellas');
        expect(prose).not.toContain('280 / 420 / 700');
        expect(html).not.toContain('Progreso de combate');
      }
  },
);
it('Vargas reads naturally with the actual 218 damage and 50 healing, and preserves damage-based healing restrictions', () => {
  const active = render('vargas', 1),
    passive = render('vargas', 1, true);
  expect(active.prose).toContain('Golpe físico de 218, sin crítico.');
  expect(active.prose).toContain(
    'Cura 15 % del daño aplicado a vida, excluyendo escudos y exceso.',
  );
  expect(passive.prose).toContain('cura 50 de vida');
  expect(active.html).toContain('aria-label="218 · Daño físico (280% AD)"');
  expect(active.html).toContain('1 estrellas: 280% AD, nivel actual');
  expect(active.html).toContain('420% AD');
  expect(active.html).toContain('700% AD');
});
it('Dolea keeps fixed damage separate from HP scaling, and the breakdown uses real authored star amounts, not current AD', () => {
  const active = render('dolea', 2),
    passive = render('dolea', 2, true);
  expect(active.prose).toContain('180 de daño físico');
  expect(active.html).toContain('100 fijo');
  expect(active.html).toContain('180 fijo');
  expect(active.html).toContain('324 fijo');
  expect(active.html).not.toContain('% AD');
  expect(active.html).not.toContain('% AP');
  expect(passive.prose).toContain('escudo de 120');
  expect(passive.html).toContain('12% vida máxima');
});
it('Florin shows independent main and secondary amounts, current stun duration and attack-cycle bonus', () => {
  const active = render('florin', 2),
    passive = render('florin', 2, true);
  expect(active.prose).toContain('202 de daño físico al objetivo');
  expect(active.prose).toContain('radio 2 reciben 121 de daño físico');
  expect(active.prose).toContain('aturde 1,5 s');
  expect(passive.prose).toContain('Después de 4 ataques básicos');
  expect(passive.prose).toContain('añade 46 de daño al básico');
  expect(passive.prose).not.toContain('daño físico');
});
