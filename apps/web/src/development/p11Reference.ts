import { P11_ECONOMY_CONFIG } from '@tft/game-data';
import { DevelopmentController } from '@tft/game-core/development';
/** DEV fixture, fixed clock; real pool accounting and four real character definitions. */
export function createP11Reference() {
  const time = { now: () => 0 };
  const c = new DevelopmentController(time, 42, 'dev-p11a-roster-reference', P11_ECONOMY_CONFIG);
  const result = c.execute({
    id: 'p11a-formation',
    origin: 'diagnostic',
    expectedRevision: 0,
    command: { type: 'formation', preset: 'mixed' },
  });
  if (!result.ok) throw Error(result.message);
  c.coordinator.start();
  const gold = c.execute({
    id: 'p11a-gold',
    origin: 'diagnostic',
    expectedRevision: c.revision,
    command: { type: 'gold', mode: 'set', amount: 52 },
  });
  if (!gold.ok) throw Error(gold.message);
  const snapshot = structuredClone(c.exportSnapshot());
  const state = snapshot.save.match;
  for (const offer of state.shop) if (offer) state.pool[offer.definitionId]!++;
  state.shop = ['dolea', 'vargas', 'jaramillo', 'florin', 'peibol'].map((definitionId, i) => {
    state.pool[definitionId]!--;
    return { id: `p11a-reference-offer-${i}`, definitionId };
  });
  snapshot.save.clock.remainingMs = 18400;
  snapshot.checkpoint = null;
  c.dispose();
  return DevelopmentController.restore(snapshot, time);
}
