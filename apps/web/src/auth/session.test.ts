import { beforeEach, expect, it, vi } from 'vitest';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
const fixture = vi.hoisted(() => ({
  callback: null as null | ((event: AuthChangeEvent, session: Session | null) => void),
  restore: null as Session | null,
}));
vi.mock('./client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: typeof fixture.callback) => {
        fixture.callback = cb;
      },
      getSession: async () => ({ data: { session: fixture.restore }, error: null }),
    },
  },
}));
beforeEach(() => {
  vi.resetModules();
  fixture.restore = null;
  fixture.callback = null;
});
const session = { user: { id: 'one' }, access_token: 'test-token' } as Session;
it('restores the SDK persistent session', async () => {
  fixture.restore = session;
  const store = await import('./session');
  await Promise.resolve();
  expect(store.getAccountSnapshot().session).toBe(session);
  expect(store.getAccountSnapshot().loading).toBe(false);
});
it('tracks refresh, account switch, logout and recovery without manual storage', async () => {
  const store = await import('./session');
  fixture.callback!('SIGNED_IN', session);
  expect(store.getAccountSnapshot().session?.user.id).toBe('one');
  const refreshed = { ...session, access_token: 'new-token' };
  fixture.callback!('TOKEN_REFRESHED', refreshed);
  expect(store.getAccountSnapshot().session?.access_token).toBe('new-token');
  fixture.callback!('PASSWORD_RECOVERY', refreshed);
  expect(store.getAccountSnapshot().recovery).toBe(true);
  store.finishRecovery();
  expect(store.getAccountSnapshot().recovery).toBe(false);
  fixture.callback!('SIGNED_IN', { ...session, user: { ...session.user, id: 'two' } });
  expect(store.getAccountSnapshot().session?.user.id).toBe('two');
  fixture.callback!('SIGNED_OUT', null);
  expect(store.getAccountSnapshot().session).toBeNull();
});
