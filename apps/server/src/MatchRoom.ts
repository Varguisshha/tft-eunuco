import { P11K_ECONOMY_CONFIG, JARAMILLO_ECONOMY_CONFIG } from '@tft/game-data';
import type { DurableMatch } from './persistence/DurableMatch';
import { Room, ServerError, type Client } from '@colyseus/core';
import {
  NETWORK_VERSION,
  PAIRING_VERSION,
  RECOVERY_VERSION,
  ResumeAcceptedSchema,
  ResumeRequestSchema,
} from '@tft/shared';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import { verifyIdentity, type VerifiedIdentity } from './auth';
export class MatchRoom extends Room {
  static async onAuth(token: string) {
    try {
      return await verifyIdentity(token);
    } catch {
      throw new ServerError(401, 'Inicia sesión con una cuenta verificada.');
    }
  }
  protected verify = verifyIdentity;
  private credentials = new Map<string, VerifiedIdentity>();
  maxClients = 2;
  maxMessagesPerSecond = 30;
  protected match!: AuthoritativeMatch;
  private published = -1;
  protected ready = new Set<string>();
  private sentFinal = new Set<string>();
  private sentSpectate = new Map<string, string>();
  private finishScheduled = false;
  protected finalRetentionMs = 300_000;
  private sentCombat = new Map<string, string>();
  protected durable?: DurableMatch;
  private transaction = false;
  private shuttingDown = false;
  private ticking = false;
  private lastCheckpoint = 0;
  protected mutate<T>(operation: () => T): Promise<T> {
    if (!this.durable) return Promise.resolve(operation());
    return this.durable
      .run((candidate) => {
        const old = this.match;
        this.match = candidate;
        this.transaction = true;
        try {
          return operation();
        } finally {
          this.match = old;
          this.transaction = false;
        }
      })
      .then((result) => {
        this.match = this.durable!.match;
        this.publish();
        return result;
      });
  }
  private failed() {
    if (this.shuttingDown) return;
    if (this.durable) this.match = this.durable.match;
    this.published = -1;
    this.publish();
    for (const client of this.clients)
      client.send('service_status', {
        version: 1,
        available: false,
        message: 'Servicio temporalmente no disponible. La partida está pausada.',
      });
  }
  async persistShutdown() {
    this.shuttingDown = true;
    for (const c of this.clients)
      c.send('service_status', {
        version: 1,
        available: false,
        message: 'Servidor reiniciando. Tu partida se conservará.',
      });
    try {
      if (this.durable) await this.durable.shutdown();
    } finally {
      for (const c of this.clients) void c.leave(4003, 'server_restarting');
    }
  }
  protected recoverable = false;
  protected manualStart = true;
  protected modernProtocol = false;
  protected createMatch(capacity: 2 | 3 | 4 = 2) {
    return new AuthoritativeMatch(
      this.roomId,
      undefined,
      undefined,
      capacity,
      this.modernProtocol ? P11K_ECONOMY_CONFIG : JARAMILLO_ECONOMY_CONFIG,
    );
  }
  onCreate() {
    this.match = this.createMatch();
    // Transport headroom permits an authenticated replacement before closing the old socket.
    // Logical capacity remains in AuthoritativeMatch; private membership gates every join.
    this.maxClients = this.recoverable ? 16 : this.match.capacity;
    this.onMessage('command', (client, payload: unknown) => {
      if (!this.valid(client)) return;
      if (!this.durable) {
        client.send('action_receipt', this.match.submit(client.sessionId, payload));
        this.publish();
        return;
      }
      void this.mutate(() => {
        if (!this.valid(client)) throw new Error('Old connection');
        return this.match.submit(client.sessionId, payload);
      })
        .then((receipt) => client.send('action_receipt', receipt))
        .catch(() => this.failed());
    });
    this.onMessage('start', (client, payload: unknown) => {
      if (!this.valid(client)) return;
      if (payload !== null) {
        client.send('protocol_error', 'invalid-payload');
        return;
      }
      if (!this.manualStart || !this.match.start(client.sessionId))
        client.send('protocol_error', 'Esperando a todos los jugadores.');
      this.publish();
    });
    this.onMessage('sync', (client, payload: unknown) => {
      if (payload !== null || !this.valid(client)) return;
      this.ready.add(client.sessionId);
      if (this.durable)
        client.send('service_status', {
          version: 1,
          available: !this.durable.unavailable,
          message: this.durable.unavailable
            ? 'Servicio temporalmente no disponible. La partida está pausada.'
            : 'Servicio disponible',
        });
      if (this.recoverable) {
        const p = this.match.players.find((p) => p.sessionId === client.sessionId)!;
        const clock = this.match.clock.snapshot();
        client.send(
          'resume_accepted',
          ResumeAcceptedSchema.parse({
            version: RECOVERY_VERSION,
            matchId: this.roomId,
            participantId: p.id,
            connectionId: client.sessionId,
            generation: p.generation,
            nextSequence: p.sequence,
            spectateSequence: p.spectateSequence,
            roundId: clock.roundId,
            phaseId: clock.phaseId,
            duelId: p.eliminated
              ? p.spectatingDuelId
              : (this.match.duelFor(client.sessionId)?.pairing.combatId ?? null),
            revision: this.match.revision,
          }),
        );
      }
      this.sendView(client);
    });
    this.onMessage('spectate_duel', (client, payload: unknown) => {
      if (!this.valid(client)) return;
      void this.mutate(() => this.valid(client) && this.match.spectate(client.sessionId, payload))
        .then((ok) => {
          if (!ok) client.send('protocol_error', 'spectate-denied');
          this.publish();
        })
        .catch(() => this.failed());
    });
    this.onMessage('ping', (client, payload: unknown) => {
      if (typeof payload === 'number' && Number.isFinite(payload) && payload >= 0)
        client.send('pong', { echo: payload, serverTime: this.match.clock.now() });
    });
    this.onMessage('*', (client) => client.send('protocol_error', 'unsupported-message'));
    this.onMessage('authenticate', async (client, token: unknown) => {
      try {
        const previous = this.credentials.get(client.sessionId);
        const identity = await this.verify(token);
        if (!previous || identity.userId !== previous.userId || !this.clients.includes(client))
          throw new Error('Session changed');
        this.credentials.set(client.sessionId, identity);
      } catch {
        void client.leave(4001);
      }
    });
    this.clock.setInterval(() => {
      for (const client of this.clients) {
        const current = this.credentials.get(client.sessionId);
        if (!current) {
          void client.leave(4001);
          continue;
        }
        if (!this.valid(client)) continue;
        void this.verify(current.token).then(
          () => {},
          () => {
            if (this.credentials.get(client.sessionId) === current) void client.leave(4001);
          },
        );
      }
    }, 15000);
    this.setSimulationInterval(() => {
      // Keep the room clock ticking for authentication and expiry, without cloning a final.
      if (this.match.finalResults && !this.durable?.unavailable) {
        this.publish();
        return;
      }
      if (this.durable) {
        if (this.ticking) return;
        if (this.durable.unavailable) {
          this.ticking = true;
          void this.durable
            .retry()
            .then(() => {
              this.match = this.durable!.match;
              if (!this.durable!.unavailable) {
                for (const c of this.clients)
                  c.send('service_status', {
                    version: 1,
                    available: true,
                    message: 'Partida recuperada',
                  });
                this.published = -1;
                this.publish();
              }
            })
            .finally(() => {
              this.ticking = false;
            });
          return;
        }
        const phase = this.match.clock.snapshot();
        const due = phase.clockState === 'running' && phase.remainingMs <= 0;
        if (due || Date.now() - this.lastCheckpoint >= 1000) {
          this.ticking = true;
          this.lastCheckpoint = Date.now();
          void this.mutate(() => this.match.pulse())
            .catch(() => this.failed())
            .finally(() => {
              this.ticking = false;
            });
        }
      } else {
        this.match.pulse();
        this.publish();
      }
      for (const client of this.clients)
        if (this.ready.has(client.sessionId)) this.sendSpectator(client);
    }, 50);
    // Waiting/abandoned rooms are bounded; the active match does not pause on disconnection.
    this.clock.setTimeout(() => {
      if (this.match.clock.snapshot().currentPhase === 'not_started') void this.disconnect();
    }, 300_000);
    this.clock.setTimeout(() => void this.disconnect(), 3_600_000);
  }
  onJoin(client: Client, _options: unknown, auth?: VerifiedIdentity) {
    if (this.shuttingDown) throw new ServerError(503, 'Servidor reiniciando');
    if (!auth || auth.expiresAt <= Date.now()) throw new ServerError(401, 'Sesión no válida.');
    this.credentials.set(client.sessionId, auth);
    const existing = this.match.players.find((p) => p.id === auth.userId);
    if (existing && this.recoverable && ResumeRequestSchema.safeParse(_options).success) {
      const oldId = existing.sessionId;
      this.match.resume(client.sessionId, auth.userId);
      this.credentials.delete(oldId);
      this.ready.delete(oldId);
      const old = this.clients.find((c) => c.sessionId === oldId);
      if (old) void old.leave(4002, 'connection_superseded');
    } else this.match.join(client.sessionId, auth);
    if (!this.recoverable && this.match.players.length === this.match.capacity) void this.lock();
    this.publish();
  }
  onLeave(client: Client) {
    this.credentials.delete(client.sessionId);
    if (this.durable) {
      // Expired finals cannot be written again; transport eviction is purely volatile.
      if (!this.match.finalResults || this.durable.retentionDeadline > Date.now())
        void this.mutate(() => this.match.disconnect(client.sessionId)).catch(() => this.failed());
    } else this.match.disconnect(client.sessionId);
    this.sentCombat.delete(client.sessionId);
    this.sentSpectate.delete(client.sessionId);
    this.sentFinal.delete(client.sessionId);
    this.ready.delete(client.sessionId);
    this.publish();
  }
  onDispose() {
    this.credentials.clear();
    this.ready.clear();
    this.sentCombat.clear();
    this.sentSpectate.clear();
    this.sentFinal.clear();
  }
  protected valid(client: Client) {
    const auth = this.credentials.get(client.sessionId);
    if (
      !auth ||
      auth.expiresAt <= Date.now() ||
      !this.match.players.some((p) => p.sessionId === client.sessionId && p.connected)
    ) {
      void client.leave(4001);
      return false;
    }
    return true;
  }
  private sendView(client: Client) {
    if (!this.valid(client)) return;
    const modern = this.modernProtocol || this.match.capacity > 2;
    const snapshot = modern
        ? this.match.competitiveSnapshot(client.sessionId)
        : this.match.snapshot(client.sessionId),
      duel = this.match.players.find((p) => p.sessionId === client.sessionId)?.eliminated
        ? null
        : this.match.duelFor(client.sessionId),
      combat = duel?.replay;
    if (combat && this.sentCombat.get(client.sessionId) !== snapshot.combatId) {
      client.send('combat_trace', {
        version: modern ? PAIRING_VERSION : NETWORK_VERSION,
        ...(modern
          ? {
              pairing: duel!.pairing,
              side: duel!.pairing.southPlayerId === snapshot.playerId ? 'south' : 'north',
            }
          : {}),
        matchId: this.roomId,
        combatId: snapshot.combatId,
        startedAt: this.match.clock.snapshot().phaseStart,
        replay: combat,
      });
      this.sentCombat.set(client.sessionId, snapshot.combatId!);
    }
    client.send('state_snapshot', snapshot);
    const final = this.match.finalResults;
    if (modern && final && !this.sentFinal.has(client.sessionId)) {
      client.send('final_results', final);
      this.sentFinal.add(client.sessionId);
    }
  }
  private sendSpectator(client: Client) {
    if (!this.valid(client)) return;
    const frame = this.match.spectatorFrame(client.sessionId);
    if (!frame) return;
    const key = `${frame.combatId}/${frame.selectionSequence}/${frame.sequence}`;
    if (this.sentSpectate.get(client.sessionId) === key) return;
    this.sentSpectate.set(client.sessionId, key);
    client.send('spectate_snapshot', frame);
  }
  protected publish() {
    if (this.transaction) return;
    if (this.match.finalResults && !this.finishScheduled) {
      this.finishScheduled = true;
      const deadline = this.durable?.retentionDeadline ?? Date.now() + this.finalRetentionMs;
      const expire = () => {
        // Room-clock deltas can straddle the wall-clock deadline. Never evict early:
        // onLeave would otherwise persist a redundant final just before expiry.
        const remaining = deadline - Date.now();
        if (remaining > 0) this.clock.setTimeout(expire, remaining);
        else void this.disconnect();
      };
      this.clock.setTimeout(expire, Math.max(1, deadline - Date.now()));
    }
    if (this.published === this.match.revision) return;
    this.published = this.match.revision;
    for (const client of this.clients) if (this.ready.has(client.sessionId)) this.sendView(client);
  }
}
