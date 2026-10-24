import { useEffect, useRef, useState } from 'react';
import { RemoteCoordinator } from './RemoteCoordinator';
import { LocalSession } from '../match/LocalSession';
import { LocalGame } from '../match/LocalGame';
import type { Session } from '@supabase/supabase-js';
export function Multiplayer({
  accountSession,
  onAccount,
}: {
  accountSession: Session;
  onAccount: () => void;
}) {
  const [session, setSession] = useState<LocalSession | null>(null);
  const [roomId, setRoomId] = useState(new URLSearchParams(location.search).get('match') ?? '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const remote = useRef<RemoteCoordinator | null>(null);
  const alive = useRef(true);
  const latestToken = useRef(accountSession.access_token);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      remote.current?.dispose();
    };
  }, []);
  useEffect(() => {
    latestToken.current = accountSession.access_token;
    remote.current?.room.send('authenticate', accountSession.access_token);
  }, [accountSession.access_token]);
  const connect = async (mode: 'create' | 'join') => {
    setBusy(true);
    setMessage('Conectando…');
    try {
      const c = await RemoteCoordinator.connect(mode, roomId.trim(), accountSession.access_token);
      if (!alive.current) {
        c.dispose();
        return;
      }
      remote.current = c;
      if (latestToken.current !== accountSession.access_token)
        c.room.send('authenticate', latestToken.current);
      setRoomId(c.room.roomId);
      setSession(new LocalSession(c.getMatch(), undefined, undefined, c));
      setMessage('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No se pudo conectar.');
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  if (session)
    return (
      <>
        <LocalGame
          session={session}
          onNew={() => {
            remote.current?.dispose();
            remote.current = null;
            setSession(null);
          }}
          onReplace={() => {}}
        />
        <details className="save-notice">
          <summary>Multijugador · sesión {roomId}</summary>
          <p>
            Abre otro navegador, selecciona Multijugador de prueba y une esta sesión:{' '}
            <b>{roomId}</b>. Cada conexión recibe su identidad del servidor.
          </p>
          <button
            onClick={() => {
              remote.current?.dispose();
              setSession(null);
            }}
          >
            Salir de la sesión
          </button>
        </details>
      </>
    );
  return (
    <main className="local-lobby">
      <span className="eyebrow">DOS JUGADORES · SERVIDOR LOCAL</span>
      <h1>Multijugador de prueba</h1>
      <button onClick={onAccount}>Volver a mi cuenta</button>
      <p>Tu perfil identifica a tu jugador. Inicia la partida cuando estén ambos conectados.</p>
      <div className="lobby-actions">
        <button
          className="button combat-primary"
          disabled={busy}
          onClick={() => void connect('create')}
        >
          Crear partida de prueba
        </button>
      </div>
      <label>
        Identificador de sesión
        <input
          aria-label="Identificador de sesión"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
      </label>
      <button
        className="button"
        disabled={busy || !roomId.trim()}
        onClick={() => void connect('join')}
      >
        Unirse a la sesión
      </button>
      <p role="status">{message}</p>
      <small>
        Sesión de prueba con cuentas verificadas. Sin reconexión tras salir. Los guardados locales
        permanecen separados.
      </small>
    </main>
  );
}
