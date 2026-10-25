import { useEffect, useRef, useState } from 'react';
import { Client, type Room } from '@colyseus/sdk';
import {
  LOBBY_VERSION,
  LobbyEventSchema,
  RoomCodeSchema,
  lobbyStartReason,
  type LobbySnapshot,
} from '@tft/shared';
import type { Session } from '@supabase/supabase-js';
import { RemoteCoordinator } from './RemoteCoordinator';
import { LocalSession } from '../match/LocalSession';
import { LocalGame } from '../match/LocalGame';
import { GameFrame } from '../match/hud/GameFrame';
import { GameIcon, type GameIconName } from '../match/hud/GameIcon';
import './lobby.css';
function LobbyButton({
  children,
  icon = 'play',
  onClick,
  disabled = false,
  active = false,
}: {
  children: React.ReactNode;
  icon?: GameIconName;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      className={`account-action lobby-button ${active ? 'is-active' : ''}`}
      type="button"
      disabled={disabled}
      onClick={onClick}
    >
      <GameFrame width={460} height={80} />
      <GameIcon name={icon} />
      <span>{children}</span>
    </button>
  );
}
export function Multiplayer({
  accountSession,
  onAccount,
  onLocal,
}: {
  accountSession: Session;
  onAccount: () => void;
  onLocal: () => void;
}) {
  const [session, setSession] = useState<LocalSession | null>(null);
  const [lobby, setLobby] = useState<LobbySnapshot | null>(null);
  const [code, setCode] = useState('');
  const [capacity, setCapacity] = useState<2 | 3 | 4>(2);
  const [message, setMessage] = useState('');
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const gateway = useRef<Room | null>(null);
  const remote = useRef<RemoteCoordinator | null>(null);
  const token = useRef(accountSession.access_token);
  const current = useRef<LobbySnapshot | null>(null);
  const destination = useRef<string | null>(null);
  const pending = useRef<string | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    token.current = accountSession.access_token;
    gateway.current?.send('authenticate', token.current);
    remote.current?.room.send('authenticate', token.current);
  }, [accountSession.access_token]);
  useEffect(() => {
    let alive = true;
    let room: Room | undefined;
    setMessage('Conectando con las salas…');
    const endpoint = new URL(import.meta.env.VITE_GAME_SERVER_URL || 'http://127.0.0.1:2567');
    const secure =
      ['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname) ||
      ['https:', 'wss:'].includes(endpoint.protocol);
    const client = new Client(endpoint.href);
    client.auth.token = token.current;
    void (async () => {
      if (!secure) throw new Error('El servidor remoto requiere una conexión segura.');
      room = await client.create('lobby_gateway');
      if (!alive) {
        await room.leave();
        return;
      }
      room.reconnection.enabled = false;
      gateway.current = room;
      setConnected(true);
      setMessage('');
      room.onMessage('protocol_error', () => {
        if (alive) setMessage('Solicitud no compatible. Vuelve a conectar.');
      });
      room.onMessage('lobby_event', (raw: unknown) => {
        const parsed = LobbyEventSchema.safeParse(raw);
        if (!alive) return;
        if (!parsed.success) {
          setMessage('Respuesta no compatible. Vuelve a conectar.');
          return;
        }
        const e = parsed.data;
        if (e.requestId === pending.current || e.error) {
          pending.current = null;
          clearTimeout(timeout.current);
          setBusy(false);
        }
        current.current = e.lobby;
        setLobby(e.lobby);
        if (e.error) setMessage(e.error);
        if (e.lobby?.status === 'waiting' && destination.current) {
          destination.current = null;
          remote.current?.dispose();
          remote.current = null;
          setSession(null);
        }
        if (
          e.lobby?.status === 'starting' &&
          e.lobby.matchId &&
          destination.current !== e.lobby.matchId
        ) {
          const matchId = e.lobby.matchId;
          destination.current = matchId;
          setMessage('Entrando en la pista…');
          void RemoteCoordinator.connect('join', matchId, token.current)
            .then((c) => {
              if (!alive || current.current?.matchId !== matchId) {
                c.dispose();
                return;
              }
              remote.current = c;
              c.room.send('authenticate', token.current);
              setSession(new LocalSession(c.getMatch(), undefined, undefined, c));
              setMessage('');
            })
            .catch(() => {
              if (alive)
                setMessage(
                  'No se pudo entrar. La sala se recuperará automáticamente en unos segundos.',
                );
            });
        }
      });
      room.onLeave(() => {
        if (alive) {
          gateway.current = null;
          setConnected(false);
          setBusy(false);
          setMessage(
            'Se ha perdido la conexión a la sala. Vuelve a conectar; si la sesión ha caducado, entra desde tu cuenta.',
          );
        }
      });
      room.send('authenticate', token.current);
      room.send('lobby_action', {
        version: LOBBY_VERSION,
        requestId: crypto.randomUUID(),
        type: 'sync',
      });
    })().catch(() => {
      if (alive)
        setMessage(
          'No se pudo conectar. Comprueba el servidor y tu sesión, y vuelve a intentarlo.',
        );
    });
    return () => {
      alive = false;
      clearTimeout(timeout.current);
      void room?.leave();
      gateway.current = null;
      remote.current?.dispose();
      remote.current = null;
      destination.current = null;
      pending.current = null;
    };
  }, [attempt]);
  const send = (type: string, extra: Record<string, unknown> = {}) => {
    if (!gateway.current || pending.current) return;
    const requestId = crypto.randomUUID();
    pending.current = requestId;
    setBusy(true);
    setMessage('');
    gateway.current.send('lobby_action', { version: LOBBY_VERSION, requestId, type, ...extra });
    timeout.current = setTimeout(() => {
      pending.current = null;
      setBusy(false);
      setMessage('La respuesta tarda demasiado. Comprueba la conexión antes de repetir.');
    }, 10_000);
  };
  const leave = () => {
    send('leave_lobby');
    remote.current?.dispose();
    remote.current = null;
    destination.current = null;
    setSession(null);
  };
  if (session)
    return (
      <>
        <LocalGame session={session} onNew={leave} onReplace={() => {}} />
        <details className="save-notice">
          <summary>Partida privada</summary>
          <p>
            Solo los participantes de tu sala pueden entrar. Sin reconexión al combate en esta fase.
          </p>
          <button onClick={leave}>Salir de la partida</button>
        </details>
      </>
    );
  const host = lobby?.hostUserId === accountSession.user.id;
  const self = lobby?.participants.find((p) => p.userId === accountSession.user.id);
  const waiting = lobby?.status === 'waiting';
  const blocked = busy || !connected;
  const reason = lobby ? lobbyStartReason(lobby) : null;
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Copiado. Compártelo con tus amigos.');
    } catch {
      setMessage('No se pudo copiar. Selecciona el código y cópialo manualmente.');
    }
  };
  return (
    <main className="private-lobby account-screen">
      <div className="lobby-shell">
        <header className="lobby-header">
          <div className="account-brand">
            TFT <strong>EUNUCO</strong>
          </div>
          <button className="lobby-back" onClick={onAccount}>
            Mi cuenta
          </button>
        </header>
        <div className="lobby-layout">
          <section className="lobby-invite">
            <h1>{lobby ? 'Tu grupo.\nLa misma pista.' : 'La próxima ronda,\ncon los tuyos.'}</h1>
            <p>
              {lobby
                ? 'Comparte el código. Reúne al grupo y marcaos como listos.'
                : 'Crea una sala privada o entra con el código de un amigo.'}
            </p>
            {lobby ? (
              <>
                <div className="lobby-code">
                  <span>Código de sala</span>
                  <strong>
                    {lobby.roomCode.slice(0, 4)}-{lobby.roomCode.slice(4)}
                  </strong>
                </div>
                <LobbyButton icon="journal" onClick={() => void copy(lobby.roomCode)}>
                  Copiar código
                </LobbyButton>
                <button
                  className="lobby-text-action"
                  onClick={() =>
                    void copy(`Únete a mi partida de TFT EUNUCO con el código ${lobby.roomCode}.`)
                  }
                >
                  Copiar invitación para compartir
                </button>
                <small>
                  Comparte el código solo con tu grupo. El servidor actual es local; no es un enlace
                  público.
                </small>
              </>
            ) : (
              <>
                <div className="lobby-emblem">
                  <GameIcon name="shield" />
                </div>
                <LobbyButton icon="play" onClick={onLocal}>
                  Partida local
                </LobbyButton>
                <small>También puedes practicar sin conexión.</small>
              </>
            )}
          </section>
          <section className="lobby-panel">
            <GameFrame width={620} height={650} />
            <div className="lobby-panel-content">
              {lobby ? (
                <>
                  <div className="lobby-panel-heading">
                    <h2>Sala privada</h2>
                    <span>
                      {lobby.participants.length} / {lobby.capacity}
                    </span>
                  </div>
                  <ol className="lobby-roster">
                    {Array.from({ length: lobby.capacity }, (_, i) => {
                      const p = lobby.participants[i];
                      return (
                        <li
                          key={p?.userId ?? `empty-${i}`}
                          className={`${p ? 'occupied' : 'empty'} ${p?.readyState ? 'is-ready' : ''}`}
                        >
                          <span className={`avatar avatar-${p?.avatarId ?? 'jade'}`}>
                            <GameIcon
                              name={
                                !p
                                  ? 'plus'
                                  : p.avatarId === 'pulse'
                                    ? 'xp'
                                    : p.avatarId === 'spark'
                                      ? 'gold'
                                      : 'shield'
                              }
                            />
                          </span>
                          <div>
                            <strong>
                              {p?.name ?? 'Plaza libre'}
                              {p?.userId === accountSession.user.id ? ' · Tú' : ''}
                            </strong>
                            <small>
                              {p
                                ? p.userId === lobby.hostUserId
                                  ? 'Anfitrión'
                                  : 'Invitado'
                                : 'Esperando a un amigo'}
                            </small>
                          </div>
                          {p && (
                            <span className="lobby-ready">
                              {!p.connected ? 'Sin conexión' : p.readyState ? 'Listo' : 'No listo'}
                              {p.readyState && <GameIcon name="check" />}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                  {host && (
                    <fieldset className="lobby-capacity">
                      <legend>Plazas de la sala</legend>
                      {([2, 3, 4] as const).map((n) => (
                        <label key={n}>
                          <input
                            type="radio"
                            name="capacity"
                            checked={lobby.capacity === n}
                            disabled={blocked || !waiting || n < lobby.participants.length}
                            onChange={() => send('set_capacity', { capacity: n })}
                          />
                          <span>{n}</span>
                        </label>
                      ))}
                    </fieldset>
                  )}
                  <p className="lobby-reason">
                    {reason ??
                      (host
                        ? 'Todos listos. La pista os espera.'
                        : 'Todos listos. Esperando al anfitrión.')}
                  </p>
                  <div className="lobby-primary-actions">
                    <LobbyButton
                      icon="check"
                      active={!!self?.readyState}
                      disabled={blocked || !waiting}
                      onClick={() => send('set_ready', { readyState: !self?.readyState })}
                    >
                      {self?.readyState ? 'No estoy listo' : 'Estoy listo'}
                    </LobbyButton>
                    {host && (
                      <LobbyButton
                        disabled={blocked || !!reason}
                        active={!reason}
                        onClick={() => send('start_match')}
                      >
                        Iniciar partida
                      </LobbyButton>
                    )}
                  </div>
                  <div className="lobby-secondary-actions">
                    <button className="lobby-text-action" disabled={blocked} onClick={leave}>
                      Abandonar sala
                    </button>
                    {host && (
                      <button
                        className="lobby-text-action"
                        disabled={blocked || !waiting}
                        onClick={() => send('close_lobby')}
                      >
                        Cerrar sala para todos
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h2>Reúne a tu grupo</h2>
                  <fieldset className="lobby-capacity">
                    <legend>Elige las plazas</legend>
                    {([2, 3, 4] as const).map((n) => (
                      <label key={n}>
                        <input
                          type="radio"
                          name="capacity"
                          checked={capacity === n}
                          onChange={() => setCapacity(n)}
                        />
                        <span>{n} jugadores</span>
                      </label>
                    ))}
                  </fieldset>
                  <p className="lobby-reason">
                    {capacity === 2
                      ? 'Dos jugadores, una partida completa.'
                      : 'Cada jugador tendrá su tienda y su enfrentamiento.'}
                  </p>
                  <LobbyButton
                    active
                    disabled={blocked}
                    icon="plus"
                    onClick={() => send('create_lobby', { capacity })}
                  >
                    Crear sala privada
                  </LobbyButton>
                  <div className="lobby-join">
                    <h3>¿Ya tienes un código?</h3>
                    <label htmlFor="room-code">Código de ocho caracteres</label>
                    <input
                      id="room-code"
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={32}
                      placeholder="ABCD-EFGH"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                    <LobbyButton
                      disabled={blocked || !RoomCodeSchema.safeParse(code).success}
                      icon="play"
                      onClick={() => send('join_lobby', { roomCode: code })}
                    >
                      Unirme a la sala
                    </LobbyButton>
                  </div>
                </>
              )}
              <p className="lobby-notice" role="status" aria-live="polite">
                {message || (busy ? 'Esperando confirmación…' : '')}
              </p>
              {!connected && (
                <LobbyButton icon="refresh" onClick={() => setAttempt((a) => a + 1)}>
                  Volver a conectar
                </LobbyButton>
              )}
            </div>
          </section>
        </div>
        <footer className="lobby-footer">
          Salas privadas · Cuentas verificadas <span>Partidas de 2 a 4</span>
        </footer>
      </div>
    </main>
  );
}
