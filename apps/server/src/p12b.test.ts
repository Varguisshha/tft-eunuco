import { it, expect } from 'vitest';
import { P12B_ECONOMY_CONFIG, P11K_ECONOMY_CONFIG } from '@tft/game-data';
import {
  runCombat,
  validateItemState,
  planItemDrop,
  scaledProfile,
  withGhostArmy,
} from '@tft/game-core';
import { DEFAULT_OVERTIME, reversePerspective, type CombatInput } from '@tft/shared';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import { fixtureUsers, equip, act } from './multi-fixture';
import { pairRound, type PairingHistory } from './pairings';
import { P12B_CATALOG_HASH, P11K_CATALOG_HASH } from './persistence/snapshot';

function setup(n: 2 | 3 | 4 = 3, historical = false) {
  const m = new AuthoritativeMatch(
    'p12b',
    { now: () => 0 },
    () => 360,
    n,
    historical ? P11K_ECONOMY_CONFIG : P12B_ECONOMY_CONFIG,
  );
  for (let i = 0; i < n; i++)
    m.join(`socket-${i}`, { userId: fixtureUsers[i]!, name: `Player ${i}` });
  m.start('socket-0');
  return m;
}
function advance(m: AuthoritativeMatch) {
  m.clock.restore({ ...m.clock.snapshot(), remainingMs: 0 });
  m.pulse();
}
function through(m: AuthoritativeMatch, round: number) {
  for (let i = 0; i < 80; i++) {
    if (
      Number(m.clock.snapshot().roundId.split('/').at(-1)) === round &&
      m.clock.snapshot().currentPhase === 'resolution'
    )
      return;
    advance(m);
  }
  throw Error('Round not reached');
}
it.each([2, 3, 4] as const)(
  '%i real players: rounds 3/6/9/12/15 atomically accumulate one remover, restore and retries never backfill',
  (n) => {
    let m = setup(n);
    // Fill the component bag; overflow must still use existing pending storage.
    for (const p of m.players) m.grantItems(p.id, 'fill', Array(16).fill('component-ad'));
    for (const round of [3, 6, 9, 12, 15]) {
      through(m, round);
      expect(m.exportState().itemDrops!.rounds).toHaveLength(round / 3);
      for (const p of m.players) {
        expect(p.state.items!.removers!.issued).toHaveLength(1 + round / 3);
        expect(p.state.items!.pending.length).toBeGreaterThan(0);
        validateItemState(p.state);
      }
      const record = m.exportState().itemDrops!.rounds.at(-1)!,
        legacy = planItemDrop(
          m.id,
          round,
          m.exportState().itemDrops!.seed,
          m.players.map((p) => p.id),
        );
      expect(record.version).toBe('f0p12b-1');
      expect(record.quantity).toBe(legacy.quantity);
      expect(record.players.map((r) => [r.seed, r.definitionIds])).toEqual(
        legacy.players.map((r) => [r.seed, r.definitionIds]),
      );
      expect(record.players).toHaveLength(n); // no clone grants
      const saved = m.exportState();
      expect(saved.catalog).toBe(P12B_CATALOG_HASH);
      for (let i = 0; i < 3; i++) m.pulse();
      expect(m.exportState()).toEqual(saved);
      m = AuthoritativeMatch.restore(saved, { now: () => 0 });
      expect(m.players.map((p) => p.state.items)).toEqual(saved.players.map((p) => p.state.items));
      m.assertConservation();
    }
  },
);
it('P11K remains initial-only, has no new ghost metadata and retains its fingerprint', () => {
  const m = setup(3, true);
  equip(m);
  through(m, 3);
  expect(m.exportState().catalog).toBe(P11K_CATALOG_HASH);
  expect(m.duels.every((d) => !d.replay.input.ghost)).toBe(true);
  expect(m.players.every((p) => p.state.items!.removers!.issued.length === 1)).toBe(true);
  expect(m.exportState().itemDrops!.rounds[0]!.version).toBe('f0p8d-1');
  expect(() => AuthoritativeMatch.restore(m.exportState())).not.toThrow();
});
it('clones freeze profiles, independent IDs and provenance; source duel and economics stay isolated', () => {
  const m = setup();
  equip(m, undefined, ['dolea', 'vargas'], 2);
  for (const p of m.players) {
    m.grantItems(p.id, 'equipment', ['component-ad']);
    expect(
      act(m, m.players.indexOf(p), {
        type: 'equip_item',
        unitId: p.state.units[0]!.id,
        itemId: p.state.items!.components[0]!.id,
      }).accepted,
    ).toBe(true);
  }
  const armies = structuredClone(m.players.map((p) => p.state.units));
  advance(m);
  const d = m.duels.find((d) => d.pairing.kind === 'ghost')!,
    g = d.replay.input.ghost!,
    owner = m.players.find((p) => p.id === g.sourcePlayerId)!;
  expect(g.damageMultiplierMilli).toBe(800);
  expect(g.units).toHaveLength(2);
  expect(g.units.every((u) => u.unitId !== u.sourceUnitId && u.unitId.length <= 80)).toBe(true);
  expect(m.players.map((p) => p.state.units)).toEqual(armies);
  expect(d.replay.input.units.filter((u) => u.owner === 'north').map((u) => u.profile)).toEqual(
    m
      .duelFor(owner.sessionId)!
      .replay.input.units.filter((u) => g.units.some((x) => x.sourceUnitId === u.id))
      .map((u) => u.profile),
  );
  const original = structuredClone(m.duelFor(owner.sessionId)!.replay);
  const copy = structuredClone(d.replay.input);
  copy.units.find((u) => u.owner === 'north')!.profile.stats.attack = 1;
  runCombat(copy);
  expect(m.duelFor(owner.sessionId)!.replay).toEqual(original);
  for (const duel of m.duels) {
    expect(runCombat(duel.replay.input)).toEqual(duel.replay);
    expect(reversePerspective(reversePerspective(duel.replay))).toEqual(duel.replay);
  }
  const before = m.exportState();
  const recovered = AuthoritativeMatch.restore(before, { now: () => 0 });
  expect(recovered.duels).toEqual(m.duels);
  expect(
    act(
      m,
      m.players.findIndex((p) => p.id === g.realPlayerId),
      { type: 'sell_unit', unitId: g.units[0]!.unitId },
    ).accepted,
  ).toBe(false);
  expect(() =>
    AuthoritativeMatch.restore({
      ...before,
      duels: before.duels.map((x) =>
        x.pairing.kind === 'ghost'
          ? { ...x, replay: { ...x.replay, input: { ...x.replay.input, ghost: undefined } } }
          : x,
      ),
    }),
  ).toThrow('ghost policy');
  advance(m);
  expect(m.settlements.size).toBe(3);
  const settlement = m.settlements.get(`${m.settlementId}/${owner.id}`)!;
  expect(settlement.combatId).toBe(original.input.combatId);
  expect(
    m.players.every((p) => p.state.healthLedger.filter((h) => h.side === 'south').length === 1),
  ).toBe(true);
});
it('real ghost victory earns JARAMILLO progress once; owner only earns its own human win', () => {
  const m = setup();
  const plan = pairRound(fixtureUsers.slice(0, 3), 1, [], 360, m.id, {
    recentWindow: 6,
    version: 'f0p12b-1',
  });
  const g = plan.pairings.find((p) => p.kind === 'ghost')!;
  const owner = m.players.findIndex((p) => p.id === g.ghostOwnerId),
    facing = m.players.findIndex((p) => p.id === g.ghostFacingId);
  equip(m, [owner], ['jaramillo']);
  equip(m, [facing], ['jaramillo'], 2);
  advance(m);
  const source = m.duelFor(m.players[owner]!.sessionId)!;
  const ghost = m.duels.find((d) => d.pairing.kind === 'ghost')!;
  expect(source.replay.result.winner).toBe(
    source.pairing.southPlayerId === g.ghostOwnerId ? 'south' : 'north',
  );
  expect(ghost.replay.result.winner).toBe('south');
  advance(m);
  expect(m.players[owner]!.state.units[0]!.progress!.stacks[0]!.count).toBe(1);
  expect(m.players[facing]!.state.units[0]!.progress!.stacks[0]!.count).toBe(1);
  const saved = m.exportState();
  expect(() => AuthoritativeMatch.restore(saved)).not.toThrow();
});
it.each([2, 3, 4, 5, 7])(
  '%i players: deterministic complete assignments, rotation and no own ghost',
  (n) => {
    const ids = Array.from({ length: n }, (_, i) => `participant-${i}`),
      history: PairingHistory[] = [];
    for (let round = 1; round <= n * 3; round++) {
      const plan = pairRound(ids, round, history, 42, 'lab', {
        recentWindow: 6,
        version: 'f0p12b-1',
      });
      expect(
        pairRound([...ids].reverse(), round, history, 42, 'lab', {
          recentWindow: 6,
          version: 'f0p12b-1',
        }),
      ).toEqual(plan);
      const assigned = plan.pairings.flatMap((p) =>
        p.kind === 'human' ? [p.southPlayerId, p.northPlayerId] : [p.southPlayerId],
      );
      expect(assigned.sort()).toEqual([...ids].sort());
      expect(plan.pairings.filter((p) => p.kind === 'ghost')).toHaveLength(n % 2);
      expect(plan.pairings.every((p) => p.northPlayerId !== p.southPlayerId)).toBe(true);
      if (round === 1)
        for (const pairing of plan.pairings) {
          let input: CombatInput = {
            protocolVersion: 3 as const,
            rulesVersion: 'f0p11h-1' as const,
            combatId: pairing.combatId,
            seed: 42,
            maxTicks: 50,
            overtime: DEFAULT_OVERTIME,
            obstacles: [],
            traits: [],
            units: [pairing.southPlayerId, pairing.northPlayerId].map((id, i) => {
              const profile = scaledProfile('dolea', 1, P12B_ECONOMY_CONFIG);
              profile.traits = [];
              return {
                id: `${id}-army`,
                definitionId: 'dolea',
                owner: i === 0 ? ('south' as const) : ('north' as const),
                position: { q: 0, r: i === 0 ? 4 : 3 },
                profile,
              };
            }),
          };
          if (pairing.kind === 'ghost')
            input = withGhostArmy(input, pairing.ghostOwnerId, pairing.ghostFacingId);
          const replay = runCombat(input);
          expect(runCombat(replay.input)).toEqual(replay);
        }
      history.push({ round, pairings: plan.pairings });
    }
    if (n % 2)
      for (const id of ids)
        expect(
          history.flatMap((h) => h.pairings).filter((p) => p.ghostFacingId === id),
        ).toHaveLength(3);
  },
);
function nearElimination(p: AuthoritativeMatch['players'][number]) {
  const h = p.state.healthLedger.filter((e) => e.side === 'south').at(-1)!;
  h.base = h.hpBefore - 1;
  h.survivors = 0;
  h.requested = h.base;
  h.applied = h.base;
  h.hpAfter = 1;
  p.state.health.south = 1;
}
it('4→3→2→1, ghost elimination and final periodic reward never wait on nonexistent duels', () => {
  const m = setup(4);
  through(m, 1);
  nearElimination(m.players[0]!);
  through(m, 2);
  expect(m.players.filter((p) => !p.eliminated)).toHaveLength(3);
  advance(m); // preparation 3
  const saved = m.exportState(),
    active = m.players.filter((p) => !p.eliminated);
  const plan = pairRound(
    active.map((p) => p.id),
    3,
    saved.pairingHistory,
    saved.pairingSeed!,
    m.id,
    { recentWindow: 6, version: 'f0p12b-1' },
  );
  const facing = m.players.find(
    (p) => p.id === plan.pairings.find((d) => d.kind === 'ghost')!.ghostFacingId,
  )!;
  nearElimination(facing);
  through(m, 3);
  expect(facing.eliminated).toBe(true);
  expect(facing.state.items!.distributions).toHaveLength(0);
  expect(m.players.filter((p) => !p.eliminated)).toHaveLength(2);
  expect(m.exportState().itemDrops!.rounds[0]!.players).toHaveLength(2);
  expect(() => AuthoritativeMatch.restore(m.exportState())).not.toThrow();
  const survivor = m.players.find((p) => !p.eliminated)!;
  nearElimination(survivor);
  for (let i = 0; i < 5 && !m.finalResults; i++) advance(m);
  expect(m.finalResults).not.toBeNull();
  expect(m.players.filter((p) => !p.eliminated)).toHaveLength(1);
  const count = m.settlements.size;
  advance(m);
  expect(m.settlements.size).toBe(count);
  expect(() => AuthoritativeMatch.restore(m.exportState())).not.toThrow();
});
it('final round 3 winner receives the same confirmed periodic event; simultaneous wipeout receives none', () => {
  const m = setup(2);
  through(m, 2);
  advance(m);
  nearElimination(m.players[0]!);
  advance(m);
  advance(m);
  expect(m.finalResults?.round).toBe(3);
  const winner = m.players.find((p) => !p.eliminated)!;
  expect(winner.state.items!.removers!.issued).toHaveLength(2);
  expect(m.exportState().itemDrops!.rounds[0]!.players.map((p) => p.playerId)).toEqual([winner.id]);
  expect(() => AuthoritativeMatch.restore(m.exportState())).not.toThrow();
  const wipe = setup(3);
  through(wipe, 2);
  advance(wipe);
  wipe.players.forEach(nearElimination);
  advance(wipe);
  advance(wipe);
  expect(wipe.finalResults?.sharedFirst).toBe(true);
  expect(wipe.exportState().itemDrops!.rounds).toHaveLength(0);
  expect(wipe.players.every((p) => p.state.items!.removers!.issued.length === 1)).toBe(true);
  expect(() => AuthoritativeMatch.restore(wipe.exportState())).not.toThrow();
});
it('earned source progression is frozen into a later clone without sharing a mutable stack ledger', () => {
  const m = setup();
  equip(m, undefined, ['jaramillo']);
  let observed = false;
  for (let round = 1; round <= 4; round++) {
    if (round > 1) advance(m);
    advance(m);
    const d = m.duels.find((d) => d.pairing.kind === 'ghost')!,
      g = d.replay.input.ghost!;
    const p = m.players.find((p) => p.id === g.sourcePlayerId)!,
      u = p.state.units[0]!;
    if (u.progress?.stacks[0]?.count) {
      const count = u.progress.stacks[0].count;
      const definition = d.replay.input.units.find((x) => x.owner === 'north')!.profile
        .championAbility!.passive!.matchProgress!;
      const base = m.config; // source stat includes exactly its already-earned permanent count
      const plain = scaledProfile(u.definitionId, u.stars, base);
      expect(d.replay.input.units.find((x) => x.owner === 'north')!.profile.stats.attack).toBe(
        Math.floor((plain.stats.attack * (1000 + count * definition.adPercentMilli)) / 1000),
      );
      observed = true;
    }
    expect(runCombat(d.replay.input)).toEqual(d.replay);
    advance(m);
  }
  expect(observed).toBe(true);
});
