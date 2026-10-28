import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { realpathSync } from 'node:fs';
export const PORTS = { web: 4173, server: 2567, control: 2559, database: 55440 };
export function targetIdentity(root) {
  return createHash('sha256').update(realpathSync(root)).digest('hex').slice(0, 16);
}
export function assertLocalDatabase(raw, id) {
  const u = new URL(raw);
  if (
    u.protocol !== 'postgresql:' ||
    u.hostname !== '127.0.0.1' ||
    u.port !== '55440' ||
    u.pathname !== '/tft_local_' + id ||
    u.username ||
    u.password ||
    u.search ||
    u.hash
  )
    throw Error('LOCAL requires its dedicated loopback database');
  return raw;
}
export function assertLocalEnvironment(env) {
  for (const key of Object.keys(env)) {
    if (
      env[key] &&
      (/^(VITE_|SUPABASE_|RAILWAY_|PGHOST|PGPORT|PGDATABASE|PGSERVICE|DATABASE_URL|TFT_PROXY_)/.test(
        key,
      ) ||
        (key === 'TFT_ENV' && env[key] !== 'diagnostic'))
    )
      throw Error('Remove inherited online configuration before LOCAL: ' + key);
  }
}
export function childEnvironment(env) {
  const out = {};
  for (const k of ['PATH', 'HOME', 'USER', 'LOGNAME', 'TMPDIR', 'LANG'])
    if (env[k]) out[k] = env[k];
  return { ...out, NODE_ENV: 'development', TFT_ENV: 'diagnostic' };
}
export const localUsers = [1, 2, 3, 4].map((n) => `90000000-0000-4000-8000-00000000000${n}`);
export function issueIdentity(slot, key, now = Date.now()) {
  if (!Number.isInteger(slot) || !localUsers[slot]) throw Error('Invalid diagnostic identity');
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(
    JSON.stringify({
      sub: localUsers[slot],
      aud: 'tft-r2-local-only',
      exp: Math.floor(now / 1000) + 3600,
    }),
  ).toString('base64url');
  return (
    h +
    '.' +
    p +
    '.' +
    createHmac('sha256', key)
      .update(h + '.' + p)
      .digest('base64url')
  );
}
export function verifyIdentity(raw, key, now = Date.now()) {
  if (typeof raw !== 'string' || raw.length > 2048) throw Error('Invalid local identity');
  const parts = raw.split('.');
  if (parts.length !== 3) throw Error('Invalid local JWT');
  const [h, p, s] = parts;
  const expected = createHmac('sha256', key)
    .update(h + '.' + p)
    .digest();
  const actual = Buffer.from(s, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw Error('Invalid signature');
  const head = JSON.parse(Buffer.from(h, 'base64url').toString());
  const claims = JSON.parse(Buffer.from(p, 'base64url').toString());
  const slot = localUsers.indexOf(claims.sub);
  if (
    head.alg !== 'HS256' ||
    head.typ !== 'JWT' ||
    slot < 0 ||
    claims.aud !== 'tft-r2-local-only' ||
    !Number.isInteger(claims.exp) ||
    claims.exp * 1000 <= now
  )
    throw Error('Invalid local claims');
  return {
    token: raw,
    userId: claims.sub,
    name: ['Vargas · LOCAL', 'Florin · LOCAL', 'Nora · LOCAL', 'Alex · LOCAL'][slot],
    avatarId: 'jade',
    expiresAt: claims.exp * 1000,
  };
}
