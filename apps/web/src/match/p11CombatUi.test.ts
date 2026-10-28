import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { it, expect, vi } from 'vitest';
import { createP11CReference } from '../development/p11bReference';
import { LocalSession } from './LocalSession';
import { LocalGame } from './LocalGame';
vi.mock('../game/GameCanvas', () => ({ GameCanvas: () => null }));
it('combat UI allows own bench sale and lock, keeps formation disabled and exposes only visible statistics', () => {
  const c = createP11CReference(),
    s = new LocalSession(c.coordinator.getMatch(), undefined, c.coordinator);
  expect(s.getMatch().phase).toBe('combat');
  const bench = s.getMatch().units.find((u) => u.location.kind === 'bench')!,
    board = s.getMatch().units.find((u) => u.location.kind === 'board')!;
  expect(bench).toBeDefined();
  expect(s.canSellUnit(bench.id)).toBe(true);
  expect(s.canSellUnit(board.id)).toBe(false);
  expect(s.canLockShop).toBe(true);
  expect(s.editable).toBe(false);
  s.select(bench.id);
  const html = renderToStaticMarkup(
    createElement(LocalGame, { session: s, onNew: () => {}, onReplace: () => {} }),
  );
  expect(html).toContain('Estadísticas de combate');
  expect(html).toContain('Vender Peibol');
  expect(html).toContain('item-vertical');
  const stats = s.combatStatistics()!,
    replay = c.coordinator.getReplay()!;
  expect(stats.observedTick).toBe(Math.min(45, Math.floor(replay.result.tick / 2)));
  expect(stats.complete).toBe(false);
  expect(stats.units.reduce((n, u) => n + u.received, 0)).toBe(
    replay.events
      .filter((e) => e.tick <= stats.observedTick && e.type === 'damage')
      .reduce((n, e) => n + (e.type === 'damage' ? e.payload.amount : 0), 0),
  );
  expect(s.combatStatistics()).toBe(stats);
  c.dispose();
});
