import { useSyncExternalStore } from 'react';
import type { RemoteCoordinator } from './RemoteCoordinator';
import './recovery.css';
export function RecoveryNotice({
  coordinator,
  onLeave,
  onAccount,
}: {
  coordinator: RemoteCoordinator;
  onLeave: () => void;
  onAccount: () => void;
}) {
  const status = useSyncExternalStore(coordinator.subscribe, () => coordinator.recoveryStatus);
  if (!status) return null;
  return (
    <aside className="recovery-notice" aria-label="Estado de conexión">
      <p role="status" aria-live="polite">
        {status}
      </p>
      {!coordinator.connected && (
        <div>
          {coordinator.canRetry && <button onClick={coordinator.retry}>Reintentar</button>}
          {status.startsWith('Sesión') && <button onClick={onAccount}>Ir a mi cuenta</button>}
          <button onClick={onLeave}>Volver al menú</button>
        </div>
      )}
    </aside>
  );
}
