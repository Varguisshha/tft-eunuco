import { Room, ServerError, matchMaker, type Client } from '@colyseus/core';
import { randomUUID } from 'node:crypto';
import { LobbyCapacitySchema, type LobbySnapshot } from '@tft/shared';
import { LobbyHub } from './LobbyHub';
import { MatchRoom } from './MatchRoom';
import { verifyIdentity, type VerifiedIdentity, type VerifyIdentity } from './auth';
type Permit = {
  users: string[];
  roster: LobbySnapshot['participants'];
  started: () => void;
  ended: () => void;
};
/** A permit never crosses the wire. Client-selected options cannot create a private match. */
export function lobbyRooms(verify: VerifyIdentity = verifyIdentity, BaseMatch = MatchRoom) {
  const permits = new Map<string, Permit>();
  class PrivateMatch extends BaseMatch {
    private permit!: Permit;
    private began = false;
    protected manualStart = false;
    protected modernProtocol = true;
    protected createMatch() {
      return super.createMatch(LobbyCapacitySchema.parse(this.permit.users.length));
    }
    autoDispose = false;
    onCreate(options: { ticket?: string } = {}) {
      const permit = permits.get(options.ticket ?? '');
      if (!permit) throw new ServerError(403, 'La partida debe iniciarse desde una sala privada.');
      permits.delete(options.ticket!);
      this.permit = permit;
      super.onCreate();
      void this.setPrivate(true);
      // Every frozen participant must authenticate and request its first snapshot.
      this.clock.setInterval(() => {
        if (
          !this.began &&
          this.match.players.length === this.permit.users.length &&
          this.ready.size === this.permit.users.length &&
          this.clients.every((client) => this.valid(client)) &&
          this.match.start(this.clients[0]!.sessionId)
        ) {
          this.began = true;
          this.permit.started();
        }
      }, 50);
      this.clock.setTimeout(() => {
        if (!this.began) void this.disconnect();
      }, 25_000);
    }
    onJoin(client: Client, options: unknown, auth?: VerifiedIdentity) {
      if (!auth || !this.permit.users.includes(auth.userId))
        throw new ServerError(403, 'No perteneces a esta partida.');
      const frozen = this.permit.roster.find((p) => p.userId === auth.userId)!;
      super.onJoin(client, options, { ...auth, name: frozen.name, avatarId: frozen.avatarId });
    }
    onLeave(client: Client) {
      super.onLeave(client);
      if (this.began && this.clients.length === 0) void this.disconnect();
    }
    onDispose() {
      this.permit?.ended();
    }
  }
  const hub = new LobbyHub(async (users, started, ended, roster) => {
    const ticket = randomUUID();
    permits.set(ticket, { users: [...users], roster: structuredClone(roster), started, ended });
    try {
      const room = await matchMaker.createRoom('private_match', { ticket });
      return {
        id: room.roomId,
        cancel: async () => {
          await matchMaker.remoteRoomCall(room.roomId, 'disconnect');
        },
      };
    } finally {
      permits.delete(ticket);
    }
  });
  class LobbyRoom extends Room {
    maxClients = 1;
    maxMessagesPerSecond = 12;
    private identity?: VerifiedIdentity;
    private attached = false;
    static async onAuth(token: string) {
      try {
        return await verify(token);
      } catch {
        throw new ServerError(401, 'Inicia sesión con una cuenta verificada.');
      }
    }
    onCreate() {
      void this.setPrivate(true);
      this.onMessage('lobby_action', (client, payload: unknown) => {
        if (this.valid(client)) void hub.action(this.identity!.userId, payload);
      });
      this.onMessage('authenticate', async (client, token: unknown) => {
        const previous = this.identity;
        try {
          const next = await verify(token);
          if (!previous || next.userId !== previous.userId || !this.clients.includes(client))
            throw new Error('Invalid identity');
          this.identity = next;
        } catch {
          void client.leave(4001);
        }
      });
      this.onMessage('*', (client) => client.send('protocol_error', 'Solicitud no compatible.'));
      this.clock.setInterval(() => {
        hub.sweep();
        const previous = this.identity;
        const client = this.clients[0];
        if (!client || !previous || !this.valid(client)) return;
        void verify(previous.token).catch(() => {
          if (this.identity === previous) void client.leave(4001);
        });
      }, 5000);
    }
    onJoin(_client: Client, _options: unknown, auth?: VerifiedIdentity) {
      if (!auth || auth.expiresAt <= Date.now()) throw new ServerError(401, 'Sesión caducada.');
      this.identity = auth;
      try {
        hub.connect(auth, (event) => this.clients[0]?.send('lobby_event', event));
        this.attached = true;
      } catch {
        throw new ServerError(409, 'Tu cuenta ya está conectada en otra ventana.');
      }
    }
    private valid(client: Client) {
      if (!this.identity || this.identity.expiresAt <= Date.now()) {
        void client.leave(4001);
        return false;
      }
      return true;
    }
    onLeave() {
      if (this.attached && this.identity) {
        hub.disconnect(this.identity.userId);
        this.attached = false;
      }
    }
    onDispose() {
      // The last gateway must still expire disconnected/empty rooms after its own clock stops.
      const cleanup = setTimeout(() => hub.sweep(), 31_000);
      cleanup.unref();
    }
  }
  return { LobbyRoom, PrivateMatch, hub };
}
