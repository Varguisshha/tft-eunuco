import { AccountPortal } from './auth/AccountPortal';
import { GameFrame } from './match/hud/GameFrame';
import { GameIcon } from './match/hud/GameIcon';
import { Suspense, lazy, useEffect, useState } from 'react';
import { ITEMS_ECONOMY_CONFIG } from '@tft/game-data';
import { createMatch, LocalMatchCoordinator, runCombat } from '@tft/game-core';
import { AUTOMATIC_SAVE_KEY, decodeSave } from './match/automaticSave';
import { attachAutomaticHost } from './match/automaticHost';
import { Arena } from './Arena';
import { BoardSession } from './game/session';
import { LocalGame } from './match/LocalGame';
import { LocalSession, restoreMatch, SAVE_KEY } from './match/LocalSession';
const DevelopmentAccess = __DEVTOOLS__
  ? lazy(() => import('./development/DevelopmentAccess'))
  : null;
export function App() {
  const [screen, setScreen] = useState<'local' | 'arena' | 'online'>(
    location.hash === '#multiplayer' ||
      location.search.includes('code=') ||
      location.hash.includes('access_token=') ||
      /(?:[?#&])error=/.test(location.search + location.hash)
      ? 'online'
      : 'local',
  );
  useEffect(() => {
    if (screen !== 'online' && location.hash === '#multiplayer')
      history.replaceState(null, '', location.pathname + location.search);
  }, [screen]);
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
        if (!coordinator.development) localStorage.setItem(AUTOMATIC_SAVE_KEY, text);
        if (!coordinator.development) setHasSave(true);
      },
      () => setNotice('No se pudo guardar. La partida continúa en memoria.'),
    );
  }, [session]);
  const create = () => {
    const n = Number(seed);
    if (!seed.trim() || !Number.isInteger(n) || n < 0 || n > 0xffffffff) {
      setNotice('La semilla debe ser un entero entre 0 y 4294967295.');
      return;
    }
    attach(
      new LocalMatchCoordinator(createMatch(n, ITEMS_ECONOMY_CONFIG), {
        matchId: crypto.randomUUID(),
        time,
      }),
    );
    setNotice('');
  };
  const resume = () => {
    try {
      const text = localStorage.getItem(AUTOMATIC_SAVE_KEY);
      if (text) {
        const restored = decodeSave(text, time);
        if (restored.development || restored.getMatch().development)
          throw new Error('DEV save in normal slot');
        attach(restored);
      } else {
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
        className={`screen-nav ${(screen === 'local' && session) || screen === 'online' ? 'in-match' : ''}`}
        aria-label="Pantalla"
      >
        <details
          className="match-menu"
          open={(!session && screen === 'local') || screen === 'arena'}
        >
          <summary aria-label="Opciones de partida">
            <GameFrame compact />
            <GameIcon name="stats" />
          </summary>
          <div className="match-menu-content">
            <a className="nav-brand" href="#" aria-label="TFT EUNUCO">
              TFT EUNUCO
            </a>
            <button
              aria-label="Partida local"
              aria-current={screen === 'local' ? 'page' : undefined}
              onClick={() => setScreen('local')}
            >
              Partida local
            </button>
            <button
              aria-label="Arena de pruebas"
              aria-current={screen === 'arena' ? 'page' : undefined}
              onClick={() => setScreen('arena')}
            >
              Arena de pruebas
            </button>
            <button
              onClick={() => setScreen('online')}
              aria-current={screen === 'online' ? 'page' : undefined}
            >
              Salas privadas
            </button>
            <span>F0–P7B.2</span>
          </div>
        </details>
      </nav>
      {notice && session && (
        <p className="save-notice" role="status">
          {notice}
        </p>
      )}
      {screen === 'online' ? (
        <AccountPortal onLocal={() => setScreen('local')} />
      ) : screen === 'arena' ? (
        <Arena providedSession={arena} />
      ) : session ? (
        <LocalGame session={session} onNew={() => setSession(null)} onReplace={attach} />
      ) : (
        <main className="local-lobby">
          <span className="eyebrow">ECONOMÍA · FORMACIÓN · COMBATE</span>
          <h1>Cada moneda cuenta.</h1>
          <p>
            Construye un equipo, mejora tus personajes y decide cuándo ahorrar o gastar. Una partida
            local de rondas automáticas, con DOLEA, VARGAS, JARAMILLO y los cuatro personajes de
            prueba.
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
      {DevelopmentAccess && screen === 'local' && (
        <Suspense fallback={null}>
          <DevelopmentAccess
            session={session}
            seed={Number(seed) || 42}
            onReplace={attach}
            onNormal={(c) => (c ? attach(c) : setSession(null))}
          />
        </Suspense>
      )}
    </>
  );
}
