import { AuthoritativeMatch } from './AuthoritativeMatch';
import { DurableMatch } from './persistence/DurableMatch';
import type { MatchRepository } from './persistence/repository';
import type { StoredMatch } from './persistence/snapshot';
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
  lobby?: LobbySnapshot;
  saved?: StoredMatch;
};
/** A permit never crosses the wire. Client-selected options cannot create a private match. */
export function lobbyRooms(
  verify: VerifyIdentity = verifyIdentity,
  BaseMatch = MatchRoom,
  repository?: MatchRepository,
) {
  const permits = new Map<string, Permit>();
  const active = new Set<PrivateMatch>();
  class PrivateMatch extends BaseMatch {
    private permit!: Permit;
    private began = false;
    protected recoverable = true;
    protected manualStart = false;
    protected modernProtocol = true;
    protected createMatch() {
      return this.permit.saved
        ? AuthoritativeMatch.restore(this.permit.saved.authority)
        : super.createMatch(LobbyCapacitySchema.parse(this.permit.users.length));
    }
    autoDispose = false;
    async onCreate(options: { ticket?: string } = {}) {
      const permit = permits.get(options.ticket ?? '');
      if (!permit) throw new ServerError(403, 'La partida debe iniciarse desde una sala privada.');
      permits.delete(options.ticket!);
      this.permit = permit;
      if (repository) this.roomId = permit.saved?.id ?? randomUUID();
      super.onCreate();
      if (repository && permit.lobby) {
        this.durable = new DurableMatch(
          this.match,
          repository,
          { ...permit.lobby, matchId: this.roomId },
          permit.saved,
        );
        await this.mutate(() => {});
      }
      active.add(this);
      if (permit.saved)
        this.clock.setTimeout(
          () => void this.disconnect(),
          Math.max(1, permit.saved.expiresAt - Date.now()),
        );
      this.began = !!permit.saved && permit.saved.authority.clock.currentPhase !== 'not_started';
      void this.setPrivate(true);
      // Every frozen participant must authenticate and request its first snapshot.
      this.clock.setInterval(() => {
        if (
          !this.began &&
          !this.durable?.unavailable &&
          this.match.players.length === this.permit.users.length &&
          this.ready.size === this.permit.users.length &&
          this.clients.every((client) => this.valid(client))
        ) {
          this.began = true;
          void this.mutate(() => this.match.start(this.clients[0]!.sessionId))
            .then((ok) => {
              if (ok) this.permit.started();
              else this.began = false;
            })
            .catch(() => {
              this.began = false;
            });
        }
      }, 50);
      this.clock.setTimeout(() => {
        if (!this.began) void this.disconnect();
      }, 25_000);
    }
    async onJoin(client: Client, options: unknown, auth?: VerifiedIdentity) {
      if (!auth || !this.permit.users.includes(auth.userId))
        throw new ServerError(403, 'No perteneces a esta partida.');
      const frozen = this.permit.roster.find((p) => p.userId === auth.userId)!;
      await this.mutate(() =>
        super.onJoin(client, options, { ...auth, name: frozen.name, avatarId: frozen.avatarId }),
      );
    }
    onLeave(client: Client) {
      super.onLeave(client);
      // Keep authority alive until final retention or the one-hour hard limit.
    }
    async onDispose() {
      active.delete(this);
      try {
        await this.durable?.close();
      } finally {
        this.permit?.ended();
      }
    }
  }
  const hub = new LobbyHub(async (users, started, ended, roster, lobby) => {
    const ticket = randomUUID();
    permits.set(ticket, {
      users: [...users],
      roster: structuredClone(roster),
      started,
      ended,
      ...(lobby ? { lobby } : {}),
    });
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
        hub.connect(
          auth,
          (event) => this.clients[0]?.send('lobby_event', event),
          () => {
            this.attached = false;
            void this.clients[0]?.leave(4002, 'connection_superseded');
          },
        );
        this.attached = true;
      } catch {
        throw new ServerError(409, 'Tu cuenta ya está conectada en otra ventana.');
      }
    }
    private valid(client: Client) {
      if (!this.attached || !this.identity || this.identity.expiresAt <= Date.now()) {
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
  async function restore() {
    if (!repository) return;
    for (const saved of await repository.load()) {
      // Validate before creating any transport. Corrupt/incompatible state fails startup closed.
      AuthoritativeMatch.restore(saved.authority);
      if (
        saved.id !== saved.authority.id ||
        saved.lobby.matchId !== saved.id ||
        saved.lobby.capacity !== saved.authority.capacity ||
        saved.authority.players.some(
          (p) => !saved.lobby.participants.some((member) => member.userId === p.id),
        )
      )
        throw new Error('Invalid recovery membership');
      const ticket = randomUUID();
      let ended = () => {};
      permits.set(ticket, {
        users: saved.lobby.participants.map((p) => p.userId),
        roster: saved.lobby.participants,
        lobby: saved.lobby,
        saved,
        started: () => {},
        ended: () => ended(),
      });
      try {
        const room = await matchMaker.createRoom('private_match', { ticket });
        ended = hub.restoreMatch(saved.lobby, room.roomId);
      } finally {
        permits.delete(ticket);
      }
    }
  }
  return {
    LobbyRoom,
    PrivateMatch,
    hub,
    restore,
    checkpoint: async () => {
      const results = await Promise.allSettled([...active].map((room) => room.persistShutdown()));
      if (results.some((r) => r.status === 'rejected'))
        console.warn(
          'Persistence checkpoint unavailable during shutdown; recover last durable commit.',
        );
    },
  };
}
