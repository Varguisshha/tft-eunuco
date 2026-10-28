/** Bounded exponential retry; injected entropy makes timing independently testable. */
export const MAX_RECOVERY_ATTEMPTS = 5;
export function retryDelay(attempt: number, entropy = Math.random()) {
  return Math.round(Math.min(12000, 750 * 2 ** attempt) * (0.85 + 0.3 * entropy));
}
export function recoveryError(error: unknown) {
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? Number(error.code) : 0;
  if (code === 401 || code === 4001) return 'Sesión caducada o cerrada. Vuelve a iniciar sesión.';
  if (code === 403) return 'Acceso rechazado. Esta cuenta no pertenece a la partida.';
  if (code === 4002) return 'Tu partida está abierta en otra ventana.';
  if (code === 522 || code === 4212)
    return 'Partida no disponible. El servidor ya no conserva esta sala.';
  return null;
}
