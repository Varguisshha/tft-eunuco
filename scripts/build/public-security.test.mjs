import { it, expect } from 'vitest';
import { Buffer } from 'node:buffer';
import { assertPublicCredentials } from './public-security.mjs';
it('accepts the Supabase SDK prefix predicate but rejects actual secret values', () => {
  expect(() => assertPublicCredentials('key.startsWith(`sb_secret_`)')).not.toThrow();
  for (const key of ['sb_secret_example', 'sb_secret_a', 'sb_secret_1234567890abcdefghijklmnop'])
    expect(() => assertPublicCredentials(`const key="${key}"`)).toThrow();
});
it('rejects legacy service-role JWTs and PG connection strings without logging their values', () => {
  const token = (role) =>
    'eyJhbGciOiJIUzI1NiJ9.' +
    Buffer.from(JSON.stringify({ role })).toString('base64url') +
    '.signature';
  expect(() => assertPublicCredentials(token('service_role'))).toThrow('Privileged JWT');
  expect(() => assertPublicCredentials(token('anon'))).not.toThrow();
  expect(() => assertPublicCredentials('postgresql://private:password@host/db')).toThrow(
    'Private credential',
  );
});
