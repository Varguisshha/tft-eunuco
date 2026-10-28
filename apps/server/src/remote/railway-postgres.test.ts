import { it, expect } from 'vitest';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
const url = process.env.P9B_FENCE_TEST_URL;
it.skipIf(!url)(
  'PG serializes acquisition, fences stale/legacy writers and limits RPC grants',
  async () => {
    if (
      !/^postgresql:\/\/127\.0\.0\.1:55439\/tft_railway_fence_test(?:_p11h_20261027)?$/.test(url!)
    )
      throw Error('Disposable fence database required');
    const pool = new Pool({ connectionString: url });
    const a = randomUUID(),
      b = randomUUID(),
      id = randomUUID();
    const rpc = async (name: string, owner: string) =>
      (await pool.query(`select public.authority_lease_${name}($1) as ok`, [owner])).rows[0].ok;
    try {
      await pool.query(
        "truncate private.authority_members,private.authority_matches; update private.authority_lease set owner=null,enabled=false,expires_at='-infinity'",
      );
      expect(await rpc('acquire', a)).toBe(true);
      expect(await rpc('acquire', b)).toBe(false);
      const doc = {
        id,
        revision: 1,
        commitId: randomUUID(),
        status: 'active',
        expiresAt: Date.now() + 300000,
        authority: { id },
        lobby: { matchId: id, participants: [] },
      };
      await pool.query('select public.authority_fenced_commit($1,0,$2)', [a, doc]);
      await pool.query('select public.authority_fenced_commit($1,0,$2)', [a, doc]); // original idempotency
      await expect(
        pool.query('select public.authority_fenced_commit($1,0,$2)', [b, doc]),
      ).rejects.toThrow('Authority unavailable');
      await expect(pool.query('select public.authority_commit(0,$1)', [doc])).rejects.toThrow(
        'Fenced authority',
      );
      await pool.query(
        "update private.authority_lease set expires_at=clock_timestamp()-interval '1 second'",
      );
      expect(await rpc('renew', a)).toBe(false);
      expect(await rpc('acquire', b)).toBe(true);
      await expect(
        pool.query('select public.authority_fenced_commit($1,0,$2)', [a, doc]),
      ).rejects.toThrow('Authority unavailable');
      expect(await rpc('release', a)).toBe(false);
      expect(await rpc('renew', b)).toBe(true);
      expect(await rpc('release', b)).toBe(true);
      await expect(pool.query('select public.authority_commit(0,$1)', [doc])).rejects.toThrow(
        'Fenced authority',
      );
      for (const role of ['anon', 'authenticated']) {
        const result = await pool.query(
          "select has_function_privilege($1,'public.authority_fenced_commit(uuid,bigint,jsonb)','EXECUTE') as ok",
          [role],
        );
        expect(result.rows[0].ok).toBe(false);
      }
      expect(
        (
          await pool.query(
            "select has_function_privilege('service_role','private.authority_commit(bigint,jsonb)','EXECUTE') as ok",
          )
        ).rows[0].ok,
      ).toBe(false);
      expect(
        (await pool.query('select revision from private.authority_matches where id=$1', [id]))
          .rows[0].revision,
      ).toBe('1');
    } finally {
      await pool.end();
    }
  },
);
