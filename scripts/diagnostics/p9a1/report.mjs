/** Numeric aggregates only; never copies authorities, tokens or client payloads. */
import fs from 'node:fs';
import process from 'node:process';
const root = process.argv[2] ?? 'artifacts/p9a1';
const output = {};
for (const run of fs.readdirSync(root)) {
  const file = root + '/' + run + '/metrics.jsonl';
  if (!fs.existsSync(file)) continue;
  const rows = fs
    .readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
    .filter((row) => row.memory);
  if (!rows.length) continue;
  const first = rows[0],
    last = rows.at(-1);
  const states = rows
    .filter((row) => row.label !== 'interval' && row.label !== 'expiry-check')
    .map((row) => ({
      label: row.label,
      atMs: row.at,
      memory: row.memory,
      rooms: row.rooms.length,
      registeredRooms: row.rooms.filter((r) => r.registered).length,
      sockets: row.rooms.reduce((n, r) => n + r.sockets, 0),
      timers: row.rooms.reduce((n, r) => n + r.timers, 0),
      eventListeners: row.rooms.reduce((n, r) => n + r.eventListeners, 0),
      socketListeners: row.rooms.reduce((n, r) => n + r.socketListeners, 0),
      operations: row.operations,
      loop: row.loop,
    }));
  const phases = {};
  for (const row of rows.filter((r) => r.label === 'interval')) {
    const phase = row.rooms.find((r) => r.registered && r.phase !== 'lobby')?.phase ?? 'empty';
    const p = (phases[phase] ??= {
      samples: 0,
      rssMax: 0,
      heapMax: 0,
      windowP50MaxMs: 0,
      windowP95MaxMs: 0,
      windowP99MaxMs: 0,
      delayMaxMs: 0,
      gcCount: 0,
      gcMs: 0,
    });
    p.samples++;
    p.rssMax = Math.max(p.rssMax, row.memory.rss);
    p.heapMax = Math.max(p.heapMax, row.memory.heapUsed);
    p.windowP50MaxMs = Math.max(p.windowP50MaxMs, row.loop.p50);
    p.windowP95MaxMs = Math.max(p.windowP95MaxMs, row.loop.p95);
    p.windowP99MaxMs = Math.max(p.windowP99MaxMs, row.loop.p99);
    p.delayMaxMs = Math.max(p.delayMaxMs, row.loop.max);
    p.gcCount += row.gc.count;
    p.gcMs += row.gc.ms;
  }
  const traffic = {},
    participants = {},
    trafficPhases = {};
  for (const [key, value] of Object.entries(last.traffic)) {
    const [, participant, phase, type] = key.split('/');
    for (const [target, k] of [
      [traffic, type],
      [participants, participant],
      [trafficPhases, phase],
    ]) {
      const item = (target[k] ??= { messages: 0, bytes: 0, max: 0 });
      item.messages += value.messages;
      item.bytes += value.bytes;
      item.max = Math.max(item.max, value.max);
    }
  }
  const durationMs = last.at - first.at,
    cpuMs = (last.cpu.user + last.cpu.system - first.cpu.user - first.cpu.system) / 1000;
  output[run] = {
    durationMs,
    cpuMs,
    cpuOneCorePercent: (cpuMs / durationMs) * 100,
    rssMax: Math.max(...rows.map((r) => r.memory.rss)),
    heapMax: Math.max(...rows.map((r) => r.memory.heapUsed)),
    states,
    phases,
    traffic,
    participants,
    trafficPhases,
    operations: last.operations,
  };
}
fs.writeFileSync(root + '/aggregate.json', JSON.stringify(output, null, 2));
