import { MECHANICS_SCENARIOS, VARGAS_SCENARIOS } from '@tft/game-data';
import type { AbilityScenario } from '@tft/game-data';
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
        <label className="arena-scenario">
          DOLEA
          <select
            aria-label="Duelo de DOLEA"
            value=""
            disabled={!preparing}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (n >= 1 && n <= 3) session.loadCharacterDuel(n as 1 | 2 | 3);
              else if (n === 4) session.loadCharacterDuel(1, true);
              else if (n === 5) session.loadCharacterDuel(1, 'death');
            }}
          >
            <option value="">Probar evolución…</option>
            <option value="1">DOLEA 1★</option>
            <option value="2">DOLEA 2★</option>
            <option value="3">DOLEA 3★ · apariencia 2★</option>
            <option value="4">DOLEA · overtime</option>
            <option value="5">DOLEA · muerte</option>
          </select>
        </label>
        <label className="arena-scenario">
          Prueba de límite
          <select
            aria-label="Escenario de overtime"
            disabled={!preparing}
            value=""
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'overtime' || value === 'timeout' || value === 'mutual')
                session.loadScenario(value);
            }}
          >
            <option value="">Cargar escenario…</option>
            <option value="overtime">Victoria en overtime</option>
            <option value="timeout">Tiempo agotado · 450</option>
            <option value="mutual">Eliminación mutua</option>
          </select>
        </label>
        <label className="arena-scenario">
          Sinergias y habilidades
          <select
            aria-label="Diagnóstico P6A"
            value=""
            disabled={!preparing}
            onChange={(e) => {
              if (e.target.value) session.loadAbilityScenario(e.target.value as AbilityScenario);
            }}
          >
            <option value="">Cargar diagnóstico…</option>
            <option value="ability-1">Volumen Sucio · 1★</option>
            <option value="ability-2">Volumen Sucio · 2★</option>
            <option value="ability-3">Volumen Sucio · 3★</option>
            <option value="traits-2">2 miembros · diagnóstico</option>
            <option value="traits-3">3 miembros · diagnóstico</option>
            <option value="passive-overtime">Pasiva durante overtime</option>
            <option value="hortaleza-2">Hortaleza · 2 miembros</option>
            <option value="hortaleza-3">Hortaleza · 3 miembros</option>
            <option value="padel-1">Llama de Pádel · 1 miembro</option>
            <option value="padel-2">Llama de Pádel · 2 miembros</option>
            <option value="padel-3">Llama de Pádel · 3 miembros</option>
          </select>
        </label>
        <label className="arena-scenario">
          AD, AP y críticos
          <select
            aria-label="Diagnóstico de estadísticas"
            value=""
            disabled={!preparing}
            onChange={(e) => {
              if (e.target.value)
                session.loadStatsScenario(e.target.value as import('@tft/game-data').StatsScenario);
            }}
          >
            <option value="">Cargar diagnóstico…</option>
            <option value="basic-normal">Básico · 0% crítico</option>
            <option value="basic-critical">Básico · 100% crítico</option>
            <option value="physical-ad">Físico con AD</option>
            <option value="magic-ap">Mágico con AP</option>
            <option value="physical-ap">Físico con AP</option>
            <option value="magic-ad">Mágico con AD</option>
            <option value="mixed">Mixto AD/AP</option>
            <option value="modifiers">Modificadores AD/AP</option>
            <option value="speed-stack">Velocidad · varias fuentes</option>
            <option value="support">Curación y escudo AD/AP</option>
            <option value="stats-overtime">Estadísticas en overtime</option>
            <option value="dolea-advanced">DOLEA · reglas avanzadas</option>
          </select>
        </label>
        <label className="arena-scenario">
          Mecánicas avanzadas
          <select
            aria-label="Diagnóstico de mecánicas"
            value=""
            disabled={!preparing}
            onChange={(e) => {
              if (e.target.value)
                session.loadMechanicsScenario(
                  e.target.value as import('@tft/game-data').MechanicsScenario,
                );
            }}
          >
            <option value="">Cargar diagnóstico…</option>
            {MECHANICS_SCENARIOS.map((id) => (
              <option key={id} value={id}>
                {
                  {
                    'stack-cycle': 'Acumulaciones · ciclo de 5',
                    'kill-marks': 'Eliminaciones · sinergia 1/1',
                    'periodic-credit': 'Daño periódico · responsable',
                    'environment-credit': 'Daño ambiental · sin asesino',
                    'simultaneous-credit': 'Eliminaciones simultáneas',
                    'progress-2': 'Progresión · 2 miembros',
                    'progress-4': 'Progresión · 4 miembros',
                    'progress-6': 'Progresión · 6, contador individual',
                    'progress-team': 'Progresión · contador de equipo',
                    'free-repeat': 'Reejecución gratuita',
                    'jump-chain': 'Salto y ataque encadenado',
                    'jump-blocked': 'Salto · destino bloqueado',
                    'jump-cancel': 'Salto · interrupción',
                    'dolea-mechanics': 'DOLEA · motor de mecánicas',
                  }[id]
                }
              </option>
            ))}
          </select>
        </label>
        <button disabled={!preparing} onClick={() => session.loadJaramilloScenario()}>
          Diagnóstico JARAMILLO
        </button>
        {!preparing && (
          <label>
            Tiempo de reproducción{' '}
            <input
              aria-label="Tiempo de reproducción"
              type="range"
              min="0"
              max="45000"
              step="25"
              onChange={(e) => session.seekTime(Number(e.target.value))}
            />
          </label>
        )}
        <label className="arena-scenario">
          VARGAS y sinergias
          <select
            aria-label="Diagnóstico VARGAS"
            value=""
            disabled={!preparing}
            onChange={(e) => {
              if (e.target.value)
                session.loadVargasScenario(
                  e.target.value as import('@tft/game-data').VargasScenario,
                );
            }}
          >
            <option value="">Cargar VARGAS…</option>
            {VARGAS_SCENARIOS.map((id) => (
              <option key={id} value={id}>
                {id.startsWith('upm')
                  ? `UPM · ${id.slice(-1)} miembros ficticios`
                  : id === 'depredador-10'
                    ? 'El Depredador · 10 rivales'
                    : `VARGAS ${id.slice(-1)}★ · arte nativo 2★`}
              </option>
            ))}
          </select>
        </label>
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
            <button
              className="button"
              disabled={combat.mode !== 'paused'}
              onClick={() => session.stepCombat()}
            >
              +1 tick
            </button>
            <button className="button" onClick={() => session.startCombat(true)}>
              Repetir semilla
            </button>
            <button className="button quiet" onClick={() => session.returnToPreparation()}>
              Volver a preparación
            </button>
            <label className="arena-scenario">
              Revisar eventos · unidad seleccionada
              <select
                aria-label="Momento de pasiva y escudo"
                value=""
                onChange={(e) => {
                  if (e.target.value)
                    session.seekFeedback(
                      e.target.value as import('./combatFeedback').FeedbackMoment,
                    );
                }}
              >
                <option value="">Saltar a evento real…</option>
                <option value="start">Inicio · disponibilidad</option>
                <option value="passive">Activación de pasiva</option>
                <option value="shield">Escudo recibido</option>
                <option value="absorption">Primera absorción</option>
                <option value="depleted">Escudo agotado</option>
                <option value="expiration">Escudo expirado</option>
                <option value="outgoing">Primer impacto propio</option>
                <option value="critical">Primer crítico propio</option>
                <option value="modifier">Modificador aplicado</option>
                <option value="modifier-expiration">Modificador expirado</option>
                <option value="overtime">Inicio de overtime</option>
                <option value="stack">Acumulación confirmada</option>
                <option value="stack-consume">Consumo del umbral</option>
                <option value="stack-expiration">Acumulación expirada</option>
                <option value="kill">Eliminación atribuida</option>
                <option value="empower">Habilidad mejorada</option>
                <option value="repeat">Reejecución resuelta</option>
                <option value="jump">Salto en curso</option>
                <option value="chain">Ataque encadenado</option>
              </select>
            </label>
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
          Tick <strong>{combat.tick.toString().padStart(3, '0')}</strong> / 450
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
              : 'Doble derrota'}
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
