import { defineServer, defineRoom } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { MatchRoom } from './MatchRoom';
import { lobbyRooms } from './LobbyRoom';
import { verifyIdentity, type VerifyIdentity } from './auth';
export function createServer(
  RoomType: typeof MatchRoom = MatchRoom,
  verify: VerifyIdentity = verifyIdentity,
) {
  const { LobbyRoom, PrivateMatch } = lobbyRooms(verify, RoomType);
  return defineServer({
    greet: false,
    gracefullyShutdown: false,
    transport: new WebSocketTransport({ maxPayload: 4096, perMessageDeflate: false }),
    rooms: {
      test_match: defineRoom(RoomType),
      lobby_gateway: defineRoom(LobbyRoom),
      private_match: defineRoom(PrivateMatch),
    },
  });
}
