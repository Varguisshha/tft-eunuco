import { beforeAll, afterAll, it, expect } from 'vitest';
import { defineServer, defineRoom } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Client, type Room } from '@colyseus/sdk';
import {
  COMPETITIVE_VERSION,
  CompetitiveSnapshotSchema,
  FinalResultsSchema,
  SpectateFrameSchema,
  type CompetitiveSnapshot,
  type SpectateFrame,
} from '@tft/shared';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import { MatchRoom } from './MatchRoom';
import { fixtureUsers, equip, intent } from './multi-fixture';
let now = 0;
const authorities = new Map<string, AuthoritativeMatch>();
async function verify(token: unknown) {
  const i =
    typeof token === 'string'
      ? ['fixture-0', 'fixture-1', 'fixture-2', 'fixture-3'].indexOf(token)
      : -1;
  if (i < 0) throw Error('Invalid fixture');
  return {
    userId: fixtureUsers[i]!,
    name: `Fixture ${i}`,
    avatarId: 'jade' as const,
    token: String(token),
    expiresAt: Date.now() + 3600000,
  };
}
function room(capacity: 2 | 3 | 4) {
  return class extends MatchRoom {
    static onAuth = verify;
    protected verify = verify;
    protected modernProtocol = true;
    protected createMatch() {
      const m = new AuthoritativeMatch(this.roomId, { now: () => now }, () => 360, capacity);
      authorities.set(this.roomId, m);
      return m;
    }
  };
}
const server = defineServer({
  greet: false,
  gracefullyShutdown: false,
  transport: new WebSocketTransport({ maxPayload: 4096 }),
  rooms: { two: defineRoom(room(2)), three: defineRoom(room(3)), four: defineRoom(room(4)) },
});
const rooms: Room[] = [];
beforeAll(() => server.listen(2575, '127.0.0.1'));
afterAll(async () => {
  await Promise.all(rooms.filter((r) => r.connection.isOpen).map((r) => r.leave()));
  await server.gracefullyShutdown(false);
});
async function until(f: () => boolean) {
  const limit = Date.now() + 4000;
  while (!f()) {
    if (Date.now() > limit) throw Error('Timeout');
    await new Promise((r) => setTimeout(r, 10));
  }
}
it.each([2, 3, 4] as const)(
  '%i SDK clients finish with identical immutable ranking and private spectator frames',
  async (count) => {
    now = 0;
    const sockets: Room[] = [];
    const views: (CompetitiveSnapshot | undefined)[] = [];
    const finals: unknown[][] = Array.from({ length: count }, () => []);
    const frames: SpectateFrame[][] = Array.from({ length: count }, () => []);
    const receipts: unknown[][] = Array.from({ length: count }, () => []);
    for (let i = 0; i < count; i++) {
      const c = new Client('http://127.0.0.1:2575');
      c.auth.token = `fixture-${i}`;
      const r =
        i === 0
          ? await c.create(['two', 'three', 'four'][count - 2]!)
          : await c.joinById(sockets[0]!.roomId);
      sockets.push(r);
      rooms.push(r);
      r.onMessage('state_snapshot', (raw: unknown) => {
        views[i] = CompetitiveSnapshotSchema.parse(raw);
      });
      r.onMessage('final_results', (raw: unknown) =>
        finals[i]!.push(FinalResultsSchema.parse(raw)),
      );
      r.onMessage('spectate_snapshot', (raw: unknown) =>
        frames[i]!.push(SpectateFrameSchema.parse(raw)),
      );
      r.onMessage('combat_trace', () => {});
      r.onMessage('protocol_error', () => {});
      r.onMessage('action_receipt', (raw: unknown) => receipts[i]!.push(raw));
      r.send('sync', null);
    }
    await until(() => views.filter(Boolean).length === count);
    const m = authorities.get(sockets[0]!.roomId)!;
    const health = count === 4 ? [1, 9, 30, 100] : count === 3 ? [1, 9, 100] : [1, 100];
    m.players.forEach((p, i) => {
      p.state.config = structuredClone(p.state.config);
      p.state.config.roundDamage.initialHp = health[i]!;
      p.state.health = { south: health[i]!, north: health[i]! };
    });
    if (count > 2)
      equip(
        m,
        Array.from({ length: count - 2 }, (_, i) => i + 1),
        ['dolea'],
      );
    equip(m, [count - 1], ['vargas'], 3);
    sockets[0]!.send('start', null);
    await until(() => views[0]!.clock.currentPhase === 'preparation');
    let spectated = false;
    const aliveCounts = new Set<number>();
    for (let n = 0; n < 150 && !m.finalResults; n++) {
      now += m.clock.snapshot().remainingMs;
      m.pulse();
      await until(() => views.every((v) => v!.revision === m.revision));
      aliveCounts.add(m.players.filter((p) => !p.eliminated).length);
      if (
        count > 2 &&
        m.players[0]!.eliminated &&
        m.clock.snapshot().currentPhase === 'combat' &&
        !spectated
      ) {
        const duelId = m.duels[0]!.pairing.combatId;
        sockets[0]!.send('spectate_duel', {
          version: COMPETITIVE_VERSION,
          matchId: m.id,
          phaseId: m.clock.snapshot().phaseId,
          sequence: 0,
          duelId,
        });
        await until(() => frames[0]!.length > 0);
        expect(frames[0]![0]!.state.result).toBeNull();
        expect(frames[0]![0]!.state).not.toHaveProperty('rngState');
        expect(frames.slice(1).every((f) => f.length === 0)).toBe(true);
        const msg = intent(m, 0, { type: 'reroll_shop' });
        sockets[0]!.send('command', msg);
        await until(() => receipts[0]!.length > 0);
        expect(receipts[0]!.at(-1)).toMatchObject({ accepted: false, reason: 'not-active' });
        spectated = true;
      }
    }
    await until(() => finals.every((f) => f.length === 1));
    const final = m.finalResults!;
    for (let i = 0; i < count; i++) {
      expect(finals[i]![0]).toEqual(final);
      expect(views[i]!.finalResults).toEqual(final);
    }
    if (count === 4) expect([...aliveCounts]).toEqual(expect.arrayContaining([3, 2, 1]));
    if (count > 2) expect(spectated).toBe(true);
    const frozen = JSON.stringify(final),
      settlements = m.settlements.size;
    now += 100000;
    m.pulse();
    for (const s of sockets) s.send('sync', null);
    await new Promise((r) => setTimeout(r, 100));
    expect(finals.every((f) => f.length === 1)).toBe(true);
    expect(JSON.stringify(m.finalResults)).toBe(frozen);
    expect(m.settlements.size).toBe(settlements);
    m.assertConservation();
    await Promise.all(sockets.map((s) => s.leave()));
  },
  15000,
);
