import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { LocalMatchCoordinator, createMatch, runCombat, combatStatsView } from '@tft/game-core';
import { ADVANCED_ECONOMY_CONFIG, createStatsScenario } from '@tft/game-data';
import { ADVANCED_COMBAT_RULES } from '@tft/shared';
import { LocalSession } from './LocalSession';
import { UnitInspector } from './UnitInspector';
import { Shop } from './Shop';
import { encodeSave, decodeSave } from './automaticSave';
import { BoardSession } from '../game/session';
import { CombatPlayback } from '../game/combatPlayback';
import { feedbackMoment } from '../game/combatFeedback';
const setup = () => {
  const session = new LocalSession(createMatch(42, ADVANCED_ECONOMY_CONFIG));
  const offer = session.getMatch().shop.find((o) => o?.definitionId === 'dolea')!;
  session.dispatch({ type: 'buy_unit', offerId: offer.id });
  const unit = session.getMatch().units[0]!;
  session.move(unit.id, { q: 0, r: 4 });
  session.select(unit.id);
  return session;
};
describe('P6B.1 integration without a new HUD surface', () => {
  it('shows AD/AP, effective stats, crit chance and total multiplier in the real contextual inspector', () => {
    const session = setup(),
      input = createStatsScenario('modifiers', 42);
    input.units[0]!.id = session.selected()!.id;
    const t = runCombat(input),
      p = new CombatPlayback(t);
    p.seek(400);
    session.combatFrame = () => p.frame();
    const selected = session.inspection()!,
      live = p.frame().state.units.find((u) => u.id === session.selected()!.id)!;
    expect(selected.profile.stats).toMatchObject(combatStatsView(live, 4));
    expect(selected.profile.stats).toMatchObject({
      attack: 135,
      abilityPower: 110,
      critChanceMilli: 0,
      critMultiplierMilli: 1500,
    });
    const content = renderToStaticMarkup(
      createElement(UnitInspector, { session, view: session.getSnapshot() }),
    );
    for (const label of ['AD', 'AP', 'Prob. crítico', 'Daño crítico', '135', '110', '150%'])
      expect(content).toContain(label);
    p.seek(2400);
    expect(session.inspection()!.profile.stats.attack).toBe(100);
  });
  it('new games retain the same five offers, DOLEA portrait, costs and bench rules', () => {
    const s = setup();
    const shop = renderToStaticMarkup(
      createElement(Shop, { session: new LocalSession(createMatch(42, ADVANCED_ECONOMY_CONFIG)) }),
    );
    expect(shop).toContain('/assets/splash/dolea.webp');
    expect(s.getMatch().shop).toHaveLength(5);
    expect(s.getMatch().config.benchSize).toBe(9);
    expect(s.getMatch().units[0]!.definitionId).toBe('dolea');
    expect(s.getMatch().gold).toBe(8);
  });
  it('roundtrips the advanced automatic save and settles/progresses exactly like the live coordinator', () => {
    let now = 0;
    const time = { now: () => now };
    const c = new LocalMatchCoordinator(createMatch(42, ADVANCED_ECONOMY_CONFIG), {
      time,
      development: true,
      matchId: 'advanced-test',
    });
    c.start();
    const s = new LocalSession(c.getMatch(), undefined, c),
      offer = c.getMatch().shop.find((o) => o?.definitionId === 'dolea')!;
    s.dispatch({ type: 'buy_unit', offerId: offer.id });
    s.move(c.getMatch().units[0]!.id, { q: 0, r: 4 });
    for (let i = 0; i < 610; i++) {
      now += 50;
      c.pulse();
    }
    expect(c.getReplay()!.input.rulesVersion).toBe(ADVANCED_COMBAT_RULES);
    const restored = decodeSave(encodeSave(c.exportSave()), time);
    expect(restored.getMatch()).toEqual(c.getMatch());
    expect(restored.getReplay()).toEqual(c.getReplay());
    for (let i = 0; i < 1600 && c.getMatch().round < 2; i++) {
      now += 50;
      c.pulse();
      restored.pulse();
    }
    expect(c.getMatch().round).toBe(2);
    expect(restored.getMatch()).toEqual(c.getMatch());
    expect(c.settlementIds).toHaveLength(1);
  });
  it('technical Arena loads advanced fixtures, seeks actual critical/buff/expiry events and repeats the same trace', () => {
    const s = new BoardSession();
    s.loadStatsScenario('basic-critical');
    s.startCombat();
    s.seekFeedback('critical');
    expect(s.combatFrame()!.state.rulesVersion).toBe(ADVANCED_COMBAT_RULES);
    expect(
      s.combatFrame()!.recentEvents.some((e) => e.type === 'damage' && e.payload.critical),
    ).toBe(true);
    s.returnToPreparation();
    s.loadStatsScenario('modifiers');
    s.startCombat();
    s.seekFeedback('modifier');
    const f = s.combatFrame()!;
    expect(
      combatStatsView(f.state.units.find((u) => u.id === 'stats-source')!, f.tick).attack,
    ).toBe(135);
    s.seekFeedback('modifier-expiration');
    expect(
      combatStatsView(s.combatFrame()!.state.units.find((u) => u.id === 'stats-source')!).attack,
    ).toBe(100);
    s.startCombat(true);
    s.seekFeedback('modifier');
    expect(s.combatFrame()!.state).toEqual(f.state);
  });
  it('keeps advanced profiles and trait definitions valid when a fixture formation is edited', () => {
    const s = new BoardSession();
    s.loadStatsScenario('speed-stack');
    s.choose('test-k01');
    s.activate({ q: 1, r: 4 });
    s.startCombat();
    expect(s.combatFrame()!.state.rulesVersion).toBe(ADVANCED_COMBAT_RULES);
    expect(s.combatFrame()!.state.units).toHaveLength(3);
    expect(
      s.combatFrame()!.state.units.every((u) => u.profile.stats.abilityPower !== undefined),
    ).toBe(true);
  });
  it('DOLEA passive feedback and old Arena diagnostics remain available', () => {
    const t = runCombat(createStatsScenario('dolea-advanced', 42));
    expect(feedbackMoment(t.events, 'diagnostic-dolea', 'passive')).toBe(75);
    expect(t.events.find((e) => e.type === 'shield_apply')).toMatchObject({
      payload: { shieldAfter: 72 },
    });
    const s = new BoardSession();
    s.loadAbilityScenario('traits-3');
    s.startCombat();
    s.seekFeedback('start');
    expect(s.combatFrame()!.state.rulesVersion).toBe('f0p6a-1');
  });
});
