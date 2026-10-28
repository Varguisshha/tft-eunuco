/** Explicit local preparation gate. Public builds cannot enable it (also checked by Vite). */
export function registrationMode(env: { mode?: string | undefined; appEnv?: string | undefined }) {
  if (env.mode !== 'open-local') return 'invited' as const;
  if (!['local', 'local-isolated'].includes(env.appEnv ?? ''))
    throw Error('El registro abierto está preparado solo para LOCAL.');
  return 'open-local' as const;
}
export const accountRegistrationMode = registrationMode({
  mode: import.meta.env.VITE_ACCOUNT_REGISTRATION_MODE,
  appEnv: import.meta.env.VITE_APP_ENV,
});
