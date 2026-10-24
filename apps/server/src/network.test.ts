import { afterAll, beforeAll, expect, it } from 'vitest';
import { Client, type Room } from '@colyseus/sdk';
import {
  NETWORK_VERSION,
  NetworkSnapshotSchema,
  ActionReceiptSchema,
  type NetworkSnapshot,
  type ActionReceipt,
} from '@tft/shared';
import { createServer } from './server';
const server = createServer();
const clients: Room[] = [];
beforeAll(() => server.listen(2568, '127.0.0.1'));
afterAll(async () => {
  await Promise.all(clients.map((c) => c.leave()));
  await server.gracefullyShutdown(false);
});
async function waitFor(test: () => boolean) {
  const until = Date.now() + 4000;
  while (!test()) {
    if (Date.now() > until) throw new Error('Network timeout');
    await new Promise((r) => setTimeout(r, 10));
  }
}
it('two real sockets: private snapshots, concurrent purchases, duplicate, spoof, unknown commands and third rejection', async () => {
  const a = await new Client('http://127.0.0.1:2568').create('test_match');
  clients.push(a);
  const b = await new Client('http://127.0.0.1:2568').joinById(a.roomId);
  clients.push(b);
  let sa: NetworkSnapshot | undefined, sb: NetworkSnapshot | undefined;
  const ra: ActionReceipt[] = [],
    rb: ActionReceipt[] = [],
    errors: string[] = [];
  a.onMessage('state_snapshot', (x: unknown) => {
    sa = NetworkSnapshotSchema.parse(x);
  });
  b.onMessage('state_snapshot', (x: unknown) => {
    sb = NetworkSnapshotSchema.parse(x);
  });
  a.onMessage('action_receipt', (x: unknown) => ra.push(ActionReceiptSchema.parse(x)));
  b.onMessage('action_receipt', (x: unknown) => rb.push(ActionReceiptSchema.parse(x)));
  a.onMessage('protocol_error', (x: string) => errors.push(x));
  a.send('sync', null);
  b.send('sync', null);
  await waitFor(() => !!sa && !!sb);
  expect(sa!.playerId).toBe('vargas');
  expect(sb!.playerId).toBe('florin');
  expect(a.sessionId).not.toBe(b.sessionId);
  await expect(new Client('http://127.0.0.1:2568').joinById(a.roomId)).rejects.toThrow();
  a.send('start', null);
  await waitFor(
    () => sa?.clock.currentPhase === 'preparation' && sb?.clock.currentPhase === 'preparation',
  );
  expect(sa!.clock.phaseDeadline).toBe(sb!.clock.phaseDeadline);
  expect(sa!.clock.phaseSequence).toBe(sb!.clock.phaseSequence);
  const command = (room: Room, s: NetworkSnapshot) => ({
    version: NETWORK_VERSION,
    sessionId: room.sessionId,
    requestId: 'buy',
    sequence: 0,
    matchId: room.roomId,
    phaseId: s.clock.phaseId,
    action: {
      type: 'buy_unit',
      offerId: s.own.shop[0]!.id,
      seq: s.own.nextActionSeq,
      expectedRevision: s.own.revision,
    },
  });
  const ca = command(a, sa!),
    cb = command(b, sb!);
  a.send('command', ca);
  b.send('command', cb);
  await waitFor(
    () =>
      ra.length === 1 &&
      rb.length === 1 &&
      sa!.own.units.length === 1 &&
      sb!.own.units.length === 1,
  );
  expect(ra[0]!.accepted && rb[0]!.accepted).toBe(true);
  expect(sa!.own.units[0]!.id.startsWith('vargas-')).toBe(true);
  expect(sb!.own.units[0]!.id.startsWith('florin-')).toBe(true);
  expect(JSON.stringify(sa)).not.toContain(cb.action.offerId);
  const gold = sa!.own.gold;
  a.send('command', ca);
  await waitFor(() => ra.length === 2);
  expect(ra[1]).toEqual(ra[0]);
  expect(sa!.own.gold).toBe(gold);
  a.send('command', { ...ca, requestId: 'forged', sequence: 1, sessionId: b.sessionId });
  await waitFor(() => ra.length === 3);
  expect(ra[2]!.reason).toBe('identity');
  a.send('dev_add_gold', { gold: 999 });
  await waitFor(() => errors.length > 0);
  expect(errors[0]).toBe('unsupported-message');
  await b.leave();
  clients.splice(clients.indexOf(b), 1);
  await waitFor(() => sa!.players[1]!.connected === false);
  expect(sa!.clock.currentPhase).toBe('preparation');
});

