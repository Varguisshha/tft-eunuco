/** Diagnostics only: direct PostgreSQL adapter for the isolated crash suite. */
import { Pool } from 'pg';
import { type StoredMatch } from './snapshot';
import { encodeStoredMatch, decodeStoredMatch } from './codec';
import type { MatchRepository } from './repository';
export class PostgresTestRepository implements MatchRepository {
  pool: Pool;
  constructor(url: string) {
    this.pool = new Pool({
      connectionString: url,
      connectionTimeoutMillis: 2000,
      query_timeout: 4000,
    });
    this.pool.on('error', () => {
      /* Idle sockets are discarded; the next transaction reports availability. */
    });
  }
  async commit(expected: number, document: StoredMatch) {
    await this.pool.query('select public.authority_commit($1,$2::jsonb)', [
      expected,
      JSON.stringify(encodeStoredMatch(document)),
    ]);
  }
  async load() {
    const r = await this.pool.query('select public.authority_load() as document');
    return r.rows.map((r) => decodeStoredMatch(r.document));
  }
}
