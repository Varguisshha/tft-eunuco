import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMatch, LocalMatchCoordinator, offsetToAxial } from '@tft/game-core';
import { CURRENT_ECONOMY_CONFIG } from '@tft/game-data';
import { LocalSession } from './LocalSession';
import { LocalGame } from './LocalGame';
import { decodeSave, encodeSave } from './automaticSave';
import { BoardSession } from '../game/session';
vi.mock('../game/GameCanvas', () => ({ GameCanvas: () => null }));
function setup() {
  let now = 1000;
  const time = { now: () => now };
  const coordinator = new LocalMatchCoordinator(createMatch(360, CURRENT_ECONOMY_CONFIG), {
    matchId: 'hud-test',
    time,
  });
  const session = new LocalSession(coordinator.getMatch(), undefined, coordinator);
  const render = () =>
    renderToStaticMarkup(
      createElement(LocalGame, { session, onNew: () => {}, onReplace: () => {} }),
    );
  const buy = (slot: number) =>
    session.dispatch({ type: 'buy_unit', offerId: session.getMatch().shop[slot]!.id });
  const tick = (ms: number) => {
    for (let i = 0; i < ms; i += 50) {
      now += 50;
      coordinator.pulse();
    }
  };
  return { coordinator, session, render, buy, tick, time };
}
const buttons = (html: string) =>
  [...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].map((m) => m[0]);
