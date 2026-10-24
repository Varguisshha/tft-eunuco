import { DevelopmentController } from '@tft/game-core/development';
import { LocalMatchCoordinator, offsetToAxial } from '@tft/game-core';
import type { TimeSource } from '@tft/game-core';
import type { DevelopmentCommand } from '@tft/shared/development';
/** Deterministic DEV-only comparison fixture. Uses existing transactions and validated saves.
 * Its explicit fixed TimeSource keeps the reference readable; normal and DEV clocks are unchanged.
 */
export function createNeonReference() {
  let now = 0;
  const time: TimeSource = { now: () => now };
  const c = new DevelopmentController(time, 42, 'dev-neon-visual-reference');
  let seq = 0;
  const run = (command: DevelopmentCommand) => {
    const result = c.execute({
      id: `neon-${seq++}`,
      origin: 'diagnostic',
      expectedRevision: c.revision,
      command,
    });
    if (!result.ok) throw new Error(result.message);
  };
  run({ type: 'formation', preset: 'mixed' });
  c.coordinator.start();
  // Settle two real rounds, retaining the conservation and settlement ledger checks.
  for (let n = 0; n < 2; n++) {
    run({ type: 'advance' });
    run({ type: 'advance' });
    run({ type: 'advance' });
  }
  run({ type: 'formation', preset: 'empty' });
  run({ type: 'level', value: 4 });
  for (const [id, col, row] of [
    ['vargas', 1, 5],
    ['dolea', 3, 5],
    ['test-k01', 4, 6],
    ['test-r03', 5, 5],
  ] as const)
    run({
      type: 'spawn',
      definitionId: id,
      stars: 1,
      to: { kind: 'board', hex: offsetToAxial(col, row) },
    });
  for (const id of ['vargas', 'dolea', 'test-k01'])
    run({ type: 'spawn', definitionId: id, stars: 1 });
  run({ type: 'gold', mode: 'set', amount: 52 });
  run({ type: 'xp', mode: 'set', amount: 4 });
  run({ type: 'health', side: 'south', value: 100 });
  run({ type: 'health', side: 'north', value: 88 });
  const snapshot = structuredClone(c.exportSnapshot());
  const state = snapshot.save.match;
  // Diagnostic opponent composition, not a modification of the production catalog or balance.
  state.config.opponents = state.config.opponents.map((t) =>
    t.fromRound === 3 ? { ...t, definitions: ['dolea', 'test-r03', 'test-k01', 'vargas'] } : t,
  );
  for (const offer of state.shop) if (offer) state.pool[offer.definitionId]!++;
  state.shop = ['vargas', 'dolea', 'test-k01', 'test-r03', 'dolea'].map((definitionId, i) => {
    state.pool[definitionId]!--;
    return { id: `neon-offer-${i}`, definitionId };
  });
  snapshot.save.clock.remainingMs = 18400;
  // The authority still chooses legal rival hexes and derives all profiles from the real catalog.
  snapshot.checkpoint = null;
  now = 11600;
  const checked = LocalMatchCoordinator.restore(snapshot.save, time);
  snapshot.save = checked.exportSave();
  c.dispose();
  return DevelopmentController.restore(snapshot, time);
}
