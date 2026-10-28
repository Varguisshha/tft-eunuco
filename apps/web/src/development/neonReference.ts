import { INTEGRATED_ECONOMY_CONFIG, resolveItemCatalog } from '@tft/game-data';
import { DevelopmentController } from '@tft/game-core/development';
import {
  LocalMatchCoordinator,
  offsetToAxial,
  grantItemInstances,
  applyItemCommand,
} from '@tft/game-core';
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

/** Current four-character shop, original splash art, existing DEV-only authority. */
export function createFlorinReference() {
  const c = createNeonReference();
  const snapshot = structuredClone(c.exportSnapshot());
  const state = snapshot.save.match;
  for (const offer of state.shop) if (offer) state.pool[offer.definitionId]!++;
  state.shop = ['dolea', 'vargas', 'jaramillo', 'florin', 'florin'].map((definitionId, i) => {
    state.pool[definitionId]!--;
    return { id: `florin-reference-${i}`, definitionId };
  });
  snapshot.checkpoint = null;
  c.dispose();
  return DevelopmentController.restore(snapshot, { now: () => 11600 });
}

/** Existing inventory APIs, isolated save and real pool; no public grant command. */
export function createFlorinItemReference(stars: 1 | 2 | 3) {
  const c = new DevelopmentController({ now: () => 0 }, 42, `dev-florin-equipped-${stars}`);
  let revision = 0;
  for (const command of [
    { type: 'formation', preset: 'empty' },
    { type: 'level', value: 3 },
    {
      type: 'spawn',
      definitionId: 'florin',
      stars,
      to: { kind: 'board', hex: offsetToAxial(3, 4) },
    },
    {
      type: 'spawn',
      definitionId: 'dolea',
      stars: 1,
      to: { kind: 'board', hex: offsetToAxial(1, 5) },
    },
  ] as DevelopmentCommand[]) {
    const result = c.execute({
      id: `florin-equipped-${revision++}`,
      origin: 'diagnostic',
      expectedRevision: c.revision,
      command,
    });
    if (!result.ok) throw Error(result.message);
  }
  const snapshot = structuredClone(c.exportSnapshot()),
    state = snapshot.save.match;
  grantItemInstances(state, 'florin-diagnostic-equipment', [
    'item-forge-ad--ad',
    'item-forge-ap--ap',
    'item-forge-armor--armor',
  ]);
  const florin = state.units.find((u) => u.definitionId === 'florin')!;
  for (const item of [...state.items!.completed])
    applyItemCommand(state, { type: 'equip_item', unitId: florin.id, itemId: item.id });
  snapshot.checkpoint = null;
  c.dispose();
  return DevelopmentController.restore(snapshot, { now: () => 0 });
}

/** P8E fixtures stay behind the existing DEV boundary; grants use the existing inventory API. */
export function createItemHudReference(
  mode: 'empty' | 'components' | 'full' | 'all' | 'two' | 'three' | 'fusion' = 'components',
) {
  const c = createFlorinReference();
  let seq = 0;
  for (const [definitionId, col] of [
    ['jaramillo', 5],
    ['florin', 6],
  ] as const) {
    const r = c.execute({
      id: `item-hud-${seq++}`,
      origin: 'diagnostic',
      expectedRevision: c.revision,
      command: { type: 'spawn', definitionId, stars: 1, to: { kind: 'bench', slot: col } },
    });
    if (!r.ok) throw Error(r.message);
  }
  const snapshot = structuredClone(c.exportSnapshot()),
    state = snapshot.save.match;
  state.config = structuredClone(INTEGRATED_ECONOMY_CONFIG);
  state.items!.catalogVersion = 'f0p8d-1';
  const catalog = resolveItemCatalog(state.items!.catalogVersion);
  const components = catalog.definitions.filter((d) => d.kind === 'component').map((d) => d.id);
  const completed = catalog.definitions
    .filter((d) => d.kind === 'completed' && d.availability === 'available')
    .map((d) => d.id);
  if (mode === 'components')
    grantItemInstances(state, 'hud-components', [...components, ...components]);
  if (mode === 'full')
    for (let n = 0; n < 3; n++)
      grantItemInstances(state, `hud-full-${n}`, [...components, ...completed.slice(0, 16)]);
  if (mode === 'all')
    for (let n = 0; n < completed.length; n += 16)
      grantItemInstances(state, `hud-all-${n}`, completed.slice(n, n + 16));
  if (mode === 'two' || mode === 'three') {
    const quantity = mode === 'two' ? 2 : 3,
      round = mode === 'two' ? 3 : 6;
    grantItemInstances(state, `hud-drop-${round}`, components.slice(0, quantity));
    state.items!.distributions.push({
      id: `hud-drop-${round}`,
      round,
      quantity,
      seed: 42,
      instanceIds: state.items!.grants.at(-1)!.instances.map((i) => i.id),
    });
  }
  if (mode === 'fusion') {
    grantItemInstances(
      state,
      'hud-fusion',
      completed
        .filter((id) => catalog.definitions.find((d) => d.id === id)?.content?.slotCost !== 3)
        .slice(0, 8),
    );
    const units = state.units.filter((u) => u.definitionId === 'vargas');
    for (const [i, u] of units.entries())
      for (const item of state.items!.completed.slice(0, i ? 2 : 3))
        applyItemCommand(state, { type: 'equip_item', unitId: u.id, itemId: item.id });
  }
  snapshot.checkpoint = null;
  c.dispose();
  return DevelopmentController.restore(snapshot, { now: () => 11600 });
}
