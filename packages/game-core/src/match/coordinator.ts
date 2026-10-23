import {
  AutomaticSaveSchema,
  CombatBatchSchema,
  CLOCK_RULES,
  PREPARATION_MS,
  RESOLUTION_MS,
  VISUAL_TAIL_MS,
  type AutomaticSave,
  type CombatReplay,
  type MatchCoordinator,
  type MatchState,
  type TimedCommand,
} from '@tft/shared';
import { applyMatchAction, commandFor, RoundAuthority, type MatchError } from './engine';
import { validateMatchState } from './invariants';
import { MatchClock, type TimeSource } from './clock';
export interface CoordinatorOptions {
  matchId: string;
  time: TimeSource;
  development?: boolean;
}
/** Owns phase changes and settlement. Neither Phaser nor React can advance a phase by command. */
export class LocalMatchCoordinator implements MatchCoordinator {
  private state: MatchState;
  private rejection: MatchError | null = null;
  get lastRejection() {
    return this.rejection;
  }
  private clock: MatchClock;
  private authority = new RoundAuthority();
  private replay: CombatReplay | null = null;
  private playbackMs = 0;
  private lastPulse: number;
  private settlements: string[] = [];
  private listeners = new Set<() => void>();
  private preparationMs = PREPARATION_MS;
  private resolutionMs = RESOLUTION_MS;
  private recovered = false;
  private checkpoint: AutomaticSave | null = null;
  readonly development: boolean;
  constructor(state: MatchState, options: CoordinatorOptions) {
    this.state = validateMatchState(state);
    this.development = options.development ?? false;
    this.clock = new MatchClock(options.time, options.matchId, state.round);
    this.lastPulse = this.clock.now();
  }
  getMatch = () => this.state;
  getClock = () => this.clock.snapshot();
  getReplay = () => this.replay;
  getPlaybackMs = () => this.playbackMs;
  get durations() {
    return { preparation: this.preparationMs, resolution: this.resolutionMs };
  }
  get recoveredFromSave() {
    return this.recovered;
  }
  get settlementIds(): readonly string[] {
    return this.settlements;
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit() {
    this.listeners.forEach((l) => l());
  }
  start(): boolean {
    if (this.getClock().currentPhase !== 'not_started') return false;
    this.clock.enter('preparation', this.state.round, this.preparationMs);
    this.lastPulse = this.clock.now();
    this.emit();
    return true;
  }
  submit(intent: TimedCommand): boolean {
    // Deadline checked at receipt even when no scheduler/render has run since the deadline.
    this.rejection = null;
    const before = this.getClock();
    this.pulse();
    const current = this.getClock();
    if (
      intent.matchId !== current.matchId ||
      intent.phaseId !== current.phaseId ||
      intent.expectedRevision !== this.state.revision ||
      current.currentPhase !== 'preparation' ||
      current.clockState !== 'running' ||
      before.remainingMs <= 0 ||
      current.remainingMs <= 0 ||
      ['start_combat', 'start_combat_auto', 'resolve_round', 'next_round'].includes(
        intent.command.type,
      )
    ) {
      this.rejection = 'wrong-phase';
      return false;
    }
    const outcome = applyMatchAction(this.state, commandFor(this.state, intent.command));
    if (!outcome.ok) {
      this.rejection = outcome.error;
      return false;
    }
    this.state = outcome.state;
    this.emit();
    return true;
  }
  pulse(): void {
    const now = this.clock.now(),
      elapsed = now - this.lastPulse;
    this.lastPulse = now;
    const phase = this.getClock();
    if (phase.clockState !== 'running') return;
    if (phase.currentPhase === 'preparation' && phase.remainingMs === 0) {
      this.checkpoint = this.exportSave();
      const started = this.authority.begin(this.state);
      this.state = started.state;
      this.replay = started.replay;
      this.playbackMs = 0;
      this.clock.enter('combat', this.state.round, 45_000);
      this.lastPulse = this.clock.now();
    } else if (phase.currentPhase === 'combat') {
      // Visual time: bounded gaps prevent a suspended tab from skipping the last death/impact.
      const end = this.replay!.result.tick * 100 + VISUAL_TAIL_MS;
      this.playbackMs = Math.min(end, this.playbackMs + Math.min(elapsed, 100));
      if (this.playbackMs >= end) {
        const settlementId = `${phase.roundId}/settlement`;
        if (this.settlements.includes(settlementId)) throw new Error('Repeated settlement');
        const outcome = this.authority.settle(this.state);
        if (!outcome.ok) throw new Error(outcome.error);
        this.state = outcome.state;
        this.settlements.push(settlementId);
        this.clock.enter(
          this.state.health.south === 0 ? 'finished' : 'resolution',
          this.state.round,
          this.state.health.south === 0 ? 0 : this.resolutionMs,
        );
      }
    } else if (phase.currentPhase === 'resolution' && phase.remainingMs === 0) {
      const outcome = applyMatchAction(
        this.state,
        commandFor(this.state, { type: 'next_round', round: this.state.round }),
      );
      if (!outcome.ok) throw new Error(outcome.error);
      this.state = outcome.state;
      this.replay = null;
      this.playbackMs = 0;
      this.clock.enter('preparation', this.state.round, this.preparationMs);
    }
    this.emit();
  }
  exportSave(): AutomaticSave {
    return {
      saveVersion: 1,
      rulesVersion: CLOCK_RULES,
      match: this.state,
      clock: this.getClock(),
      preparationMs: this.preparationMs,
      resolutionMs: this.resolutionMs,
      development: this.development,
      recovered: this.recovered,
      playbackMs: this.playbackMs,
      settlements: [...this.settlements],
      replay: this.replay,
    };
  }
  static restore(value: unknown, time: TimeSource): LocalMatchCoordinator {
    const save = AutomaticSaveSchema.parse(value);
    const state = validateMatchState(save.match);
    const phase = save.clock.currentPhase;
    if (
      save.clock.roundId !== `${save.clock.matchId}/round/${state.round}` ||
      save.clock.phaseId !== `${save.clock.matchId}/phase/${save.clock.phaseSequence}` ||
      save.clock.transitionId !== `${save.clock.matchId}/transition/${save.clock.phaseSequence}` ||
      save.clock.remainingMs > save.clock.phaseDuration ||
      save.clock.phaseDuration !==
        (phase === 'preparation'
          ? save.preparationMs
          : phase === 'resolution'
            ? save.resolutionMs
            : phase === 'combat'
              ? 45000
              : 0) ||
      (phase === 'not_started'
        ? save.clock.clockState !== 'ready'
        : phase === 'finished'
          ? save.clock.clockState !== 'stopped'
          : !['running', 'paused'].includes(save.clock.clockState)) ||
      (phase === 'not_started'
        ? state.phase !== 'preparation' || state.history.length !== 0
        : phase === 'finished'
          ? !['resolution', 'preparation'].includes(state.phase) || state.health.south !== 0
          : state.phase !== phase) ||
      (phase === 'resolution' && state.health.south === 0) ||
      (!save.development &&
        (save.preparationMs !== PREPARATION_MS ||
          save.resolutionMs !== RESOLUTION_MS ||
          save.clock.clockState === 'paused'))
    )
      throw new Error('Inconsistent clock');
    const paidRounds = state.healthLedger.length / 2;
    if (
      save.settlements.length !== paidRounds ||
      save.settlements.some((id, i) => id !== `${save.clock.matchId}/round/${i + 1}/settlement`)
    )
      throw new Error('Invalid settlements');
    if (state.combat) {
      const replay = save.replay;
      if (
        !replay ||
        JSON.stringify(replay.input) !== JSON.stringify(state.combat.input) ||
        replay.snapshots.length !== replay.result.tick + 1 ||
        replay.snapshots.some((s, i) => s.tick !== i) ||
        JSON.stringify(replay.snapshots.at(-1)!.result) !== JSON.stringify(replay.result) ||
        replay.events.filter((e) => e.type === 'combat_end').length !== 1 ||
        !replay.events.some(
          (e) =>
            e.type === 'combat_end' &&
            e.tick === replay.result.tick &&
            JSON.stringify(e.payload) === JSON.stringify(replay.result),
        ) ||
        replay.events.some((e, i) => i > 0 && e.tick < replay.events[i - 1]!.tick) ||
        save.playbackMs > replay.result.tick * 100 + VISUAL_TAIL_MS ||
        (phase !== 'combat' &&
          (save.playbackMs !== replay.result.tick * 100 + VISUAL_TAIL_MS ||
            JSON.stringify(state.combat.result) !== JSON.stringify(replay.result)))
      )
        throw new Error('Invalid saved replay');
      CombatBatchSchema.parse({
        protocolVersion: replay.input.protocolVersion,
        rulesVersion: replay.input.rulesVersion,
        fromTick: 0,
        toTick: replay.result.tick,
        events: replay.events,
        snapshots: replay.snapshots,
      });
    } else if (save.replay || save.playbackMs) throw new Error('Unexpected replay');
    const instance = new LocalMatchCoordinator(state, {
      matchId: save.clock.matchId,
      time,
      development: save.development,
    });
    instance.clock.restore(save.clock);
    instance.lastPulse = instance.clock.now();
    instance.replay = save.replay;
    instance.authority = new RoundAuthority(save.replay);
    instance.playbackMs = save.playbackMs;
    instance.preparationMs = save.preparationMs;
    instance.resolutionMs = save.resolutionMs;
    instance.settlements = save.settlements;
    instance.recovered = true;
    return instance;
  }
  /** Explicit one-time migration: caller validates historical command replay first. */
  static migrate(
    state: MatchState,
    replay: CombatReplay | null,
    options: CoordinatorOptions,
  ): LocalMatchCoordinator {
    const c = new LocalMatchCoordinator(state, options);
    c.replay = replay;
    c.authority = new RoundAuthority(replay);
    c.settlements = Array.from(
      { length: state.healthLedger.length / 2 },
      (_, i) => `${options.matchId}/round/${i + 1}/settlement`,
    );
    c.playbackMs =
      state.phase === 'resolution' && replay ? replay.result.tick * 100 + VISUAL_TAIL_MS : 0;
    const finished = state.health.south === 0 && state.phase !== 'combat';
    c.clock.enter(
      finished ? 'finished' : state.phase,
      state.round,
      finished
        ? 0
        : state.phase === 'preparation'
          ? PREPARATION_MS
          : state.phase === 'combat'
            ? 45_000
            : RESOLUTION_MS,
    );
    c.recovered = true;
    return c;
  }
  private requireDevelopment() {
    if (!this.development) throw new Error('Development controls disabled');
  }
  debugPause(): void {
    this.requireDevelopment();
    this.pulse();
    const state = this.getClock().clockState;
    if (state === 'running') this.clock.pause();
    else if (state === 'paused') this.clock.resume();
    this.lastPulse = this.clock.now();
    this.emit();
  }
  debugDurations(preparation: number, resolution: number): void {
    this.requireDevelopment();
    if (
      ![preparation, resolution].every((n) => Number.isInteger(n) && n >= 100) ||
      preparation > PREPARATION_MS ||
      resolution > RESOLUTION_MS
    )
      throw new Error('Invalid durations');
    this.preparationMs = preparation;
    this.resolutionMs = resolution;
    this.emit();
  }
  debugAdvance(): void {
    this.requireDevelopment();
    const phase = this.getClock();
    if (phase.currentPhase === 'not_started') {
      this.start();
      return;
    }
    if (phase.currentPhase === 'combat') {
      this.playbackMs = this.replay!.result.tick * 100 + VISUAL_TAIL_MS;
      if (phase.clockState === 'paused') this.clock.resume();
    } else if (phase.currentPhase === 'preparation' || phase.currentPhase === 'resolution') {
      this.clock.restore({ ...phase, remainingMs: 0, clockState: 'running' });
    }
    this.pulse();
  }
  /** Isolated branch, never writes into the normal save; replays identical formation and RNG. */
  debugRepeat(time: TimeSource): LocalMatchCoordinator {
    this.requireDevelopment();
    if (!this.checkpoint) throw new Error('No round checkpoint in this session');
    const repeated = LocalMatchCoordinator.restore(this.checkpoint, time);
    repeated.clock.restore({
      ...repeated.getClock(),
      remainingMs: repeated.preparationMs,
      clockState: 'running',
    });
    return repeated;
  }
  get canRepeat() {
    return this.checkpoint !== null;
  }
}
