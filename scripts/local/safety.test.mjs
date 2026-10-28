import { describe, expect, it } from 'vitest';
import {
  assertLocalDatabase,
  assertLocalEnvironment,
  childEnvironment,
  issueIdentity,
  verifyIdentity,
} from './safety.mjs';
const id = '1234567890abcdef';
describe('LOCAL storage and credentials boundary', () => {
  it('allows only the selected dedicated database with no alternate host parameters', () => {
    const valid = 'postgresql://127.0.0.1:55440/tft_local_' + id;
    expect(assertLocalDatabase(valid, id)).toBe(valid);
    for (const bad of [
      valid + '?host=remote',
      valid + '#x',
      valid.replace('127.0.0.1', 'localhost'),
      valid.replace('55440', '55439'),
      valid.replace(id, 'other'),
      valid.replace('127.0.0.1', 'db.qiombjvkaolllnjqzspz.supabase.co'),
      valid.replace('127.0.0.1', 'user:pass@127.0.0.1'),
    ])
      expect(() => assertLocalDatabase(bad, id)).toThrow();
  });
  it('fails closed for inherited remote settings and never forwards ambient secrets', () => {
    for (const key of [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'RAILWAY_PROJECT_ID',
      'DATABASE_URL',
      'PGHOST',
      'VITE_SUPABASE_URL',
      'TFT_PROXY_MODE',
    ])
      expect(() => assertLocalEnvironment({ [key]: 'remote' })).toThrow();
    expect(() => assertLocalEnvironment({ TFT_ENV: 'private' })).toThrow();
    expect(
      childEnvironment({
        PATH: '/bin',
        HOME: '/tmp',
        SECRET: 'hidden',
        NODE_OPTIONS: '--require evil',
        SUPABASE_URL: 'https://real',
      }),
    ).toEqual({ PATH: '/bin', HOME: '/tmp', NODE_ENV: 'development', TFT_ENV: 'diagnostic' });
  });
});
describe('diagnostic JWT boundary', () => {
  it('accepts only signed, live, diagnostic identities', () => {
    const key = 'test-session-key',
      now = 100000;
    expect(verifyIdentity(issueIdentity(0, key, now), key, now).name).toBe('Vargas · LOCAL');
    expect(() => verifyIdentity(issueIdentity(0, key, now), 'other-key', now)).toThrow();
    expect(() => verifyIdentity(issueIdentity(0, key, now), key, now + 3600001)).toThrow();
    expect(() => verifyIdentity('personal-supabase-jwt', key, now)).toThrow();
    expect(() => verifyIdentity(issueIdentity(0, key, now) + '.extra', key, now)).toThrow();
    expect(() => issueIdentity(4, key, now)).toThrow();
  });
});
