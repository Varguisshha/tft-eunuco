import { ROSTER_ECONOMY_CONFIG } from '@tft/game-data';
import { DevelopmentController } from '@tft/game-core/development';
/** DEV fixture, fixed clock; real pool accounting and four real character definitions. */
export function createRosterReference() {
  const time = { now: () => 0 };
  const c = new DevelopmentController(time, 42, 'dev-p10a-roster-reference', ROSTER_ECONOMY_CONFIG);
  const result = c.execute({
    id: 'p10a-formation',
    origin: 'diagnostic',
    expectedRevision: 0,
    command: { type: 'formation', preset: 'mixed' },
  });
  if (!result.ok) throw Error(result.message);
  c.coordinator.start();
  const gold=c.execute({id:'p10a-gold',origin:'diagnostic',expectedRevision:c.revision,command:{type:'gold',mode:'set',amount:52}});
  if(!gold.ok)throw Error(gold.message);
  const snapshot = structuredClone(c.exportSnapshot());
  const state = snapshot.save.match;
  for (const offer of state.shop) if (offer) state.pool[offer.definitionId]!++;
  state.shop = ['dolea', 'vargas', 'jaramillo', 'florin', 'dolea'].map((definitionId, i) => {
    state.pool[definitionId]!--;
    return { id: `p10a-reference-offer-${i}`, definitionId };
  });
  snapshot.save.clock.remainingMs = 18400;
  snapshot.checkpoint = null;
  c.dispose();
  return DevelopmentController.restore(snapshot, time);
}
