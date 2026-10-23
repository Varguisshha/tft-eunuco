import { useRef } from 'react';
import type { LocalMatchCoordinator } from '@tft/game-core';
import { decodeSave, encodeSave } from './automaticSave';
export function DevelopmentClock({
  coordinator: c,
  onReplace,
}: {
  coordinator: LocalMatchCoordinator;
  onReplace: (c: LocalMatchCoordinator) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const clock = c.getClock();
  return (
    <>
      <button className="button" onClick={() => dialog.current?.showModal()}>
        Depuración
      </button>
      <dialog ref={dialog} className="match-journal clock-debug" aria-label="Depuración del reloj">
        <header>
          <h2>Reloj local · desarrollo</h2>
          <form method="dialog">
            <button className="button">Cerrar depuración</button>
          </form>
        </header>
        <p>
          Guardado de pruebas independiente. Los controles nunca forman parte del puerto de comandos
          online.
        </p>
        <div className="debug-actions">
          <button
            className="button"
            disabled={clock.clockState === 'ready' || clock.clockState === 'stopped'}
            onClick={() => c.debugPause()}
          >
            {clock.clockState === 'paused' ? 'Reanudar reloj' : 'Pausar reloj'}
          </button>
          <button
            className="button"
            disabled={clock.currentPhase === 'finished'}
            onClick={() => c.debugAdvance()}
          >
            Avanzar fase de prueba
          </button>
          <button
            className="button"
            onClick={() =>
              onReplace(decodeSave(encodeSave(c.exportSave()), { now: () => performance.now() }))
            }
          >
            Simular recarga
          </button>
          <button
            className="button"
            disabled={!c.canRepeat}
            onClick={() => onReplace(c.debugRepeat({ now: () => performance.now() }))}
          >
            Repetir ronda desde checkpoint
          </button>
          <label>
            Duraciones de próximas fases
            <select
              aria-label="Duraciones de prueba"
              value={c.durations.preparation === 8000 ? 'short' : 'normal'}
              onChange={(e) =>
                c.debugDurations(
                  e.target.value === 'short' ? 8000 : 30000,
                  e.target.value === 'short' ? 2000 : 5000,
                )
              }
            >
              <option value="normal">Normal · 30 s / 5 s</option>
              <option value="short">Corta · 8 s / 2 s</option>
            </select>
          </label>
        </div>
        <dl>
          <dt>Estado / fase</dt>
          <dd>
            {clock.clockState} / {clock.currentPhase}
          </dd>
          <dt>Phase ID</dt>
          <dd>{clock.phaseId}</dd>
          <dt>Transition ID</dt>
          <dd>{clock.transitionId}</dd>
          <dt>Inicio / deadline / duración (ms)</dt>
          <dd>
            {Math.round(clock.phaseStart)} / {Math.round(clock.phaseDeadline)} /{' '}
            {clock.phaseDuration}
          </dd>
          <dt>Restante / reproducción (ms)</dt>
          <dd>
            {Math.round(clock.remainingMs)} / {Math.round(c.getPlaybackMs())}
          </dd>
          <dt>Liquidaciones</dt>
          <dd>{c.settlementIds.join('\n') || 'Ninguna'}</dd>
          <dt>Recuperada</dt>
          <dd>{c.recoveredFromSave ? 'Sí' : 'No'}</dd>
        </dl>
      </dialog>
    </>
  );
}
