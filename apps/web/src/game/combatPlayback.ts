import {
  OVERTIME_START_TICK,
  TICK_MS,
  type CombatReplay,
  type CombatState,
  type CombatEventV3,
} from '@tft/shared';
import { unitAnimationCue, type VisualCue } from './animationPlayback';
import { FEEDBACK_WINDOW_MS } from './combatFeedback';
export interface PlaybackFrame {
  timeMs: number;
  animationCues: ReadonlyMap<string, VisualCue>;
  tick: number;
  state: CombatState;
  recentEvents: CombatEventV3[];
  feedbackEvents?: CombatEventV3[];
  overtime: boolean;
  remainingTicks: number;
  overtimeIntro: number;
}
/** A sampling clock only. It never simulates combat or computes HP/damage. */
export class CombatPlayback {
  private elapsed = 0;
  private paused = false;
  private speed: 1 | 2 = 1;
  constructor(readonly replay: CombatReplay) {}
  get finished(): boolean {
    return this.elapsed >= this.replay.result.tick * TICK_MS + 600;
  }
  setPaused(paused: boolean): void {
    this.paused = paused;
  }
  setSpeed(speed: 1 | 2): void {
    this.speed = speed;
  }
  advance(deltaMs: number): void {
    if (this.paused || this.finished) return;
    if (!Number.isFinite(deltaMs) || deltaMs < 0)
      throw new RangeError('Playback delta must be finite and nonnegative');
    this.elapsed = Math.min(
      this.replay.result.tick * TICK_MS + 600,
      this.elapsed + deltaMs * this.speed,
    );
  }
  seek(timeMs: number): void {
    if (!Number.isFinite(timeMs) || timeMs < 0) throw new RangeError('Invalid playback position');
    this.elapsed = Math.min(timeMs, this.replay.result.tick * TICK_MS + 600);
  }
  frame(): PlaybackFrame {
    const tick = Math.min(this.replay.result.tick, Math.floor(this.elapsed / TICK_MS));
    return sampleCombatFrame(
      this.replay.snapshots[tick]!,
      this.replay.events,
      this.elapsed,
      this.replay.input.maxTicks,
    );
  }
}

/** Shared sampling for complete player replays and server-released spectator frames. */
export function sampleCombatFrame(
  state: CombatState,
  events: CombatEventV3[],
  timeMs: number,
  maxTicks = 450,
): PlaybackFrame {
  const tick = state.tick;
  return {
    animationCues: new Map(state.units.map((u) => [u.id, unitAnimationCue(u, timeMs, events)])),
    overtime:
      tick >= OVERTIME_START_TICK &&
      events.some((e) => e.type === 'overtime_start' && e.tick <= tick),
    remainingTicks: state.result !== null ? 0 : Math.max(0, maxTicks - tick),
    overtimeIntro: Math.max(0, 1 - (timeMs - OVERTIME_START_TICK * TICK_MS) / 600),
    timeMs: timeMs,
    tick,
    state: state,
    recentEvents: events.filter((e) => e.tick <= tick && e.tick * TICK_MS > timeMs - 700),
    feedbackEvents: events.filter(
      (e) => e.tick <= tick && e.tick * TICK_MS > timeMs - FEEDBACK_WINDOW_MS,
    ),
  };
}
