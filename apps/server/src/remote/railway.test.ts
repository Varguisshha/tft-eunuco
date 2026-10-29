import { describe, it, expect, vi } from 'vitest';
import type { IncomingMessage } from 'node:http';
import { readConfig } from './config';
import { requestAllowed } from './http';
import { AuthorityLease } from './authorityLease';
export const railwayEnv = {
  TFT_ENV: 'private',
  NODE_ENV: 'production',
  HOST: '0.0.0.0',
  PORT: '31234',
  TFT_PROXY_MODE: 'railway',
  TFT_PUBLIC_URL: 'https://game.example.test',
  TFT_ALLOWED_ORIGINS: 'https://game.example.test',
  RAILWAY_PROJECT_ID: 'local-fixture',
  RAILWAY_SERVICE_ID: 'local-fixture',
  RAILWAY_ENVIRONMENT_ID: 'local-fixture',
  RAILWAY_DEPLOYMENT_ID: 'local-fixture',
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
  SUPABASE_SERVICE_ROLE_KEY: 'server-only-placeholder',
};
describe('Railway explicit deployment contract', () => {
  it('uses the injected port, one pilot match and bounded gateways', () => {
    const c = readConfig(railwayEnv);
    expect(c).toMatchObject({
      host: '0.0.0.0',
      port: 31234,
      proxyMode: 'railway',
      maxMatches: 1,
      maxGateways: 8,
      finalRetentionMs: 300000,
    });
  });
  it.each([
    { PORT: '' },
    { PORT: '0' },
    { PORT: '65536' },
    { PORT: '1e3' },
    { PORT: '31234.0' },
    { HOST: '127.0.0.1' },
    { TFT_ENV: 'diagnostic' },
    { TFT_PROXY_MODE: 'true' },
    { TFT_ALLOWED_ORIGINS: '' },
    { TFT_ALLOWED_ORIGINS: '*' },
    { TFT_ALLOWED_ORIGINS: 'https://other.example.test' },
    { TFT_PUBLIC_URL: 'http://game.example.test' },
    { RAILWAY_DEPLOYMENT_ID: '' },
    { RAILWAY_SERVICE_ID: '' },
    { TFT_PROXY_ADDRESS: '127.0.0.1' },
    { RAILWAY_TCP_PROXY_DOMAIN: 'proxy.example.test' },
    { SUPABASE_SERVICE_ROLE_KEY: '' },
    { SUPABASE_PUBLISHABLE_KEY: '' },
    { SUPABASE_URL: '' },
  ])('rejects incomplete or unsafe platform input %j', (override) => {
    expect(() => readConfig({ ...railwayEnv, ...override })).toThrow();
  });
  it('restricts forwarded data and keeps the health-host exception path-specific', () => {
    const c = readConfig(railwayEnv);
    const req = (headers = {}, url = '/', method = 'GET') =>
      ({
        headers: {
          host: c.publicUrl.host,
          origin: c.publicUrl.origin,
          'x-forwarded-proto': 'https',
          'x-forwarded-host': c.publicUrl.host,
          ...headers,
        },
        socket: { remoteAddress: '10.1.2.3' },
        url,
        method,
      }) as unknown as IncomingMessage;
    expect(requestAllowed(req(), c, true)).toBe(true);
    for (const headers of [
      { host: 'evil.test' },
      { origin: 'https://evil.test' },
      { 'x-forwarded-proto': 'http' },
      { 'x-forwarded-proto': 'https,http' },
      { 'x-forwarded-host': 'evil.test' },
      { 'x-forwarded-host': undefined },
    ])
      expect(requestAllowed(req(headers), c, true)).toBe(false);
    expect(
      requestAllowed(
        req({ 'x-forwarded-for': 'attacker', forwarded: 'host=evil.test;proto=http' }),
        c,
        true,
      ),
    ).toBe(true); // ignored, never authorizes identity
    const health = {
      host: 'healthcheck.railway.app',
      origin: undefined,
      'x-forwarded-proto': undefined,
    };
    expect(requestAllowed(req(health, '/readyz'), c)).toBe(true);
    for (const path of ['/', '/readyz?x', '/matchmake/create/lobby_gateway', '/assets/a.js'])
      expect(requestAllowed(req(health, path), c)).toBe(false);
    expect(requestAllowed(req(health, '/readyz', 'POST'), c)).toBe(false);
    expect(requestAllowed(req(health, '/readyz'), c, true)).toBe(false);
    const duplicate = req();
    duplicate.rawHeaders = ['Host', c.publicUrl.host, 'Host', 'evil.test'];
    expect(requestAllowed(duplicate, c)).toBe(false);
  });
});
it('lease rejects another authority before timers or writes', async () => {
  const l = new AuthorityLease(
    async () => false,
    () => {},
  );
  await expect(l.acquire()).rejects.toThrow('already owned');
});
it('monotonic local deadline fails closed before the database fence expires', async () => {
  let time = 0,
    losses = 0;
  const l = new AuthorityLease(
    async () => true,
    () => losses++,
    () => time,
  );
  await l.acquire();
  time = 39000;
  l.assert();
  time = 40000;
  expect(() => l.assert()).toThrow();
  expect(losses).toBe(1);
  await l.renew();
  expect(() => l.assert()).toThrow();
  expect(losses).toBe(1);
  await l.release();
});
it('renewal failure cannot be silently retried into a new authority', async () => {
  let losses = 0;
  const l = new AuthorityLease(
    async (op) => op !== 'renew',
    () => losses++,
  );
  await l.acquire();
  await l.renew();
  expect(losses).toBe(1);
  expect(() => l.assert()).toThrow();
  await l.release();
});
it('late renewal cannot revive a released authority', async () => {
  let finish!: (v: boolean) => void,
    losses = 0;
  const l = new AuthorityLease(
    async (op) =>
      op === 'renew'
        ? new Promise<boolean>((r) => {
            finish = r;
          })
        : true,
    () => losses++,
  );
  await l.acquire();
  const pending = l.renew();
  await l.release();
  finish(true);
  await pending;
  expect(losses).toBe(0);
  expect(() => l.assert()).toThrow();
});
it('transient renewal transport failure retains only the unextended valid fence; subsequent renewal recovers', async () => {
  let now = 0,
    losses = 0,
    failing = true;
  const l = new AuthorityLease(
    async (op) => {
      if (op === 'renew' && failing) throw Error('Network down');
      return true;
    },
    () => losses++,
    () => now,
  );
  await l.acquire();
  now = 10000;
  await l.renew();
  expect(losses).toBe(0);
  l.assert();
  failing = false;
  now = 20000;
  await l.renew();
  now = 45000;
  l.assert();
  now = 60000;
  expect(() => l.assert()).toThrow();
  expect(losses).toBe(1);
  await l.release();
});
it('transport failure never extends the deadline or revives an expired authority', async () => {
  let now = 0,
    losses = 0;
  const l = new AuthorityLease(
    async (op) => {
      if (op === 'renew') throw Error('Timeout');
      return true;
    },
    () => losses++,
    () => now,
  );
  await l.acquire();
  for (now = 10000; now < 40000; now += 10000) await l.renew();
  await l.renew();
  expect(losses).toBe(1);
  expect(() => l.assert()).toThrow();
  await l.release();
});

it('watchdog fences a hung renewal before DB expiry and ignores its late success', async () => {
  vi.useFakeTimers();
  let now = 0,
    losses = 0,
    finish: ((value: boolean) => void) | undefined;
  const l = new AuthorityLease(
    async (op) =>
      op === 'renew'
        ? new Promise<boolean>((resolve) => {
            finish = resolve;
          })
        : true,
    () => losses++,
    () => now,
  );
  try {
    await l.acquire();
    now = 10000;
    const pending = l.renew();
    now = 40000;
    await vi.advanceTimersByTimeAsync(1000);
    expect(losses).toBe(1);
    expect(() => l.assert()).toThrow();
    finish!(true);
    await pending;
    expect(() => l.assert()).toThrow();
    expect(losses).toBe(1);
  } finally {
    await l.release();
    vi.useRealTimers();
  }
});
