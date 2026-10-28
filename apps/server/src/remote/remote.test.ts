import { describe, it, expect } from 'vitest';
import { createServer, request, type IncomingMessage } from 'node:http';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readConfig } from './config';
import { requestAllowed, protectHttp } from './http';
import { Availability } from './availability';
const base = {
  TFT_ENV: 'private',
  NODE_ENV: 'production',
  TFT_PUBLIC_URL: 'https://game.example.test',
  TFT_PROXY_ADDRESS: '127.0.0.1',
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
  SUPABASE_SERVICE_ROLE_KEY: 'server-only-placeholder',
};
describe('remote configuration fails closed', () => {
  it('accepts explicit private and same origin', () =>
    expect(readConfig(base).origins).toEqual(['https://game.example.test']));
  it.each([
    { TFT_ENV: 'other' },
    { TFT_PUBLIC_URL: 'http://game.example.test' },
    { TFT_ALLOWED_ORIGINS: '*' },
    { HOST: '0.0.0.0' },
    { TFT_PROXY_ADDRESS: '10.0.0.1' },
    { SUPABASE_URL: 'http://project.supabase.co' },
    { SUPABASE_SERVICE_ROLE_KEY: '' },
    { SUPABASE_PUBLISHABLE_KEY: 'sb_secret_example' },
    { NODE_ENV: 'development' },
    { COLYSEUS_LATENCY: '50' },
    { PORT: 'NaN' },
    {
      SUPABASE_PUBLISHABLE_KEY:
        'eyJ.' +
        Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url') +
        '.example',
    },
  ])('rejects unsafe override %j', (override) =>
    expect(() => readConfig({ ...base, ...override })).toThrow(),
  );
  it('does not leak invalid credential-bearing URLs', () => {
    try {
      readConfig({ ...base, SUPABASE_URL: 'https://password:secret@host' });
    } catch (e) {
      expect(String(e)).not.toContain('secret');
    }
  });
  it('requires local diagnostic addresses', () =>
    expect(() => readConfig({ ...base, TFT_ENV: 'diagnostic' })).toThrow());
});
it('origin/host/proxy do not trust forwarded client values', () => {
  const c = readConfig(base);
  const req = (headers: object, ip = '127.0.0.1') =>
    ({ headers, socket: { remoteAddress: ip } }) as IncomingMessage;
  const headers = {
    host: c.publicUrl.host,
    origin: c.publicUrl.origin,
    'x-forwarded-proto': 'https',
  };
  expect(requestAllowed(req(headers), c, true)).toBe(true);
  expect(requestAllowed(req({ ...headers, origin: 'https://evil.test' }), c, true)).toBe(false);
  expect(requestAllowed(req({ ...headers, host: 'evil.test' }), c, true)).toBe(false);
  expect(requestAllowed(req(headers, '192.0.2.1'), c, true)).toBe(false);
  expect(requestAllowed(req({ host: headers.host, 'x-forwarded-proto': 'https' }), c, true)).toBe(
    false,
  );
});
it('readiness collapses concurrent probes and reports recovery without exceptions', async () => {
  let failed = false,
    calls = 0,
    time = 10000;
  const a = new Availability(
    async () => {
      calls++;
      if (failed) throw Error('sensitive');
    },
    () => time,
  );
  expect(await Promise.all([a.check(), a.check()])).toEqual([true, true]);
  expect(calls).toBe(1);
  failed = true;
  time += 6000;
  expect(await a.check()).toBe(false);
  failed = false;
  time += 6000;
  expect(await a.check()).toBe(true);
  a.stop();
  expect(await a.check()).toBe(false);
});
it('front guard protects framework OPTIONS, binary assets, DEV and readiness', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'p9a-'));
  await writeFile(join(dir, 'index.html'), '<html>game</html>');
  await writeFile(join(dir, 'image.png'), Buffer.from([0, 255, 128, 45]));
  const c = readConfig({ ...base, TFT_STATIC_DIR: dir });
  let fail = false;
  const a = new Availability(async () => {
    if (fail) throw Error('db');
  });
  await a.check(true);
  let routed = 0;
  const s = createServer((_req, res) => {
    routed++;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end('router');
  });
  protectHttp(s, c, a);
  await new Promise<void>((r) => s.listen(0, '127.0.0.1', r));
  const port = (s.address() as { port: number }).port;
  const call = (path: string, method = 'GET', extra = {}) =>
    new Promise<{ code: number; headers: object; body: Buffer }>((resolve, reject) => {
      const q = request(
        {
          host: '127.0.0.1',
          port,
          path,
          method,
          headers: {
            host: c.publicUrl.host,
            origin: c.publicUrl.origin,
            'x-forwarded-proto': 'https',
            ...extra,
          },
        },
        (r) => {
          const chunks: Buffer[] = [];
          r.on('data', (b) => chunks.push(b));
          r.on('end', () =>
            resolve({ code: r.statusCode!, headers: r.headers, body: Buffer.concat(chunks) }),
          );
        },
      );
      q.on('error', reject);
      q.end();
    });
  try {
    expect((await call('/')).code).toBe(200);
    expect((await call('/image.png')).body).toEqual(Buffer.from([0, 255, 128, 45]));
    expect((await call('/healthz')).code).toBe(200);
    expect((await call('/readyz')).code).toBe(200);
    expect(
      (await call('/matchmake/create/lobby_gateway', 'OPTIONS', { origin: 'https://evil.test' }))
        .code,
    ).toBe(403);
    const valid = await call('/matchmake/create/lobby_gateway', 'POST');
    expect(valid.code).toBe(200);
    expect(valid.headers).toHaveProperty('access-control-allow-origin', c.publicUrl.origin);
    expect(routed).toBe(1);
    for (const path of [
      '/matchmake/create/test_match',
      '/.env',
      '/%2e%2e/package.json',
      '/artifacts/p8f/index.html',
      '/__healthcheck',
    ])
      expect((await call(path, 'POST')).code).toBe(404);
    fail = true;
    await a.check(true);
    expect((await call('/readyz')).code).toBe(503);
    expect((await call('/matchmake/create/lobby_gateway', 'POST')).code).toBe(503);
    expect((await call('/healthz')).code).toBe(200);
  } finally {
    await new Promise<void>((r) => s.close(() => r()));
    await rm(dir, { recursive: true });
  }
});

it('a pending successful probe cannot reopen a draining process', async () => {
  let finish!: () => void;
  const a = new Availability(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const pending = a.check(true);
  a.stop();
  finish();
  expect(await pending).toBe(false);
  expect(a.ready).toBe(false);
});

it('bounds final retention without changing competitive phase clocks', () => {
  expect(readConfig(base).finalRetentionMs).toBe(300000);
  expect(readConfig({ ...base, TFT_FINAL_RETENTION_MS: '60000' }).finalRetentionMs).toBe(60000);
  for (const value of ['0', '-1', '1000', 'NaN', 'Infinity', '3600001', '30000.5'])
    expect(() => readConfig({ ...base, TFT_FINAL_RETENTION_MS: value })).toThrow(
      'Invalid TFT_FINAL_RETENTION_MS',
    );
});
