import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import {
  createMatch,
  LocalMatchCoordinator,
  matchTraits,
  commandFor,
  applyMatchAction,
  runCombat,
} from '@tft/game-core';
import { CURRENT_ECONOMY_CONFIG, ECONOMY_CONFIG, createAbilityScenario } from '@tft/game-data';
import { LocalSession } from './LocalSession';
import { UnitInspector } from './UnitInspector';
import { TraitRail } from './hud/TraitRail';
import { CONTENT_ICONS, ContentIcon } from './hud/ContentIcon';
import { Shop } from './Shop';
import { encodeSave, decodeSave } from './automaticSave';
import { unitAnimationCue } from '../game/animationPlayback';
import { characterManifest } from '../game/characterAssets';
import { resolveAnimation } from '@tft/sprite-contract';
import { readFileSync } from 'node:fs';
import { CombatPlayback } from '../game/combatPlayback';
const html = (element: React.ReactNode) => renderToStaticMarkup(element);
function formation(catalog: 'f0p4.1' | 'f0p6a' = 'f0p6a') {
  let s = createMatch(42, { ...CURRENT_ECONOMY_CONFIG, catalog });
  const buy = s.shop.find((o) => o?.definitionId === 'dolea')!;
  for (const action of [{ type: 'buy_unit' as const, offerId: buy.id }]) {
    const r = applyMatchAction(s, commandFor(s, action));
    if (!r.ok) throw Error();
    s = r.state;
  }
  return s;
}
describe('P6A presentation and persistence', () => {
  it('inspector includes the logical overtime attack-speed multiplier without changing replay', () => {
    const state = formation();
    const session = new LocalSession(state);
    const input = createAbilityScenario('passive-overtime', 42);
    input.units.find((u) => u.definitionId === 'dolea')!.id = state.units[0]!.id;
    const replay = runCombat(input);
    const playback = new CombatPlayback(replay);
    playback.seek(44900);
    session.combatFrame = () => playback.frame();
    session.select(state.units[0]!.id);
    const before = JSON.stringify(replay);
    expect(session.inspection()!.profile.stats.attackSpeedMilli).toBe(
      Math.floor((800 * input.overtime.attackSpeedMilli[1]) / 1000),
    );
    expect(JSON.stringify(replay)).toBe(before);
  });
  it('shop connects two real traits/icons to DOLEA, inspector has one mixed ability and data descriptions', () => {
    const session = new LocalSession(createMatch(42, CURRENT_ECONOMY_CONFIG));
    const shop = html(createElement(Shop, { session }));
    expect(shop).toContain('HORTALEZA');
    expect(shop).toContain('LLAMA DE PÁDEL');
    expect(shop).toContain(CONTENT_ICONS.hortaleza);
    expect(shop).toContain('/sprites/dolea/star1/attack-portrait.png');
    const state = formation();
    const s = new LocalSession(state);
    s.select(state.units[0]!.id);
    const inspector = html(createElement(UnitInspector, { session: s, view: s.getSnapshot() }));
    expect(inspector.match(/VOLUMEN SUCIO/g)).toHaveLength(1);
    expect(inspector).toContain('Volumen eterno');
    expect(inspector).toContain('Press de banca');
    expect(inspector).toContain('70 maná');
    expect(inspector).toContain('12 %');
    const old = new LocalSession(formation('f0p4.1'));
    old.select(old.getMatch().units[0]!.id);
    expect(html(createElement(UnitInspector, { session: old, view: old.getSnapshot() }))).toContain(
      'Bastión de prueba',
    );
  });
  it('bench excluded, moving in/out updates core counts and accessible tooltips', () => {
    const s = new LocalSession(formation());
    expect(matchTraits(s.getMatch()).every((t) => t.count === 0)).toBe(true);
    s.move(s.getMatch().units[0]!.id, { q: 0, r: 4 });
    expect(matchTraits(s.getMatch()).map((t) => t.count)).toEqual([1, 1]);
    const rail = html(createElement(TraitRail, { state: s.getMatch() }));
    expect(rail.match(/role="tooltip"/g)).toHaveLength(2);
    expect(rail).toContain('aria-describedby');
    expect(rail).toContain('+220 de vida');
    expect(rail).not.toContain('title=');
    s.bench(0, s.getMatch().units[0]!.id);
    expect(matchTraits(s.getMatch()).every((t) => t.count === 0)).toBe(true);
  });
  it('every registered icon is a separate original SVG and unknown icons fall back', () => {
    for (const path of Object.values(CONTENT_ICONS))
      expect(readFileSync(`apps/web/public${path}`, 'utf8')).toContain('<svg');
    expect(html(createElement(ContentIcon, { id: 'future' }))).toContain('trait-unknown.svg');
  });
  it.each([undefined, 'f0p4.1', 'f0p6a'] as const)(
    'restores %s automatic combat with the same catalog, trace and next round',
    (catalog) => {
      const config = catalog ? { ...ECONOMY_CONFIG, catalog } : ECONOMY_CONFIG;
      let now = 0;
      const time = { now: () => now };
      const c = new LocalMatchCoordinator(createMatch(42, config), {
        matchId: 'compat',
        time,
        development: true,
      });
      c.start();
      const session = new LocalSession(c.getMatch(), undefined, c);
      const offer =
        c.getMatch().shop.find((o) => o?.definitionId === 'dolea') ??
        c.getMatch().shop.find(Boolean)!;
      session.dispatch({ type: 'buy_unit', offerId: offer.id });
      session.dispatch({
        type: 'move_unit',
        unitId: c.getMatch().units[0]!.id,
        to: { kind: 'board', hex: { q: 0, r: 4 } },
      });
      for (let i = 0; i < 610; i++) {
        now += 50;
        c.pulse();
      }
      const restored = decodeSave(encodeSave(c.exportSave()), time);
      expect(restored.getMatch()).toEqual(c.getMatch());
      expect(restored.exportSave().replay).toEqual(c.exportSave().replay);
      for (let i = 0; i < 1600 && c.getMatch().round < 2; i++) {
        now += 50;
        c.pulse();
        restored.pulse();
      }
      expect(c.getMatch().round).toBe(2);
      expect(restored.getMatch()).toEqual(c.getMatch());
      expect(restored.exportSave().replay).toEqual(c.exportSave().replay);
    },
  );
  it.each([1, 2, 3] as const)(
    'ability requests the existing visual fallback at %s stars without altering events',
    (stars) => {
      const t = runCombat(createAbilityScenario(`ability-${stars}`, 42));
      const start = t.events.find(
        (e) =>
          e.type === 'ability_cast' &&
          e.payload.unitId === 'diagnostic-dolea' &&
          e.payload.stage === 'start',
      )!;
      expect(start).toBeDefined();
      const u = t.snapshots[start.tick]!.units.find((u) => u.id === 'diagnostic-dolea')!;
      const before = JSON.stringify(t.events);
      expect(unitAnimationCue(u, start.tick * 100, t.events).state).toBe('ability');
      expect(resolveAnimation(characterManifest('dolea'), stars, 'ability')).toMatchObject({
        status: 'fallback',
        selected: 'attack',
        selectedStars: stars === 3 ? 2 : stars,
      });
      expect(JSON.stringify(t.events)).toBe(before);
    },
  );
});
