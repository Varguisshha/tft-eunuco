import type { SupabaseClient } from '@supabase/supabase-js';
import { PasswordSchema, RegistrationSchema, OpenRegistrationSchema } from '@tft/shared';
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
    private mode: 'invited' | 'open-local' = 'invited',
  ) {}
  async register(input: unknown) {
    const parsed = (
      this.mode === 'open-local' ? OpenRegistrationSchema : RegistrationSchema
    ).safeParse(input);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
    const v = parsed.data;
    checkAuthError(
      (
        await this.client.auth.signUp({
          email: v.email,
          password: v.password,
          options: {
            emailRedirectTo: this.redirect,
            data: {
              username: v.username,
              ...('invitation' in v ? { invitation: v.invitation } : {}),
            },
            ...('captchaToken' in v ? { captchaToken: v.captchaToken } : {}),
          },
        })
      ).error,
    );
    return v.email;
  }
  async login(email: string, password: string, captchaToken?: string) {
    this.requireCaptcha(captchaToken);
    checkAuthError(
      (
        await this.client.auth.signInWithPassword({
          email,
          password,
          ...(captchaToken ? { options: { captchaToken } } : {}),
        })
      ).error,
    );
  }
  private requireCaptcha(token?: string) {
    if (this.mode === 'open-local' && !token) throw Error('Completa la verificación de seguridad.');
  }
  async recover(email: string, captchaToken?: string) {
    this.requireCaptcha(captchaToken);
    await this.client.auth.resetPasswordForEmail(email, {
      redirectTo: this.redirect,
      ...(captchaToken ? { captchaToken } : {}),
    });
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
