import { afterAll, beforeAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { defineServer, defineRoom } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Client, type Room } from '@colyseus/sdk';
import { P12F_ECONOMY_CONFIG } from '@tft/game-data';
import { LOBBY_VERSION, RECOVERY_VERSION, type LobbySnapshot } from '@tft/shared';
import { MatchRoom } from './MatchRoom';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import { DurableMatch } from './persistence/DurableMatch';
import type { StoredMatch } from './persistence/snapshot';
import { fixtureUsers, equip, intent } from './multi-fixture';
import { RemoteCoordinator } from '../../web/src/network/RemoteCoordinator';
import { LocalSession } from '../../web/src/match/LocalSession';
import { itemInteraction } from '../../web/src/match/items/itemInteraction';
import { encodeStoredMatch, decodeStoredMatch } from './persistence/codec';
import { P12F_CATALOG_HASH } from './persistence/snapshot';
let capacity: 2 | 4 = 2;
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
    return new AuthoritativeMatch(
      this.roomId,
      { now: () => 0 },
      () => 360,
      capacity,
      P12F_ECONOMY_CONFIG,
    );
  }
  onCreate() {
    this.roomId = randomUUID();
    super.onCreate();
    rooms.set(this.roomId, this);
  }
  invalidBoardCommand(itemId: string) {
    return intent(this.match, 0, {
      type: 'equip_item',
      unitId: this.match.players[0]!.state.units.find((u) => u.location.kind === 'board')!.id,
      itemId,
    });
  }
  lastReceipt() {
    return [...this.match.players[0]!.receipts.values()].at(-1)!;
  }
  saved: StoredMatch | undefined;
  async prepare() {
    equip(this.match);
    for (const p of this.match.players)
      this.match.grantItems(p.id, 'p12f-net', [
        'component-ad',
        'component-ad',
        'component-attack_speed',
        'component-attack_speed',
      ]);
    const lobby: LobbySnapshot = {
      version: LOBBY_VERSION,
      roomId: randomUUID(),
      roomCode: 'ABCDEFGH',
      hostUserId: this.match.players[0]!.id,
      capacity,
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
          saved = decodeStoredMatch(encodeStoredMatch(doc));
          this.saved = saved;
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
beforeAll(() => server.listen(2594, '127.0.0.1'));
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
  const sdk = new Client('http://127.0.0.1:2594');
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
it.each([2, 4] as const)(
  '%i SDK clients: combat purchase, crafting, bench equipment, duplicate delivery, codec and reconnect',
  async (n) => {
    capacity = n;
    const peers = [await connect(0)];
    for (let i = 1; i < n; i++) peers.push(await connect(i, peers[0]!.room.roomId));
    const a = peers[0]!,
      f = rooms.get(a.room.roomId)!;
    await f.prepare();
    await until(() => peers.every((c) => c.getMatch().phase === 'preparation'));
    await f.advance();
    await until(() => peers.every((c) => c.getMatch().phase === 'combat' && !!c.getReplay()));
    const session = new LocalSession(a.getMatch(), undefined, undefined, a),
      ui = itemInteraction(session);
    const unsubscribe = ui.subscribe(() => {});
    try {
      const frozen = structuredClone(a.getReplay());
      expect(
        session.dispatch({ type: 'buy_unit', offerId: a.getMatch().shop.find(Boolean)!.id }),
      ).toBe(true);
      await until(() => !a.requestPending);
      const bench = a.getMatch().units.find((u) => u.location.kind === 'bench')!;
      const [first, second, third, fourth] = a.getMatch().items!.components;
      expect(ui.combine(first!.id, second!.id)).toBe(true);
      await until(() => !a.requestPending && !ui.getSnapshot().pending);
      expect(ui.getSnapshot().outcome).toBe('success');
      const crafted = a.getMatch().items!.completed[0]!;
      expect(ui.equip(bench.id, crafted.id)).toBe(true);
      await until(() => !a.requestPending && !ui.getSnapshot().pending);
      expect(ui.equip(bench.id, third!.id)).toBe(true);
      await until(() => !a.requestPending && !ui.getSnapshot().pending);
      expect(ui.equip(bench.id, fourth!.id)).toBe(true);
      await until(() => !a.requestPending && !ui.getSnapshot().pending);
      const record = f.lastReceipt();
      const duplicate = { ...JSON.parse(record.payload), sessionId: a.room.sessionId };
      let duplicateReceipt = false;
      a.room.onMessage('action_receipt', (r) => {
        if (r.requestId === duplicate.requestId) duplicateReceipt = r.accepted;
      });
      a.room.send('command', duplicate);
      await until(() => duplicateReceipt);
      const after = structuredClone(a.getMatch());
      expect(after.units.find((u) => u.id === bench.id)!.equipment).toHaveLength(2);
      expect(after.items!.crafts).toHaveLength(2);
      expect(ui.equip(after.units.find((u) => u.location.kind === 'board')!.id, crafted.id)).toBe(
        false,
      );
      expect(a.getReplay()).toEqual(frozen);
      const invalid = f.invalidBoardCommand(crafted.id);
      let rejected = false;
      a.room.onMessage('action_receipt', (r) => {
        if (r.requestId === invalid.requestId) rejected = !r.accepted && r.reason === 'wrong-phase';
      });
      a.room.send('command', invalid);
      await until(() => rejected);
      expect(a.getMatch().items).toEqual(after.items);
      expect(a.getMatch().units).toEqual(after.units);
      expect(f.saved!.authority.catalog).toBe(P12F_CATALOG_HASH);
      const restored = AuthoritativeMatch.restore(f.saved!.authority, { now: () => 0 }, false);
      expect(restored.players[0]!.state.items).toEqual(after.items);
      await a.room.leave();
      const resumed = await connect(0, f.roomId);
      expect(resumed.getMatch().items).toEqual(after.items);
      expect(resumed.getMatch().units).toEqual(after.units);
      expect(resumed.getReplay()).toEqual(frozen);
    } finally {
      unsubscribe();
      for (const p of peers) p.dispose();
    }
  },
  30000,
);
