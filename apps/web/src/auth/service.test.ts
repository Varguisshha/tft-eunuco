import { expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AccountService } from './service';
function fixture(error: object | null = null) {
  const auth = {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
  };
  Object.values(auth).forEach((fn) => fn.mockResolvedValue({ error }));
  return {
    auth,
    service: new AccountService(
      { auth } as unknown as SupabaseClient,
      'https://game.example.test/',
    ),
  };
}
it('submits normalized private registration through Supabase, never a custom password store', async () => {
  const { auth, service } = fixture();
  await service.register({
    email: 'one@example.test',
    username: 'PLAYER',
    password: 'a long test phrase',
    confirmation: 'a long test phrase',
    invitation: 'a'.repeat(64),
  });
  expect(auth.signUp).toHaveBeenCalledWith({
    email: 'one@example.test',
    password: 'a long test phrase',
    options: {
      emailRedirectTo: 'https://game.example.test/',
      data: { username: 'player', invitation: 'a'.repeat(64) },
    },
  });
});
it('rejects invalid registration before provider', async () => {
  const { auth, service } = fixture();
  await expect(service.register({})).rejects.toThrow();
  expect(auth.signUp).not.toHaveBeenCalled();
});
it('logs in and out through the provider', async () => {
  const { auth, service } = fixture();
  await service.login('a@b.test', 'secret');
  await service.logout();
  expect(auth.signInWithPassword).toHaveBeenCalled();
  expect(auth.signOut).toHaveBeenCalled();
});
it.each(['invalid_credentials', 'email_not_confirmed'])(
  'reports login rejection %s',
  async (code) => {
    await expect(fixture({ code }).service.login('a@b.test', 'secret')).rejects.toThrow();
  },
);
it('recovery does not enumerate unknown accounts', async () => {
  await expect(
    fixture({ code: 'user_not_found' }).service.recover('unknown@b.test'),
  ).resolves.toBeUndefined();
});
it('password change requires recovery state and matching policy', async () => {
  const { auth, service } = fixture();
  await expect(
    service.newPassword('a long test phrase', 'a long test phrase', false),
  ).rejects.toThrow();
  await expect(service.newPassword('short', 'short', true)).rejects.toThrow();
  await expect(service.newPassword('a long test phrase', 'different', true)).rejects.toThrow();
  expect(auth.updateUser).not.toHaveBeenCalled();
});
it('successful recovery updates through provider then revokes sessions', async () => {
  const { auth, service } = fixture();
  await service.newPassword('a long test phrase', 'a long test phrase', true);
  expect(auth.updateUser).toHaveBeenCalledWith({ password: 'a long test phrase' });
  expect(auth.signOut).toHaveBeenCalled();
});
