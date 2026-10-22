import { useState } from 'react';
import type { BoardSession, SessionSnapshot } from './session';
export function CombatControls({
  session,
  combat,
}: {
  session: BoardSession;
  combat: SessionSnapshot['combat'];
}) {
  const [seedText, setSeedText] = useState(String(combat.seed));
  const preparing = combat.mode === 'preparation';
  const seed = Number(seedText);
  const validSeed =
    seedText.trim() !== '' && Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff;
  return (
    <section className="combat-controls" aria-label="Controles de combate">
      <div className="combat-actions">
        <button
          className="button"
          onClick={() => {
            session.loadDuel();
            session.setSeed(validSeed ? seed : 42);
          }}
          disabled={!preparing}
        >
          Cargar duelo 4 × 4
        </button>
        {preparing ? (
          <button
            className="button combat-primary"
            disabled={!validSeed}
            onClick={() => {
              session.setSeed(seed);
              session.startCombat();
            }}
          >
            Iniciar combate
          </button>
        ) : (
          <>
            <button
              className="button combat-primary"
              disabled={combat.mode === 'finished'}
              onClick={() => session.pauseCombat()}
            >
              {combat.mode === 'paused' ? 'Reanudar' : 'Pausar'}
            </button>
            <button className="button" onClick={() => session.startCombat(true)}>
              Repetir semilla
            </button>
            <button className="button quiet" onClick={() => session.returnToPreparation()}>
              Volver a preparación
            </button>
          </>
        )}
      </div>
      <div className="combat-clock">
        <label>
          Semilla{' '}
          <input
            aria-label="Semilla de combate"
            type="text"
            inputMode="numeric"
            value={preparing ? seedText : String(combat.seed)}
            disabled={!preparing}
            onChange={(e) => setSeedText(e.target.value)}
            aria-invalid={!validSeed}
          />
        </label>
        <span className="tick-readout">
          Tick <strong>{combat.tick.toString().padStart(3, '0')}</strong> / 300
        </span>
        <div className="playback-speed" aria-label="Velocidad de reproducción">
          <button aria-pressed={combat.speed === 1} onClick={() => session.setCombatSpeed(1)}>
            ×1
          </button>
          <button aria-pressed={combat.speed === 2} onClick={() => session.setCombatSpeed(2)}>
            ×2
          </button>
        </div>
        <span className={`combat-phase ${combat.mode}`}>
          {combat.mode === 'preparation'
            ? 'Preparación'
            : combat.mode === 'paused'
              ? 'En pausa'
              : combat.mode === 'finished'
                ? 'Finalizado'
                : 'Combatiendo'}
        </span>
      </div>
      {!validSeed && preparing && (
        <p className="seed-error" role="alert">
          Introduce una semilla entera entre 0 y 4294967295.
        </p>
      )}
      {combat.result && (
        <div className="combat-result" role="status">
          {combat.result.winner === 'south'
            ? 'Victoria jade · Derrota ámbar'
            : combat.result.winner === 'north'
              ? 'Victoria ámbar · Derrota jade'
              : 'Empate'}
          <span>
            {combat.result.reason === 'timeout'
              ? 'Límite temporal'
              : combat.result.reason === 'empty'
                ? 'Tablero vacío'
                : 'Eliminación'}{' '}
            · Tick {combat.result.tick} · Semilla {combat.seed}
          </span>
        </div>
      )}
    </section>
  );
}
