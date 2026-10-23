import { CLOCK_RULES, type MatchPhase, type PhaseSnapshot } from '@tft/shared';
export interface TimeSource {
  now(): number;
}
/** Monotonic time for a single application lifetime; saved remaining time is rebased on recovery. */
export class MatchClock {
  private phase: PhaseSnapshot;
  private lastNow = 0;
  private logicalOffset = 0;
  constructor(
    private readonly source: TimeSource,
    matchId: string,
    round = 1,
  ) {
    const now = this.now();
    this.phase = {
      rulesVersion: CLOCK_RULES,
      matchId,
      roundId: `${matchId}/round/${round}`,
      phaseId: `${matchId}/phase/0`,
      transitionId: `${matchId}/transition/0`,
      phaseSequence: 0,
      currentPhase: 'not_started',
      phaseStart: now,
      phaseDeadline: now,
      phaseDuration: 0,
      remainingMs: 0,
      clockState: 'ready',
    };
  }
  now(): number {
    const value = this.source.now();
    if (!Number.isFinite(value) || value < 0) throw new Error('Invalid monotonic time');
    this.lastNow = Math.max(this.lastNow, value + this.logicalOffset);
    return this.lastNow;
  }
  snapshot(): PhaseSnapshot {
    return {
      ...this.phase,
      remainingMs:
        this.phase.clockState === 'running'
          ? Math.max(0, this.phase.phaseDeadline - this.now())
          : this.phase.remainingMs,
    };
  }
  enter(phase: MatchPhase, round: number, duration: number): void {
    const now = this.now(),
      sequence = this.phase.phaseSequence + 1;
    this.phase = {
      ...this.phase,
      roundId: `${this.phase.matchId}/round/${round}`,
      phaseId: `${this.phase.matchId}/phase/${sequence}`,
      transitionId: `${this.phase.matchId}/transition/${sequence}`,
      phaseSequence: sequence,
      currentPhase: phase,
      phaseStart: now,
      phaseDeadline: now + duration,
      phaseDuration: duration,
      remainingMs: duration,
      clockState: phase === 'finished' ? 'stopped' : 'running',
    };
  }
  pause(): void {
    this.phase = { ...this.snapshot(), clockState: 'paused' };
  }
  resume(): void {
    if (this.phase.clockState !== 'paused') return;
    this.phase = {
      ...this.phase,
      phaseDeadline: this.now() + this.phase.remainingMs,
      clockState: 'running',
    };
  }
  restore(saved: PhaseSnapshot): void {
    // Rebase to this process while retaining a nonnegative, coherent logical start.
    const elapsed = saved.phaseDuration - saved.remainingMs;
    this.logicalOffset += Math.max(0, elapsed - this.now());
    const now = this.now();
    this.phase = { ...saved, phaseStart: now - elapsed, phaseDeadline: now + saved.remainingMs };
  }
}
