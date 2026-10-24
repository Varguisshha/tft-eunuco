import { defineServer, defineRoom } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { MatchRoom } from './MatchRoom';
export function createServer() {
  return defineServer({
    greet: false,
    gracefullyShutdown: false,
    transport: new WebSocketTransport({ maxPayload: 4096, perMessageDeflate: false }),
    rooms: { test_match: defineRoom(MatchRoom) },
  });
}
