import { canUseCombatEconomy } from '@tft/game-core';
import { gameEndpoint } from './endpoint';
import { ServiceStatusSchema } from '@tft/shared';
import { Client, type Room } from '@colyseus/sdk';
import {
  COMPETITIVE_VERSION,
  RECOVERY_VERSION,
  ResumeAcceptedSchema,
  SpectateFrameSchema,
  type SpectateFrame,
  ActionReceiptSchema,
  NETWORK_VERSION,
  reverseHex,
  type MatchCoordinator,
  type MatchState,
  type CombatReplay,
  type TimedCommand,
} from '@tft/shared';
import { MAX_RECOVERY_ATTEMPTS, retryDelay, recoveryError } from './retry';
import { createItemInventory, scaledOwnedProfile, type MatchError } from '@tft/game-core';
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
  get arenaId() {
    return this.snapshot?.arenaId ?? 'mar-de-cristal';
  }
  readonly development = false;
  readonly recoveredFromSave = false;
  readonly remote = true;
  connected = true;
  lastRejection: MatchError | null = null;
  notice = 'Conectado al servidor';
  private snapshot!: RemoteSnapshot;
  private spectator: SpectateFrame | null = null;
  private spectatorSequence = 0;
  private selectedSpectatorSequence = -1;
  private pendingTrace: RemoteTrace | null = null;
  private state!: MatchState;
  private replay: CombatReplay | null = null;
  private traceId: string | null = null;
  private listeners = new Set<() => void>();
  private sequence = 0;
  private pending = false;
  private activeRequest: { id: string; sequence: number } | null = null;
  private commandTimer: ReturnType<typeof setTimeout> | undefined;
  private resynchronizing = false;
  private resumeSeen = false;
  private confirmationRevision = 0;
  private offset = 0;
  private bestRtt = Infinity;
  private timer: ReturnType<typeof setInterval>;
  private pingTimer: ReturnType<typeof setInterval>;
  recoveryStatus = '';
  private storageAvailable = true;
  private frozenPlayback = 0;
  private frozenRemaining = 0;
  recoveryAttempt = 0;
  private getToken: (() => string) | null = null;
  private disposed = false;
  private recoveryTimer: ReturnType<typeof setTimeout> | undefined;
  private recoveryRun = 0;
  private terminal = false;
  private exhausted = false;
  constructor(public room: Room) {
    this.bind(room);
    this.timer = setInterval(() => this.emit(), 50);
    this.pingTimer = setInterval(() => {
      if (this.connected) this.room.send('ping', performance.now());
    }, 2000);
  }
  private bind(room: Room) {
    const message = (type: string, callback: (raw: unknown) => void) =>
      room.onMessage(type, (raw: unknown) => {
        if (!this.disposed && this.room === room) callback(raw);
      });
    message('service_status', (raw) => {
      const parsed = ServiceStatusSchema.safeParse(raw);
      if (!parsed.success) return;
      const wasAvailable = this.storageAvailable;
      this.frozenPlayback = this.getPlaybackMs();
      this.frozenRemaining = this.snapshot ? this.getClock().remainingMs : 0;
      this.storageAvailable = parsed.data.available;
      this.pending = false;
      this.activeRequest = null;
      this.confirmationRevision = 0;
      clearTimeout(this.commandTimer);
      this.recoveryStatus = parsed.data.available ? '' : parsed.data.message;
      this.notice = parsed.data.message;
      if (parsed.data.available && !wasAvailable) this.room.send('sync', null);
      this.emit();
    });
    message('resume_accepted', (raw) => {
      const result = ResumeAcceptedSchema.safeParse(raw);
      if (
        !result.success ||
        result.data.connectionId !== room.sessionId ||
        result.data.matchId !== room.roomId
      )
        return;
      this.sequence = result.data.nextSequence;
      if (this.resynchronizing) this.resumeSeen = true;
      this.spectatorSequence = result.data.spectateSequence + 1;
      this.selectedSpectatorSequence = result.data.spectateSequence;
    });
    room.reconnection.enabled = false;
    message('combat_trace', (raw: unknown) => {
      const parsed = RemoteTraceSchema.safeParse(raw);
      if (!parsed.success || parsed.data.matchId !== room.roomId) return;
      this.pendingTrace = parsed.data;
      if (this.snapshot) {
        this.bindTrace();
        this.state = projectRemote(this.snapshot, this.replay);
        this.emit();
      }
    });
    message('spectate_snapshot', (raw: unknown) => {
      const parsed = SpectateFrameSchema.safeParse(raw);
      if (!parsed.success || !this.snapshot || !this.eliminated) return;
      const f = parsed.data;
      if (
        f.matchId !== room.roomId ||
        f.playerId !== this.snapshot.playerId ||
        f.selectionSequence !== this.selectedSpectatorSequence ||
        !('spectatingDuelId' in this.snapshot) ||
        f.combatId !== this.snapshot.spectatingDuelId ||
        !this.snapshot.pairings.some((p) => p.combatId === f.combatId && p.round === f.round) ||
        (this.spectator?.combatId === f.combatId && f.sequence < this.spectator.sequence)
      )
        return;
      this.spectator = f;
      this.emit();
    });
    message('final_results', () => {
      /* canonical result is also retained in the snapshot */
    });
    message('state_snapshot', (raw: unknown) => this.receive(raw));
    message('action_receipt', (raw: unknown) => {
      const parsed = ActionReceiptSchema.safeParse(raw);
      if (!parsed.success) {
        if (this.pending) this.resyncCommand('Respuesta incompatible.');
        return;
      }
      const r = parsed.data;
      if (!this.activeRequest) return;
      if (r.requestId === 'invalid') {
        this.resyncCommand('Solicitud rechazada por el protocolo.');
        return;
      }
      // Delayed duplicates cannot clear a newer command or pin it to a stale revision.
      if (r.requestId !== this.activeRequest.id || r.sequence !== this.activeRequest.sequence)
        return;
      clearTimeout(this.commandTimer);
      this.activeRequest = null;
      this.pending = false;
      this.confirmationRevision = r.accepted ? r.revision : 0;
      this.notice = r.accepted
        ? 'Acción confirmada por el servidor'
        : `Acción rechazada: ${r.reason}`;
      if (
        !r.accepted &&
        ['sequence', 'invalid-payload', 'identity', 'request-conflict'].includes(r.reason)
      )
        this.resyncCommand(this.notice);
      else if (!r.accepted) {
        try {
          this.room.send('sync', null);
        } catch {
          this.resyncCommand(this.notice);
        }
      } else if ((this.snapshot?.revision ?? 0) < r.revision) this.armCommandTimeout();
      this.emit();
    });
    message('protocol_error', () => {
      if (this.pending || this.confirmationRevision || this.resynchronizing)
        this.resyncCommand('El servidor rechazó la solicitud.');
      else {
        this.notice = 'Solicitud no válida. Puedes volver a intentarlo.';
        this.emit();
      }
    });
    message('pong', (raw: unknown) => {
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
    room.onLeave((code) => {
      if (this.disposed || this.room !== room) return;
      this.connected = false;
      this.pending = false;
      this.activeRequest = null;
      this.resynchronizing = false;
      this.confirmationRevision = 0;
      clearTimeout(this.commandTimer);
      if (this.snapshot && this.finalResults) {
        this.terminal = true;
        this.recoveryStatus = 'Partida finalizada. Resultado conservado.';
        this.notice = this.recoveryStatus;
        this.emit();
        return;
      }
      const reason = recoveryError({ code });
      this.terminal = !!reason;
      this.recoveryStatus = reason ?? 'Conexión perdida. Intentando recuperar tu partida…';
      this.notice = this.recoveryStatus;
      if (!reason && this.getToken) this.scheduleRecovery();
      this.emit();
    });
    room.send('ping', performance.now());
  }
  static async connect(mode: 'create' | 'join', matchId = '', token: string) {
    const endpoint = gameEndpoint(
      import.meta.env.VITE_GAME_SERVER_URL,
      typeof location === 'undefined' ? 'http://127.0.0.1' : location.href,
      !!import.meta.env.DEV,
    );
    if (
      !['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname) &&
      !['https:', 'wss:'].includes(endpoint.protocol)
    )
      throw new Error('El servidor remoto requiere una conexión segura.');
    const client = new Client(endpoint.href);
    client.auth.token = token;
    const room =
      mode === 'create'
        ? await client.create('test_match')
        : await client.joinById(matchId, { recoveryVersion: RECOVERY_VERSION });
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
  enableRecovery(getToken: () => string) {
    this.getToken = getToken;
  }
  get canRetry() {
    return !this.connected && !this.terminal && !this.disposed && this.exhausted;
  }
  retry = () => {
    if (!this.canRetry) return;
    clearTimeout(this.recoveryTimer);
    this.recoveryAttempt = 0;
    this.exhausted = false;
    this.scheduleRecovery();
  };
  private scheduleRecovery() {
    if (this.disposed || !this.getToken || this.terminal) return;
    if (this.recoveryAttempt >= MAX_RECOVERY_ATTEMPTS) {
      this.exhausted = true;
      this.recoveryStatus = 'No se pudo recuperar la conexión. Puedes volver a intentarlo.';
      this.emit();
      return;
    }
    const run = ++this.recoveryRun;
    const delay = retryDelay(this.recoveryAttempt++);
    this.recoveryStatus = `Conexión perdida · Reintento ${this.recoveryAttempt}/${MAX_RECOVERY_ATTEMPTS}`;
    this.emit();
    this.recoveryTimer = setTimeout(() => {
      void this.recover(run);
    }, delay);
  }
  private async recover(run: number) {
    let candidate: RemoteCoordinator | undefined;
    try {
      const token = this.getToken?.();
      if (!token) throw { code: 401 };
      candidate = await RemoteCoordinator.connect('join', this.room.roomId, token);
      if (this.disposed || run !== this.recoveryRun) {
        candidate.dispose();
        return;
      }
      // Adopt a fully synchronized connection without replaying any pending command.
      const room = candidate.room;
      this.snapshot = candidate.snapshot;
      this.state = candidate.state;
      this.replay = candidate.replay;
      this.traceId = candidate.traceId;
      this.pendingTrace = candidate.pendingTrace;
      this.sequence = candidate.sequence;
      this.spectatorSequence = candidate.spectatorSequence;
      this.selectedSpectatorSequence = candidate.selectedSpectatorSequence;
      this.spectator = candidate.spectator;
      this.offset = candidate.offset;
      this.bestRtt = candidate.bestRtt;
      candidate.disposed = true;
      clearInterval(candidate.timer);
      clearInterval(candidate.pingTimer);
      this.room = room;
      this.bind(room);
      this.connected = true;
      this.pending = false;
      this.activeRequest = null;
      this.resynchronizing = false;
      this.confirmationRevision = 0;
      clearTimeout(this.commandTimer);
      this.recoveryAttempt = 0;
      this.recoveryStatus = 'Partida recuperada';
      this.notice = 'Conectado al servidor';
      room.send('sync', null);
      this.emit();
      this.recoveryTimer = setTimeout(() => {
        this.recoveryStatus = '';
        this.emit();
      }, 3500);
    } catch (error) {
      candidate?.dispose();
      if (this.disposed || run !== this.recoveryRun) return;
      const reason = recoveryError(error);
      if (reason) {
        this.terminal = true;
        this.recoveryStatus = reason;
        this.emit();
      } else this.scheduleRecovery();
    }
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
    if (this.resynchronizing && this.resumeSeen) {
      this.resynchronizing = false;
      this.resumeSeen = false;
      clearTimeout(this.commandTimer);
      this.notice = 'Control recuperado. Puedes volver a colocar tus unidades.';
    }
    if (!this.pending && !this.resynchronizing && s.revision >= this.confirmationRevision) {
      this.confirmationRevision = 0;
      clearTimeout(this.commandTimer);
    }
    if (
      !('spectatingDuelId' in s) ||
      this.spectator?.combatId !== s.spectatingDuelId ||
      s.clock.currentPhase !== 'combat'
    )
      this.spectator = null;
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
        position:
          'finalPosition' in p && p.finalPosition !== null
            ? p.finalPosition
            : 'provisionalPosition' in p
              ? p.provisionalPosition
              : 1,
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
  get roundSettlement() {
    return 'ownSettlement' in this.snapshot ? this.snapshot.ownSettlement : null;
  }
  get purchaseUpgrades() {
    return this.snapshot.purchaseUpgrades ?? [];
  }
  get currentRound() {
    return Number(this.snapshot.clock.roundId.split('/').at(-1));
  }
  get player() {
    return ownPlayer(this.snapshot);
  }
  get eliminated() {
    return 'eliminated' in this.player && this.player.eliminated;
  }
  get finalResults() {
    return 'finalResults' in this.snapshot ? this.snapshot.finalResults : null;
  }
  get spectating() {
    return 'spectating' in this.player && this.player.spectating;
  }
  get spectatorDuels() {
    return 'pairings' in this.snapshot ? this.snapshot.pairings : [];
  }
  get selectedDuelId() {
    return 'spectatingDuelId' in this.snapshot ? this.snapshot.spectatingDuelId : null;
  }
  getSpectatorFrame = () => this.spectator;
  spectate(duelId: string | null) {
    if (!this.connected || !this.eliminated || this.finalResults) return false;
    this.spectator = null;
    this.selectedSpectatorSequence = this.spectatorSequence++;
    this.room.send('spectate_duel', {
      version: COMPETITIVE_VERSION,
      matchId: this.snapshot.matchId,
      phaseId: this.snapshot.clock.phaseId,
      sequence: this.selectedSpectatorSequence,
      duelId,
    });
    this.emit();
    return true;
  }
  getMatch = () => this.state;
  getClock = () => {
    const c = this.snapshot.clock;
    return {
      ...c,
      clockState: !this.connected || !this.storageAvailable ? ('stopped' as const) : c.clockState,
      remainingMs: !this.storageAvailable
        ? this.frozenRemaining
        : c.clockState === 'running'
          ? Math.max(0, c.phaseDeadline - (performance.now() + this.offset))
          : c.remainingMs,
    };
  };
  getReplay = () => this.replay;
  getPlaybackMs = (): number =>
    !this.storageAvailable
      ? this.frozenPlayback
      : this.replay
        ? this.snapshot.clock.currentPhase === 'combat'
          ? Math.min(
              this.replay.result.tick * 100 + 600,
              Math.max(0, performance.now() + this.offset - this.snapshot.clock.phaseStart),
            )
          : this.replay.result.tick * 100 + 600
        : 0;
  get names() {
    if (this.spectator)
      return {
        south:
          this.snapshot.players.find((p) => p.id === this.spectator?.southPlayerId)?.name ??
          'Participante',
        north:
          this.snapshot.players.find((p) => p.id === this.spectator?.northPlayerId)?.name ??
          'Participante',
      };
    return {
      south: ownPlayer(this.snapshot).name,
      north: opponent(this.snapshot)?.name ?? 'Rival por asignar',
    };
  }
  get status() {
    return `${this.notice} · ${this.snapshot.players.filter((p) => p.connected).length}/${this.snapshot.players.length} conectados`;
  }
  get serviceReady() {
    return this.storageAvailable;
  }
  get requestPending() {
    return (
      this.pending ||
      this.resynchronizing ||
      (this.snapshot?.revision ?? 0) < this.confirmationRevision
    );
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
                  // Public equipment belongs to this rival; never borrow our private inventory.
                  profile: scaledOwnedProfile(
                    u,
                    this.state.config,
                    this.state.config.itemCatalog
                      ? createItemInventory(p.id, this.state.config.itemCatalog)
                      : undefined,
                    this.state.round,
                    this.state.seed,
                  ),
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
    if (
      !this.connected ||
      !this.storageAvailable ||
      this.eliminated ||
      this.finalResults ||
      this.requestPending ||
      (this.getClock().currentPhase !== 'preparation' &&
        !canUseCombatEconomy(this.state, intent.command))
    )
      return false;
    this.pending = true;
    const requestId = crypto.randomUUID(),
      sequence = this.sequence++;
    this.activeRequest = { id: requestId, sequence };
    this.armCommandTimeout();
    try {
      this.room.send('command', {
        version: NETWORK_VERSION,
        sessionId: this.room.sessionId,
        requestId,
        sequence,
        matchId: intent.matchId,
        phaseId: intent.phaseId,
        action: {
          ...intent.command,
          seq: this.state.nextActionSeq,
          expectedRevision: intent.expectedRevision,
        },
      });
    } catch {
      this.resyncCommand('No se pudo enviar la acción.');
      return false;
    }
    this.notice = 'Esperando confirmación del servidor';
    return true;
  }
  private armCommandTimeout() {
    clearTimeout(this.commandTimer);
    this.commandTimer = setTimeout(() => {
      if (!this.disposed && (this.pending || this.confirmationRevision || this.resynchronizing))
        this.resyncCommand('La confirmación ha tardado demasiado.');
    }, 8000);
  }
  private resyncCommand(reason: string) {
    if (this.disposed || !this.connected) return;
    clearTimeout(this.commandTimer);
    this.pending = false;
    this.activeRequest = null;
    this.confirmationRevision = 0;
    this.resynchronizing = true;
    this.resumeSeen = false;
    this.notice = `${reason} Sincronizando el control…`;
    // Request state/sequence; never replay an action with an uncertain outcome.
    try {
      this.room.send('sync', null);
      this.armCommandTimeout();
    } catch {
      this.connected = false;
      this.resynchronizing = false;
      this.scheduleRecovery();
    }
    this.emit();
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
  stopRecovery(reason: string) {
    this.recoveryStatus = reason;
    this.terminal = true;
    this.dispose();
  }
  dispose() {
    this.disposed = true;
    this.recoveryRun++;
    clearTimeout(this.recoveryTimer);
    clearTimeout(this.commandTimer);
    this.connected = false;
    this.notice = 'Desconectado. Vuelve a crear o unirte a una sesión.';
    this.emit();
    clearInterval(this.timer);
    clearInterval(this.pingTimer);
    this.listeners.clear();
    void this.room.leave();
  }
}
