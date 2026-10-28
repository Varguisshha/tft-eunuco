import { P11G_ECONOMY_CONFIG } from '@tft/game-data';
import { DevelopmentController } from '@tft/game-core/development';
import type { DevelopmentCommand } from '@tft/shared/development';
import { createP11BReference } from './p11bReference';
/** Fixed-clock diagnostic, real transactions and grants. Never a competitive match. */
export function createP11GReference(fullInventory = false, fusion?: 2 | 3) {
  const config = {
    ...P11G_ECONOMY_CONFIG,
    roundDamage: { ...P11G_ECONOMY_CONFIG.roundDamage, initialHp: 1000 },
  };
  const c = fullInventory
    ? createP11BReference(config)
    : new DevelopmentController({ now: () => 0 }, 42, `dev-p11g-${crypto.randomUUID()}`, config);
  const run = (command: DevelopmentCommand) => {
    const result = c.execute({
      id: `p11g-${c.revision}`,
      origin: 'diagnostic',
      expectedRevision: c.revision,
      command,
    });
    if (!result.ok) throw Error(result.message);
  };
  if (!fullInventory) {
    run({ type: 'formation', preset: 'mixed' });
    c.coordinator.start();
  }
  run({ type: 'gold', mode: 'set', amount: 52 });
  if (fusion === 3) {
    run({ type: 'spawn', definitionId: 'dolea', stars: 2 });
    run({ type: 'spawn', definitionId: 'dolea', stars: 2 });
  }
  if (fusion) run({ type: 'spawn', definitionId: 'dolea', stars: 1 });
  return c;
}
