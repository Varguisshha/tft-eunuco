import { Room, type Client } from '@colyseus/core';
import { NETWORK_VERSION } from '@tft/shared';
import { AuthoritativeMatch } from './AuthoritativeMatch';
export class MatchRoom extends Room {
  maxClients = 2;
  maxMessagesPerSecond = 30;
  private match!: AuthoritativeMatch;
  private published = -1;
  private ready = new Set<string>();
  private sentCombat = new Map<string, string>();
  onCreate() {
    this.match = new AuthoritativeMatch(this.roomId);
    this.onMessage('command', (client, payload: unknown) => {
      client.send('action_receipt', this.match.submit(client.sessionId, payload));
      this.publish();
    });
    this.onMessage('start', (client, payload: unknown) => {
      if (payload !== null) {
        client.send('protocol_error', 'invalid-payload');
        return;
      }
      if (!this.match.start(client.sessionId))
        client.send('protocol_error', 'Esperando a los dos jugadores.');
      this.publish();
    });
    this.onMessage('sync', (client, payload: unknown) => {
      if (payload !== null) return;
      this.ready.add(client.sessionId);
      this.sendView(client);
    });
    this.onMessage('ping', (client, payload: unknown) => {
      if (typeof payload === 'number' && Number.isFinite(payload) && payload >= 0)
        client.send('pong', { echo: payload, serverTime: this.match.clock.now() });
    });
    this.onMessage('*', (client) => client.send('protocol_error', 'unsupported-message'));
    this.setSimulationInterval(() => {
      this.match.pulse();
      this.publish();
    }, 50);
    // Waiting/abandoned rooms are bounded; the active match does not pause on disconnection.
    this.clock.setTimeout(() => {
      if (this.match.clock.snapshot().currentPhase === 'not_started') void this.disconnect();
    }, 300_000);
    this.clock.setTimeout(() => void this.disconnect(), 3_600_000);
  }
  onJoin(client: Client) {
    this.match.join(client.sessionId);
    if (this.match.players.length === 2) void this.lock();
    this.publish();
  }
  onLeave(client: Client) {
    this.match.disconnect(client.sessionId);
    this.sentCombat.delete(client.sessionId);
    this.ready.delete(client.sessionId);
    this.publish();
  }
  private sendView(client: Client) {
    const snapshot = this.match.snapshot(client.sessionId),
      combat = this.match.replay;
    if (combat && this.sentCombat.get(client.sessionId) !== snapshot.combatId) {
      client.send('combat_trace', {
        version: NETWORK_VERSION,
        matchId: this.roomId,
        combatId: snapshot.combatId,
        startedAt: this.match.clock.snapshot().phaseStart,
        replay: combat,
      });
      this.sentCombat.set(client.sessionId, snapshot.combatId!);
    }
    client.send('state_snapshot', snapshot);
  }
  private publish() {
    if (this.published === this.match.revision) return;
    this.published = this.match.revision;
    for (const client of this.clients) if (this.ready.has(client.sessionId)) this.sendView(client);
    if (this.match.clock.snapshot().currentPhase === 'finished')
      this.clock.setTimeout(() => void this.disconnect(), 60_000);
  }
}
