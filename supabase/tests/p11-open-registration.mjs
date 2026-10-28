import process from 'node:process';
import console from 'node:console';
import { URL } from 'node:url';
/** Disposable loopback-only PostgreSQL proof; never uses project env files or Supabase APIs. */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const endpoint = new URL(
  process.env.P11_REGISTRATION_TEST_URL ?? 'postgresql://127.0.0.1:55439/postgres',
);
if (
  !['postgresql:', 'postgres:'].includes(endpoint.protocol) ||
  !['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname) ||
  endpoint.username ||
  endpoint.password
)
  throw Error('Use a credential-free loopback diagnostic endpoint');
const database = `tft_signup_p11_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
const directory = mkdtempSync(join(tmpdir(), 'p11-signup-'));
function run(cmd, args, extra = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...extra });
  if (r.status !== 0)
    throw Error(
      `${cmd} local registration check failed: ${
        String(r.stderr)
          .split('\n')
          .filter((l) => l.startsWith('psql:'))
          .at(-1) ?? 'diagnostic subprocess error'
      }`,
    );
  return r;
}
try {
  run('createdb', ['-h', endpoint.hostname, '-p', endpoint.port || '5432', database]);
  endpoint.pathname = `/${database}`;
  const bootstrap = readFileSync('supabase/tests/bootstrap.sql', 'utf8').replace(
    'create role anon; create role authenticated; create role service_role;',
    () =>
      "do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if; if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if; if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if; end $$;",
  );
  const file = join(directory, 'bootstrap.sql');
  writeFileSync(file, bootstrap, { mode: 0o600 });
  const files = [
    file,
    'supabase/migrations/202610240001_accounts.sql',
    'supabase/migrations/202610240002_redact_invitation_metadata.sql',
    'supabase/tests/authorization.sql',
    'supabase/local/202610270001_open_registration.sql',
    'supabase/tests/open-registration.sql',
  ];
  run('psql', [endpoint.href, '-X', '-v', 'ON_ERROR_STOP=1', ...files.flatMap((f) => ['-f', f])]);
  run('python3', ['supabase/tests/open-registration.concurrent.py'], {
    env: { ...process.env, P11_REGISTRATION_TEST_URL: endpoint.href },
  });
  console.log(
    JSON.stringify({
      result: 'PASS',
      database,
      closedPolicyBefore: true,
      openRegistration: true,
      usernameValidation: true,
      quotaRollback: true,
      concurrentRequests: 8,
      accepted: 5,
      profilePrivacy: true,
      remoteCalls: 0,
      realGoTrueEmailCaptcha: 'not exercised',
    }),
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
