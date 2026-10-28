import { it, expect } from 'vitest';
import {
  DROP_ITEMS_ECONOMY_CONFIG,
  EFFECT_ITEMS_ECONOMY_CONFIG,
  ITEM_DROP_POLICY,
  DROP_ITEM_CATALOG,
  EXECUTABLE_ITEM_CATALOG,
} from '@tft/game-data';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import { planItemDrop } from './item-drops';
import { fixtureUsers } from './multi-fixture';
import { validateItemState, grantItemInstances } from '@tft/game-core';
const ids = fixtureUsers.slice(0, 4);
function setup(count: 2 | 3 | 4 = 4, historical = false) {
  let m = new AuthoritativeMatch(
    '00000000-0000-4000-8000-000000000010',
    { now: () => 0 },
    undefined,
    count,
    historical ? EFFECT_ITEMS_ECONOMY_CONFIG : DROP_ITEMS_ECONOMY_CONFIG,
  );
  const s = m.exportState();
  s.rng = 123;
  if (s.itemDrops) s.itemDrops.seed = 123;
  m = AuthoritativeMatch.restore(s, { now: () => 0 }, false);
  ids.slice(0, count).forEach((id, i) => m.join(`s${i}`, { userId: id, name: `P${i}` }));
  m.start('s0');
  return m;
}
function advance(m: AuthoritativeMatch) {
  m.clock.restore({ ...m.clock.snapshot(), remainingMs: 0 });
  m.pulse();
}
function nearElimination(p: AuthoritativeMatch['players'][number]) {
  const entry = p.state.healthLedger.filter((e) => e.side === 'south').at(-1)!;
  entry.base = entry.hpBefore - 1;
  entry.survivors = 0;
  entry.requested = entry.base;
  entry.applied = entry.base;
  entry.hpAfter = 1;
  p.state.health.south = 1;
}
function through(m: AuthoritativeMatch, round: number) {
  for (let i = 0; i < 40; i++) {
    if (
      m.clock.snapshot().currentPhase === 'resolution' &&
      m.players.some((p) => p.state.round === round)
    )
      return;
    advance(m);
  }
  throw Error('Round not reached');
}
it('version changes only identity, never recipes, effects or statistics', () => {
  expect({ ...DROP_ITEM_CATALOG, version: EXECUTABLE_ITEM_CATALOG.version }).toEqual(
    EXECUTABLE_ITEM_CATALOG,
  );
});
it.each([1, 2, 4, 5, 7, 8, 0, -3])('rejects noneligible round %i', (round) => {
  expect(() => planItemDrop('m', round, 1, ids)).toThrow();
});
it('uniform policy, independent streams, duplicates and canonical participant order', () => {
  expect(ITEM_DROP_POLICY.quantityWeights).toEqual([50, 50]);
  const counts = [0, 0],
    categories = new Set<string>();
  let duplicates = 0,
    independent = 0;
  for (let seed = 0; seed < 4096; seed++) {
    const d = planItemDrop('m', 3, seed, ids);
    counts[d.quantity - 2]!++;
    expect(planItemDrop('m', 3, seed, [...ids].reverse())).toEqual(d);
    expect(d.players.every((p) => p.definitionIds.length === d.quantity)).toBe(true);
    for (const p of d.players) {
      p.definitionIds.forEach((id) => categories.add(id));
      if (new Set(p.definitionIds).size < p.definitionIds.length) duplicates++;
    }
    if (JSON.stringify(d.players[0]!.definitionIds) !== JSON.stringify(d.players[1]!.definitionIds))
      independent++;
  }
  expect(counts[0]).toBeGreaterThan(1900);
  expect(counts[0]).toBeLessThan(2200);
  expect(categories.size).toBe(8);
  expect(duplicates).toBeGreaterThan(0);
  expect(independent).toBeGreaterThan(3900);
});
it.each([2, 3, 4] as const)(
  '%i players: rounds 3 and 6, restore, disconnected eligibility, no replay duplication',
  (count) => {
    const m = setup(count);
    m.disconnect('s1');
    through(m, 2);
    expect(m.exportState().itemDrops!.rounds).toEqual([]);
    advance(m);
    advance(m); // preparation then combat 3
    expect(m.exportState().itemDrops!.rounds).toEqual([]);
    const restored = AuthoritativeMatch.restore(m.exportState(), { now: () => 0 }, false);
    for (const game of [m, restored]) {
      through(game, 6);
      const rounds = game.exportState().itemDrops!.rounds;
      expect(rounds.map((d) => d.round)).toEqual([3, 6]);
      for (const d of rounds) expect(d.players).toHaveLength(count);
      for (const p of game.players) {
        expect(p.state.items!.components.length).toBe(rounds.reduce((n, d) => n + d.quantity, 0));
        expect(p.state.items!.completed).toEqual([]);
        validateItemState(p.state);
      }
      const before = structuredClone(game.exportState().itemDrops);
      for (let i = 0; i < 10; i++) {
        game.pulse();
        (game as unknown as { settle(): void }).settle();
      }
      expect(game.exportState().itemDrops).toEqual(before);
      expect(AuthoritativeMatch.restore(game.exportState()).exportState().itemDrops).toEqual(
        before,
      );
    }
    expect(restored.exportState().itemDrops).toEqual(m.exportState().itemDrops);
    expect(restored.players.map((p) => p.state.items)).toEqual(m.players.map((p) => p.state.items));
  },
);
it('overflow enters pending, no automatic craft, unique ownership and stable IDs', () => {
  const m = setup();
  for (const p of m.players) m.grantItems(p.id, 'full', Array(16).fill('component-ad'));
  through(m, 3);
  const all: string[] = [];
  for (const p of m.players) {
    expect(p.state.items!.components).toHaveLength(16);
    expect(p.state.items!.pending).toHaveLength(m.exportState().itemDrops!.rounds[0]!.quantity);
    expect(p.state.items!.crafts).toEqual([]);
    for (const item of [...p.state.items!.components, ...p.state.items!.pending]) {
      expect(item.ownerId).toBe(p.id);
      all.push(item.id);
    }
  }
  expect(new Set(all).size).toBe(all.length);
});
it('eliminated players and terminal rounds receive nothing', () => {
  const m = setup();
  through(m, 2);
  nearElimination(m.players[0]!);
  through(m, 3);
  expect(m.players[0]!.eliminated).toBe(true);
  expect(m.players[0]!.state.items!.distributions).toEqual([]);
  expect(m.exportState().itemDrops!.rounds[0]!.players).toHaveLength(3);
  expect(AuthoritativeMatch.restore(m.exportState()).exportState().itemDrops).toEqual(
    m.exportState().itemDrops,
  );
  const terminal = setup(2);
  through(terminal, 2);
  terminal.players.forEach(nearElimination);
  advance(terminal);
  advance(terminal);
  advance(terminal);
  expect(terminal.finalResults).not.toBeNull();
  expect(terminal.exportState().itemDrops!.rounds).toEqual([]);
});
it('P8C keeps drops off and shop, combat, economy RNG unchanged', () => {
  const old = setup(4, true),
    current = setup();
  through(old, 6);
  through(current, 6);
  expect(old.exportState().itemDrops).toBeUndefined();
  expect(current.exportState().rng).toBe(old.exportState().rng);
  expect(current.duels).toEqual(old.duels);
  expect(current.pool).toEqual(old.pool);
  expect(current.players.map((p) => [p.state.gold, p.state.shop, p.state.health])).toEqual(
    old.players.map((p) => [p.state.gold, p.state.shop, p.state.health]),
  );
});
it('restore rejects tampering and orphan records', () => {
  const m = setup();
  through(m, 3);
  const s = m.exportState();
  s.itemDrops!.rounds[0]!.quantity = s.itemDrops!.rounds[0]!.quantity === 2 ? 3 : 2;
  expect(() => AuthoritativeMatch.restore(s)).toThrow();
  const missing = m.exportState();
  missing.itemDrops!.rounds = [];
  expect(() => AuthoritativeMatch.restore(missing)).toThrow();
});
it('a failed complete grant leaves all participant inventories unchanged', () => {
  const m = setup();
  through(m, 2);
  advance(m);
  advance(m);
  for (let i = 0; i < 2048; i++)
    grantItemInstances(m.players.at(-1)!.state, `capacity-${i}`, ['component-ad']);
  const before = m.players.map((p) => structuredClone(p.state.items));
  expect(() => advance(m)).toThrow();
  expect(m.players.map((p) => p.state.items)).toEqual(before);
  expect(m.exportState().itemDrops!.rounds).toEqual([]);
});

