import { P11H_ECONOMY_CONFIG, P11K_ECONOMY_CONFIG, P11H_ITEM_CATALOG } from '@tft/game-data';
import { grantItemInstances, applyItemCommand } from '@tft/game-core';
import { DevelopmentController } from '@tft/game-core/development';
import { createP11BReference } from './p11bReference';
/** All available items, overflow pending and a real combat-capable formation. */
export function createP11HReference(config = P11H_ECONOMY_CONFIG) {
  const c = createP11BReference({
    ...config,
    roundDamage: { ...P11H_ECONOMY_CONFIG.roundDamage, initialHp: 1000 },
  });
  const save = structuredClone(c.exportSnapshot()),
    state = save.save.match;
  const present = new Set(
    [
      ...state.items!.completed,
      ...state.items!.pending,
      ...state.units.flatMap((u) => u.equipment ?? []),
    ].map((i) => i.definitionId),
  );
  grantItemInstances(
    state,
    'p11h-reference-all',
    P11H_ITEM_CATALOG.definitions
      .filter((d) => d.kind === 'completed' && d.availability === 'available' && !present.has(d.id))
      .map((d) => d.id),
  );
  if (config.removerPolicy) {
    const unit = state.units.find((u) => u.definitionId === 'florin')!;
    unit.location = { kind: 'bench', slot: 0 };
    const item = state.items!.completed[0]!;
    applyItemCommand(state, { type: 'equip_item', unitId: unit.id, itemId: item.id });
  }
  save.checkpoint = null;
  c.dispose();
  return DevelopmentController.restore(save, { now: () => 0 });
}

export const createP11KReference = () => createP11HReference(P11K_ECONOMY_CONFIG);
