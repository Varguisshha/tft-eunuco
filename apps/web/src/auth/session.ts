import { useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './client';
let state: { session: Session | null; loading: boolean; recovery: boolean } = {
  session: null,
  loading: !!supabase,
  recovery: false,
};
const listeners = new Set<() => void>();
function publish(session: Session | null, recovery = state.recovery) {
  state = { session, loading: false, recovery: !!session && recovery };
  listeners.forEach((l) => l());
}
let received = false;
supabase?.auth.onAuthStateChange((event, session) => {
  received = true;
  publish(session, event === 'PASSWORD_RECOVERY' || (event !== 'SIGNED_OUT' && state.recovery));
});
void supabase?.auth
  .getSession()
  .then(({ data, error }) => {
    if (!received) publish(error ? null : data.session);
  })
  .catch(() => {
    if (!received) publish(null);
  });
export const finishRecovery = () => publish(state.session, false);
export const getAccountSnapshot = () => state;
export function useAccountSession() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}