it('real-time sockets replay one common combat then receive the next round and reject a late command', async () => {
  const { createHash } = await import('node:crypto');
  const a = await new Client('http://127.0.0.1:2568').create('test_match');
  clients.push(a);
  const b = await new Client('http://127.0.0.1:2568').joinById(a.roomId);
  clients.push(b);
  const views: Array<NetworkSnapshot | undefined> = [undefined, undefined];
  const traces: unknown[] = [null, null];
  const receipts: ActionReceipt[][] = [[], []];
  for (const [i, c] of [a, b].entries()) {
    c.onMessage('state_snapshot', (x: unknown) => {
      views[i] = NetworkSnapshotSchema.parse(x);
    });
    c.onMessage('combat_trace', (x: unknown) => {
      traces[i] = x;
    });
    c.onMessage('action_receipt', (x: unknown) => receipts[i]!.push(ActionReceiptSchema.parse(x)));
    c.send('sync', null);
  }
  await waitFor(() => views.every(Boolean));
  a.send('start', null);
  await waitFor(() => views.every((s) => s?.clock.currentPhase === 'preparation'));
  const sendIntent = (i: number, type: string, params: Record<string, unknown>) => {
    const c = [a, b][i]!,
      s = views[i]!,
      sequence = receipts[i]!.length;
    const message = {
      version: NETWORK_VERSION,
      sessionId: c.sessionId,
      requestId: `real-${sequence}`,
      sequence,
      matchId: c.roomId,
      phaseId: s.clock.phaseId,
      action: { type, ...params, seq: s.own.nextActionSeq, expectedRevision: s.own.revision },
    };
    c.send('command', message);
    return message;
  };
  for (const i of [0, 1]) sendIntent(i, 'buy_unit', { offerId: views[i]!.own.shop[0]!.id });
  await waitFor(() => views.every((s) => s!.own.units.length === 1));
  for (const i of [0, 1])
    sendIntent(i, 'move_unit', {
      unitId: views[i]!.own.units[0]!.id,
      to: { kind: 'board', hex: { q: 0, r: 4 } },
    });
  await waitFor(() => views.every((s) => s!.own.units[0]!.location.kind === 'board'));
  const stale = {
    version: NETWORK_VERSION,
    sessionId: a.sessionId,
    requestId: 'late',
    sequence: 2,
    matchId: a.roomId,
    phaseId: views[0]!.clock.phaseId,
    action: {
      type: 'buy_xp',
      seq: views[0]!.own.nextActionSeq,
      expectedRevision: views[0]!.own.revision,
    },
  };
  const until = Date.now() + 85000;
  while (!views.every((s) => s!.own.round === 2)) {
    if (Date.now() > until) throw new Error('Round did not advance');
    await new Promise((r) => setTimeout(r, 50));
  }
  const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
  expect(traces[0]).toEqual(traces[1]);
  expect(traces[0]).not.toBeNull();
  expect(views[0]!.own.health.south).toBe(views[1]!.own.health.north);
  expect(views[0]!.own.health.north).toBe(views[1]!.own.health.south);
  expect(views[0]!.settlementId).toBe(views[1]!.settlementId);
  expect(views[0]!.clock.phaseDeadline).toBe(views[1]!.clock.phaseDeadline);
  a.send('command', stale);
  await waitFor(() => receipts[0]!.length === 3);
  expect(receipts[0]![2]!.reason).toBe('wrong-phase');
  console.log(
    JSON.stringify({
      room: a.roomId,
      traceSha256: hash(traces[0]),
      round: 2,
      health: views[0]!.own.health,
      deadline: views[0]!.clock.phaseDeadline,
      lateRejected: true,
    }),
  );
}, 100000);

it('enforces per-connection message frequency at the transport boundary', async () => {
  const c = await new Client('http://127.0.0.1:2568').create('test_match');
  clients.push(c);
  let closed = false;
  c.onMessage('pong', () => {});
  c.onLeave(() => {
    closed = true;
  });
  c.onError(() => {});
  for (let i = 0; i < 40; i++) c.send('ping', i);
  await waitFor(() => closed);
  expect(closed).toBe(true);
  clients.splice(clients.indexOf(c), 1);
});