it.each([0, 1, 42, 123])('frozen seed %i and explicit two/three fixtures', (seed) => {
  const d = planItemDrop('fixture', 3, seed, ids);
  expect({ quantity: d.quantity, types: d.players.map((p) => p.definitionIds) }).toMatchSnapshot();
});

it('failed persistence hides candidate rewards; retry and duplicate request preserve exactly once', async () => {
  const { DurableMatch } = await import('./persistence/DurableMatch');
  const { LOBBY_VERSION } = await import('@tft/shared');
  const { randomUUID } = await import('node:crypto');
  const { act } = await import('./multi-fixture');
  const m = setup();
  through(m, 2);
  advance(m);
  advance(m);
  let stored: import('./persistence/snapshot').StoredMatch | null = null;
  let fail = false;
  const repository = {
    async commit(_expected: number, document: import('./persistence/snapshot').StoredMatch) {
      if (fail) throw Error('offline');
      stored = structuredClone(document);
    },
    async load() {
      return stored ? [stored] : [];
    },
  };
  const durable = new DurableMatch(m, repository, {
    version: LOBBY_VERSION,
    roomId: randomUUID(),
    roomCode: 'ABCDEFGH',
    hostUserId: ids[0]!,
    capacity: 4,
    participants: m.players.map((p) => ({
      userId: p.id,
      name: p.name,
      avatarId: p.avatarId,
      readyState: true,
      connected: true,
    })),
    status: 'in_match',
    createdAt: 0,
    expiresAt: Date.now() + 100000,
    matchId: m.id,
    revision: 1,
  });
  await durable.run(() => {});
  const before = durable.match.players.map((p) => structuredClone(p.state.items));
  fail = true;
  await expect(durable.run(advance)).rejects.toThrow();
  expect(durable.match.players.map((p) => p.state.items)).toEqual(before);
  expect((await repository.load())[0]!.authority.itemDrops!.rounds).toEqual([]);
  // Restart from the last durable state after a failed write, then settle once.
  const restarted = AuthoritativeMatch.restore(
    (await repository.load())[0]!.authority,
    { now: () => 0 },
    false,
  );
  fail = false;
  const recovered = new DurableMatch(
    restarted,
    repository,
    durable.lobby,
    (await repository.load())[0]!,
  );
  await recovered.run(advance);
  expect(recovered.match.exportState().itemDrops!.rounds).toHaveLength(1);
  await recovered.run(advance); // preparation 4
  const reward = recovered.match.players[0]!.state.items!.components[0]!;
  const receipts = await recovered.run((game) =>
    act(game, 0, { type: 'inspect_item', itemId: reward.id }),
  );
  expect(receipts.accepted).toBe(true);
  const snapshot = recovered.match.exportState();
  const receipt = snapshot.players[0]!.receipts.at(-1)!;
  const original = JSON.parse(receipt[1].payload);
  const result = await recovered.run((game) => game.submit('s0', { ...original, sessionId: 's0' }));
  expect(result).toEqual(receipts);
  expect(recovered.match.exportState().itemDrops).toEqual(snapshot.itemDrops);
});

it('private presentation exposes only own rewards and redacts reward entropy', () => {
  const m = setup();
  through(m, 3);
  const own = m.competitiveSnapshot('s0').own.items!;
  expect(own.distributions[0]!.seed).toBe(0);
  expect(m.players[0]!.state.items!.distributions[0]!.seed).not.toBe(0);
  const text = JSON.stringify(m.competitiveSnapshot('s0'));
  expect(text).not.toContain('"itemDrops"');
  for (const other of m.players.slice(1))
    for (const item of other.state.items!.components) expect(text).not.toContain(item.id);
});
