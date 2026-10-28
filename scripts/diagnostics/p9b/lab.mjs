/* global Buffer, console, fetch, setTimeout, URL */
import fs from 'node:fs';
import https from 'node:https';
import http from 'node:http';
import net from 'node:net';
import process from 'node:process';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import pg from '../../../apps/server/node_modules/pg/lib/index.js';
import { Client } from '../../../apps/server/node_modules/@colyseus/sdk/build/index.mjs';
import {
  LOBBY_VERSION,
  NETWORK_VERSION,
  RECOVERY_VERSION,
} from '../../../packages/shared/src/index.ts';
const root = 'artifacts/p9b-r0';
const origin = 'https://game.p9b.test:9447';
const pool = new pg.Pool({ connectionString: 'postgresql://127.0.0.1:55439/tft_railway_test' });
const secret = randomBytes(32).toString('hex'),
  serviceKey = randomBytes(32).toString('hex');
const publicKey = 'sb_publishable_p9b_local_only';
const user = (i) => ({
  id: `00000000-0000-4000-8000-00000000000${i + 1}`,
  aud: 'authenticated',
  role: 'authenticated',
  email: `fixture${i}@example.test`,
  email_confirmed_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  is_anonymous: false,
});
const tokens = Array.from({ length: 4 }, (_, i) => {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const b = Buffer.from(
    JSON.stringify({
      sub: user(i).id,
      aud: 'authenticated',
      role: 'authenticated',
      iat: Math.floor(Date.now() / 1000),
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
const tls = {
  key: fs.readFileSync(root + '/server.key'),
  cert: fs.readFileSync(root + '/server.pem'),
  minVersion: 'TLSv1.2',
};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(check, ms = 20000) {
  const end = Date.now() + ms;
  while (!(await check())) {
    if (Date.now() > end) throw Error('Lab wait expired');
    await pause(100);
  }
}
const free = net.createServer();
await new Promise((r) => free.listen(0, '127.0.0.1', r));
const port = free.address().port;
await new Promise((r) => free.close(r));
const env = {
  ...process.env,
  NODE_ENV: 'production',
  TFT_ENV: 'private',
  HOST: '0.0.0.0',
  PORT: String(port),
  TFT_PROXY_MODE: 'railway',
  TFT_PUBLIC_URL: origin,
  TFT_ALLOWED_ORIGINS: origin,
  TFT_FINAL_RETENTION_MS: '300000',
  RAILWAY_PROJECT_ID: 'local',
  RAILWAY_SERVICE_ID: 'local',
  RAILWAY_ENVIRONMENT_ID: 'local',
  RAILWAY_DEPLOYMENT_ID: 'local',
  SUPABASE_URL: 'https://localhost:9448',
  SUPABASE_PUBLISHABLE_KEY: publicKey,
  SUPABASE_SERVICE_ROLE_KEY: serviceKey,
};
const evidence = {
  dynamicPort: port,
  host: '0.0.0.0',
  private: true,
  compiledServer: true,
  normalClock: true,
  negatives: {},
  assets: {},
};
let unavailable = false;
const auth = https.createServer(tls, async (req, res) => {
  const send = (status, data) => {
    res.writeHead(status, {
      'content-type': 'application/json',
      'access-control-allow-origin': origin,
      'access-control-allow-headers':
        'authorization,apikey,content-type,x-client-info,x-supabase-api-version',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
    });
    res.end(JSON.stringify(data));
  };
  if (req.method === 'OPTIONS') return send(204, null);
  const path = new URL(req.url, 'https://localhost').pathname;
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  const index = tokens.indexOf(token);
  try {
    if (path === '/auth/v1/health') return send(unavailable ? 503 : 200, {});
    if (path === '/auth/v1/user')
      return send(index < 0 ? 401 : 200, index < 0 ? { message: 'invalid token' } : user(index));
    if (path === '/rest/v1/player_profiles' && index >= 0)
      return send(200, {
        user_id: user(index).id,
        username: 'fixture' + index,
        display_name: ['Vargas', 'Florin', 'Jaramillo', 'Dolea'][index],
        avatar_id: 'jade',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      });
    if (path === '/rest/v1/rpc/player_session_active')
      return send(index >= 0 ? 200 : 401, index >= 0);
    if (token !== serviceKey) return send(401, { message: 'unauthorized' });
    if (unavailable) return send(503, { message: 'offline' });
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    const name = path.replace('/rest/v1/rpc/', '');
    const allowed = {
      authority_health: [],
      authority_lease_health: [],
      authority_load: [],
      authority_lease_acquire: ['lease_owner'],
      authority_lease_renew: ['lease_owner'],
      authority_lease_release: ['lease_owner'],
      authority_fenced_commit: ['lease_owner', 'expected', 'document'],
    };
    if (!Object.hasOwn(allowed, name)) return send(404, {});
    const keys = allowed[name];
    const args = keys.map((k) => (k === 'document' ? JSON.stringify(body[k]) : body[k]));
    const result = await pool.query(
      `select public.${name}(${args.map((_, i) => '$' + (i + 1)).join(',')}) as value`,
      args,
    );
    return send(
      200,
      name === 'authority_load' ? result.rows.map((r) => r.value) : (result.rows[0]?.value ?? null),
    );
  } catch {
    return send(503, { message: 'fixture dependency failed' });
  }
});
await new Promise((r) => auth.listen(9448, '127.0.0.1', r));
const headers = (req) => ({
  ...req.headers,
  host: new URL(origin).host,
  'x-forwarded-host': new URL(origin).host,
  'x-forwarded-proto': 'https',
});
const edge = https.createServer(tls, (req, res) => {
  if (req.headers.host !== new URL(origin).host) {
    res.writeHead(403).end();
    return;
  }
  const q = http.request(
    { host: '127.0.0.1', port, path: req.url, method: req.method, headers: headers(req) },
    (r) => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res);
    },
  );
  q.on('error', () => res.writeHead(502).end());
  req.pipe(q);
});
edge.on('upgrade', (req, socket, head) => {
  const q = http.request({ host: '127.0.0.1', port, path: req.url, headers: headers(req) });
  q.on('upgrade', (r, peer, upHead) => {
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\n${Object.entries(r.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n')}\r\n\r\n`,
    );
    if (head.length) peer.write(head);
    if (upHead.length) socket.write(upHead);
    socket.pipe(peer).pipe(socket);
    socket.on('error', () => peer.destroy());
    peer.on('error', () => socket.destroy());
  });
  q.on('response', (r) =>
    socket.end(`HTTP/1.1 ${r.statusCode} Rejected\r\nConnection: close\r\n\r\n`),
  );
  q.on('error', () => socket.destroy());
  q.end();
});
await new Promise((r) => edge.listen(9447, '127.0.0.1', r));
let backend;
const children = [];
const sockets = [];
function launch(tag, override = {}) {
  const log = fs.openSync(root + '/' + tag + '.jsonl', 'w');
  const child = spawn(
    process.execPath,
    ['--require', './scripts/diagnostics/p9b/dns.cjs', 'apps/server/dist/main.js'],
    { env: { ...env, ...override }, stdio: ['ignore', log, log] },
  );
  fs.closeSync(log);
  children.push(child);
  return child;
}
async function stop(p, signal = 'SIGTERM') {
  if (!p || p.exitCode !== null || p.signalCode) return;
  await new Promise((r) => {
    p.once('exit', r);
    p.kill(signal);
  });
}
async function boot(tag) {
  backend = launch(tag);
  await until(async () => {
    try {
      return (await fetch(origin + '/readyz')).status === 200;
    } catch {
      return false;
    }
  }, 100000);
}
const client = (i) => {
  const c = new Client(origin, { headers: { Origin: origin } });
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
  await until(() => result);
  off();
  if (result.error) throw Error('Lobby action failed: ' + JSON.stringify(result.error));
  return result;
}

const normal = true,
  initialShops = new Map();
const measure = async () => {};
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
    sockets.push(g);
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
    sockets.push(r);
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
        evidence.reconnected = true;
        const itemsBefore = JSON.stringify(views.map((v) => v.own.items));
        await stop(backend);
        await boot('active-recovery');
        for (let j = 0; j < count; j++) await join(j);
        assert.equal(JSON.stringify(views.map((v) => v.own.items)), itemsBefore);
        evidence.activeRecovery = true;
      }
    }
    await pause(250);
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
  let id;
  if (process.env.P9B_RESUME_BROWSER === '1') {
    const row = (
      await pool.query(
        'select id from private.authority_matches where expires_at > now() order by expires_at desc limit 1',
      )
    ).rows[0];
    assert.ok(row, 'No retained match remains for browser verification');
    id = row.id;
    await boot('browser-recovery');
  } else {
    await pool.query(
      "truncate private.authority_members,private.authority_matches; update private.authority_lease set owner=null,enabled=false,expires_at='-infinity'",
    );
    await boot('initial');
    assert.equal((await fetch(origin + '/')).status, 200);
    const second = launch('overlap', { PORT: String(port + 1) });
    await pause(3000);
    let secondReady = false;
    try {
      secondReady =
        (
          await fetch('http://127.0.0.1:' + (port + 1) + '/readyz', {
            headers: { Host: 'healthcheck.railway.app' },
          })
        ).status === 200;
    } catch {
      /* No listener before ownership/restoration is expected. */
    }
    assert.equal(secondReady, false);
    await stop(second);
    evidence.negatives.overlapNotReady = true;
    const invalid = new Client(origin, { headers: { Origin: origin } });
    invalid.auth.token = 'invalid';
    await assert.rejects(() => invalid.create('lobby_gateway'));
    evidence.negatives.invalidToken = true;
    const wrongOrigin = new Client(origin, { headers: { Origin: 'https://evil.test' } });
    wrongOrigin.auth.token = tokens[0];
    await assert.rejects(() => wrongOrigin.create('lobby_gateway'));
    evidence.negatives.origin = true;
    for (const path of ['/missing.png', '/dev', '/artifacts/x', '/.env'])
      assert.equal((await fetch(origin + path)).status, 404);
    const ttf = await fetch(origin + '/assets/fonts/bungee.ttf');
    assert.equal(ttf.status, 200);
    assert.equal(ttf.headers.get('content-type'), 'font/ttf');
    evidence.assets.ttfBytes = (await ttf.arrayBuffer()).byteLength;
    id = await game(4, 0);
    evidence.matchCompleted = true;
    const before = (
      await pool.query('select expires_at from private.authority_matches where id=$1', [id])
    ).rows[0].expires_at.toISOString();
    await stop(backend, 'SIGKILL');
    await boot('final-recovery');
    const after = (
      await pool.query('select expires_at from private.authority_matches where id=$1', [id])
    ).rows[0].expires_at.toISOString();
    assert.equal(after, before);
    evidence.finalRecoveryDeadlinePreserved = true;
  }
  fs.writeFileSync(
    root + '/browser-session.json',
    JSON.stringify({
      access_token: tokens[0],
      refresh_token: 'fixture-only',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      token_type: 'bearer',
      user: user(0),
      matchId: id,
    }),
  );
  if (process.env.P9B_RESUME_BROWSER !== '1')
    fs.writeFileSync(root + '/lab-evidence.json', JSON.stringify(evidence, null, 2));
  console.log('P9B_BROWSER_READY');
  await until(() => fs.existsSync(root + '/browser-done'), 120000);
  unavailable = true;
  await pause(5100);
  assert.equal((await fetch(origin + '/readyz')).status, 503);
  evidence.negatives.persistenceReadiness = true;
  unavailable = false;
  await stop(backend);
  if (process.env.P9B_RESUME_BROWSER !== '1')
    fs.writeFileSync(root + '/lab-evidence.json', JSON.stringify(evidence, null, 2));
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  for (const p of children) await stop(p);
  for (const s of sockets) if (s.connection.isOpen) await s.leave();
  edge.closeAllConnections();
  auth.closeAllConnections();
  await new Promise((r) => edge.close(r));
  await new Promise((r) => auth.close(r));
  await pool.end();
}
