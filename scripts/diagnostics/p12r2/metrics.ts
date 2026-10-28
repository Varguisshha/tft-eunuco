/** Opt-in test-runner instrumentation. Never imported by application entrypoints. */
import { beforeEach, afterEach, expect } from 'vitest';
import { performance, PerformanceObserver } from 'node:perf_hooks';
import { mkdirSync, appendFileSync, existsSync, statSync, readFileSync } from 'node:fs';
const gc: { start: number; duration: number }[] = [];
const observer = new PerformanceObserver((list) => {
  for (const e of list.getEntries()) gc.push({ start: e.startTime, duration: e.duration });
});
observer.observe({ entryTypes: ['gc'] });
let start = 0,
  cpu = process.cpuUsage(),
  rss = 0;
beforeEach(() => {
  start = performance.now();
  cpu = process.cpuUsage();
  rss = process.memoryUsage().rss;
});
afterEach(async () => {
  const end = performance.now(),
    usage = process.cpuUsage(cpu);
  await new Promise<void>((resolve) => setTimeout(resolve, 10));
  const supplemental: Record<string, unknown> = {};
  for (const [name, file] of [
    ['simulation', 'artifacts/p8f/integrated-stress.json'],
    ['playback', '/tmp/p8c-playback.json'],
  ]) {
    if (existsSync(file!) && statSync(file!).mtimeMs >= performance.timeOrigin + start)
      supplemental[name!] = JSON.parse(readFileSync(file!, 'utf8'));
  }
  const entries = gc.filter((e) => e.start >= start && e.start <= end);
  mkdirSync('artifacts/p12a-r2', { recursive: true });
  appendFileSync(
    `artifacts/p12a-r2/test-metrics-${process.pid}.jsonl`,
    JSON.stringify({
      at: Date.now(),
      startAt: performance.timeOrigin + start,
      endAt: performance.timeOrigin + end,
      pid: process.pid,
      node: process.version,
      file: expect.getState().testPath,
      name: expect.getState().currentTestName,
      wallMs: end - start,
      cpuMs: (usage.user + usage.system) / 1000,
      rssBefore: rss,
      rssAfter: process.memoryUsage().rss,
      supplemental,
      gcCount: entries.length,
      gcMs: entries.reduce((n, e) => n + e.duration, 0),
    }) + '\n',
  );
});
