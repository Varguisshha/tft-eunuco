import { expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { OpenRegistrationSchema } from '@tft/shared';
import { AccountService } from './service';
import { registrationMode } from './registrationMode';
const input = {
  email: 'local@example.test',
  username: 'LOCAL_PLAYER',
  password: 'a local test phrase',
  confirmation: 'a local test phrase',
  captchaToken: 'diagnostic-proof-only',
  website: '',
};
function fixture() {
  const auth = {
    signUp: vi.fn().mockResolvedValue({ error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
  };
  return {
    auth,
    service: new AccountService(
      { auth } as unknown as SupabaseClient,
      'http://127.0.0.1:4173/',
      'open-local',
    ),
  };
}
it('submits no invitation and sends proof as provider captchaToken, never as user metadata', async () => {
  const { auth, service } = fixture();
  await expect(service.register(input)).resolves.toBe(input.email);
  expect(auth.signUp).toHaveBeenCalledWith({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: 'http://127.0.0.1:4173/',
      data: { username: 'local_player' },
      captchaToken: input.captchaToken,
    },
  });
});
it.each([
  { ...input, captchaToken: '' },
  { ...input, website: 'bot' },
  { ...input, username: '<script>' },
  { ...input, confirmation: 'wrong' },
  { ...input, email: 'bad' },
  { ...input, password: 'short', confirmation: 'short' },
])('rejects invalid open registration before provider %#', async (value) => {
  const { auth, service } = fixture();
  expect(OpenRegistrationSchema.safeParse(value).success).toBe(false);
  await expect(service.register(value)).rejects.toThrow();
  expect(auth.signUp).not.toHaveBeenCalled();
});
it('login and recovery preserve provider CAPTCHA enforcement', async () => {
  const { auth, service } = fixture();
  await expect(service.login(input.email, input.password)).rejects.toThrow();
  await expect(service.recover(input.email)).rejects.toThrow();
  expect(auth.signInWithPassword).not.toHaveBeenCalled();
  expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
  await service.login(input.email, input.password, input.captchaToken);
  await service.recover(input.email, input.captchaToken);
  expect(auth.signInWithPassword).toHaveBeenCalledWith({
    email: input.email,
    password: input.password,
    options: { captchaToken: input.captchaToken },
  });
  expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(input.email, {
    redirectTo: 'http://127.0.0.1:4173/',
    captchaToken: input.captchaToken,
  });
});
it('public mode remains closed and cannot be opened by the local preparation flag', () => {
  expect(registrationMode({})).toBe('invited');
  expect(registrationMode({ mode: 'open-local', appEnv: 'local-isolated' })).toBe('open-local');
  for (const appEnv of ['private', 'production', 'staging', ''])
    expect(() => registrationMode({ mode: 'open-local', appEnv })).toThrow();
});
