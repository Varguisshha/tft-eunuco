import { TICK_MS, type CombatReplay, type CombatState, type CombatEventV2 } from '@tft/shared';
export interface PlaybackFrame {
  timeMs: number;
  tick: number;
  state: CombatState;
  recentEvents: CombatEventV2[];
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
  frame(): PlaybackFrame {
    const tick = Math.min(this.replay.result.tick, Math.floor(this.elapsed / TICK_MS));
    return {
      timeMs: this.elapsed,
      tick,
      state: this.replay.snapshots[tick]!,
      recentEvents: this.replay.events.filter(
        (e) => e.tick <= tick && e.tick * TICK_MS > this.elapsed - 700,
      ),
    };
  }
}
