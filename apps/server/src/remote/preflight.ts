/** Explicit CLI. Read-only RPCs; no DDL, writes, cleanup, account or Auth setting changes. */
import { AuthoritativeMatch } from '../AuthoritativeMatch';
import { readConfig } from './config';
import { SupabaseMatchRepository } from '../persistence/repository';
try {
  const c = readConfig();
  if (!process.argv.includes('--check-storage'))
    console.log('Configuration valid. Storage was not contacted.');
  else {
    const repo = new SupabaseMatchRepository(c.supabaseUrl, c.serviceKey);
    await repo.probe();
    if (c.proxyMode === 'railway') await repo.probeLease();
    const snapshots = await repo.load();
    if (snapshots.length > (c.maxMatches ?? Infinity)) throw Error('Pilot capacity exceeded');
    for (const snapshot of snapshots) AuthoritativeMatch.restore(snapshot.authority);
    const response = await fetch(new URL('/auth/v1/health', c.supabaseUrl), {
      headers: { apikey: c.publishableKey },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw Error('Auth unavailable');
    console.log(
      JSON.stringify({
        configuration: true,
        storage: true,
        auth: true,
        recoverableMatches: snapshots.length,
      }),
    );
  }
} catch {
  console.error(
    'Preflight failed. Check configuration, connectivity and installed migrations locally; credentials are not logged.',
  );
  process.exitCode = 1;
}
