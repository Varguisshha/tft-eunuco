import type { SupabaseClient } from '@supabase/supabase-js';
import { PasswordSchema, RegistrationSchema } from '@tft/shared';
export function checkAuthError(error: { code?: string | undefined } | null) {
  if (error)
    throw new Error(
      error.code === '23505'
        ? 'Ese nombre ya está ocupado. Elige otro.'
        : error.code === 'email_not_confirmed'
          ? 'Verifica tu email antes de entrar.'
          : 'No se pudo completar. Comprueba tus datos y vuelve a intentarlo.',
    );
}
export class AccountService {
  constructor(
    private client: SupabaseClient,
    private redirect: string,
  ) {}
  async register(input: unknown) {
    const parsed = RegistrationSchema.safeParse(input);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
    const v = parsed.data;
    checkAuthError(
      (
        await this.client.auth.signUp({
          email: v.email,
          password: v.password,
          options: {
            emailRedirectTo: this.redirect,
            data: { username: v.username, invitation: v.invitation },
          },
        })
      ).error,
    );
    return v.email;
  }
  async login(email: string, password: string) {
    checkAuthError((await this.client.auth.signInWithPassword({ email, password })).error);
  }
  async recover(email: string) {
    await this.client.auth.resetPasswordForEmail(email, { redirectTo: this.redirect });
  }
  async newPassword(password: string, confirmation: string, recovery: boolean) {
    if (!recovery) throw new Error('Abre un enlace de recuperación válido.');
    const parsed = PasswordSchema.safeParse(password);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
    if (password !== confirmation) throw new Error('Las contraseñas no coinciden.');
    checkAuthError((await this.client.auth.updateUser({ password })).error);
    await this.logout();
  }
  async logout() {
    checkAuthError((await this.client.auth.signOut()).error);
  }
}
