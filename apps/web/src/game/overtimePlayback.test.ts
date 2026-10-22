import { expect, it } from 'vitest';
import { runCombat } from '@tft/game-core';
import { createCombatScenario } from '@tft/game-data';
import { CombatPlayback } from './combatPlayback';
import { BoardSession } from './session';
it('samples overtime once at 300 and freezes its transition and countdown on pause', () => {
  const playback = new CombatPlayback(runCombat(createCombatScenario('timeout', 42)));
  playback.advance(29900);
  expect(playback.frame().overtime).toBe(false);
  playback.advance(100);
  expect(playback.frame()).toMatchObject({
    tick: 300,
    overtime: true,
    remainingTicks: 150,
    overtimeIntro: 1,
  });
  const frame = playback.frame();
  playback.setPaused(true);
  playback.advance(5000);
  expect(playback.frame()).toEqual(frame);
  playback.setPaused(false);
  playback.setSpeed(2);
  playback.advance(200);
  expect(playback.frame()).toMatchObject({ tick: 304, remainingTicks: 146 });
  expect(playback.frame().overtimeIntro).toBeCloseTo(1 / 3);
  playback.advance(100000);
  expect(playback.frame()).toMatchObject({
    tick: 450,
    remainingTicks: 0,
    overtimeIntro: 0,
    overtime: true,
  });
});
it('repeats a fresh timeline without duplicated overtime and clears when returning to preparation', () => {
  const session = new BoardSession();
  session.loadScenario('timeout');
  session.startCombat();
  session.advanceCombat(31000);
  const frame = session.combatFrame();
  expect(frame?.overtime).toBe(true);
  session.startCombat(true);
  expect(session.combatFrame()?.overtime).toBe(false);
  session.advanceCombat(31000);
  expect(session.combatFrame()).toEqual(frame);
  session.returnToPreparation();
  expect(session.combatFrame()).toBeNull();
});
it.each(['overtime', 'timeout', 'mutual'] as const)(
  'has a repeatable technical Arena scenario: %s',
  (scenario) => {
    const input = createCombatScenario(scenario, 42);
    const a = runCombat(input),
      b = runCombat(input);
    expect(a).toEqual(b);
    if (scenario === 'overtime') {
      expect(a.result.outcome).toBe('win');
      expect(a.result.tick).toBeGreaterThanOrEqual(300);
      expect(a.result.tick).toBeLessThan(450);
    }
    if (scenario === 'timeout')
      expect(a.result).toMatchObject({ outcome: 'double_loss', reason: 'timeout', tick: 450 });
    if (scenario === 'mutual')
      expect(a.result).toMatchObject({ outcome: 'double_loss', reason: 'elimination', tick: 3 });
  },
);
it('jumping past the start still displays overtime even after its one-time event leaves recent effects', () => {
  const playback = new CombatPlayback(runCombat(createCombatScenario('timeout', 42)));
  playback.advance(40000);
  expect(playback.frame().overtime).toBe(true);
  expect(playback.frame().recentEvents.some((e) => e.type === 'overtime_start')).toBe(false);
});
