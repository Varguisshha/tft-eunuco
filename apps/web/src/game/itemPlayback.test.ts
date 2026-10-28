import { writeFileSync } from 'node:fs';
import { it, expect } from 'vitest';
import { runCombat } from '@tft/game-core';
import {
  battle,
  stressBattle,
} from '../../../../packages/game-core/src/items/execution.test-support';
import { CombatPlayback, sampleCombatFrame } from './combatPlayback';
it.each([1, 2] as const)(
  'item replay at %ix has identical states at 30/60/144 FPS and spectator sampling',
  (speed) => {
    const replay = runCombat(
      battle(
        ['item-forge-attack_speed--magic_resist', 'item-forge-attack_speed--critical'],
        'jaramillo',
      ),
    );
    const original = JSON.stringify(replay);
    const start = performance.now();
    for (const fps of [30, 60, 144]) {
      const playback = new CombatPlayback(replay);
      playback.setSpeed(speed);
      let now = 0;
      while (now < 1000) {
        const delta = Math.min(1000 - now, 1000 / fps);
        playback.advance(delta);
        now += delta;
      }
      const frame = playback.frame();
      expect(frame.state).toEqual(replay.snapshots[Math.floor((1000 * speed) / 100)]);
      const spectator = sampleCombatFrame(
        frame.state,
        replay.events,
        frame.timeMs,
        replay.input.maxTicks,
      );
      expect(spectator).toEqual(frame);
      for (let t = 0; t < replay.result.tick * 100; t += 100) {
        playback.seek(t);
        expect(playback.frame().state).toEqual(replay.snapshots[t / 100]);
      }
    }
    expect(JSON.stringify(replay)).toBe(original);
    expect(performance.now() - start).toBeLessThan(1500);
  },
);

it('full equipped arena samples within a frame budget at both speeds without changing authoritative results', () => {
  const setupStart = performance.now();
  const replay = runCombat(stressBattle());
  const setupMs = performance.now() - setupStart;
  const timings: number[] = [];
  for (const speed of [1, 2] as const) {
    const playback = new CombatPlayback(replay);
    playback.setSpeed(speed);
    for (let i = 0; i < 120; i++) {
      playback.seek(i * 350);
      const start = performance.now();
      playback.advance(1000 / 60);
      const frame = playback.frame();
      timings.push(performance.now() - start);
      expect(frame.state).toBe(replay.snapshots[frame.tick]);
    }
  }
  timings.sort((a, b) => a - b);
  const metrics = {
    setupMs,
    samples: timings.length,
    p95ms: timings[Math.floor(timings.length * 0.95)],
    p99ms: timings[Math.floor(timings.length * 0.99)],
  };
  if (process.env.P8C_METRICS === '1')
    writeFileSync('/tmp/p8c-playback.json', JSON.stringify(metrics, null, 2));
  expect(metrics.p95ms).toBeLessThan(16.7);
});
