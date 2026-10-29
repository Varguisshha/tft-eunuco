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
  finalRetentionMs = 300_000,
  limits: { maxMatches?: number; maxGateways?: number } = {},
) {
  const permits = new Map<string, Permit>();
  const active = new Set<PrivateMatch>();
  let pendingMatches = 0;
  let gateways = 0;
  class PrivateMatch extends BaseMatch {
    private permit!: Permit;
    private began = false;
    protected recoverable = true;
    protected finalRetentionMs = finalRetentionMs;
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
      this.arenaId = permit.lobby?.arenaId ?? 'mar-de-cristal';
      if (repository) this.roomId = permit.saved?.id ?? randomUUID();
      super.onCreate();
      if (repository && permit.lobby) {
        this.durable = new DurableMatch(
          this.match,
          repository,
          { ...permit.lobby, matchId: this.roomId },
          permit.saved,
          finalRetentionMs,
        );
        if (!permit.saved) await this.mutate(() => {});
      }
      active.add(this);
      if (permit.saved && !this.match.finalResults)
        this.clock.setTimeout(
          () => void this.disconnect(),
          Math.max(1, permit.saved.expiresAt - Date.now()),
        );
      this.began = !!permit.saved && permit.saved.authority.clock.currentPhase !== 'not_started';
      // Hydration owns the live authority; the permit must not retain its source graph.
      delete permit.saved;
      this.publish();
      void this.setPrivate(true);
      // Every frozen participant must authenticate and request its first snapshot.
      const startGate = this.clock.setInterval(() => {
        if (this.began) {
          // A pending/failed start must retain its gate until the committed phase advances.
          if (this.match.clock.snapshot().currentPhase !== 'not_started') startGate.clear();
          return;
        }
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
      if (this.match.finalResults && this.durable && this.durable.retentionDeadline <= Date.now())
        throw new ServerError(410, 'La ventana de recuperación ha terminado.');
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
        super.onDispose();
        this.permit?.ended();
      }
    }
  }
  const hub = new LobbyHub(async (users, started, ended, roster, lobby) => {
    if (active.size + pendingMatches >= (limits.maxMatches ?? Infinity))
      throw new ServerError(
        503,
        'El piloto está ocupado. Espera a que termine la ventana de resultados.',
      );
    pendingMatches++;
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
      pendingMatches--;
    }
  });
  class LobbyRoom extends Room {
    private counted = false;
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
      if (gateways >= (limits.maxGateways ?? Infinity))
        throw new ServerError(503, 'El piloto está completo.');
      gateways++;
      this.counted = true;
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
      if (this.counted) {
        gateways--;
        this.counted = false;
      }
      // The last gateway must still expire disconnected/empty rooms after its own clock stops.
      const cleanup = setTimeout(() => hub.sweep(), 31_000);
      cleanup.unref();
    }
  }
  async function restore() {
    if (!repository) return;
    const rows = await repository.load();
    if (
      rows.filter((s) => s.status !== 'closed' && s.expiresAt > Date.now()).length >
      (limits.maxMatches ?? Infinity)
    )
      throw Error('Pilot recovery capacity exceeded');
    for (const saved of rows) {
      if (saved.status === 'closed' || saved.expiresAt <= Date.now()) continue;
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
