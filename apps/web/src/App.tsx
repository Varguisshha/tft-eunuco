import { useState } from 'react';
import { CURRENT_ECONOMY_CONFIG } from '@tft/game-data';
import { createMatch } from '@tft/game-core';
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
      return !!localStorage.getItem(SAVE_KEY);
    } catch {
      return false;
    }
  });
  const save = (s: ReturnType<typeof createMatch>) => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    setHasSave(true);
  };
  const start = () => {
    const n = Number(seed);
    if (!seed.trim() || !Number.isInteger(n) || n < 0 || n > 0xffffffff) {
      setNotice('La semilla debe ser un entero entre 0 y 4294967295.');
      return;
    }
    const state = createMatch(n, CURRENT_ECONOMY_CONFIG);
    try {
      save(state);
    } catch {
      setNotice('Guardado no disponible; podrás jugar en memoria.');
    }
    setSession(new LocalSession(state, save));
  };
  const resume = () => {
    try {
      const text = localStorage.getItem(SAVE_KEY);
      if (!text) throw new Error();
      setSession(new LocalSession(restoreMatch(text), save));
      setNotice('');
    } catch {
      setNotice(
        'No se pudo validar la partida guardada. Puedes iniciar otra; el guardado se conserva hasta entonces.',
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
        <span>F0–P4.1 · LOCAL</span>
      </nav>
      {screen === 'arena' ? (
        <Arena providedSession={arena} />
      ) : session ? (
        <LocalGame session={session} />
      ) : (
        <main className="local-lobby">
          <span className="eyebrow">ECONOMÍA · FORMACIÓN · COMBATE</span>
          <h1>Cada moneda cuenta.</h1>
          <p>
            Construye un equipo, mejora tus personajes y decide cuándo ahorrar o gastar. Una partida
            local de rondas abiertas, con DOLEA y los cuatro personajes de prueba.
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
              <button className="button combat-primary" onClick={resume}>
                Continuar partida guardada
              </button>
            )}
            <button className="button combat-primary" onClick={start}>
              {hasSave ? 'Iniciar nueva partida' : 'Iniciar partida local'}
            </button>
          </div>
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
