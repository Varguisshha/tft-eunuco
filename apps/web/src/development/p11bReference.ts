import { grantItemInstances, grantDevelopmentRemover, applyItemCommand } from '@tft/game-core';
import { matchCatalog, TFT185_ITEM_CATALOG } from '@tft/game-data';
import { P11B_ECONOMY_CONFIG, P11C_ECONOMY_CONFIG } from '@tft/game-data';
import { DevelopmentController } from '@tft/game-core/development';
/** DEV fixture, fixed clock; real pool accounting and four real character definitions. */
export function createP11BReference(config = P11B_ECONOMY_CONFIG) {
  const time = { now: () => 0 };
  const c = new DevelopmentController(
    time,
    42,
    ['f0p11g-1', 'f0p11h-1'].includes(config.catalog ?? '')
      ? `dev-p11g-${crypto.randomUUID()}`
      : 'dev-p11b-roster-reference',
    config,
  );
  const result = c.execute({
    id: 'p11b-formation',
    origin: 'diagnostic',
    expectedRevision: 0,
    command: { type: 'formation', preset: 'mixed' },
  });
  if (!result.ok) throw Error(result.message);
  c.coordinator.start();
  const gold = c.execute({
    id: 'p11b-gold',
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
    return { id: `p11b-reference-offer-${i}`, definitionId };
  });
  if (['f0p11g-1', 'f0p11h-1'].includes(config.catalog ?? ''))
    state.shopRolls = state.shop.map((offer) => ({
      cost: matchCatalog(config).find((d) => d.id === offer!.definitionId)!.cost,
      outcome: 'offered',
    }));
  const all = TFT185_ITEM_CATALOG.definitions;
  const components = all.filter((d) => d.kind === 'component').map((d) => d.id);
  grantItemInstances(state, 'p11b-components', [...components, ...components]);
  const special = ['TFT_Item_Deathblade', 'TFT_Item_WarmogsArmor'].map(
    (id) => all.find((d) => d.content?.sourceRecordId === id)!.id,
  );
  grantItemInstances(state, 'p11b-equipped', special);
  const unit = state.units.find((u) => u.definitionId === 'dolea')!;
  for (const item of [...state.items!.completed])
    applyItemCommand(state, { type: 'equip_item', itemId: item.id, unitId: unit.id });
  grantItemInstances(
    state,
    'p11b-items',
    all
      .filter((d) => d.kind === 'completed' && d.availability === 'available')
      .slice(0, 12)
      .map((d) => d.id),
  );
  if (!state.config.removerPolicy) grantDevelopmentRemover(state, 'p11b-fixture');
  snapshot.save.clock.remainingMs = 18400;
  snapshot.checkpoint = null;
  c.dispose();
  return DevelopmentController.restore(snapshot, time);
}

/** Fixed mid-combat diagnostic slice; full replay remains private to the local DEV client. */
export function createP11CReference() {
  const c = createP11BReference(P11C_ECONOMY_CONFIG);
  const offer = c.coordinator.getMatch().shop[4]!;
  const clock = c.coordinator.getClock();
  c.coordinator.submit({
    matchId: clock.matchId,
    phaseId: clock.phaseId,
    expectedRevision: c.coordinator.getMatch().revision,
    command: { type: 'buy_unit', offerId: offer.id },
  });
  c.coordinator.debugAdvance();
  const snapshot = structuredClone(c.exportSnapshot());
  snapshot.save.playbackMs = Math.min(
    4500,
    Math.floor(snapshot.save.replay!.result.tick / 2) * 100,
  );
  snapshot.save.clock.remainingMs -= snapshot.save.playbackMs;
  snapshot.checkpoint = null;
  c.dispose();
  return DevelopmentController.restore(snapshot, { now: () => 0 });
}
