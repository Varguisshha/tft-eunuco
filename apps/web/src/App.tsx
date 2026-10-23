import { useEffect, useState } from 'react';
import { CURRENT_ECONOMY_CONFIG } from '@tft/game-data';
import { createMatch, LocalMatchCoordinator, runCombat } from '@tft/game-core';
import { AUTOMATIC_SAVE_KEY, DEVELOPMENT_SAVE_KEY, decodeSave } from './match/automaticSave';
import { attachAutomaticHost } from './match/automaticHost';
import { Arena } from './Arena';
import { BoardSession } from './game/session';
import { LocalGame } from './match/LocalGame';
import { LocalSession, restoreMatch, SAVE_KEY } from './match/LocalSession';
export function App() {
  const [screen, setScreen] = useState<'local' | 'arena'>('local');
  const [arena] = useState(() => new BoardSession());
  const [session, setSession] = useState<LocalSession | null>(null);
  const [seed, setSeed] = useState('42');
  const [notice, setNotice] = useState('');
  const [legacySave] = useState(() => {
    try {
      return !!localStorage.getItem('tft-eunuco-local-f0p3-1');
    } catch {
      return false;
    }
  });
  const [hasSave, setHasSave] = useState(() => {
    try {
      return !!(localStorage.getItem(AUTOMATIC_SAVE_KEY) || localStorage.getItem(SAVE_KEY));
    } catch {
      return false;
    }
  });
  const time = { now: () => performance.now() };
  const attach = (coordinator: LocalMatchCoordinator) =>
    setSession(new LocalSession(coordinator.getMatch(), undefined, coordinator));
  useEffect(() => {
    const coordinator = session?.coordinator;
    if (!coordinator) return;
    return attachAutomaticHost(
      coordinator,
      (text) => {
        localStorage.setItem(
          coordinator.development ? DEVELOPMENT_SAVE_KEY : AUTOMATIC_SAVE_KEY,
          text,
        );
        if (!coordinator.development) setHasSave(true);
      },
      () => setNotice('No se pudo guardar. La partida continúa en memoria.'),
    );
  }, [session]);
  const create = (development = false) => {
    const n = Number(seed);
    if (!seed.trim() || !Number.isInteger(n) || n < 0 || n > 0xffffffff) {
      setNotice('La semilla debe ser un entero entre 0 y 4294967295.');
      return;
    }
    attach(
      new LocalMatchCoordinator(createMatch(n, CURRENT_ECONOMY_CONFIG), {
        matchId: crypto.randomUUID(),
        time,
        development,
      }),
    );
    setNotice('');
  };
  const resume = (development = false) => {
    try {
      const text = localStorage.getItem(development ? DEVELOPMENT_SAVE_KEY : AUTOMATIC_SAVE_KEY);
      if (text) attach(decodeSave(text, time));
      else {
        if (development) throw new Error('No development save');
        const old = localStorage.getItem(SAVE_KEY);
        if (!old) throw new Error('No save');
        const state = restoreMatch(old);
        attach(
          LocalMatchCoordinator.migrate(
            state,
            state.combat ? runCombat(state.combat.input) : null,
            { matchId: crypto.randomUUID(), time },
          ),
        );
      }
      setNotice('');
    } catch {
      setNotice(
        'No se pudo validar el guardado. Se conserva intacto; no se ha iniciado otra partida.',
      );
    }
  };
  return (
    <>
      <nav
        className={`screen-nav ${screen === 'local' && session ? 'in-match' : ''}`}
        aria-label="Pantalla"
      >
        <a className="nav-brand" href="#">
          TFT EUNUCO
        </a>
        <button
          aria-current={screen === 'local' ? 'page' : undefined}
          onClick={() => setScreen('local')}
        >
          Partida local
        </button>
        <button
          aria-current={screen === 'arena' ? 'page' : undefined}
          onClick={() => setScreen('arena')}
        >
          Arena de pruebas
        </button>
        <span>F0–P5.3 · LOCAL</span>
      </nav>
      {notice && session && (
        <p className="save-notice" role="status">
          {notice}
        </p>
      )}
      {screen === 'arena' ? (
        <Arena providedSession={arena} />
      ) : session ? (
        <LocalGame session={session} onNew={() => setSession(null)} onReplace={attach} />
      ) : (
        <main className="local-lobby">
          <span className="eyebrow">ECONOMÍA · FORMACIÓN · COMBATE</span>
          <h1>Cada moneda cuenta.</h1>
          <p>
            Construye un equipo, mejora tus personajes y decide cuándo ahorrar o gastar. Una partida
            local de rondas automáticas, con DOLEA y los cuatro personajes de prueba.
          </p>
          <div className="lobby-rules">
            <span>
              <b>10</b> oro inicial
            </span>
            <span>
              <b>5</b> ofertas
            </span>
            <span>
              <b>9</b> plazas de banquillo
            </span>
          </div>
          <label>
            Semilla de partida
            <input
              aria-label="Semilla de partida"
              inputMode="numeric"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
            />
          </label>
          <div className="lobby-actions">
            {hasSave && (
              <button className="button combat-primary" onClick={() => resume()}>
                Continuar partida guardada
              </button>
            )}
            <button className="button combat-primary" onClick={() => create()}>
              {hasSave ? 'Crear nueva partida' : 'Crear partida local'}
            </button>
          </div>
          <details className="lobby-development">
            <summary>Herramientas de desarrollo local</summary>
            <p>Partida aislada, con guardado propio y controles técnicos. Sin autoridad online.</p>
            <button className="button" onClick={() => create(true)}>
              Crear partida de desarrollo
            </button>
            <button className="button" onClick={() => resume(true)}>
              Recuperar prueba de desarrollo
            </button>
          </details>
          <small>
            Se guarda en este navegador. Una nueva partida sustituye el guardado de esta versión.
            Sin cuentas ni conexión.
          </small>
          {legacySave && (
            <p>
              El guardado de F0-P3 se conserva por separado. Overtime utiliza nuevas reglas; inicia
              una partida de esta versión para jugar.
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
        </main>
      )}
    </>
  );
}
