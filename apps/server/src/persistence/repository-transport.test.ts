import { afterEach, expect, it, vi } from 'vitest';
import { SupabaseMatchRepository } from './repository';
import type { StoredMatch } from './snapshot';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
it('accepts a checkpoint confirmed after 5 s without retrying an ambiguous write', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms) => {
    const c = new AbortController();
    setTimeout(() => c.abort(new DOMException('Timed out', 'TimeoutError')), ms);
    return c.signal;
  });
  const fetcher = vi.fn(
    (_url: unknown, init?: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(() => resolve(new Response(null, { status: 204 })), 7_900);
        init?.signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(init.signal?.reason);
        });
      }),
  );
  vi.stubGlobal('fetch', fetcher);
  const repository = new SupabaseMatchRepository('https://example.supabase.co', 'test-only');
  const committing = repository.commit(0, {
    authority: { catalog: 'transport-fixture', duels: [] },
  } as unknown as StoredMatch);
  const checked = expect(committing).resolves.toBeUndefined();
  await vi.advanceTimersByTimeAsync(7_901);

  await checked;

  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('never treats a rejected fenced write as a successful checkpoint', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify({ code: 'P0001', message: 'Authority unavailable' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
    ),
  );
  const repository = new SupabaseMatchRepository('https://example.supabase.co', 'test-only');
  await expect(
    repository.commit(0, {
      authority: { catalog: 'transport-fixture', duels: [] },
    } as unknown as StoredMatch),
  ).rejects.toMatchObject({ kind: 4 });
});

it('allows an independently confirmed lease renewal beyond five seconds without replacing its authority', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms) => {
    const c = new AbortController();
    setTimeout(() => c.abort(new DOMException('Timed out', 'TimeoutError')), ms);
    return c.signal;
  });
  let confirmed = false;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: unknown, init?: RequestInit) => {
      if (String(url).endsWith('/authority_lease_renew'))
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            confirmed = true;
            resolve();
          }, 7900);
          init?.signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(init.signal?.reason);
          });
        });
      return new Response('true', { headers: { 'Content-Type': 'application/json' } });
    }),
  );
  const lost = vi.fn(),
    repo = new SupabaseMatchRepository('https://example.supabase.co', 'test-only'),
    lease = await repo.acquireAuthority(lost);
  const renewed = lease.renew();
  await vi.advanceTimersByTimeAsync(7901);
  await renewed;
  expect(confirmed).toBe(true);
  expect(lost).not.toHaveBeenCalled();
  expect(() => lease.assert()).not.toThrow();
  await lease.release();
  expect(() => lease.assert()).toThrow('Authority unavailable');
});
