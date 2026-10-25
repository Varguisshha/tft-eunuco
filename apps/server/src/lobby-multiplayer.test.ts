import { beforeAll, afterAll, it, expect } from 'vitest';
import { Client, type Room } from '@colyseus/sdk';
import { randomUUID } from 'node:crypto';
import {
  LOBBY_VERSION,
  LobbyEventSchema,
  CompetitiveSnapshotSchema as RoundSnapshotSchema,
  DuelMessageSchema,
  type CompetitiveSnapshot as RoundSnapshot,
} from '@tft/shared';
import { MatchRoom } from './MatchRoom';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import { createServer } from './server';
import { fixtureUsers, equip, intent } from './multi-fixture';
import { authorizedReplay, projectRemote, opponent } from '../../web/src/network/remoteView';
let now = 0;
const authorities = new Map<string, AuthoritativeMatch>();
async function verify(token: unknown) {
  const index =
    typeof token === 'string'
      ? ['fixture-0', 'fixture-1', 'fixture-2', 'fixture-3'].indexOf(token)
      : -1;
  if (index < 0) throw Error('Invalid fixture identity');
  return {
    userId: fixtureUsers[index]!,
    name: ['Vargas', 'Florin', 'Nora', 'Alex'][index]!,
    avatarId: 'jade' as const,
    token: String(token),
    expiresAt: Date.now() + 3600000,
  };
}
class FixtureMatch extends MatchRoom {
  static onAuth = verify;
  protected verify = verify;
  protected createMatch(capacity: 2 | 3 | 4 = 2) {
    const match = new AuthoritativeMatch(this.roomId, { now: () => now }, () => 360, capacity);
    authorities.set(this.roomId, match);
    return match;
  }
}
const server = createServer(FixtureMatch, verify);
const rooms: Room[] = [];
beforeAll(() => server.listen(2573, '127.0.0.1'));
afterAll(async () => {
  await Promise.all(rooms.filter((r) => r.connection.isOpen).map((r) => r.leave().catch(() => {})));
  await server.gracefullyShutdown(false);
});
async function until(f: () => boolean) {
  const limit = Date.now() + 5000;
  while (!f()) {
    if (Date.now() > limit) throw Error('timeout');
    await new Promise((r) => setTimeout(r, 10));
  }
}
function client(index: number) {
  const c = new Client('http://127.0.0.1:2573');
  c.auth.token = `fixture-${index}`;
  return c;
}
function action(r: Room, type: string, extra = {}) {
  const requestId = randomUUID();
  return new Promise<ReturnType<typeof LobbyEventSchema.parse>>((resolve) => {
    const off = r.onMessage('lobby_event', (raw: unknown) => {
      const e = LobbyEventSchema.parse(raw);
      if (e.requestId === requestId) {
        off();
        resolve(e);
      }
    });
    r.send('lobby_action', { version: LOBBY_VERSION, requestId, type, ...extra });
  });
}
it.each([2, 3, 4] as const)(
  'private %i-player lobby, whitelist, synchronized transition and three complete rounds',
  async (count) => {
    now = 0;
    const gateways: Room[] = [];
    for (let i = 0; i < count; i++) {
      const r = await client(i).create('lobby_gateway');
      r.reconnection.enabled = false;
      r.onMessage('lobby_event', () => {});
      rooms.push(r);
      gateways.push(r);
    }
    const created = await action(gateways[0]!, 'create_lobby', { capacity: count });
    for (let i = 1; i < count; i++)
      await action(gateways[i]!, 'join_lobby', { roomCode: created.lobby!.roomCode });
    expect((await action(gateways[0]!, 'start_match')).error).toMatch(/listos/);
    for (const r of gateways) await action(r, 'set_ready', { readyState: true });
    expect((await action(gateways[1]!, 'start_match')).error).toMatch(/anfitrión/);
    const started = await action(gateways[0]!, 'start_match');
    const id = started.lobby!.matchId!;
    expect((await action(gateways[0]!, 'start_match')).error).toBeTruthy();
    expect((await action(gateways[0]!, 'set_capacity', { capacity: 2 })).error).toBeTruthy();
    await expect(client(9).joinById(id)).rejects.toThrow();
    if (count < 4) await expect(client(3).joinById(id)).rejects.toThrow();
    const match = authorities.get(id)!;
    expect(match.capacity).toBe(count);
    const sockets: Room[] = [];
    const views: Array<RoundSnapshot | undefined> = [];
    const traces: Array<Array<ReturnType<typeof DuelMessageSchema.parse>>> = [];
    for (let i = 0; i < count; i++) {
      const r = await client(i).joinById(id, { name: 'Forged', userId: fixtureUsers[(i + 1) % 4] });
      r.reconnection.enabled = false;
      rooms.push(r);
      sockets.push(r);
      traces[i] = [];
      r.onMessage('state_snapshot', (raw: unknown) => {
        views[i] = RoundSnapshotSchema.parse(raw);
      });
      r.onMessage('combat_trace', (raw: unknown) => {
        traces[i]!.push(DuelMessageSchema.parse(raw));
      });
      r.onMessage('protocol_error', () => {});
      r.onMessage('action_receipt', () => {});
      if (i < count - 1) r.send('sync', null);
    }
    sockets[0]!.send('start', null);
    await new Promise((r) => setTimeout(r, 100));
    expect(match.clock.snapshot().currentPhase).toBe('not_started');
    sockets[count - 1]!.send('sync', null);
    await until(
      () => views.every((v) => v?.clock.currentPhase === 'preparation') && views.length === count,
    );
    expect((await action(gateways[0]!, 'sync')).lobby!.status).toBe('in_match');
    expect(views.map((v) => v!.players.map((p) => p.name))).toEqual(
      Array(count).fill(['Vargas', 'Florin', 'Nora', 'Alex'].slice(0, count)),
    );
    // Unequal formations produce an early completed duel while another is still playing.
    equip(match, [0], ['dolea'], 2);
    equip(
      match,
      Array.from({ length: count - 1 }, (_, i) => i + 1),
      ['dolea', 'vargas'],
    );
    for (let round = 1; round <= 3; round++) {
      const before = match.players.map((p) => ({
        gold: p.state.gold,
        xp: p.state.xp,
        hp: p.state.health.south,
      }));
      now = match.clock.snapshot().phaseDeadline;
      match.pulse();
      await until(() => views.every((v) => v?.own.phase === 'combat' && v.own.round === round));
      expect(new Set(views.map((v) => v!.clock.phaseDeadline)).size).toBe(1);
      expect(new Set(views.map((v) => v!.combatId)).size).toBe(count === 2 ? 1 : 2);
      for (let i = 0; i < count; i++) {
        const s = views[i]!,
          t = traces[i]!.at(-1)!;
        expect(t.combatId).toBe(s.combatId);
        expect(authorizedReplay(s, t)).not.toBeNull();
        const projected = projectRemote(s, authorizedReplay(s, t));
        expect(projected.health.south).toBe(s.own.hp);
        expect(projected.health.north).toBe(opponent(s)!.hp);
        expect(projected.pool).toEqual({});
        expect(s.players.every((p) => !('shop' in p) && !('gold' in p) && !('units' in p))).toBe(
          true,
        );
        expect(JSON.stringify(s)).not.toMatch(/shopRng|combatRng|"pool"|"token"/);
        const foreign = traces
          .find((ts, j) => j !== i && ts.at(-1)!.combatId !== s.combatId)
          ?.at(-1);
        if (foreign) expect(authorizedReplay(s, foreign)).toBeNull();
        const ownUnits = projected.combat!.input.units.filter((u) => u.owner === 'south');
        expect(ownUnits.every((u) => u.id.startsWith(s.playerId))).toBe(true);
      }
      if (count === 3) expect(views[0]!.pairings.filter((p) => p.kind === 'ghost')).toHaveLength(1);
      const early = Math.min(...match.duels.map((d) => d.replay.result.tick)) * 100 + 600;
      now = match.clock.snapshot().phaseStart + early;
      match.pulse();
      if (
        now < match.clock.snapshot().phaseDeadline &&
        match.clock.snapshot().currentPhase === 'combat'
      ) {
        await until(() =>
          views.some(
            (v) => v!.players.find((p) => p.id === v!.playerId)!.status === 'awaiting_round',
          ),
        );
        expect(
          match.players.map((p) => ({
            gold: p.state.gold,
            xp: p.state.xp,
            hp: p.state.health.south,
          })),
        ).toEqual(before);
        const command = intent(match, 0, { type: 'reroll_shop' });
        expect(match.submit(command.sessionId, command).reason).toBe('wrong-phase');
      }
      if (match.clock.snapshot().currentPhase === 'combat') {
        now = match.clock.snapshot().phaseDeadline;
        match.pulse();
      }
      await until(() => views.every((v) => v!.own.phase === 'resolution'));
      for (let i = 0; i < count; i++) {
        expect(views[i]!.ownSettlement?.round).toBe(round);
        expect(views[i]!.own.healthLedger).toHaveLength(round);
        expect(views[i]!.players.map((p) => [p.id, p.hp, p.provisionalPosition])).toEqual(
          views[0]!.players.map((p) => [p.id, p.hp, p.provisionalPosition]),
        );
      }
      const settled = JSON.stringify(match.players.map((p) => p.state));
      match.pulse();
      expect(JSON.stringify(match.players.map((p) => p.state))).toBe(settled);
      match.assertConservation();
      now = match.clock.snapshot().phaseDeadline;
      match.pulse();
      await until(() =>
        views.every((v) => v!.own.phase === 'preparation' && v!.own.round === round + 1),
      );
      expect(views.every((v) => !v!.combatId && v!.pairings.length === 0)).toBe(true);
    }
    for (const r of sockets) await r.leave();
    for (const r of gateways) {
      await action(r, 'leave_lobby');
      await r.leave();
    }
  },
  20000,
);
