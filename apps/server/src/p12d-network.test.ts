import { afterAll, beforeAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { defineServer, defineRoom } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Client, type Room } from '@colyseus/sdk';
import { P12D_ECONOMY_CONFIG } from '@tft/game-data';
import { LOBBY_VERSION, RECOVERY_VERSION, type LobbySnapshot } from '@tft/shared';
import { MatchRoom } from './MatchRoom';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import { DurableMatch } from './persistence/DurableMatch';
import type { StoredMatch } from './persistence/snapshot';
import { fixtureUsers, equip } from './multi-fixture';
import { RemoteCoordinator } from '../../web/src/network/RemoteCoordinator';
import { LocalSession } from '../../web/src/match/LocalSession';
const rooms = new Map<string, Fixture>();
const clients: RemoteCoordinator[] = [];
class Fixture extends MatchRoom {
  protected modernProtocol = true;
  protected recoverable = true;
  static async onAuth(token: unknown) {
    const i = ['lab-0', 'lab-1', 'lab-2', 'lab-3'].indexOf(String(token));
    if (i < 0) throw Error('Lab only');
    return {
      userId: fixtureUsers[i]!,
      name: `Lab ${i}`,
      avatarId: 'jade' as const,
      token: String(token),
      expiresAt: Date.now() + 3600000,
    };
  }
  protected verify = Fixture.onAuth;
  protected createMatch() {
    return new AuthoritativeMatch(this.roomId, undefined, () => 360, 2, P12D_ECONOMY_CONFIG);
  }
  onCreate() {
    this.roomId = randomUUID();
    super.onCreate();
    rooms.set(this.roomId, this);
  }
  async prepare() {
    equip(this.match);
    const lobby: LobbySnapshot = {
      version: LOBBY_VERSION,
      roomId: randomUUID(),
      roomCode: 'ABCDEFGH',
      hostUserId: this.match.players[0]!.id,
      capacity: 2,
      participants: this.match.players.map((p) => ({
        userId: p.id,
        name: p.name,
        avatarId: p.avatarId,
        connected: true,
        readyState: true,
      })),
      status: 'in_match',
      createdAt: Date.now(),
      expiresAt: Date.now() + 900000,
      matchId: this.roomId,
      revision: 1,
    };
    let saved: StoredMatch | undefined;
    this.durable = new DurableMatch(
      this.match,
      {
        load: async () => (saved ? [saved] : []),
        commit: async (expected, doc) => {
          if ((saved?.revision ?? 0) !== expected && saved?.commitId !== doc.commitId)
            throw Error('CAS');
          saved = structuredClone(doc);
        },
      },
      lobby,
    );
    await this.mutate(() => this.match.start(this.match.players[0]!.sessionId));
  }
  async nearFinal() {
    await this.mutate(() => {
      const p = this.match.players.find(
          (p) => p.state.healthLedger.filter((h) => h.side === 'south').at(-1)?.outcome === 'loss',
        )!,
        h = p.state.healthLedger.filter((h) => h.side === 'south').at(-1)!;
      h.base = h.hpBefore - 1;
      h.survivors = 0;
      h.requested = h.base;
      h.applied = h.base;
      h.hpAfter = 1;
      p.state.health.south = 1;
    });
  }
  async finish() {
    // Durable restores use the persisted RNG, not the constructor's seed callback.
    // The previous round's loser can win next time. Bound the laboratory to two
    // further rounds, lowering the current loser's health only at resolution.
    for (let i = 0; i < 6 && !this.match.finalResults; i++) {
      await this.advance();
      if (this.match.clock.snapshot().currentPhase === 'resolution') await this.nearFinal();
    }
    expect(this.match.finalResults).not.toBeNull();
  }
  async advance() {
    await this.mutate(() => {
      this.match.clock.restore({ ...this.match.clock.snapshot(), remainingMs: 0 });
      this.match.pulse();
    });
  }
}
const server = defineServer({
  greet: false,
  gracefullyShutdown: false,
  transport: new WebSocketTransport(),
  rooms: { lab: defineRoom(Fixture) },
});
beforeAll(() => server.listen(2591, '127.0.0.1'));
afterAll(async () => {
  for (const c of clients) c.dispose();
  await server.gracefullyShutdown(false);
});
async function until(f: () => boolean) {
  const end = Date.now() + 8000;
  while (!f()) {
    if (Date.now() > end) throw Error('Lab timeout');
    await new Promise((r) => setTimeout(r, 10));
  }
}
async function connect(i: number, id?: string) {
  const sdk = new Client('http://127.0.0.1:2591');
  sdk.auth.token = `lab-${i}`;
  const room: Room = id
    ? await sdk.joinById(id, { recoveryVersion: RECOVERY_VERSION })
    : await sdk.create('lab');
  const remote = new RemoteCoordinator(room);
  clients.push(remote);
  room.send('sync', null);
  await until(() => {
    try {
      return !!remote.getMatch();
    } catch {
      return false;
    }
  });
  return remote;
}
it('real durable room + two SDK clients + UI permissions buy/sell during combat and after reconnect', async () => {
  const a = await connect(0),
    b = await connect(1, a.room.roomId),
    f = rooms.get(a.room.roomId)!;
  await f.prepare();
  await until(
    () =>
      a.getClock().currentPhase === 'preparation' && b.getClock().currentPhase === 'preparation',
  );
  await f.advance();
  await until(() => a.getMatch().phase === 'combat' && !!a.getReplay() && !!b.getReplay());
  const session = new LocalSession(a.getMatch(), undefined, undefined, a);
  const offer = a.getMatch().shop.find(Boolean)!;
  expect(a.purchaseErrors).toContain(null);
  expect(session.canEconomicAction({ type: 'buy_unit', offerId: offer.id })).toBe(true);
  const frozen = structuredClone(a.getReplay());
  expect(session.dispatch({ type: 'buy_unit', offerId: offer.id })).toBe(true);
  await until(() => !a.requestPending);
  const bench = a.getMatch().units.find((u) => u.location.kind === 'bench')!;
  expect(bench).toBeDefined();
  expect(session.canSellUnit(bench.id)).toBe(true);
  expect(session.dispatch({ type: 'sell_unit', unitId: bench.id })).toBe(true);
  await until(() => !a.requestPending);
  expect(a.getMatch().units.some((u) => u.id === bench.id)).toBe(false);
  expect(a.getReplay()).toEqual(frozen);
  expect(session.canSellUnit(a.getMatch().units.find((u) => u.location.kind === 'board')!.id)).toBe(
    false,
  );
  await f.advance();
  await until(() => a.getClock().currentPhase === 'resolution');
  await f.nearFinal();
  await b.room.leave();
  const reconnected = await connect(1, a.room.roomId);
  expect(reconnected.getClock().currentPhase).toBe('resolution');
  await f.finish();
  await until(() => !!a.finalResults && !!reconnected.finalResults);
  expect(a.finalResults!.standings).toHaveLength(2);
  const final = structuredClone(a.finalResults);
  await a.room.leave();
  expect(a.finalResults).toEqual(final);
  expect(a.recoveryStatus).toContain('Resultado conservado');
  const recoveredFinal = await connect(0, reconnected.room.roomId);
  expect(recoveredFinal.finalResults).toEqual(final);
});
