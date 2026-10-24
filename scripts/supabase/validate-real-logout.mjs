// Explicit opt-in integration scenario; authorized test accounts only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import process from 'node:process';
import console from 'node:console';
const req = createRequire(process.cwd() + '/apps/server/package.json');
const { createClient } = req('@supabase/supabase-js'),
  { Client } = req('@colyseus/sdk');
const cfg = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .trim()
    .split('\n')
    .map((l) => l.split('=')),
);
const dir = process.env.TFT_E2E_DIR;
if (!dir) throw new Error('Set TFT_E2E_DIR to the private directory of authorized test accounts.');
(async () => {
  const saved = JSON.parse(fs.readFileSync(dir + '/florin_test.session.json'));
  const c = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  assert.ifError((await c.auth.setSession(saved)).error);
  const token = (await c.auth.getSession()).data.session.access_token;
  assert.ifError((await c.auth.signOut({ scope: 'local' })).error);
  const bearer = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: 'Bearer ' + token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  assert.equal((await bearer.rpc('player_session_active')).data, false);
  const socket = new Client('http://127.0.0.1:2567');
  socket.auth.token = token;
  await assert.rejects(() => socket.create('test_match'));
  assert((await c.auth.refreshSession({ refresh_token: saved.refresh_token })).error);
  console.log(
    'Local logout, live session revocation, rejected revoked socket, rejected refresh PASS',
  );
})().catch((e) => {
  console.error('FAILED:', e.code || e.message);
  process.exitCode = 1;
});
