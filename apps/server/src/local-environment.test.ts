import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { IncomingMessage } from 'node:http';
import { readConfig } from './remote/config';
import { requestAllowed } from './remote/http';
import { gameEndpoint } from '../../web/src/network/endpoint';
it('prepares the exact new host without accepting other Railway tenants or the old origin', () => {
  const host = 'tfteunuco.up.railway.app';
  const config = readConfig({
    TFT_ENV: 'private',
    NODE_ENV: 'production',
    HOST: '0.0.0.0',
    RAILWAY_PROJECT_ID: 'fixture',
    RAILWAY_SERVICE_ID: 'fixture',
    RAILWAY_ENVIRONMENT_ID: 'fixture',
    RAILWAY_DEPLOYMENT_ID: 'fixture',
    PORT: '8080',
    TFT_PUBLIC_URL: `https://${host}`,
    TFT_ALLOWED_ORIGINS: `https://${host}`,
    TFT_PROXY_MODE: 'railway',
    SUPABASE_URL: 'https://qiombjvkaolllnjqzspz.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'test',
    SUPABASE_SERVICE_ROLE_KEY: 'test',
  });
  const req = {
    method: 'POST',
    url: '/matchmake/create/lobby_gateway',
    rawHeaders: [],
    socket: { remoteAddress: '127.0.0.1' },
    headers: {
      host,
      origin: `https://${host}`,
      'x-forwarded-proto': 'https',
      'x-forwarded-host': host,
    },
  } as unknown as IncomingMessage;
  expect(requestAllowed(req, config, true)).toBe(true);
  for (const origin of [
    'https://other.up.railway.app',
    'https://tft-eunuco-private.up.railway.app',
    'http://' + host,
  ])
    expect(
      requestAllowed(
        { ...req, headers: { ...req.headers, origin } } as IncomingMessage,
        config,
        true,
      ),
    ).toBe(false);
  expect(gameEndpoint(undefined, `https://${host}/`, false).href).toBe(`https://${host}/`);
});
it('keeps diagnostic entrypoints out of the production server and no deployment in local scripts', () => {
  const main = readFileSync('apps/server/src/main.ts', 'utf8');
  expect(main).toContain("['private', 'production']");
  expect(main).not.toContain('safety.mjs');
  const local = readFileSync('scripts/local/run.mjs', 'utf8');
  expect(local).toContain('configFile: false');
  expect(local).toContain('envDir: false');
  expect(local).not.toMatch(/railway up|db push|db reset|killall/);
});
