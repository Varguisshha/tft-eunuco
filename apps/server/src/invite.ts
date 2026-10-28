import { randomBytes, createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key)
  throw new Error('Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno privado.');
const hours = Number(process.env.INVITE_HOURS ?? 48),
  uses = Number(process.env.INVITE_USES ?? 1);
if (
  !Number.isFinite(hours) ||
  hours <= 0 ||
  hours > 720 ||
  !Number.isInteger(uses) ||
  uses < 1 ||
  uses > 100
)
  throw new Error('Límites de invitación no válidos.');
const token = randomBytes(32).toString('hex');
const { error } = await createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
}).rpc('issue_registration_invitation', {
  hash: createHash('sha256').update(token).digest('hex'),
  expiry: new Date(Date.now() + hours * 3600000).toISOString(),
  email: process.env.INVITE_EMAIL || null,
  use_limit: uses,
});
if (error)
  throw new Error('No se pudo emitir la invitación. Comprueba configuración y migraciones.');
// The admin deliberately receives this one-time secret on stdout; never run in logged CI.
process.stdout.write(`${token}\n`);
