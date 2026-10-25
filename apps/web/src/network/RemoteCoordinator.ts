import { Client, type Room } from '@colyseus/sdk';
import {
  ActionReceiptSchema,
  NETWORK_VERSION,
  reverseHex,
  type MatchCoordinator,
  type MatchState,
  type CombatReplay,
  type TimedCommand,
} from '@tft/shared';
import { scaledProfile, type MatchError } from '@tft/game-core';
import {
  RemoteSnapshotSchema,
  RemoteTraceSchema,
  authorizedReplay,
  currentPairing,
  opponent,
  ownPlayer,
  projectRemote,
  type RemoteSnapshot,
  type RemoteTrace,
} from './remoteView';
export class RemoteCoordinator implements MatchCoordinator {
  readonly development = false;
  readonly recoveredFromSave = false;
  readonly remote = true;
  connected = true;
  lastRejection: MatchError | null = null;
  notice = 'Conectado al servidor';
  private snapshot!: RemoteSnapshot;
  private pendingTrace: RemoteTrace | null = null;
  private state!: MatchState;
  private replay: CombatReplay | null = null;
  private traceId: string | null = null;
  private listeners = new Set<() => void>();
  private sequence = 0;
  private pending = false;
  private offset = 0;
  private bestRtt = Infinity;
  private timer: ReturnType<typeof setInterval>;
  private pingTimer: ReturnType<typeof setInterval>;
  constructor(readonly room: Room) {
    room.reconnection.enabled = false;
    room.onMessage('combat_trace', (raw: unknown) => {
      const parsed = RemoteTraceSchema.safeParse(raw);
      if (!parsed.success || parsed.data.matchId !== room.roomId) return;
      this.pendingTrace = parsed.data;
      if (this.snapshot) {
        this.bindTrace();
        this.state = projectRemote(this.snapshot, this.replay);
        this.emit();
      }
    });
    room.onMessage('state_snapshot', (raw: unknown) => this.receive(raw));
    room.onMessage('action_receipt', (raw: unknown) => {
      const r = ActionReceiptSchema.parse(raw);
      this.pending = false;
      this.notice = r.accepted
        ? 'Acción confirmada por el servidor'
        : `Acción rechazada: ${r.reason}`;
      this.emit();
    });
    room.onMessage('protocol_error', (message: unknown) => {
      this.notice = String(message);
      this.emit();
    });
    room.onMessage('pong', (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const v = raw as Record<string, unknown>;
      if (typeof v.echo !== 'number' || typeof v.serverTime !== 'number') return;
      const now = performance.now(),
        rtt = now - v.echo;
      if (rtt >= 0 && rtt < this.bestRtt) {
        this.bestRtt = rtt;
        this.offset = v.serverTime - (now + v.echo) / 2;
      }
    });
    room.onLeave(() => {
      clearInterval(this.timer);
      clearInterval(this.pingTimer);
      this.connected = false;
      this.pending = false;
      this.notice = 'Desconectado. Esta fase no admite reconexión.';
      this.emit();
    });
    this.timer = setInterval(() => this.emit(), 50);
    this.pingTimer = setInterval(() => room.send('ping', performance.now()), 2000);
    room.send('ping', performance.now());
  }
  static async connect(mode: 'create' | 'join', matchId = '', token: string) {
    const endpoint = new URL(import.meta.env.VITE_GAME_SERVER_URL || 'http://127.0.0.1:2567');
    if (
      !['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname) &&
      !['https:', 'wss:'].includes(endpoint.protocol)
    )
      throw new Error('El servidor remoto requiere una conexión segura.');
    const client = new Client(endpoint.href);
    client.auth.token = token;
    const room =
      mode === 'create' ? await client.create('test_match') : await client.joinById(matchId);
    const coordinator = new RemoteCoordinator(room);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        coordinator.dispose();
        reject(new Error('El servidor no envió el estado.'));
      }, 10_000);
      const off = coordinator.subscribe(() => {
        if (coordinator.snapshot) {
          clearTimeout(timeout);
          off();
          resolve();
        }
      });
      room.send('sync', null);
    });
    return coordinator;
  }
  private receive(raw: unknown) {
    const parsed = RemoteSnapshotSchema.safeParse(raw);
    if (!parsed.success) {
      this.notice = 'Estado del servidor incompatible.';
      return;
    }
    const s = parsed.data;
    if (
      s.matchId !== this.room.roomId ||
      !s.players.some((p) => p.id === s.playerId) ||
      (this.snapshot &&
        (s.playerId !== this.snapshot.playerId || s.revision < this.snapshot.revision))
    )
      return;
    if (!this.snapshot) this.offset = s.serverTime - performance.now();
    this.snapshot = s;
    if (this.traceId !== s.combatId) {
      this.replay = null;
      this.traceId = null;
    }
    this.bindTrace();
    this.state = projectRemote(s, this.replay);
    this.emit();
  }
  private bindTrace() {
    if (!this.pendingTrace || this.traceId === this.snapshot.combatId) return;
    const replay = authorizedReplay(this.snapshot, this.pendingTrace);
    if (!replay) return;
    this.replay = replay;
    this.traceId = this.pendingTrace.combatId;
    this.pendingTrace = null;
  }
  get standings() {
    const s = this.snapshot;
    return s.players
      .map((p) => ({
        ...p,
        own: p.id === s.playerId,
        rival: p.id === opponent(s)?.id,
        avatarId: 'avatarId' in p ? p.avatarId : 'jade',
        position: 'provisionalPosition' in p ? p.provisionalPosition : 1,
      }))
      .sort((a, b) => a.position - b.position);
  }
  get duel() {
    const s = this.snapshot,
      own = ownPlayer(s),
      rival = opponent(s);
    return {
      own,
      rival,
      pairing: currentPairing(s),
      awaiting: 'status' in own && own.status === 'awaiting_round',
      intro:
        s.clock.currentPhase === 'combat' &&
        performance.now() + this.offset - s.clock.phaseStart < 2200,
      outcome: this.replay
        ? this.replay.result.winner === 'south'
          ? 'Victoria'
          : this.replay.result.winner === 'north'
            ? 'Derrota'
            : 'Doble derrota'
        : 'Duelo finalizado',
    };
  }
  getMatch = () => this.state;
  getClock = () => {
    const c = this.snapshot.clock;
    return {
      ...c,
      clockState: !this.connected ? ('stopped' as const) : c.clockState,
      remainingMs:
        c.clockState === 'running'
          ? Math.max(0, c.phaseDeadline - (performance.now() + this.offset))
          : c.remainingMs,
    };
  };
  getReplay = () => this.replay;
  getPlaybackMs = () =>
    this.replay
      ? this.snapshot.clock.currentPhase === 'combat'
        ? Math.min(
            this.replay.result.tick * 100 + 600,
            Math.max(0, performance.now() + this.offset - this.snapshot.clock.phaseStart),
          )
        : this.replay.result.tick * 100 + 600
      : 0;
  get names() {
    return {
      south: ownPlayer(this.snapshot).name,
      north: opponent(this.snapshot)?.name ?? 'Rival por asignar',
    };
  }
  get status() {
    return `${this.notice} · ${this.snapshot.players.filter((p) => p.connected).length}/${this.snapshot.players.length} conectados`;
  }
  get purchaseErrors() {
    return this.snapshot.purchaseErrors;
  }
  rivals() {
    return this.snapshot.players
      .filter((p) => p.id === opponent(this.snapshot)?.id)
      .flatMap((p) =>
        p.formation.flatMap((u) =>
          u.location.kind === 'board'
            ? [
                {
                  id: u.id,
                  definitionId: u.definitionId,
                  owner: 'north' as const,
                  position: reverseHex(u.location.hex),
                  profile: scaledProfile(u.definitionId, u.stars, this.state.config),
                  stars: u.stars,
                },
              ]
            : [],
        ),
      );
  }
  start() {
    if (!this.connected) return false;
    this.room.send('start', null);
    return true;
  }
  submit(intent: TimedCommand) {
    if (!this.connected || this.pending || this.getClock().currentPhase !== 'preparation')
      return false;
    this.pending = true;
    this.room.send('command', {
      version: NETWORK_VERSION,
      sessionId: this.room.sessionId,
      requestId: crypto.randomUUID(),
      sequence: this.sequence++,
      matchId: intent.matchId,
      phaseId: intent.phaseId,
      action: {
        ...intent.command,
        seq: this.state.nextActionSeq,
        expectedRevision: intent.expectedRevision,
      },
    });
    this.notice = 'Esperando confirmación del servidor';
    return true;
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit() {
    if (this.snapshot) this.listeners.forEach((l) => l());
  }
  dispose() {
    this.connected = false;
    this.notice = 'Desconectado. Vuelve a crear o unirte a una sesión.';
    this.emit();
    clearInterval(this.timer);
    clearInterval(this.pingTimer);
    this.listeners.clear();
    void this.room.leave();
  }
}
