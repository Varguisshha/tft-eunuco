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
) {
  const { LobbyRoom, PrivateMatch, restore, checkpoint } = lobbyRooms(verify, RoomType, repository);
  const server = defineServer({
    beforeListen: async () => {
      if (repository) {
        await matchMaker.onReady;
        await restore();
      }
    },
    greet: false,
    gracefullyShutdown: false,
    transport: new WebSocketTransport({ maxPayload: 4096, perMessageDeflate: false }),
    rooms: {
      test_match: defineRoom(RoomType),
      lobby_gateway: defineRoom(LobbyRoom),
      private_match: defineRoom(PrivateMatch),
    },
  });
  if (repository) {
    server.onBeforeShutdown(checkpoint);
  }
  return server;
}
