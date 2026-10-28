import { SupabaseMatchRepository } from './persistence/repository';
import { readConfig } from './remote/config';
import { startRuntime } from './remote/runtime';
import { verifyIdentity } from './auth';
import { log } from './remote/telemetry';
const config = readConfig();
if (!['private', 'production'].includes(config.environment))
  throw Error('Use pnpm dev:local for isolated local persistence; this entry is ONLINE only.');
const repository = new SupabaseMatchRepository(config.supabaseUrl, config.serviceKey);
// Acquire before load/listen. A crash leaves a bounded fence; wait locally without serving.
const lease =
  config.proxyMode === 'railway'
    ? await (async () => {
        const until = performance.now() + 80_000;
        while (true) {
          try {
            return await repository.acquireAuthority(() => {
              log('fatal');
              process.exit(1);
            });
          } catch {
            if (performance.now() >= until) {
              log('fatal');
              process.exit(1);
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      })()
    : undefined;
const probe = async () => {
  lease?.assert();
  await repository.probe();
  const result = await fetch(new URL('/auth/v1/health', config.supabaseUrl), {
    headers: { apikey: config.publishableKey },
    signal: AbortSignal.timeout(5000),
  });
  if (!result.ok) throw Error('Authentication unavailable');
};
const runtime = await startRuntime(config, repository, verifyIdentity, probe).catch(async () => {
  log('fatal');
  await lease?.release().catch(() => {});
  process.exit(1);
});
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    const deadline = setTimeout(() => {
      log('fatal');
      process.exit(1);
    }, 30000);
    deadline.unref();
    void runtime
      .stop()
      .then(async () => {
        await lease?.release();
      })
      .then(
        () => process.exit(0),
        () => {
          log('fatal');
          process.exit(1);
        },
      );
  });
for (const event of ['uncaughtException', 'unhandledRejection'] as const)
  process.on(event, () => {
    log('fatal');
    process.exit(1);
  });
