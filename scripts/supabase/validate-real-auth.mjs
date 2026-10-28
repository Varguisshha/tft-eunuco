// Explicit opt-in integration scenario; authorized test accounts only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import process from 'node:process';
import console from 'node:console';
const req = createRequire(process.cwd() + '/apps/server/package.json');
const { createClient } = req('@supabase/supabase-js');
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
  const users = ['vargas_test', 'florin_test'].map((n) =>
    JSON.parse(fs.readFileSync(dir + '/' + n + '.json', 'utf8')),
  );
  const clients = users.map(() =>
    createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  );
  for (let i = 0; i < 2; i++) {
    const u = users[i],
      c = clients[i];
    const { data, error } = await c.auth.signInWithPassword({
      email: u.email,
      password: u.password,
    });
    if (error) throw Error('Login ' + u.username + ': ' + error.code);
    assert(data.user.email_confirmed_at);
    assert.equal(data.user.id, u.user_id);
    assert.equal((await c.rpc('player_session_active')).data, true);
    assert.equal(data.user.user_metadata.invitation, undefined);
    const { data: profile, error: pe } = await c
      .from('player_profiles')
      .select('*')
      .eq('user_id', u.user_id)
      .single();
    assert.ifError(pe);
    assert.equal(profile.username, u.username);
    const { error: edit } = await c
      .from('player_profiles')
      .update({
        display_name: i === 0 ? 'Vargas' : 'Florin',
        avatar_id: i === 0 ? 'jade' : 'spark',
      })
      .eq('user_id', u.user_id);
    assert.ifError(edit);
    const foreign = await c
      .from('player_profiles')
      .update({ display_name: 'Forbidden' })
      .eq('user_id', users[1 - i].user_id)
      .select();
    assert.ifError(foreign.error);
    assert.deepEqual(foreign.data, []);
    assert(
      (
        await c
          .from('player_profiles')
          .update({ user_id: users[1 - i].user_id })
          .eq('user_id', u.user_id)
      ).error,
    );
    assert(
      (
        await c
          .from('player_profiles')
          .update({ username: users[1 - i].username })
          .eq('user_id', u.user_id)
      ).error,
    );
    assert(
      (
        await c.rpc('issue_registration_invitation', {
          hash: '0'.repeat(64),
          expiry: new Date(Date.now() + 60000).toISOString(),
        })
      ).error,
    );
    assert((await c.schema('private').from('registration_invitations').select('token_hash')).error);
    const refresh = await c.auth.refreshSession();
    assert.ifError(refresh.error);
    assert(refresh.data.session);
    const session = refresh.data.session;
    fs.writeFileSync(dir + '/' + u.username + '.session.json', JSON.stringify(session), {
      mode: 0o600,
    });
    console.log(
      u.username +
        ': verified login, profile, own edit, foreign RLS, immutable UUID, unique username, admin denial, refresh PASS',
    );
  }
  const invalid = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  assert(
    (
      await invalid.auth.signInWithPassword({
        email: users[0].email,
        password: 'invalid-test-password-do-not-use',
      })
    ).error,
  );
  console.log('Invalid password rejected PASS');
})().catch((e) => {
  console.error('FAILED:', e.code || e.message);
  process.exitCode = 1;
});
