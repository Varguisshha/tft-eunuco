import type { MatchPhase } from '@tft/shared';
import type { PlaybackFrame } from '../game/combatPlayback';

/** Presentation contract for a future authoritative clock. No timers or phase transitions here. */
export interface PhaseClockProps {
  phase: MatchPhase;
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
    <div
      className={`phase-clock ${overtime ? 'is-overtime' : phase === 'preparation' && seconds !== null && seconds <= 5 ? 'is-urgent' : ''}`}
      aria-label="Estado de ronda"
    >
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
                : phase === 'not_started'
                  ? 'Partida preparada'
                  : phase === 'finished'
                    ? 'Partida finalizada'
                    : 'Resolución'}
        </strong>
        <small>
          {paused
            ? 'Pausa de desarrollo'
            : fighting
              ? 'Combate en curso'
              : phase === 'not_started'
                ? 'Pulsa Iniciar partida'
                : phase === 'finished'
                  ? 'Vargas eliminado'
                  : phase === 'resolution'
                    ? 'Siguiente ronda automática'
                    : seconds !== null && seconds <= 5
                      ? 'El combate está próximo'
                      : 'Prepara tu formación'}
        </small>
      </div>
      <span className="phase-time" aria-label="Tiempo de fase">
        {seconds === null || phase === 'not_started' || phase === 'finished'
          ? '—'
          : `${seconds.toFixed(1)}s`}
      </span>
    </div>
  );
}
