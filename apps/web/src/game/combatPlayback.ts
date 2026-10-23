import {
  OVERTIME_START_TICK,
  TICK_MS,
  type CombatReplay,
  type CombatState,
  type CombatEventV3,
} from '@tft/shared';
import { unitAnimationCue, type VisualCue } from './animationPlayback';
export interface PlaybackFrame {
  timeMs: number;
  animationCues: ReadonlyMap<string, VisualCue>;
  tick: number;
  state: CombatState;
  recentEvents: CombatEventV3[];
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
    return {
      animationCues: new Map(
        this.replay.snapshots[tick]!.units.map((u) => [
          u.id,
          unitAnimationCue(u, this.elapsed, this.replay.events),
        ]),
      ),
      overtime:
        tick >= OVERTIME_START_TICK &&
        this.replay.events.some((e) => e.type === 'overtime_start' && e.tick <= tick),
      remainingTicks:
        this.replay.result.tick <= tick ? 0 : Math.max(0, this.replay.input.maxTicks - tick),
      overtimeIntro: Math.max(0, 1 - (this.elapsed - OVERTIME_START_TICK * TICK_MS) / 600),
      timeMs: this.elapsed,
      tick,
      state: this.replay.snapshots[tick]!,
      recentEvents: this.replay.events.filter(
        (e) => e.tick <= tick && e.tick * TICK_MS > this.elapsed - 700,
      ),
    };
  }
}