const button = (html: string, text: string) => buttons(html).find((b) => b.includes(text))!;
describe('Game HUD V2 with real local authority', () => {
  it('starts closed with five actual offers, nine slots, real economy and gated actions', () => {
    const { render, session } = setup();
    const html = render();
    expect(session.inspection()).toBeNull();
    expect(html).not.toContain('local-inspector');
    expect(html.match(/class="shop-offer cost-/g)).toHaveLength(5);
    expect(html.match(/data-bench-slot=/g)).toHaveLength(9);
    expect(html).toContain('10<small>');
    expect(html).toContain('Interés previsto <b>+1');
    expect(button(html, 'Comprar DOLEA, oferta 2')).toContain('disabled');
    expect(button(html, 'Comprar 4 XP')).toContain('disabled');
    expect(html).toContain('/assets/splash/dolea.webp');
  });
  it('selects and changes own/rival inspection without mutating game state', () => {
    const { coordinator, session, buy, render } = setup();
    coordinator.start();
    buy(1);
    const own = session.getMatch().units[0]!;
    const before = JSON.stringify(session.getMatch());
    session.select(own.id);
    expect(session.inspection()?.profile.stats.maxHp).toBe(600);
    expect(render()).toContain('id="inspected-name">DOLEA');
    const rival = session.getSnapshot().board.units.find((u) => u.owner === 'north')!;
    session.select(rival.id);
    expect(session.inspection()?.side).toBe('north');
    expect(render()).not.toContain('sell-button');
    session.pointerActivate(offsetToAxial(6, 7));
    expect(session.inspection()).toBeNull();
    expect(render()).not.toContain('local-inspector');
    expect(JSON.stringify(session.getMatch())).toBe(before);
  });
  it('separates pointer deselection from keyboard placement and supports swap/invalid drops', () => {
    const { coordinator, session, buy } = setup();
    coordinator.start();
    buy(1);
    buy(0);
    const [dolea, tank] = session.getMatch().units;
    session.select(dolea!.id);
    session.pointerActivate(offsetToAxial(2, 4));
    expect(session.getMatch().units[0]!.location.kind).toBe('bench');
    session.select(dolea!.id);
    session.activate(offsetToAxial(2, 4));
    expect(session.getMatch().units[0]!.location).toEqual({
      kind: 'board',
      hex: offsetToAxial(2, 4),
    });
    expect(session.move(dolea!.id, offsetToAxial(2, 0))).toBe(false);
    expect(session.getMatch().units[0]!.location).toEqual({
      kind: 'board',
      hex: offsetToAxial(2, 4),
    });
    expect(session.bench(1, dolea!.id)).toBe(true);
    expect(session.getMatch().units.find((u) => u.id === tank!.id)!.location.kind).toBe('board');
  });
  it('updates DOLEA fusion portrait, stars and scaled stats using the existing pipeline', () => {
    const { coordinator, session, buy, render } = setup();
    coordinator.start();
    buy(1);
    buy(3);
    buy(4);
    expect(session.inspection()?.stars).toBe(2);
    expect(session.inspection()?.profile.stats.maxHp).toBe(1080);
    expect(session.inspection()?.profile.stats.attack).toBe(72);
    expect(render()).toContain('/sprites/dolea/star2/attack-portrait.png');
    const id = session.inspection()!.id;
    expect(session.dispatch({ type: 'sell_unit', unitId: id })).toBe(true);
    expect(session.inspection()).toBeNull();
    expect(session.getMatch().gold).toBe(10);
  });
  it('exposes lock state and enforces affordability through the authority', () => {
    const { coordinator, session, buy, render } = setup();
    coordinator.start();
    session.dispatch({ type: 'lock_shop', locked: true });
    expect(button(render(), 'Desbloquear tienda')).toContain('aria-pressed="true"');
    buy(1);
    buy(3);
    buy(4);
    session.dispatch({ type: 'buy_xp' });
    expect(session.getMatch().gold).toBe(0);
    expect(button(render(), 'Renovar')).toContain('disabled');
    expect(button(render(), 'Comprar K-01, oferta 1')).toContain('disabled');
    expect(render()).toContain('oro');
  });
  it('inspects both sides in combat and preserves five offers/nine slots across automatic phases', () => {
    const { coordinator, session, buy, render, tick } = setup();
    coordinator.start();
    buy(1);
    const id = session.getMatch().units[0]!.id;
    session.move(id, offsetToAxial(2, 4));
    tick(30000);
    expect(coordinator.getClock().currentPhase).toBe('combat');
    for (const unit of session.combatFrame()!.state.units) {
      const before = JSON.stringify(session.getMatch());
      session.select(unit.id);
      expect(session.inspection()?.hp).toBe(unit.hp);
      expect(session.inspection()?.mana).toBe(unit.mana);
      expect(JSON.stringify(session.getMatch())).toBe(before);
    }
    session.select(id);
    expect(button(render(), 'Vender DOLEA')).toContain('disabled');
    expect(session.move(id, offsetToAxial(3, 4))).toBe(false);
    tick(46000);
    expect(session.getMatch().round).toBeGreaterThanOrEqual(2);
    expect(render().match(/class="shop-offer cost-/g)).toHaveLength(5);
    expect(render().match(/data-bench-slot=/g)).toHaveLength(9);
  });
  it('does not serialize selection or alter saves; recovery keeps state, clock and economy', () => {
    const { coordinator, session, buy, tick, time } = setup();
    coordinator.start();
    buy(1);
    session.move(session.getMatch().units[0]!.id, offsetToAxial(2, 4));
    tick(30500);
    const before = encodeSave(coordinator.exportSave());
    session.select(session.getSnapshot().board.units.find((u) => u.owner === 'north')!.id);
    session.cancel();
    expect(encodeSave(coordinator.exportSave())).toBe(before);
    const recovered = decodeSave(before, time);
    const restored = new LocalSession(recovered.getMatch(), undefined, recovered);
    expect(restored.inspection()).toBeNull();
    expect(restored.getMatch()).toEqual(session.getMatch());
    expect(recovered.getClock().remainingMs).toBe(coordinator.getClock().remainingMs);
  });
  it('provides keyboard inspection of rivals before and during combat without moving units', () => {
    const { coordinator, session, buy, tick } = setup();
    coordinator.start();
    buy(1);
    session.move(session.getMatch().units[0]!.id, offsetToAxial(2, 4));
    const rival = session.getSnapshot().board.units.find((u) => u.owner === 'north')!;
    const before = session.getMatch();
    session.activate(rival.position);
    expect(session.inspection()?.side).toBe('north');
    expect(session.getMatch()).toBe(before);
    tick(30100);
    const live = session.combatFrame()!.state.units.find((u) => u.owner === 'north')!;
    const combat = session.getMatch();
    session.activate(live.position);
    expect(session.inspection()?.id).toBe(live.id);
    expect(session.getMatch()).toBe(combat);
  });
  it('leaves the technical Arena click-to-place port intact', () => {
    const arena = new BoardSession();
    expect('pointerActivate' in arena).toBe(false);
    const unit = arena.getSnapshot().board.units.find((u) => u.owner === 'south')!;
    arena.select(unit.id);
    arena.activate(offsetToAxial(6, 7));
    expect(arena.getSnapshot().board.units.find((u) => u.id === unit.id)!.position).toEqual(
      offsetToAxial(6, 7),
    );
  });
});
