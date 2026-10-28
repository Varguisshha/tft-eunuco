/* global setTimeout, Buffer, fetch, console, window, document */
import process from 'node:process';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { Client } from '../../../apps/server/node_modules/@colyseus/sdk/build/index.mjs';
import { PostgresTestRepository } from '../../../apps/server/src/persistence/PostgresTestRepository.ts';
import {
  LOBBY_VERSION,
  NETWORK_VERSION,
  RECOVERY_VERSION,
} from '../../../packages/shared/src/index.ts';
const mode = process.env.P9A1_MODE ?? 'baseline';
const normal = mode === 'normal';
if (mode === 'consecutive') process.env.TFT_FINAL_RETENTION_MS = '8000';
const initialShops = new Map();
const url = process.env.P9A1_DATABASE_URL;
if (!url || !/^postgres(?:ql)?:\/\/(?:[^/@]+@)?127\.0\.0\.1:55439\/tft_memory_test$/.test(url))
  throw Error('Isolated diagnostic DB required');
const root = 'artifacts/p9a1/' + mode;
fs.mkdirSync(root, { recursive: true });
const secret = randomBytes(32).toString('hex');
const tokens = Array.from({ length: 4 }, (_, i) => {
  const h = Buffer.from('{"alg":"HS256"}').toString('base64url'),
    b = Buffer.from(
      JSON.stringify({
        sub: `00000000-0000-4000-8000-00000000000${i + 1}`,
        aud: 'p9a1-local',
        exp: Math.floor(Date.now() / 1000) + 7200,
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
});
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(check, ms = 15000) {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw Error('Scenario timed out');
    await pause(25);
  }
}
let backend, proxy;
const repo = new PostgresTestRepository(url);
async function boot(tag) {
  const log = fs.openSync(root + '/' + tag + '-runtime.jsonl', 'a');
  backend = spawn(
    process.execPath,
    [
      '--expose-gc',
      '--import',
      './apps/server/node_modules/tsx/dist/loader.mjs',
      'scripts/diagnostics/p9a1/server.mjs',
    ],
    {
      env: {
        ...process.env,
        P9A1_KEY: secret,
        P9A1_RUN: mode + '-' + tag,
        P9A1_NORMAL: normal ? '1' : '0',
      },
      stdio: ['ignore', log, log],
    },
  );
  fs.closeSync(log);
  for (let n = 0; n < 100; n++) {
    try {
      if ((await fetch('https://localhost:9445/readyz')).status === 200) return;
    } catch {
      /* wait */
    }
    if (backend.exitCode !== null) throw Error('Backend failed');
    await pause(100);
  }
  throw Error('Backend unavailable');
}
async function stop(p, signal = 'SIGTERM') {
  if (!p || p.exitCode !== null || p.signalCode) return;
  await new Promise((r) => {
    p.once('exit', r);
    p.kill(signal);
  });
}
async function control(path, method = 'GET') {
  const r = await fetch('http://127.0.0.1:2601' + path, {
    method,
    headers: { authorization: 'Bearer ' + secret },
  });
  if (!r.ok) throw Error('Diagnostic control unavailable');
  return r.json();
}
async function browserFinal(id) {
  const { chromium } = await import(process.env.P9A1_PLAYWRIGHT_PATH);
  const browser = await chromium.launchPersistentContext('artifacts/p9a1/chrome-profile', {
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    viewport: { width: 1920, height: 1080 },
  });
  const page = await browser.newPage(),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.addInitScript(
      ({ token, id }) => {
        window.DIAGNOSTIC_TOKEN = token;
        window.DIAGNOSTIC_MATCH_ID = id;
      },
      { token: tokens[0], id },
    );
    await page.goto('https://localhost:9445');
    await page.waitForFunction(() => window.remote?.finalResults);
    await page.getByText('Clasificación definitiva', { exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: root + '/compiled-final.png' });
    const before = await page.evaluate(() => window.remote.finalResults);
    const previousSession = await page.evaluate(() => window.remote.room.sessionId);
    await page.evaluate(() => window.remote.room.connection.close());
    await page.waitForFunction(
      (previous) =>
        window.remote.connected &&
        window.remote.finalResults &&
        window.remote.room.sessionId !== previous,
      previousSession,
    );
    const after = await page.evaluate(() => window.remote.finalResults);
    if (JSON.stringify(before) !== JSON.stringify(after) || errors.length)
      throw Error('Compiled final recovery mismatch');
    fs.writeFileSync(
      root + '/compiled-client.json',
      JSON.stringify({
        finalRecovered: true,
        consoleErrors: errors.length,
        players: before.standings?.length ?? before.positions?.length ?? 4,
      }),
    );
  } finally {
    await browser.close();
  }
}
async function measure(label, detail = false, gc = false) {
  const v = await control(
    '/measure?label=' + label + (detail ? '&detail=1' : '') + (gc ? '&gc=1' : ''),
  );
  fs.writeFileSync(root + '/' + label + '.json', JSON.stringify(v, null, 2));
  return v;
}
const client = (i) => {
  const c = new Client('https://localhost:9445', { headers: { Origin: 'https://localhost:9445' } });
  c.auth.token = tokens[i];
  return c;
};
async function action(r, type, extra = {}) {
  const requestId = randomUUID();
  let result;
  const off = r.onMessage('lobby_event', (e) => {
    if (e.requestId === requestId) result = e;
  });
  r.send('lobby_action', { version: LOBBY_VERSION, requestId, type, ...extra });
  await until(() => !!result);
  off();
  if (result.error) throw Error('Lobby action failed');
  return result;
}
async function game(count, index) {
  const began = Date.now(),
    gates = [],
    peers = [],
    views = [],
    sequences = [],
    traces = [];
  const acceptedActions = {};
  let actions = 0,
    reconnected = false,
    overtime = false;
  for (let i = 0; i < count; i++) {
    const g = await client(i).create('lobby_gateway');
    g.reconnection.enabled = false;
    g.onMessage('lobby_event', () => {});
    gates.push(g);
  }
  const created = await action(gates[0], 'create_lobby', { capacity: count });
  for (let i = 1; i < count; i++)
    await action(gates[i], 'join_lobby', { roomCode: created.lobby.roomCode });
  await measure(`C-${index}-waiting`, false, !normal);
  for (const g of gates) await action(g, 'set_ready', { readyState: true });
  const started = await action(gates[0], 'start_match');
  const id = started.lobby.matchId;
  async function join(i) {
    views[i] = undefined;
    sequences[i] = undefined;
    const r = await client(i).joinById(id, { recoveryVersion: RECOVERY_VERSION });
    r.reconnection.enabled = false;
    peers[i] = r;
    r.onMessage('state_snapshot', (v) => {
      views[i] = v;
    });
    r.onMessage('resume_accepted', (v) => {
      sequences[i] = v.nextSequence;
    });
    r.onMessage('combat_trace', (v) => {
      traces[i] = { overtimeTick: v.replay.events.find((e) => e.type === 'overtime_start')?.tick };
    });
    for (const type of [
      'action_receipt',
      'service_status',
      'spectate_snapshot',
      'final_results',
      'protocol_error',
    ])
      r.onMessage(type, () => {});
    r.send('sync', null);
    await until(() => views[i] && sequences[i] !== undefined);
  }
  for (let i = 0; i < count; i++) await join(i);
  await until(() => views[0].clock.currentPhase === 'preparation');
  for (let i = 0; i < count; i++) {
    if (
      views[i].matchId !== id ||
      views[i].playerId !== `00000000-0000-4000-8000-00000000000${i + 1}`
    )
      throw Error('Cross-match identity');
  }
  const shops = JSON.stringify(views.map((v) => v.own.shop.map((o) => o?.definitionId)));
  if (initialShops.has(count) && initialShops.get(count) !== shops)
    throw Error('Previous match changed seeded shops');
  initialShops.set(count, shops);
  await measure(`D-${index}-preparation`, !normal, !normal);
  async function command(i, command) {
    const v = views[i],
      r = peers[i],
      requestId = randomUUID();
    let receipt;
    const off = r.onMessage('action_receipt', (a) => {
      if (a.requestId === requestId) receipt = a;
    });
    r.send('command', {
      version: NETWORK_VERSION,
      sessionId: r.sessionId,
      requestId,
      sequence: sequences[i]++,
      matchId: id,
      phaseId: v.clock.phaseId,
      action: { ...command, seq: v.own.nextActionSeq, expectedRevision: v.own.revision },
    });
    await until(() => !!receipt);
    off();
    actions++;
    if (receipt.accepted) acceptedActions[command.type] = (acceptedActions[command.type] ?? 0) + 1;
    return receipt.accepted;
  }
  const seen = new Set();
  let combatMeasured = false;
  const phases = [];
  while (!views[0].finalResults) {
    if (Date.now() - began > (normal ? 2400000 : 240000)) throw Error('Campaign duration exceeded');
    const clock = views[0].clock;
    if (!seen.has(clock.phaseId)) {
      seen.add(clock.phaseId);
      phases.push({ round: views[0].own.round, phase: clock.currentPhase, at: Date.now() - began });
      console.log(
        JSON.stringify({
          game: index,
          count,
          round: views[0].own.round,
          phase: clock.currentPhase,
          seconds: Math.round((Date.now() - began) / 1000),
        }),
      );
      if (clock.currentPhase === 'preparation')
        for (let i = 0; i < count; i++) {
          if (views[i].players.find((p) => p.id === views[i].playerId)?.eliminated) continue;
          if (i < count - 1 && views[i].own.round >= 7) {
            for (const u of [...views[i].own.units])
              await command(i, { type: 'sell_unit', unitId: u.id });
            continue;
          }
          for (const o of [...views[i].own.shop])
            if (o) await command(i, { type: 'buy_unit', offerId: o.id });
          if (views[i].own.gold >= 8 && views[i].own.level < 5)
            await command(i, { type: 'buy_xp' });
          for (const u of [...views[i].own.units]) {
            const own = views[i].own;
            const board = own.units.filter((x) => x.location.kind === 'board');
            if (u.location.kind !== 'bench' || board.length >= own.level) continue;
            let q = -2;
            while (board.some((x) => x.location.hex.q === q && x.location.hex.r === 4)) q++;
            await command(i, {
              type: 'move_unit',
              unitId: u.id,
              to: { kind: 'board', hex: { q, r: 4 } },
            });
          }
          const items = views[i].own.items;
          if (items?.components.length >= 2)
            await command(i, {
              type: 'combine_components',
              firstId: items.components[0].id,
              secondId: items.components[1].id,
            });
          const item = views[i].own.items?.completed[0],
            unit = views[i].own.units.find((u) => u.location.kind === 'board');
          if (item && unit)
            await command(i, { type: 'equip_item', itemId: item.id, unitId: unit.id });
        }
      if (clock.currentPhase === 'combat' && !combatMeasured) {
        await measure(`E-${index}-combat`, !normal, false);
        combatMeasured = true;
      }
      if (clock.currentPhase === 'preparation' && views[0].own.round === 4 && !reconnected) {
        const before = JSON.stringify(views[0].own);
        await peers[0].leave();
        await join(0);
        if (JSON.stringify(views[0].own) !== before) throw Error('Reconnect changed inventory');
        reconnected = true;
        await measure(`reconnect-${index}`);
      }
    }
    if (!normal) {
      const tick = traces.find((t) => t?.overtimeTick)?.overtimeTick;
      if (clock.currentPhase === 'combat' && tick && !overtime) {
        await control('/advance?match=' + id + '&ms=' + tick * 100, 'POST');
        await measure(`F-${index}-overtime`, true, false);
        overtime = true;
      }
      await control('/advance?match=' + id, 'POST');
      await pause(70);
    } else {
      if (
        clock.currentPhase === 'combat' &&
        !overtime &&
        traces.some(
          (t) => t?.overtimeTick && clock.phaseDuration - clock.remainingMs >= t.overtimeTick * 100,
        )
      ) {
        await measure(`F-${index}-overtime`);
        overtime = true;
      }
      await pause(250);
    }
  }
  await measure(`H-${index}-final-connected`, true, !normal);
  await pause(normal ? 10000 : 3000);
  await measure(`G-${index}-final-settled`, false, !normal);
  const summary = {
    count,
    index,
    normal,
    durationMs: Date.now() - began,
    actions,
    acceptedActions,
    initialShops: JSON.parse(shops),
    reconnected,
    overtime,
    phases,
    final: views[0].finalResults,
  };
  fs.writeFileSync(root + `/game-${index}.json`, JSON.stringify(summary, null, 2));
  for (const p of peers) if (p.connection.isOpen) await p.leave();
  for (const g of gates) if (g.connection.isOpen) await g.leave();
  await pause(1000);
  await measure(`I-${index}-final-disconnected`, true, !normal);
  return id;
}
try {
  await repo.pool.query('truncate private.authority_members,private.authority_matches');
  if (process.env.P9A1_RESTORE_FILE) {
    const saved = JSON.parse(fs.readFileSync(process.env.P9A1_RESTORE_FILE, 'utf8'));
    saved.revision = 1;
    saved.commitId = randomUUID();
    saved.expiresAt = Date.now() + 300000;
    await repo.commit(0, saved);
  }
  proxy = spawn(process.execPath, ['scripts/remote/local-proxy.mjs'], {
    env: { ...process.env, P9A_TLS_PORT: '9445', P9A_BACKEND_PORT: '2600' },
    stdio: 'ignore',
  });
  await boot('main');
  await measure('B-empty', false, true);
  if (process.env.P9A1_RESTORE_FILE) {
    const rows = await repo.load();
    const id = rows[0].id;
    await measure('J-restored-final', true, true);
    await pause(10000);
    await measure('J-restored-after-10s', false, true);
    if (process.env.P9A1_PLAYWRIGHT_PATH) await browserFinal(id);
    await control('/dispose?match=' + id, 'POST');
    await pause(1500);
    await measure('L-released', false, true);
  } else {
    const counts = mode === 'consecutive' ? [2, 2, 2, 2, 2, 4, 4, 4] : [4];
    for (let n = 0; n < counts.length; n++) {
      const id = await game(counts[n], n);
      if (mode === 'baseline' || mode === 'after') {
        const rows = await repo.load();
        fs.writeFileSync(root + '/retained-snapshot.json', JSON.stringify(rows));
        await stop(backend, 'SIGKILL');
        await boot('restored');
        await measure('J-restored-final', true, true);
        await pause(10000);
        await measure('J-restored-after-10s', false, true);
      }
      if (mode === 'consecutive') {
        let released = false;
        for (let n = 0; n < 50; n++) {
          await pause(250);
          const sample = await control('/measure?label=expiry-check');
          if (!sample.rooms.some((r) => r.registered && r.phase !== 'lobby')) {
            released = true;
            break;
          }
        }
        if (!released) throw Error('Final room outlived retention');
      } else await control('/dispose?match=' + id, 'POST');
      await pause(1500);
      await measure(`L-${n}-released`, false, true);
      await pause(100);
    }
    if (mode === 'consecutive') {
      await pause(32000);
      await measure('L-all-sweeps-released', false, true);
    }
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await stop(backend);
  await stop(proxy);
  await repo.pool.end();
}
