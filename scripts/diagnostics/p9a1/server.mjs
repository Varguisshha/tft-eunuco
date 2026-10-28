/* global setInterval, clearInterval, setImmediate, Buffer, structuredClone, URL */
/** Explicit local diagnostic entry. Not imported by any public runtime. */
import process from 'node:process';
import fs from 'node:fs';
import { createServer } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { monitorEventLoopDelay, PerformanceObserver, performance } from 'node:perf_hooks';
import { matchMaker } from '../../../apps/server/node_modules/@colyseus/core/build/index.mjs';
import { MatchRoom } from '../../../apps/server/src/MatchRoom.ts';
import { AuthoritativeMatch } from '../../../apps/server/src/AuthoritativeMatch.ts';
import { PostgresTestRepository } from '../../../apps/server/src/persistence/PostgresTestRepository.ts';
import { startRuntime } from '../../../apps/server/src/remote/runtime.ts';
import { readConfig } from '../../../apps/server/src/remote/config.ts';
import { fixtureUsers } from '../../../apps/server/src/multi-fixture.ts';
const secret = process.env.P9A1_KEY;
const url = process.env.P9A1_DATABASE_URL;
if (
  !secret ||
  !url ||
  !/^postgres(?:ql)?:\/\/(?:[^/@]+@)?127\.0\.0\.1:55439\/tft_memory_test$/.test(url)
)
  throw Error('Local diagnostic configuration required');
const out = 'artifacts/p9a1/' + (process.env.P9A1_RUN ?? 'profile').replace(/[^a-z0-9-]/gi, '');
fs.mkdirSync(out, { recursive: true });
const record = (v) => fs.appendFileSync(out + '/metrics.jsonl', JSON.stringify(v) + '\n');
const refs = [];
const traffic = {};
const operations = {
  commits: 0,
  commitMs: 0,
  queryMs: 0,
  encodedBytes: 0,
  exports: 0,
  exportMs: 0,
  restores: 0,
  restoreMs: 0,
  sends: 0,
  sendMs: 0,
};
let gc = { count: 0, ms: 0 };
const observer = new PerformanceObserver((list) => {
  for (const e of list.getEntries()) {
    gc.count++;
    gc.ms += e.duration;
  }
});
observer.observe({ entryTypes: ['gc'] });
const delay = monitorEventLoopDelay({ resolution: 10 });
delay.enable();
const activeRooms = () =>
  refs.flatMap((ref, index) => {
    const room = ref.deref();
    return room ? [{ room, index }] : [];
  });
