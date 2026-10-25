import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { defineServer, defineRoom } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Client, type Room } from '@colyseus/sdk';
import { createHash } from 'node:crypto';
import {
  RoundSnapshotSchema,
  DuelMessageSchema,
  ActionReceiptSchema,
  NETWORK_VERSION,
  type RoundSnapshot,
  type ActionReceipt,
  type MatchCommand,
} from '@tft/shared';
import { MatchRoom } from './MatchRoom';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import { fixtureUsers, equip } from './multi-fixture';
import { pairRound } from './pairings';
import type { VerifiedIdentity } from './auth';

// Only this test server registers these room types. No fixture credentials or clock controls
// are registered by createServer/main.ts, and no command can select capacity or authority.
let now = 0;
const authorities = new Map<string, AuthoritativeMatch>();
async function fixtureVerify(token: unknown): Promise<VerifiedIdentity> {
  const index =
    typeof token === 'string'
      ? ['fixture-0', 'fixture-1', 'fixture-2', 'fixture-3'].indexOf(token)
      : -1;
  if (index < 0) throw new Error('Unknown controlled identity');
  return {
    userId: fixtureUsers[index]!,
    name: `SDK fixture ${index + 1}`,
    avatarId: 'spark',
    token: String(token),
    expiresAt: Date.now() + 3600000,
  };
}
function diagnosticRoom(capacity: 3 | 4) {
  return class extends MatchRoom {
    static onAuth = fixtureVerify;
    protected verify = fixtureVerify;
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
  transport: new WebSocketTransport({ maxPayload: 4096, perMessageDeflate: false }),
  rooms: {
    diagnostic_three: defineRoom(diagnosticRoom(3)),
    diagnostic_four: defineRoom(diagnosticRoom(4)),
  },
});
const clients: Room[] = [];
beforeAll(() => server.listen(2572, '127.0.0.1'));
afterAll(async () => {
  await Promise.all(clients.map((c) => c.leave()));
  await server.gracefullyShutdown(false);
});
async function until(predicate: () => boolean) {
  const deadline = Date.now() + 6000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('SDK diagnostic timeout');
    await new Promise((r) => setTimeout(r, 10));
  }
}
describe('independent SDK clients, controlled identities and server clock', () => {
  it.each([3, 4] as const)(
    '%i participants complete three deterministic rounds with private traces',
    async (count) => {
      now = 0;
      const sockets: Room[] = [];
      const views: Array<RoundSnapshot | undefined> = [];
      const traces: Array<Array<ReturnType<typeof DuelMessageSchema.parse>>> = [];
      const receipts: ActionReceipt[][] = [];
      const sequences = Array(count).fill(0) as number[];
      const errors: string[][] = [];
      for (let i = 0; i < count; i++) {
        const sdk = new Client('http://127.0.0.1:2572');
        sdk.auth.token = `fixture-${i}`;
        const c =
          i === 0
            ? await sdk.create(count === 3 ? 'diagnostic_three' : 'diagnostic_four')
            : await sdk.joinById(sockets[0]!.roomId);
        sockets.push(c);
        clients.push(c);
        traces[i] = [];
        receipts[i] = [];
        errors[i] = [];
        c.onMessage('state_snapshot', (x: unknown) => {
          views[i] = RoundSnapshotSchema.parse(x);
        });
        c.onMessage('combat_trace', (x: unknown) => {
          traces[i]!.push(DuelMessageSchema.parse(x));
        });
        c.onMessage('action_receipt', (x: unknown) => {
          receipts[i]!.push(ActionReceiptSchema.parse(x));
        });
        c.onMessage('protocol_error', (x: string) => errors[i]!.push(x));
        c.send('sync', null);
      }
      await until(
        () =>
          views.filter(Boolean).length === count && views.every((v) => v!.players.length === count),
      );
      const authority = authorities.get(sockets[0]!.roomId)!;
      const plan = pairRound(fixtureUsers.slice(0, count), 1, [], 360, authority.id);
      // Real catalog units: K-01 reaches Overtime; V-02 produces a shorter duel.
      if (count === 3) equip(authority, undefined, ['test-k01']);
      else
        for (const [i, duel] of plan.pairings.entries())
          equip(
            authority,
            [fixtureUsers.indexOf(duel.southPlayerId), fixtureUsers.indexOf(duel.northPlayerId)],
            [i === 0 ? 'test-v02' : 'test-k01'],
          );
      sockets[0]!.send('start', null);
      await until(() => views.every((v) => v!.clock.currentPhase === 'preparation'));
      const send = (i: number, command: MatchCommand) => {
        const view = views[i]!,
          c = sockets[i]!,
          sequence = sequences[i]!;
        sequences[i] = sequence + 1;
        const message = {
          version: NETWORK_VERSION,
          sessionId: c.sessionId,
          requestId: `sdk-${i}-${sequence}`,
          sequence,
          matchId: c.roomId,
          phaseId: view.clock.phaseId,
          action: { ...command, seq: view.own.nextActionSeq, expectedRevision: view.own.revision },
        };
        c.send('command', message);
        return message;
      };
      const buys = sockets.map((_, i) =>
        send(i, { type: 'buy_unit', offerId: views[i]!.own.shop[0]!.id }),
      );
      await until(
        () =>
          receipts.every((r) => r.length === 1) && views.every((v) => v!.own.units.length === 2),
      );
      expect(receipts.every((r) => r[0]!.accepted)).toBe(true);
      authority.assertConservation();
      const goldBefore = views[0]!.own.gold;
      sockets[0]!.send('command', buys[0]);
      await until(() => receipts[0]!.length === 2);
      expect(receipts[0]![0]).toEqual(receipts[0]![1]);
      expect(views[0]!.own.gold).toBe(goldBefore);
      sockets[0]!.send('command', {
        ...buys[0],
        requestId: 'foreign-identity',
        sessionId: sockets[1]!.sessionId,
      });
      await until(() => receipts[0]!.length === 3);
      expect(receipts[0]![2]!.reason).toBe('identity');
      sockets[0]!.send('dev_add_gold', { gold: 999 });
      await until(() => errors[0]!.length === 1);
      expect(errors[0]![0]).toBe('unsupported-message');
      for (const [i, v] of views.entries()) {
        for (const [j, other] of views.entries())
          if (i !== j) {
            for (const offer of other!.own.shop)
              if (offer) expect(JSON.stringify(v)).not.toContain(offer.id);
            const bench = other!.own.units.find((u) => u.location.kind === 'bench')!;
            expect(JSON.stringify(v)).not.toContain(bench.id);
          }
      }
      const report = [];
      for (let round = 1; round <= 3; round++) {
        now = views[0]!.clock.phaseDeadline;
        await until(
          () =>
            views.every((v) => v!.clock.currentPhase === 'combat') &&
            traces.every((t) => t.length === round),
        );
        expect(new Set(views.map((v) => v!.clock.phaseDeadline)).size).toBe(1);
        expect(new Set(views.map((v) => v!.clock.phaseStart)).size).toBe(1);
        expect(authority.duels).toHaveLength(2);
        expect(new Set(authority.duels.map((d) => d.replay.input.seed)).size).toBe(2);
        for (let i = 0; i < count; i++) {
          const trace = traces[i]!.at(-1)!;
          expect(trace.combatId).toBe(authority.duelFor(sockets[i]!.sessionId)!.pairing.combatId);
          expect(trace.side).toBe(
            trace.pairing.southPlayerId === fixtureUsers[i] ? 'south' : 'north',
          );
          if (trace.pairing.kind === 'ghost')
            expect(trace.pairing.ghostFacingId).toBe(fixtureUsers[i]);
          expect(trace.replay).toEqual(authority.duelFor(sockets[i]!.sessionId)!.replay);
        }
        const ticks = authority.duels.map((d) => d.replay.result.tick);
        if (round === 1) {
          expect(
            authority.duels.some((d) => d.replay.events.some((e) => e.type === 'overtime_start')),
          ).toBe(true);
          expect(Math.max(...ticks)).toBe(450);
          if (count === 4) {
            expect(Math.min(...ticks)).toBeLessThan(450);
            now = views[0]!.clock.phaseStart + Math.min(...ticks) * 100 + 600;
            await until(() => views[0]!.players.some((p) => p.status === 'awaiting_round'));
            expect(authority.settlements.size).toBe(0);
            expect(views.every((v) => v!.clock.currentPhase === 'combat')).toBe(true);
          }
        }
        now = views[0]!.clock.phaseDeadline;
        await until(() => views.every((v) => v!.clock.currentPhase === 'resolution'));
        expect(authority.settlements.size).toBe(round * count);
        expect(views.every((v) => v!.ownSettlement?.round === round)).toBe(true);
        expect(new Set(views.map((v) => v!.ownSettlement!.id)).size).toBe(count);
        for (const v of views) {
          expect(v!.own.hp).toBe(v!.players.find((p) => p.id === v!.playerId)!.hp);
          expect(v!.ownSettlement!.damage).toBe(v!.own.healthLedger.at(-1)!.applied);
        }
        const ledgerLengths = authority.players.map((p) => p.state.ledger.length);
        authority.pulse();
        authority.pulse();
        expect(authority.players.map((p) => p.state.ledger.length)).toEqual(ledgerLengths);
        report.push({
          round,
          pairings: views[0]!.pairings.map((p) => ({
            kind: p.kind,
            south: p.southPlayerId,
            north: p.northPlayerId,
          })),
          ticks,
          traceHashes: authority.duels.map((d) =>
            createHash('sha256').update(JSON.stringify(d.replay)).digest('hex'),
          ),
          settlements: authority.settlements.size,
          hp: views[0]!.players.map((p) => p.hp),
        });
        now = views[0]!.clock.phaseDeadline;
        await until(() =>
          views.every((v) => v!.clock.currentPhase === 'preparation' && v!.own.round === round + 1),
        );
        authority.assertConservation();
      }
      expect(authority.players.every((p) => p.opponents.length === 3)).toBe(true);
      if (count === 4)
        for (const p of authority.players)
          expect(new Set(p.opponents.map((o) => o.opponentId)).size).toBe(3);
      else
        for (const p of authority.players)
          expect(p.opponents.filter((o) => o.ghost)).toHaveLength(1);
      console.log(
        JSON.stringify({
          scenario: `controlled-sdk-${count}`,
          liveSupabase: false,
          rounds: report,
        }),
      );
      await Promise.all(sockets.map((c) => c.leave()));
      for (const c of sockets) clients.splice(clients.indexOf(c), 1);
    },
    20000,
  );
});
