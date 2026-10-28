// Explicit opt-in integration scenario; authorized test accounts only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import process from 'node:process';
import console from 'node:console';
import { createHash } from 'node:crypto';
import { setTimeout } from 'node:timers';
const req = createRequire(process.cwd() + '/apps/server/package.json');
const { Client } = req('@colyseus/sdk');
const dir = process.env.TFT_E2E_DIR;
if (!dir) throw new Error('Set TFT_E2E_DIR to the private directory of authorized test accounts.');
const sessions = ['vargas_test', 'florin_test'].map((n) =>
  JSON.parse(fs.readFileSync(dir + '/' + n + '.session.json')),
);
const rooms = [];
const wait = async (f, ms = 7000) => {
  let end = Date.now() + ms;
  while (!f()) {
    if (Date.now() > end) throw Error('Timeout');
    await new Promise((r) => setTimeout(r, 40));
  }
};
(async () => {
  const make = (t) => {
    const c = new Client('http://127.0.0.1:2567');
    if (t) c.auth.token = t;
    return c;
  };
  await assert.rejects(() =>
    make().create('test_match', { userId: sessions[0].user.id, name: 'Admin' }),
  );
  await assert.rejects(() => make('forged-token').create('test_match'));
  const a = await make(sessions[0].access_token).create('test_match', {
    userId: 'forged',
    name: 'Admin',
  });
  rooms.push(a);
  await assert.rejects(() => make(sessions[0].access_token).joinById(a.roomId));
  const b = await make(sessions[1].access_token).joinById(a.roomId);
  rooms.push(b);
  let views = [null, null],
    traces = [null, null],
    receipts = [[], []];
  rooms.forEach((r, i) => {
    r.onMessage('state_snapshot', (s) => (views[i] = s));
    r.onMessage('combat_trace', (t) => (traces[i] = t));
    r.onMessage('action_receipt', (v) => receipts[i].push(v));
    r.onMessage('protocol_error', () => {});
    r.send('sync', null);
  });
  await wait(() => views.every(Boolean));
  assert.equal(views[0].playerId, sessions[0].user.id);
  assert.equal(views[1].playerId, sessions[1].user.id);
  assert.notEqual(a.sessionId, views[0].playerId);
  assert.deepEqual(
    views[0].players.map((p) => p.name),
    ['Vargas', 'Florin'],
  );
  assert(!/token|email|shop|gold|bench/.test(JSON.stringify(views[0].players)));
  a.send('start', null);
  await wait(() => views.every((v) => v.clock.currentPhase === 'preparation'));
  const send = (i, type, params) => {
    let r = rooms[i],
      s = views[i],
      seq = receipts[i].length;
    r.send('command', {
      version: 'f0p7b1-1',
      sessionId: r.sessionId,
      requestId: 'live-' + seq,
      sequence: seq,
      matchId: r.roomId,
      phaseId: s.clock.phaseId,
      action: { type, ...params, seq: s.own.nextActionSeq, expectedRevision: s.own.revision },
    });
  };
  for (let i = 0; i < 2; i++) send(i, 'buy_unit', { offerId: views[i].own.shop[0].id });
  await wait(() => views.every((v) => v.own.units.length === 1));
  assert(receipts.every((r) => r[0].accepted));
  assert(!JSON.stringify(views[0]).includes(views[1].own.shop[0]?.id || 'impossible'));
  for (let i = 0; i < 2; i++)
    send(i, 'move_unit', {
      unitId: views[i].own.units[0].id,
      to: { kind: 'board', hex: { q: 0, r: 4 } },
    });
  await wait(() => views.every((v) => v.own.units[0].location.kind === 'board'));
  console.log(
    'Authenticated UUIDs, spoof/duplicate rejection, private shops, purchases and deployment PASS',
  );
  await wait(() => views.every((v) => v.own.round === 2), 95000);
  assert(traces[0]);
  assert.deepEqual(traces[0], traces[1]);
  assert.equal(views[0].settlementId, views[1].settlementId);
  assert.equal(views[0].own.health.south, views[1].own.health.north);
  assert.equal(views[0].own.health.north, views[1].own.health.south);
  assert.equal(views[0].clock.phaseDeadline, views[1].clock.phaseDeadline);
  console.log(
    JSON.stringify({
      result: 'real multiplayer PASS',
      traceSha256: createHash('sha256').update(JSON.stringify(traces[0])).digest('hex'),
      round: 2,
      health: views[0].own.health,
      gold: views.map((v) => v.own.gold),
    }),
  );
  const left = new Promise((resolve) => a.onLeave(resolve));
  a.send('authenticate', sessions[1].access_token);
  assert.equal(await left, 4001);
  console.log('Socket identity switch rejected PASS');
  rooms.shift();
})()
  .catch((e) => {
    console.error('FAILED:', e.code || e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all(rooms.map((r) => r.leave()));
  });
