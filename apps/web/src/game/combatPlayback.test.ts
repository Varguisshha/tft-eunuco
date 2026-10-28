import { expect, it } from 'vitest';
import { runCombat } from '@tft/game-core';
import { createCombatInput } from '@tft/game-data';
import { BoardSession } from './session';
import { CombatPlayback } from './combatPlayback';
const replay = () => {
  const session = new BoardSession();
  session.loadDuel();
  return runCombat(createCombatInput(session.getSnapshot().board, 42));
};
it('samples the same authoritative frame regardless of rendering FPS', () => {
  const data = replay();
  const a = new CombatPlayback(data),
    b = new CombatPlayback(data);
  for (let i = 0; i < 20; i++) a.advance(50);
  b.advance(1000);
  expect(a.frame()).toEqual(b.frame());
  expect(a.frame().tick).toBe(10);
});
it('pauses all visual time, resumes, doubles speed and clamps at the end', () => {
  const player = new CombatPlayback(replay());
  player.advance(250);
  const before = player.frame();
  player.setPaused(true);
  player.advance(2000);
  expect(player.frame()).toEqual(before);
  player.setPaused(false);
  player.setSpeed(2);
  player.advance(125);
  expect(player.frame().tick).toBe(5);
  player.advance(100000);
  expect(player.finished).toBe(true);
  const end = player.frame();
  player.advance(1);
  expect(player.frame()).toEqual(end);
});
it('keeps all simultaneous events when jumping over multiple visual frames', () => {
  const data = replay();
  const player = new CombatPlayback(data);
  player.advance(1000);
  expect(player.frame().recentEvents).toEqual(
    data.events.filter((e) => e.tick <= 10 && e.tick > 3),
  );
});
it('protects deployment during combat and restores the original formation', () => {
  const session = new BoardSession();
  session.loadDuel();
  const board = JSON.stringify(session.getSnapshot().board);
  session.startCombat();
  expect(session.move('demo-0', { q: 3, r: 7 })).toBe(false);
  session.choose('test-m04');
  session.activate({ q: 3, r: 7 });
  expect(JSON.stringify(session.getSnapshot().board)).toBe(board);
  session.advanceCombat(500);
  session.pauseCombat();
  const tick = session.getSnapshot().combat.tick;
  session.advanceCombat(500);
  expect(session.getSnapshot().combat.tick).toBe(tick);
  session.returnToPreparation();
  expect(session.editable).toBe(true);
  expect(JSON.stringify(session.getSnapshot().board)).toBe(board);
});
it('replays the saved setup and seed exactly, and can restore the F0-P1 arena', () => {
  const session = new BoardSession();
  session.loadDuel();
  session.setSeed(7);
  session.startCombat();
  session.advanceCombat(900);
  const frame = JSON.stringify(session.combatFrame());
  session.startCombat(true);
  session.advanceCombat(900);
  expect(JSON.stringify(session.combatFrame())).toBe(frame);
  session.reset();
  expect(session.getSnapshot().board.units).toHaveLength(4);
  expect(session.combatFrame()).toBeNull();
});
