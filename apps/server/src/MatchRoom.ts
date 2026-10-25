import { Room, ServerError, type Client } from '@colyseus/core';
import { NETWORK_VERSION, PAIRING_VERSION } from '@tft/shared';
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
  private sentCombat = new Map<string, string>();
  protected manualStart = true;
  protected modernProtocol = false;
  protected createMatch(capacity: 2 | 3 | 4 = 2) {
    return new AuthoritativeMatch(this.roomId, undefined, undefined, capacity);
  }
  onCreate() {
    this.match = this.createMatch();
    this.maxClients = this.match.capacity;
    this.onMessage('command', (client, payload: unknown) => {
      if (!this.valid(client)) return;
      client.send('action_receipt', this.match.submit(client.sessionId, payload));
      this.publish();
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
      this.sendView(client);
    });
    this.onMessage('spectate_duel', (client, payload: unknown) => {
      if (!this.valid(client)) return;
      if (!this.match.spectate(client.sessionId, payload))
        client.send('protocol_error', 'spectate-denied');
      this.publish();
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
      this.match.pulse();
      this.publish();
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
    if (!auth || auth.expiresAt <= Date.now()) throw new ServerError(401, 'Sesión no válida.');
    this.credentials.set(client.sessionId, auth);
    this.match.join(client.sessionId, auth);
    if (this.match.players.length === this.match.capacity) void this.lock();
    this.publish();
  }
  onLeave(client: Client) {
    this.credentials.delete(client.sessionId);
    this.match.disconnect(client.sessionId);
    this.sentCombat.delete(client.sessionId);
    this.ready.delete(client.sessionId);
    this.publish();
  }
  protected valid(client: Client) {
    const auth = this.credentials.get(client.sessionId);
    if (!auth || auth.expiresAt <= Date.now()) {
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
  private publish() {
    if (this.published === this.match.revision) return;
    this.published = this.match.revision;
    for (const client of this.clients) if (this.ready.has(client.sessionId)) this.sendView(client);
    if (this.match.clock.snapshot().currentPhase === 'finished' && !this.finishScheduled) {
      this.finishScheduled = true;
      this.clock.setTimeout(() => void this.disconnect(), 300_000);
    }
  }
}
