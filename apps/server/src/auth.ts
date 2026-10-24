import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PlayerProfileSchema, type PlayerIdentity } from '@tft/shared';
export interface VerifiedIdentity extends PlayerIdentity {
  token: string;
  expiresAt: number;
}
export type VerifyIdentity = (token: unknown) => Promise<VerifiedIdentity>;
export function makeVerifier(
  client: SupabaseClient,
  scoped: (token: string) => SupabaseClient,
): VerifyIdentity {
  return async (token) => {
    if (typeof token !== 'string' || token.length < 20 || token.length > 8192)
      throw new Error('Inicia sesión para jugar.');
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user?.email_confirmed_at || data.user.is_anonymous)
      throw new Error('Sesión no válida o email sin verificar.');
    const claims = await client.auth.getClaims(token);
    const exp = claims.data?.claims.exp;
    if (claims.error || typeof exp !== 'number' || exp * 1000 <= Date.now())
      throw new Error('Sesión caducada.');
    const userClient = scoped(token);
    const active = await userClient.rpc('player_session_active');
    if (active.error || active.data !== true) throw new Error('Sesión cerrada.');
    const result = await userClient
      .from('player_profiles')
      .select('user_id,username,display_name,avatar_id,created_at,updated_at')
      .eq('user_id', data.user.id)
      .single();
    const profile = PlayerProfileSchema.safeParse(result.data);
    if (result.error || !profile.success || profile.data.user_id !== data.user.id)
      throw new Error('Perfil no disponible.');
    return {
      userId: data.user.id,
      name: profile.data.display_name,
      avatarId: profile.data.avatar_id,
      expiresAt: exp * 1000,
      token,
    };
  };
}
export const verifyIdentity: VerifyIdentity = async (token) => {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('El acceso online todavía no está configurado.');
  const endpoint = new URL(url);
  if (
    endpoint.protocol !== 'https:' &&
    !['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname)
  )
    throw new Error('Supabase requiere HTTPS fuera de desarrollo local.');
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  return makeVerifier(createClient(url, key, options), (t) =>
    createClient(url, key, { ...options, global: { headers: { Authorization: `Bearer ${t}` } } }),
  )(token);
};