function roomStats(room, index) {
  const m = room.match,
    c = m?.clock.snapshot();
  return {
    ordinal: index,
    phase: c?.currentPhase ?? 'lobby',
    round: m?.players[0]?.state.round ?? 0,
    sockets: room.clients.length,
    timers: room.clock.delayed.filter((d) => d.active).length,
    simulation: !!room._simulationInterval,
    eventListeners: room._events
      .eventNames()
      .reduce((n, k) => n + room._events.listenerCount(k), 0),
    socketListeners: room.clients.reduce(
      (n, x) => n + x.ref.eventNames().reduce((s, k) => s + x.ref.listenerCount(k), 0),
      0,
    ),
    credentials: room.credentials?.size ?? 0,
    ready: room.ready?.size ?? 0,
    combatCache: room.sentCombat?.size ?? 0,
    spectateCache: room.sentSpectate?.size ?? 0,
    savedSnapshot: !!room.permit?.saved,
    duels: m?.duels.length ?? 0,
    replaySnapshots: m?.duels.reduce((n, d) => n + d.replay.snapshots.length, 0) ?? 0,
    registered: matchMaker.getLocalRoomById(room.roomId) === room,
    disposed: room._internalState === 2,
    clockRunning: room.clock.running,
    unavailable: room.durable?.unavailable ?? false,
    overtime: !!m?.duels.some((d) =>
      d.replay.events.some(
        (e) =>
          e.type === 'overtime_start' &&
          e.tick <= Math.floor((c.phaseDuration - c.remainingMs) / 100),
      ),
    ),
  };
}
function sample(label = 'interval') {
  const rooms = activeRooms().map(({ room, index }) => roomStats(room, index));
  const v = {
    label,
    at: performance.now(),
    pid: process.pid,
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    gc,
    resources: process.getActiveResourcesInfo().reduce((a, k) => ((a[k] = (a[k] ?? 0) + 1), a), {}),
    rooms,
    loop: {
      p50: delay.percentile(50) / 1e6,
      p95: delay.percentile(95) / 1e6,
      p99: delay.percentile(99) / 1e6,
      max: delay.max / 1e6,
    },
    operations: { ...operations },
    traffic: structuredClone(traffic),
  };
  record(v);
  delay.reset();
  gc = { count: 0, ms: 0 };
  return v;
}
const create = MatchRoom.prototype.onCreate;
MatchRoom.prototype.onCreate = function (...args) {
  refs.push(new WeakRef(this));
  return create.apply(this, args);
};
const join = MatchRoom.prototype.onJoin;
MatchRoom.prototype.onJoin = function (client, options, auth) {
  if (!client.profiled) {
    client.profiled = true;
    let type = 'transport';
    const slot = fixtureUsers.indexOf(auth?.userId);
    const index = refs.findIndex((r) => r.deref() === this);
    const send = client.send.bind(client),
      enqueue = client.enqueueRaw.bind(client);
    client.send = (name, ...args) => {
      const previous = type;
      type = String(name);
      const t = performance.now();
      try {
        return send(name, ...args);
      } finally {
        operations.sends++;
        operations.sendMs += performance.now() - t;
        type = previous;
      }
    };
    client.enqueueRaw = (data, ...args) => {
      const phase = this.match.clock.snapshot().currentPhase;
      const key = `${index}/${slot}/${phase}/${type}`;
      const stat = (traffic[key] ??= { messages: 0, bytes: 0, max: 0 });
      stat.messages++;
      stat.bytes += data.byteLength;
      stat.max = Math.max(stat.max, data.byteLength);
      return enqueue(data, ...args);
    };
  }
  return join.call(this, client, options, auth);
};
const exportState = AuthoritativeMatch.prototype.exportState;
AuthoritativeMatch.prototype.exportState = function (...args) {
  const t = performance.now();
  try {
    return exportState.apply(this, args);
  } finally {
    operations.exports++;
    operations.exportMs += performance.now() - t;
  }
};
const restore = AuthoritativeMatch.restore;
AuthoritativeMatch.restore = function (...args) {
  const t = performance.now();
  try {
    return restore.apply(this, args);
  } finally {
    operations.restores++;
    operations.restoreMs += performance.now() - t;
  }
};
const repo = new PostgresTestRepository(url);
const commit = repo.commit.bind(repo);
repo.commit = async (...args) => {
  const t = performance.now();
  try {
    return await commit(...args);
  } finally {
    operations.commits++;
    operations.commitMs += performance.now() - t;
  }
};
const query = repo.pool.query.bind(repo.pool);
repo.pool.query = async (...args) => {
  if (typeof args[1]?.[1] === 'string') operations.encodedBytes += Buffer.byteLength(args[1][1]);
  const t = performance.now();
  try {
    return await query(...args);
  } finally {
    operations.queryMs += performance.now() - t;
  }
};
async function verify(raw) {
  if (typeof raw !== 'string') throw Error('Invalid identity');
  const [h, b, s] = raw.split('.');
  const expected = createHmac('sha256', secret)
      .update(h + '.' + b)
      .digest(),
    actual = Buffer.from(s ?? '', 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw Error('Invalid identity');
  const p = JSON.parse(Buffer.from(b, 'base64url').toString());
  const i = fixtureUsers.indexOf(p.sub);
  if (i < 0 || p.aud !== 'p9a1-local' || p.exp * 1000 <= Date.now())
    throw Error('Invalid identity');
  return {
    token: raw,
    userId: p.sub,
    name: ['Vargas', 'Florin', 'Nora', 'Alex'][i],
    avatarId: 'jade',
    expiresAt: p.exp * 1000,
  };
}
class Diagnostic extends MatchRoom {
  createMatch(capacity = 2) {
    const snapshot = super.createMatch(capacity).exportState();
    snapshot.rng = 80126;
    snapshot.itemDrops.seed = 80626;
    return AuthoritativeMatch.restore(snapshot, undefined, false);
  }
  async advance(ms) {
    await this.mutate(() => {
      this.match.clock.restore({
        ...this.match.clock.snapshot(),
        remainingMs:
          ms === undefined ? 0 : Math.max(0, this.match.clock.snapshot().remainingMs - ms),
      });
      this.match.pulse();
    });
  }
  snapshot() {
    return this.match.exportState();
  }
}
sample('A-start');
const config = readConfig({
  TFT_ENV: 'diagnostic',
  TFT_STATIC_DIR: process.env.P9A1_STATIC_DIR ?? 'apps/web/dist',
  PORT: '2600',
  TFT_PUBLIC_URL: 'https://localhost:9445',
  TFT_PROXY_ADDRESS: '127.0.0.1',
  SUPABASE_URL: 'http://127.0.0.1:1',
  SUPABASE_PUBLISHABLE_KEY: 'diagnostic-public',
  SUPABASE_SERVICE_ROLE_KEY: 'diagnostic-unused',
  ...(process.env.TFT_FINAL_RETENTION_MS
    ? { TFT_FINAL_RETENTION_MS: process.env.TFT_FINAL_RETENTION_MS }
    : {}),
});
const runtime = await startRuntime(
  config,
  repo,
  verify,
  async () => {
    await repo.pool.query('select 1 from private.authority_matches limit 0');
  },
  Diagnostic,
);
matchMaker.getHandler('lobby_gateway').on('create', (room) => refs.push(new WeakRef(room)));
sample('B-ready');
const timer = setInterval(() => sample(), 2000);
timer.unref();
const control = createServer((req, res) => {
  void (async () => {
    if (req.headers.authorization !== 'Bearer ' + secret) {
      res.writeHead(401).end();
      return;
    }
    const u = new URL(req.url, 'http://localhost');
    let result;
    if (u.pathname === '/measure') {
      if (u.searchParams.has('gc')) {
        globalThis.gc?.();
        await new Promise((r) => setImmediate(r));
        globalThis.gc?.();
        await new Promise((r) => setImmediate(r));
      }
      result = sample(u.searchParams.get('label') ?? 'measure');
      if (u.searchParams.has('detail')) {
        result.details = activeRooms()
          .filter(({ room }) => room.match)
          .map(({ room, index }) => {
            const t = performance.now(),
              snapshot = room.snapshot();
            const exported = performance.now(),
              encoded = JSON.stringify(snapshot);
            return {
              ordinal: index,
              snapshotBytes: Buffer.byteLength(encoded),
              exportMs: exported - t,
              stringifyMs: performance.now() - exported,
              replayBytes: Buffer.byteLength(JSON.stringify(room.match.duels)),
              savedBytes: room.permit?.saved
                ? Buffer.byteLength(JSON.stringify(room.permit.saved))
                : 0,
            };
          });
        record({ label: 'detail', at: performance.now(), details: result.details });
        delay.reset();
      }
    } else {
      const room = matchMaker.getLocalRoomById(u.searchParams.get('match') ?? '');
      if (!room) {
        res.writeHead(404).end();
        return;
      }
      if (u.pathname === '/advance' && req.method === 'POST') {
        if (process.env.P9A1_NORMAL === '1') {
          res.writeHead(403).end();
          return;
        }
        await room.advance(u.searchParams.has('ms') ? Number(u.searchParams.get('ms')) : undefined);
        result = { ok: true };
      } else if (u.pathname === '/snapshot') result = room.snapshot();
      else if (u.pathname === '/dispose' && req.method === 'POST') {
        await room.disconnect();
        result = { ok: true };
      } else {
        res.writeHead(404).end();
        return;
      }
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  })().catch(() => res.writeHead(503).end());
}).listen(2601, '127.0.0.1');
process.on('SIGTERM', () => {
  clearInterval(timer);
  void runtime.stop().then(async () => {
    sample('L-stop');
    observer.disconnect();
    delay.disable();
    control.close();
    await repo.pool.end();
    process.exit(0);
  });
});
