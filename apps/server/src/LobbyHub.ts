import { randomInt, randomUUID } from 'node:crypto';
import {
  LOBBY_VERSION,
  LobbyActionSchema,
  lobbyStartReason,
  type LobbyEvent,
  type LobbySnapshot,
} from '@tft/shared';
import type { VerifiedIdentity } from './auth';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const IDLE_MS = 15 * 60_000;
export type MatchFactory = (
  users: string[],
  started: () => void,
  ended: () => void,
) => Promise<{ id: string; cancel: () => Promise<void> }>;
type Peer = { identity: VerifiedIdentity; send: (event: LobbyEvent) => void };
type Rate = { at: number; count: number };
/** Single-process coordinator. Membership is mutated synchronously before any await. */
export class LobbyHub {
  private rooms = new Map<string, LobbySnapshot>();
  private codes = new Map<string, string>();
  private membership = new Map<string, string>();
  private peers = new Map<string, Peer>();
  private absent = new Map<string, number>();
  private receipts = new Map<string, Map<string, string>>();
  private rates = new Map<string, Rate>();
  private transitions = new Map<string, { cancel?: () => Promise<void>; deadline: number }>();
  constructor(
    private factory: MatchFactory,
    private now = Date.now,
  ) {}
  connect(identity: VerifiedIdentity, send: Peer['send']) {
    if (this.peers.has(identity.userId))
      throw new Error('Tu cuenta ya está conectada en otra ventana.');
    this.peers.set(identity.userId, { identity, send });
    this.absent.delete(identity.userId);
    const lobby = this.get(identity.userId);
    const participant = lobby?.participants.find((p) => p.userId === identity.userId);
    if (participant) {
      participant.connected = true;
      this.changed(lobby!);
    }
  }
  disconnect(id: string) {
    this.peers.delete(id);
    const lobby = this.get(id);
    if (!lobby) return;
    this.absent.set(id, this.now() + 30_000);
    const p = lobby.participants.find((p) => p.userId === id)!;
    p.connected = false;
    p.readyState = false;
    if (lobby.status === 'starting')
      this.fail(lobby, 'Un participante se ha desconectado. Volved a marcaros como listos.');
    else this.changed(lobby);
  }
  private get(id: string) {
    return this.rooms.get(this.membership.get(id) ?? '');
  }
  private emit(id: string, requestId: string | null = null, error: string | null = null) {
    const lobby = this.get(id);
    this.peers.get(id)?.send({
      version: LOBBY_VERSION,
      requestId,
      error,
      lobby: lobby ? structuredClone(lobby) : null,
    });
  }
  private changed(lobby: LobbySnapshot) {
    lobby.revision++;
    for (const p of lobby.participants) this.emit(p.userId);
  }
  private waiting(lobby: LobbySnapshot | undefined): asserts lobby is LobbySnapshot {
    if (!lobby || lobby.status !== 'waiting') throw new Error('La sala no está disponible.');
  }
  private host(lobby: LobbySnapshot, id: string) {
    if (lobby.hostUserId !== id) throw new Error('Solo el anfitrión puede hacer esto.');
  }
  private limited(key: string, max: number) {
    const now = this.now();
    let rate = this.rates.get(key);
    if (!rate || now - rate.at >= 60_000) {
      rate = { at: now, count: 0 };
      this.rates.set(key, rate);
    }
    if (++rate.count > max)
      throw new Error('Demasiados intentos. Espera un minuto y vuelve a probar.');
  }
  async action(id: string, raw: unknown) {
    if (!this.peers.has(id)) return;
    let requestId: string | null = null;
    try {
      this.limited('all:' + id, 90);
      const parsed = LobbyActionSchema.safeParse(raw);
      if (!parsed.success)
        throw new Error('Solicitud no válida. Revisa el código de ocho caracteres.');
      const action = parsed.data;
      requestId = action.requestId;
      this.sweep();
      let history = this.receipts.get(id);
      if (!history) {
        history = new Map();
        this.receipts.set(id, history);
      }
      const signature = JSON.stringify(action);
      if (history.has(requestId)) {
        if (history.get(requestId) !== signature)
          throw new Error('Identificador de solicitud reutilizado.');
        this.emit(id, requestId);
        return;
      }
      // Reserve before asynchronous start: retries never create a second match.
      history.set(requestId, signature);
      if (history.size > 128) history.delete(history.keys().next().value!);
      let lobby = this.get(id);
      if (action.type === 'sync') {
        this.emit(id, requestId);
        return;
      }
      if (action.type === 'create_lobby' || action.type === 'join_lobby') {
        this.limited('join:' + id, 8);
        if (lobby) throw new Error('Ya estás en una sala. Abandónala antes de entrar en otra.');
        if (action.type === 'create_lobby') {
          let code: string;
          do {
            code = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
          } while (this.codes.has(code));
          lobby = {
            version: LOBBY_VERSION,
            roomId: randomUUID(),
            roomCode: code,
            hostUserId: id,
            capacity: action.capacity,
            participants: [],
            status: 'waiting',
            createdAt: this.now(),
            expiresAt: this.now() + IDLE_MS,
            matchId: null,
            revision: 0,
          };
          this.rooms.set(lobby.roomId, lobby);
          this.codes.set(code, lobby.roomId);
        } else {
          lobby = this.rooms.get(this.codes.get(action.roomCode) ?? '');
          this.waiting(lobby);
          if (lobby.participants.length >= lobby.capacity)
            throw new Error('La sala está llena. Pide otra sala al anfitrión.');
        }
        const identity = this.peers.get(id)!.identity;
        lobby.participants.push({
          userId: id,
          name: identity.name,
          avatarId: identity.avatarId,
          connected: true,
          readyState: false,
        });
        this.membership.set(id, lobby.roomId);
        lobby.participants.forEach((p) => {
          p.readyState = false;
        });
      } else if (action.type === 'leave_lobby') {
        if (lobby) this.remove(lobby, id);
        this.emit(id, requestId);
        return;
      } else {
        this.waiting(lobby);
        if (action.type === 'set_ready')
          lobby.participants.find((p) => p.userId === id)!.readyState = action.readyState;
        else {
          this.host(lobby, id);
          if (action.type === 'close_lobby') {
            this.close(lobby);
            this.emit(id, requestId);
            return;
          }
          if (action.type === 'set_capacity') {
            if (action.capacity < lobby.participants.length)
              throw new Error('No puedes reducir las plazas por debajo de los participantes.');
            if (lobby.capacity !== action.capacity) {
              lobby.capacity = action.capacity;
              lobby.participants.forEach((p) => {
                p.readyState = false;
              });
            }
          } else if (action.type === 'start_match') {
            const reason = lobbyStartReason(lobby);
            if (reason) throw new Error(reason);
            lobby.status = 'starting';
            const transition = { deadline: this.now() + 25_000 } as {
              deadline: number;
              cancel?: () => Promise<void>;
            };
            this.transitions.set(lobby.roomId, transition);
            this.changed(lobby);
            const current = lobby;
            let issuedMatchId: string | null = null;
            try {
              const match = await this.factory(
                lobby.participants.map((p) => p.userId),
                () => {
                  if (this.transitions.get(current.roomId) !== transition) return;
                  current.status = 'in_match';
                  this.transitions.delete(current.roomId);
                  this.changed(current);
                },
                () => {
                  if (
                    current.status === 'starting' &&
                    this.transitions.get(current.roomId) === transition
                  )
                    this.fail(current, 'No se pudo entrar a la partida. Inténtalo de nuevo.');
                  else if (current.status === 'in_match' && current.matchId === issuedMatchId)
                    this.close(current);
                },
              );
              if (this.transitions.get(current.roomId) !== transition) {
                await match.cancel();
                return;
              }
              issuedMatchId = match.id;
              transition.cancel = match.cancel;
              current.matchId = match.id;
            } catch {
              if (this.transitions.get(current.roomId) === transition)
                this.fail(current, 'No se pudo crear la partida. Volved a marcaros como listos.');
            }
          }
        }
      }
      if (lobby) {
        lobby.expiresAt = this.now() + IDLE_MS;
        this.changed(lobby);
      }
      this.emit(id, requestId);
    } catch (error) {
      this.emit(
        id,
        requestId,
        error instanceof Error ? error.message : 'No se pudo completar la acción.',
      );
    }
  }
  private fail(lobby: LobbySnapshot, message: string) {
    const transition = this.transitions.get(lobby.roomId);
    this.transitions.delete(lobby.roomId);
    void transition?.cancel?.().catch(() => {});
    if (!this.rooms.has(lobby.roomId)) return;
    lobby.status = 'waiting';
    lobby.matchId = null;
    lobby.participants.forEach((p) => {
      p.readyState = false;
    });
    this.changed(lobby);
    for (const p of lobby.participants) this.emit(p.userId, null, message);
  }
  private remove(lobby: LobbySnapshot, id: string) {
    if (lobby.status === 'starting') this.fail(lobby, 'Un participante ha abandonado.');
    this.membership.delete(id);
    this.absent.delete(id);
    lobby.participants = lobby.participants.filter((p) => p.userId !== id);
    if (!lobby.participants.length) {
      this.close(lobby);
      return;
    }
    if (lobby.hostUserId === id)
      lobby.hostUserId = (lobby.participants.find((p) => p.connected) ??
        lobby.participants[0])!.userId;
    if (lobby.status === 'waiting')
      lobby.participants.forEach((p) => {
        p.readyState = false;
      });
    this.changed(lobby);
  }
  private close(lobby: LobbySnapshot) {
    lobby.status = 'closed';
    this.changed(lobby);
    const transition = this.transitions.get(lobby.roomId);
    this.transitions.delete(lobby.roomId);
    void transition?.cancel?.().catch(() => {});
    this.rooms.delete(lobby.roomId);
    this.codes.delete(lobby.roomCode);
    for (const p of lobby.participants) {
      this.membership.delete(p.userId);
      this.absent.delete(p.userId);
      this.emit(p.userId, null, 'La sala se ha cerrado. Puedes crear otra.');
    }
  }
  sweep() {
    for (const [id, deadline] of this.absent)
      if (deadline <= this.now()) {
        const lobby = this.get(id);
        if (lobby && lobby.status !== 'in_match') this.remove(lobby, id);
        this.absent.delete(id);
      }
    for (const lobby of this.rooms.values()) {
      if (lobby.status === 'waiting' && lobby.expiresAt <= this.now()) this.close(lobby);
      if (
        lobby.status === 'starting' &&
        (this.transitions.get(lobby.roomId)?.deadline ?? Infinity) <= this.now()
      )
        this.fail(lobby, 'La conexión a la partida ha tardado demasiado. Inténtalo de nuevo.');
    }
    for (const [key, rate] of this.rates)
      if (this.now() - rate.at >= 60_000) this.rates.delete(key);
    for (const id of this.receipts.keys())
      if (!this.peers.has(id) && !this.membership.has(id) && !this.rates.has('all:' + id))
        this.receipts.delete(id);
  }
  shutdown() {
    for (const room of this.rooms.values()) this.close(room);
    this.peers.clear();
  }
}
