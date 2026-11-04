import { afterAll, beforeAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { defineServer, defineRoom } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Client, type Room } from '@colyseus/sdk';
import { P13U_ECONOMY_CONFIG, PREDICTIONS } from '@tft/game-data';
import { RECOVERY_VERSION } from '@tft/shared';
import { MatchRoom } from './MatchRoom';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import { fixtureUsers, equip } from './multi-fixture';
import { RemoteCoordinator } from '../../web/src/network/RemoteCoordinator';
import { P13U_CATALOG_HASH } from './persistence/snapshot';
let capacity: 2 | 3 | 4 = 2;
const rooms = new Map<string, Fixture>(),
  clients: RemoteCoordinator[] = [];
class Fixture extends MatchRoom {
  protected modernProtocol = true;
  protected recoverable = true;
  static async onAuth(token: unknown) {
    const i = ['lab-0', 'lab-1', 'lab-2', 'lab-3'].indexOf(String(token));
    if (i < 0) throw Error('Local diagnostic only');
    return {
      userId: fixtureUsers[i]!,
      name: `P13S ${i}`,
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
      P13U_ECONOMY_CONFIG,
    );
  }
  onCreate() {
    this.roomId = randomUUID();
    super.onCreate();
    rooms.set(this.roomId, this);
  }
  prepare() {
    for (const p of this.match.players) {
      p.state.level = 7;
      p.state.xp = 0;
    }
    equip(this.match, undefined, ['dolea', 'vargas', 'peibol', 'danigm', 'jaramillo']);
    this.match.start(this.match.players[0]!.sessionId);
    this.publish();
  }
  advance() {
    this.match.clock.restore({ ...this.match.clock.snapshot(), remainingMs: 0 });
    this.match.pulse();
    this.publish();
  }
  authority() {
    return this.match;
  }
}
const server = defineServer({
  greet: false,
  gracefullyShutdown: false,
  transport: new WebSocketTransport(),
  rooms: { lab: defineRoom(Fixture) },
});
beforeAll(() => server.listen(2598, '127.0.0.1'));
afterAll(async () => {
  for (const c of clients) c.dispose();
  await server.gracefullyShutdown(false);
});
async function until(f: () => boolean) {
  const end = Date.now() + 8000;
  while (!f()) {
    if (Date.now() > end) throw Error('P13S network timeout');
    await new Promise((r) => setTimeout(r, 10));
  }
}
async function connect(i: number, id?: string) {
  const sdk = new Client('http://127.0.0.1:2598');
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
it.each([2, 3, 4] as const)(
  '%i real SDK clients: prediction command, response, phase locking, clone replay, reconnect and RNG privacy',
  async (n) => {
    capacity = n;
    const peers = [await connect(0)];
    for (let i = 1; i < n; i++) peers.push(await connect(i, peers[0]!.room.roomId));
    const f = rooms.get(peers[0]!.room.roomId)!;
    f.prepare();
    await until(() => peers.every((p) => p.getMatch().units.length === 5));
    const a = peers[0]!,
      kind = a.getMatch().synergies!.markets[0]!.offers[0]!,
      gold = a.getMatch().gold;
    expect(
      a.submit({
        matchId: a.room.roomId,
        phaseId: a.getClock().phaseId,
        expectedRevision: a.getMatch().revision,
        command: {
          type: 'select_prediction',
          kind,
          ...(PREDICTIONS[kind].unit ? { unitId: a.getMatch().units[0]!.id } : {}),
        },
      }),
    ).toBe(true);
    await until(() => !a.requestPending && a.getMatch().gold === gold - 1);
    expect(a.getMatch().synergies!.rng).toBe(0);
    expect(a.getMatch().synergies!.markets[0]!.bets).toHaveLength(1);
    f.advance();
    await until(() => peers.every((p) => p.getMatch().phase === 'combat' && !!p.getReplay()));
    const frozen = structuredClone(a.getReplay());
    expect(frozen!.input.rulesVersion).toBe('f0p13u-1');
    expect(a.getMatch().synergies!.markets[0]!.locked).toBe(true);
    await a.room.leave();
    const resumed = await connect(0, f.roomId);
    expect(resumed.getReplay()).toEqual(frozen);
    expect(resumed.getMatch().synergies!.markets[0]!.bets).toHaveLength(1);
    f.advance();
    await until(() => peers.slice(1).every((p) => p.getMatch().phase === 'resolution'));
    expect(f.authority().exportState().catalog).toBe(P13U_CATALOG_HASH);
    for (const p of f.authority().players) {
      expect(p.state.synergies!.receipts.filter((r) => r.kind === 'interest')).toHaveLength(1);
      expect(p.state.synergies!.receipts.filter((r) => r.kind === 'predictions')).toHaveLength(1);
    }
    f.authority().assertConservation();
    for (const p of [...peers, resumed]) p.dispose();
  },
  30000,
);
