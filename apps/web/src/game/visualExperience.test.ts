import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { runCombat } from '@tft/game-core';
import { createVargasScenario } from '@tft/game-data';
import { combatCounters } from './combatCounters';
import { characterVisualScale, originalHitBounds, CHARACTER_SCALE_CANDIDATES } from './visualScale';
import { GameCounter } from '../match/hud/GameCounter';
import { GameButton } from '../match/hud/GameButton';
import { BoardSession } from './session';
const trace = runCombat(createVargasScenario('vargas-1', 42));
describe('authoritative presentation counters', () => {
  it('starts at zero and derives the complete stack thresholds from definitions', () => {
    const s = trace.snapshots[0]!,
      u = s.units.find((u) => u.definitionId === 'vargas')!;
    const counters = combatCounters(u, s);
    expect(counters.find((c) => c.name === 'Resaca Controlada')).toMatchObject({
      value: 0,
      max: 5,
    });
    expect(counters.find((c) => c.name === 'Depredador')?.thresholds).toEqual([2, 4, 6]);
    expect(counters.find((c) => c.id === 'kills')?.value).toBe(0);
  });
  it('tracks actual consumption, active bonus and decreasing duration without animation inference', () => {
    const snapshots = trace.snapshots.filter((s) =>
      s.units.some((u) => u.statuses.some((st) => st.key === 'resaca-speed')),
    );
    expect(snapshots.length).toBeGreaterThan(1);
    const s = snapshots[0]!,
      u = s.units.find((u) => u.definitionId === 'vargas')!;
    const c = combatCounters(u, s).find((c) => c.name === 'Resaca Controlada')!;
    expect(c.value).toBe(u.mechanics!.stacks.find((s) => s.definitionId === 'resaca')!.count);
    expect(c.state).toBe('active');
    expect(c.detail).toContain('+20% velocidad de ataque');
    expect(c.detail).toContain('3.0 s');
    const later = snapshots[1]!;
    expect(
      combatCounters(later.units.find((u) => u.definitionId === 'vargas')!, later).find(
        (c) => c.name === 'Resaca Controlada',
      )?.detail,
    ).toContain('2.9 s');
    expect(combatCounters(u, s).find((c) => c.name === 'Resaca Controlada')).toEqual(c);
  });
  it('uses credited kills and keeps them separate from stack and membership counts', () => {
    const t = runCombat(createVargasScenario('depredador-10', 42));
    for (const s of t.snapshots) {
      const u = s.units.find((u) => u.definitionId === 'vargas')!;
      expect(combatCounters(u, s).find((c) => c.id === 'kills')?.value).toBe(u.mechanics!.kills);
    }
  });
  it('reads individual UPM progress, never team membership or animation counts', () => {
    const t = runCombat(createVargasScenario('upm-6', 42));
    const s = t.snapshots.at(-1)!;
    for (const u of s.units.filter((u) => u.owner === 'south')) {
      const p = s.mechanics!.traits.find((p) => p.unitId === u.id && p.traitId === 'upm');
      if (p) expect(combatCounters(u, s).find((c) => c.id === 'trait:upm')?.value).toBe(p.casts);
    }
  });
  it('renders accessible progress and its source without duplicating combat rules', () => {
    const s = trace.snapshots[0]!,
      u = s.units[0]!;
    const c = combatCounters(u, s).find((c) => c.name === 'Resaca Controlada')!;
    const html = renderToStaticMarkup(createElement(GameCounter, { counter: c }));
    expect(html).toContain('data-source="stack"');
    expect(html).toContain('aria-label="Resaca Controlada"');
    expect(html).toContain('max="5"');
  });
});
describe('visual scale preserves logical input', () => {
  for (const factor of CHARACTER_SCALE_CANDIDATES)
    it(`keeps anchored hit bounds at ${factor}`, () => {
      const foot = { x: 100, y: 200 };
      expect(
        originalHitBounds(
          { x: 100 - 20 * factor, y: 200 - 80 * factor, width: 40 * factor, height: 80 * factor },
          foot,
          factor,
        ),
      ).toEqual({ x: 80, y: 120, width: 40, height: 80 });
      expect(characterVisualScale(0.95, true, factor)).toBe(0.95 * factor);
      expect(characterVisualScale(0.95, false, factor)).toBe(0.95);
    });
  for (const count of [4, 8] as const)
    it(`provides a valid dense ${count}v${count} diagnostic with actual profiles`, () => {
      const session = new BoardSession();
      session.loadVisualFormation(count);
      const input = session.traitInput()!;
      expect(input.units).toHaveLength(count * 2);
      expect(new Set(input.units.map((u) => `${u.position.q},${u.position.r}`)).size).toBe(
        count * 2,
      );
      expect(input.units.some((u) => u.definitionId === 'dolea')).toBe(true);
      expect(input.units.some((u) => u.definitionId === 'vargas')).toBe(true);
      expect(runCombat(input).result.tick).toBeGreaterThan(0);
    });
});
it('retains semantic disabled and active button states and prepared cue extension', () => {
  const html = renderToStaticMarkup(
    createElement(GameButton, {
      label: 'Bloquear tienda',
      icon: 'lock',
      disabled: true,
      active: true,
      onAction: () => true,
    }),
  );
  expect(html).toContain('disabled=""');
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain('game-frame');
});

it('keeps five portraits with traits before the bottom name/cost rail', async () => {
  const { createMatch } = await import('@tft/game-core');
  const { CURRENT_ECONOMY_CONFIG } = await import('@tft/game-data');
  const { LocalSession } = await import('../match/LocalSession');
  const { Shop } = await import('../match/Shop');
  const session = new LocalSession(createMatch(360, CURRENT_ECONOMY_CONFIG));
  const html = renderToStaticMarkup(createElement(Shop, { session }));
  const cards = [...html.matchAll(/<button[^>]*class="shop-offer[^>]*>[\s\S]*?<\/button>/g)].map(
    (m) => m[0],
  );
  expect(cards).toHaveLength(5);
  for (const card of cards) {
    expect(card.indexOf('offer-art')).toBeLessThan(card.indexOf('offer-traits'));
    expect(card.indexOf('offer-traits')).toBeLessThan(card.indexOf('offer-footer'));
    expect(card.indexOf('offer-footer')).toBeLessThan(card.indexOf('offer-price'));
  }
  expect(cards.some((c) => (c.match(/class="offer-trait"/g) ?? []).length === 1)).toBe(true);
  expect(cards.some((c) => (c.match(/class="offer-trait"/g) ?? []).length === 2)).toBe(true);
  expect(html).toContain('/sprites/dolea/star1/attack-portrait.png');
});
