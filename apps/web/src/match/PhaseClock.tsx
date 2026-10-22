import type { MatchState } from '@tft/shared';
import type { PlaybackFrame } from '../game/combatPlayback';

/** Presentation contract for a future authoritative clock. No timers or phase transitions here. */
export interface PhaseClockProps {
  phase: MatchState['phase'];
  frame: PlaybackFrame | null;
  paused: boolean;
  authoritativeRemainingMs?: number;
}
export function PhaseClock({ phase, frame, paused, authoritativeRemainingMs }: PhaseClockProps) {
  const fighting = phase === 'combat';
  const overtime = fighting && frame?.overtime;
  const seconds =
    authoritativeRemainingMs !== undefined
      ? Math.max(0, authoritativeRemainingMs / 1000)
      : fighting && frame
        ? frame.remainingTicks / 10
        : null;
  return (
    <div className={`phase-clock ${overtime ? 'is-overtime' : ''}`} aria-label="Estado de ronda">
      <span className="phase-symbol" aria-hidden="true">
        {overtime ? '»' : fighting ? '⚔' : '◇'}
      </span>
      <div>
        <strong>
          {overtime
            ? 'OVERTIME'
            : fighting
              ? 'Combate'
              : phase === 'preparation'
                ? 'Preparación'
                : 'Resolución'}
        </strong>
        <small>
          {fighting ? (paused ? 'Reproducción en pausa' : 'Combate en curso') : 'Avance manual'}
        </small>
      </div>
      <span className="phase-time" aria-label="Tiempo de fase">
        {seconds === null ? '—' : `${seconds.toFixed(1)}s`}
      </span>
    </div>
  );
}
