import type { IncomingMessage } from 'node:http';
import type { RuntimeConfig } from './remote/config';
import { requestAllowed } from './remote/http';
import type { MatchRepository } from './persistence/repository';
import { defineServer, defineRoom, matchMaker } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { MatchRoom } from './MatchRoom';
import { lobbyRooms } from './LobbyRoom';
import { verifyIdentity, type VerifyIdentity } from './auth';
export function createServer(
  RoomType: typeof MatchRoom = MatchRoom,
  verify: VerifyIdentity = verifyIdentity,
  repository?: MatchRepository,
  runtime?: RuntimeConfig,
) {
  const { LobbyRoom, PrivateMatch, restore, checkpoint } = lobbyRooms(
    verify,
    RoomType,
    repository,
    runtime?.finalRetentionMs,
    runtime,
  );
  const server = defineServer({
    beforeListen: async () => {
      if (repository) {
        await matchMaker.onReady;
        await restore();
      }
    },
    greet: false,
    ...(runtime
      ? {
          logger: {
            error: () => console.error('Colyseus operation failed'),
            warn: () => console.warn('Colyseus warning'),
            info: () => {},
          },
        }
      : {}),
    gracefullyShutdown: false,
    transport: new WebSocketTransport({
      maxPayload: 4096,
      perMessageDeflate: false,
      pingInterval: runtime ? 10000 : 3000,
      pingMaxRetries: runtime ? 3 : 2,
      ...(runtime
        ? {
            verifyClient: ({ req }: { req: IncomingMessage }) => requestAllowed(req, runtime, true),
          }
        : {}),
    }),
    rooms: {
      ...(!runtime || runtime.environment === 'development' || runtime.environment === 'diagnostic'
        ? { test_match: defineRoom(RoomType) }
        : {}),
      lobby_gateway: defineRoom(LobbyRoom),
      private_match: defineRoom(PrivateMatch),
    },
  });
  if (repository) {
    server.onBeforeShutdown(checkpoint);
  }
  return server;
}
