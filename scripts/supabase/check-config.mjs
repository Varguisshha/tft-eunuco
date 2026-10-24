import process from 'node:process';
import console from 'node:console';
import { Buffer } from 'node:buffer';
// Prints presence and safety findings only. Never prints configuration values.
import { readFileSync, existsSync } from 'node:fs';
const config = { ...process.env };
for (const path of ['.env', '.env.local', 'apps/web/.env.local']) {
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m) config[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const keys = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
];
let missing = false,
  unsafe = false;
for (const key of keys) {
  const present = !!config[key];
  missing ||= !present;
  console.log(`${key}: ${present ? 'configured' : 'missing'}`);
}
for (const [key, value] of Object.entries(config)) {
  if (!key.startsWith('VITE_') || !value) continue;
  let privileged =
    value.startsWith('sb_secret_') || /SERVICE_ROLE|SECRET|PASSWORD|ACCESS_TOKEN/.test(key);
  try {
    privileged ||=
      JSON.parse(Buffer.from(value.split('.')[1] ?? '', 'base64url')).role === 'service_role';
  } catch {
    /* Not a legacy JWT. */
  }
  if (privileged) {
    unsafe = true;
    console.error(`Unsafe privileged frontend configuration: ${key}`);
  }
}
console.log(
  'Result:',
  unsafe
    ? 'unsafe'
    : missing
      ? 'external configuration pending'
      : 'presence checks passed; live verification still required',
);
process.exitCode = unsafe ? 1 : missing ? 2 : 0;
