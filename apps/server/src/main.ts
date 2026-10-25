import { createServer } from './server';
import { SupabaseMatchRepository } from './persistence/repository';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key || !process.env.SUPABASE_URL)
  throw new Error('Backend persistence configuration required');
const server = createServer(
  undefined,
  undefined,
  new SupabaseMatchRepository(process.env.SUPABASE_URL, key),
);
await server.listen(2567, '127.0.0.1');
console.log('TFT EUNUCO · servidor de prueba en http://127.0.0.1:2567');
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => void server.gracefullyShutdown(false).then(() => process.exit(0)));
