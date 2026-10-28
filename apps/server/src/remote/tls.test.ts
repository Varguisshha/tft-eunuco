/** Local HTTPS/WSS + real isolated PG. Run with a process-scoped trusted test CA. */
import { it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes, createHmac, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Client, type Room } from '@colyseus/sdk';
import {
  LOBBY_VERSION,
  NETWORK_VERSION,
  RECOVERY_VERSION,
  type LobbyEvent,
  type CompetitiveSnapshot,
  type ActionReceipt,
  type MatchCommand,
} from '@tft/shared';
import { fixtureUsers } from '../multi-fixture';
import { commandFor } from '@tft/game-core';
import { AuthoritativeMatch } from '../AuthoritativeMatch';
import { PostgresTestRepository } from '../persistence/PostgresTestRepository';
const enabled = process.env.P9A_TLS_TESTS === '1';
const secret = randomBytes(32).toString('hex');
const url = process.env.P9A_TEST_DATABASE_URL;
let backend: ChildProcess, proxy: ChildProcess, repo: PostgresTestRepository;
const output: string[] = [];
const sockets: Room[] = [];
const origin = 'https://localhost:9443';
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(check: () => boolean) {
  const end = Date.now() + 12000;
  while (!check()) {
    if (Date.now() > end) throw Error('TLS scenario timeout');
    await pause(20);
  }
}
const token = (i: number) => {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    b = Buffer.from(
      JSON.stringify({
        sub: fixtureUsers[i],
        aud: 'p9a-local-only',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString('base64url');
  return (
    h +
    '.' +
    b +
    '.' +
    createHmac('sha256', secret)
      .update(h + '.' + b)
      .digest('base64url')
  );
};
function client(i: number) {
  const c = new Client(origin, { headers: { Origin: origin } });
  c.auth.token = token(i);
  return c;
}
async function boot() {
  backend = spawn(
    process.execPath,
    [
      '--import',
      './apps/server/node_modules/tsx/dist/loader.mjs',
      'apps/server/src/diagnostics/p9a.ts',
    ],
    {
      env: { ...process.env, P9A_SIGNING_KEY: secret, P9A_BROWSER_SEED: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let ready = false;
  backend.stdout!.on('data', (b) => {
    output.push(String(b));
    if (String(b).includes('"event":"started"')) ready = true;
  });
  backend.stderr!.on('data', () => {});
  await until(() => ready);
}
async function stop(child: ChildProcess, signal: NodeJS.Signals = 'SIGTERM') {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((r) => {
    child.once('exit', () => r());
    child.kill(signal);
  });
}
async function control(path: string, method = 'GET') {
  const r = await fetch('http://127.0.0.1:2597' + path, {
    method,
    headers: { authorization: 'Bearer ' + secret },
  });
  if (!r.ok) throw Error('Control unavailable');
  return r;
}
async function snapshot(id: string) {
  return (await control('/snapshot?match=' + id)).json() as Promise<
    ReturnType<AuthoritativeMatch['exportState']>
  >;
}
// Build the wire command from the captured state without replaying/restoring a whole
// authority in the test runner for every shop click. The server remains the validator.
function messageFor(
  state: Awaited<ReturnType<typeof snapshot>>,
  index: number,
  command: MatchCommand,
) {
  const p = state.players[index]!;
  return {
    version: NETWORK_VERSION,
    sessionId: p.sessionId,
    requestId: `intent-${index}-${p.sequence}`,
    sequence: p.sequence,
    matchId: state.id,
    phaseId: state.clock.phaseId,
    action: commandFor(p.state, command),
  };
}
async function action(room: Room, type: string, extra = {}) {
  const id = randomUUID();
  let result: LobbyEvent | undefined;
  const off = room.onMessage('lobby_event', (e: LobbyEvent) => {
    if (e.requestId === id) result = e;
  });
  room.send('lobby_action', { version: LOBBY_VERSION, requestId: id, type, ...extra });
  await until(() => !!result);
  off();
  expect(result!.error).toBeNull();
  return result!;
}
beforeAll(async () => {
  if (!enabled) return;
  if (
    !url ||
    !/^postgres(?:ql)?:\/\/(?:[^/@]+@)?127\.0\.0\.1:55439\/tft_remote_test(?:_[a-z0-9_]+)?$/.test(
      url,
    )
  )
    throw Error('Isolated remote diagnostic DB required');
  repo = new PostgresTestRepository(url);
  await repo.pool.query('truncate private.authority_members,private.authority_matches');
  proxy = spawn(process.execPath, ['scripts/remote/local-proxy.mjs'], { stdio: 'ignore' });
  await boot();
  await pause(200);
}, 20000);
afterAll(async () => {
  if (!enabled) return;
  await Promise.all(
    sockets.filter((s) => s.connection.isOpen).map((s) => s.leave().catch(() => {})),
  );
  await stop(backend);
  await stop(proxy);
  await repo?.pool.end();
  mkdirSync('artifacts/p9a', { recursive: true });
  writeFileSync('artifacts/p9a/tls-runtime.jsonl', output.join(''));
});
it.skipIf(!enabled)(
  'trusted HTTPS, restrictive CORS, redirect, no DEV and genuine TLS rejection',
  async () => {
    expect((await fetch(origin + '/')).status).toBe(200);
    expect((await fetch('http://localhost:9080/', { redirect: 'manual' })).status).toBe(308);
    expect((await fetch(origin + '/readyz')).status).toBe(200);
    expect(
      (
        await fetch(origin + '/matchmake/create/lobby_gateway', {
          method: 'OPTIONS',
          headers: { Origin: 'https://evil.test' },
        })
      ).status,
    ).toBe(403);
    const preflight = await fetch(origin + '/matchmake/create/lobby_gateway', {
      method: 'OPTIONS',
      headers: { Origin: origin },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-origin')).toBe(origin);
    expect(preflight.headers.has('set-cookie')).toBe(false);
    expect((await fetch(origin + '/artifacts/p8f/index.html')).status).toBe(404);
    expect((await fetch(origin + '/.env')).status).toBe(404);
    const c = client(0);
    c.auth.token = 'not-valid';
    await expect(c.create('lobby_gateway')).rejects.toBeDefined();
    const outsider = new Client(origin, { headers: { Origin: 'https://evil.test' } });
    outsider.auth.token = token(0);
    await expect(outsider.create('lobby_gateway')).rejects.toBeDefined();
    // A separate process without the local CA must reject, never silently downgrade.
    const rejected = await new Promise<number | null>((resolve) => {
      const env = { ...process.env };
      delete env.NODE_EXTRA_CA_CERTS;
      const c = spawn(
        process.execPath,
        ['-e', `fetch('${origin}/healthz').then(()=>process.exit(2)).catch(()=>process.exit(0))`],
        { env, stdio: 'ignore' },
      );
      c.on('exit', resolve);
    });
    expect(rejected).toBe(0);
  },
);
it.skipIf(!enabled).each([2, 3, 4] as const)(
  '%i clients complete durable WSS campaign with normal economy',
  async (count) => {
    // Independent campaigns: do not restore finished rooms from an earlier scenario.
    await stop(backend);
    await repo.pool.query('truncate private.authority_members,private.authority_matches');
    await boot();
    const gateways: Room[] = [];
    let peers: Room[] = [];
    const views: (CompetitiveSnapshot | undefined)[] = [];
    for (let i = 0; i < count; i++) {
      const r = await client(i).create('lobby_gateway');
      r.reconnection.enabled = false;
      r.onMessage('lobby_event', () => {});
      gateways.push(r);
      sockets.push(r);
    }
    const created = await action(gateways[0]!, 'create_lobby', { capacity: count });
    for (let i = 1; i < count; i++)
      await action(gateways[i]!, 'join_lobby', { roomCode: created.lobby!.roomCode });
    for (const r of gateways) await action(r, 'set_ready', { readyState: true });
    const started = await action(gateways[0]!, 'start_match');
    const id = started.lobby!.matchId!;
    async function join(i: number) {
      const r = await client(i).joinById(id, { recoveryVersion: RECOVERY_VERSION });
      r.reconnection.enabled = false;
      r.onMessage('state_snapshot', (v: CompetitiveSnapshot) => {
        views[i] = v;
      });
      for (const n of [
        'combat_trace',
        'action_receipt',
        'final_results',
        'spectate_snapshot',
        'service_status',
        'resume_accepted',
      ])
        r.onMessage(n, () => {});
      r.send('sync', null);
      peers[i] = r;
      sockets.push(r);
      await until(() => !!views[i]);
    }
    for (let i = 0; i < count; i++) await join(i);
    await until(() => views.every((v) => v?.clock.currentPhase === 'preparation'));
    let state = await snapshot(id),
      ghost = false,
      recovered = false,
      outage = false,
      commands = 0;
    const phases: unknown[] = [];
    const characters = new Set<string>();
    async function command(i: number, command: MatchCommand) {
      state = await snapshot(id);
      const message = messageFor(state, i, command);
      let ack: ActionReceipt | undefined;
      const off = peers[i]!.onMessage('action_receipt', (r: ActionReceipt) => {
        if (r.requestId === message.requestId) ack = r;
      });
      peers[i]!.send('command', message);
      await until(() => !!ack);
      off();
      commands++;
      await pause(40);
      return ack!.accepted;
    }
    for (let step = 0; step < 240 && !state.finalResult; step++) {
      if (state.clock.currentPhase === 'preparation') {
        for (let i = 0; i < count; i++) {
          if (state.players[i]!.eliminated) continue;
          if (count > 2 && i === 0 && state.players[i]!.state.round >= 7) {
            for (const u of state.players[i]!.state.units)
              await command(i, { type: 'sell_unit', unitId: u.id });
            continue;
          }
          for (const o of [...state.players[i]!.state.shop]) {
            if (!o) continue;
            characters.add(o.definitionId);
            await command(i, { type: 'buy_unit', offerId: o.id });
          }
          state = await snapshot(id);
          if (state.players[i]!.state.gold >= 8 && state.players[i]!.state.level < 5)
            await command(i, { type: 'buy_xp' });
          state = await snapshot(id);
          const p = state.players[i]!.state;
          let deployed = p.units.filter((u) => u.location.kind === 'board').length;
          for (const u of p.units) {
            if (u.location.kind !== 'bench' || deployed >= p.level) continue;
            if (
              await command(i, {
                type: 'move_unit',
                unitId: u.id,
                to: { kind: 'board', hex: { q: deployed - 2, r: 4 } },
              })
            )
              deployed++;
          }
          state = await snapshot(id);
          const items = state.players[i]!.state.items!;
          if (items.components.length >= 2)
            await command(i, {
              type: 'combine_components',
              firstId: items.components[0]!.id,
              secondId: items.components[1]!.id,
            });
          state = await snapshot(id);
          const inventory = state.players[i]!.state.items!,
            u = state.players[i]!.state.units[0];
          if (inventory.completed[0] && u)
            await command(i, {
              type: 'equip_item',
              itemId: inventory.completed[0].id,
              unitId: u.id,
            });
        }
      }
      if (
        count === 4 &&
        !outage &&
        state.players[0]!.state.round >= 3 &&
        state.clock.currentPhase === 'preparation'
      ) {
        const before = await snapshot(id);
        await control('/outage?on=1', 'POST');
        expect((await fetch(origin + '/readyz')).status).toBe(503);
        expect((await fetch(origin + '/healthz')).status).toBe(200);
        let unavailable = false;
        const off = peers[1]!.onMessage('service_status', (v: { available: boolean }) => {
          if (!v.available) unavailable = true;
        });
        const recoveryIntent = messageFor(before, 1, {
          type: 'buy_xp',
        });
        peers[1]!.send('command', recoveryIntent);
        await until(() => unavailable);
        off();
        const after = await snapshot(id);
        expect(after.players.map((p) => p.state)).toEqual(before.players.map((p) => p.state));
        await control('/outage?on=0', 'POST');
        await pause(1200);
        outage = true;
      }
      if (
        count === 4 &&
        !recovered &&
        state.clock.currentPhase === 'combat' &&
        state.players[0]!.state.round >= 4
      ) {
        const before = await snapshot(id);
        await stop(backend, 'SIGKILL');
        await boot();
        views.fill(undefined);
        peers = [];
        for (let i = 0; i < count; i++) await join(i);
        const after = await snapshot(id);
        expect(after.players.map((p) => p.state)).toEqual(before.players.map((p) => p.state));
        expect(after.itemDrops).toEqual(before.itemDrops);
        expect(after.duels).toEqual(before.duels);
        recovered = true;
      }
      state = await snapshot(id);
      ghost ||= state.duels.some((d) => d.pairing.kind === 'ghost');
      phases.push({ round: state.clock.roundId, phase: state.clock.currentPhase });
      await control('/advance?match=' + id, 'POST');
      await pause(60);
      state = await snapshot(id);
    }
    expect(state.finalResult).not.toBeNull();
    expect(state.finalResult!.standings).toHaveLength(count);
    expect(state.itemDrops!.rounds.map((r) => r.round)).toEqual(expect.arrayContaining([3, 6]));
    if (count === 3) expect(ghost).toBe(true);
    if (count === 4) {
      expect(recovered).toBe(true);
      expect(outage).toBe(true);
    }
    mkdirSync('artifacts/p9a', { recursive: true });
    writeFileSync(
      `artifacts/p9a/tls-campaign-${count}.json`,
      JSON.stringify(
        {
          count,
          commands,
          characters: [...characters],
          ghost,
          recovered,
          outage,
          phases,
          final: state.finalResult,
          dropRounds: state.itemDrops!.rounds.map((r) => r.round),
        },
        null,
        2,
      ),
    );
    for (const peer of peers) await peer.leave();
    for (const gate of gateways) {
      if (gate.connection.isOpen) {
        await action(gate, 'leave_lobby');
        await gate.leave();
      }
    }
  },
  240000,
);
