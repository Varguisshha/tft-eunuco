import type { LocalMatchCoordinator } from '@tft/game-core';
import { encodeSave } from './automaticSave';
/** Browser lifecycle adapter. Does not depend on a mounted React/Phaser scene. */
export function attachAutomaticHost(
  coordinator: LocalMatchCoordinator,
  save: (text: string) => void,
  onError: () => void,
): () => void {
  let lastSaved = -Infinity,
    lastRevision = -1,
    lastPhase = '';
  const persist = (force = false) => {
    const clock = coordinator.getClock(),
      revision = coordinator.getMatch().revision;
    if (
      !force &&
      revision === lastRevision &&
      clock.phaseId === lastPhase &&
      performance.now() - lastSaved < 500
    )
      return;
    try {
      save(encodeSave(coordinator.exportSave()));
      lastSaved = performance.now();
      lastRevision = revision;
      lastPhase = clock.phaseId;
    } catch {
      onError();
    }
  };
  const unsubscribe = coordinator.subscribe(() => persist());
  const handle = window.setInterval(() => coordinator.pulse(), 50);
  const flush = () => persist(true);
  const visibility = () => {
    coordinator.pulse();
    flush();
  };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', visibility);
  persist(true);
  return () => {
    window.clearInterval(handle);
    unsubscribe();
    flush();
    window.removeEventListener('pagehide', flush);
    document.removeEventListener('visibilitychange', visibility);
  };
}
