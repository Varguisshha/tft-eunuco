import { describe, expect, it } from 'vitest';
import { runCombat, calculateRoundDamage } from '@tft/game-core';
import {
  RoundSnapshotSchema,
  reversePerspective,
  DuelRecordSchema,
  PAIRING_VERSION,
} from '@tft/shared';
import { multiFixture, act, intent, equip, fixtureUsers } from './multi-fixture';
import { pairRound } from './pairings';

describe('parallel authoritative rounds', () => {
  it.each([2, 3, 4] as const)(
    '%i players retain one pool, distinct shops and private economy',
    async (n) => {
      const { match } = multiFixture(n);
      expect(
        new Set(match.players.flatMap((p) => p.state.shop.filter(Boolean).map((o) => o!.id))).size,
      ).toBe(n * 5);
      const commands = match.players.map((p, i) =>
        intent(match, i, { type: 'buy_unit', offerId: p.state.shop[0]!.id }),
      );
      const receipts = await Promise.all(
        commands.map((c) => Promise.resolve().then(() => match.submit(c.sessionId, c))),
      );
      expect(receipts.every((r) => r.accepted)).toBe(true);
      match.assertConservation();
      const otherGold = match.players.slice(1).map((p) => p.state.gold);
      expect(act(match, 0, { type: 'buy_xp' }).accepted).toBe(true);
      expect(match.players.slice(1).map((p) => p.state.gold)).toEqual(otherGold);
    },
  );
  it('four shops never reserve exhausted stock and a third-star sale returns nine copies', () => {
    const { match } = multiFixture(4);
    for (const p of match.players) {
      for (const offer of p.state.shop) if (offer) match.pool[offer.definitionId]!++;
      p.state.shop = Array(5).fill(null);
    }
    const p = match.players[0]!;
    p.state.units = [3, 3, 2, 1].map((stars, i) => ({
      id: `${p.id}-stock-${i}`,
      definitionId: 'dolea',
      stars: stars as 1 | 2 | 3,
      location: { kind: 'bench', slot: i },
    }));
    match.pool.dolea = 0;
    for (const player of match.players) player.state.pool = { ...match.pool };
    match.assertConservation();
    for (const i of [0, 1, 2, 3]) {
      expect(act(match, i, { type: 'reroll_shop' }).accepted).toBe(true);
      expect(match.players[i]!.state.shop.some((o) => o?.definitionId === 'dolea')).toBe(false);
    }
    expect(act(match, 0, { type: 'sell_unit', unitId: p.state.units[0]!.id }).accepted).toBe(true);
    expect(match.pool.dolea).toBe(9);
    match.assertConservation();
  });
  it('replays a complete seeded multi-round match reproducibly', () => {
    const run = () => {
      const { match, advance } = multiFixture(4, 120);
      equip(match);
      const evidence = [];
      for (let i = 0; i < 3; i++) {
        advance(30000);
        evidence.push(structuredClone(match.duels));
        advance(match.clock.snapshot().remainingMs);
        advance(5000);
      }
      return {
        evidence,
        states: match.players.map((p) => p.state),
        settlements: [...match.settlements],
      };
    };
    expect(run()).toEqual(run());
  });
  it('stops diagnostics at first zero HP without inventing competitive eliminations', () => {
    const { match, advance } = multiFixture(3);
    for (let i = 0; i < 100 && match.clock.snapshot().currentPhase !== 'finished'; i++)
      advance(match.clock.snapshot().remainingMs);
    expect(match.clock.snapshot().currentPhase).toBe('finished');
    expect(match.players.some((p) => p.state.health.south === 0)).toBe(true);
    expect(match.roundSnapshot('socket-0').players.every((p) => p.eliminated === false)).toBe(true);
    const count = match.settlements.size;
    advance(100000);
    expect(match.settlements.size).toBe(count);
  });
  it('four-player fusion, sale and reroll preserve all inventories and reservations', () => {
    const { match } = multiFixture(4);
    const p = match.players[0]!;
    for (const o of p.state.shop.filter((o) => o?.definitionId === 'dolea'))
      expect(act(match, 0, { type: 'buy_unit', offerId: o!.id }).accepted).toBe(true);
    expect(p.state.units[0]!.stars).toBe(2);
    const before = match.pool.dolea!;
    expect(act(match, 0, { type: 'sell_unit', unitId: p.state.units[0]!.id }).accepted).toBe(true);
    expect(match.pool.dolea).toBe(before + 3);
    for (const i of [0, 1, 2, 3])
      expect(act(match, i, { type: 'reroll_shop' }).accepted).toBe(true);
    match.assertConservation();
  });
  it('four players get two independent replays and one atomic settlement each', () => {
    const { match, advance } = multiFixture(4);
    equip(match);
    advance(30000);
    expect(match.duels).toHaveLength(2);
    expect(match.simulations).toBe(2);
    expect(match.replay).toBeNull();
    expect(new Set(match.duels.map((d) => d.replay.input.seed)).size).toBe(2);
    const pool = structuredClone(match.pool);
    for (const d of match.duels) {
      expect(d.replay).toEqual(runCombat(d.replay.input));
      expect(reversePerspective(reversePerspective(d.replay))).toEqual(d.replay);
      expect(
        DuelRecordSchema.safeParse({
          version: PAIRING_VERSION,
          pairing: d.pairing,
          rulesVersion: d.replay.input.rulesVersion,
          seed: d.replay.input.seed,
          result: d.replay.result,
          finalTick: d.replay.result.tick,
          settlement: d.settlement,
        }).success,
      ).toBe(true);
    }
    advance(match.clock.snapshot().remainingMs);
    expect(match.settlements.size).toBe(4);
    expect(match.players.every((p) => p.state.lastReward?.round === 1)).toBe(true);
    expect(match.pool).toEqual(pool);
    const states = structuredClone(match.players.map((p) => p.state));
    for (let i = 0; i < 10; i++) match.pulse();
    expect(match.players.map((p) => p.state)).toEqual(states);
    expect(match.settlements.size).toBe(4);
    advance(5000);
    expect(match.players.every((p) => p.state.round === 2)).toBe(true);
    expect(match.clock.snapshot().phaseDuration).toBe(30000);
    match.assertConservation();
  });
  it('short duel waits, cannot buy and receives no early reward', () => {
    const { match, advance } = multiFixture(4);
    const plan = pairRound(fixtureUsers, 1, [], 360, match.id);
    const long = plan.pairings[1]!;
    equip(match, [
      fixtureUsers.indexOf(long.southPlayerId),
      fixtureUsers.indexOf(long.northPlayerId),
    ]);
    advance(30000);
    expect(match.duels[0]!.replay.result.tick).toBe(0);
    expect(match.duels[1]!.replay.result.tick).toBeGreaterThan(0);
    advance(600);
    expect(match.clock.snapshot().currentPhase).toBe('combat');
    expect(match.settlements.size).toBe(0);
    const shortId = match.duels[0]!.pairing.southPlayerId;
    const idx = fixtureUsers.indexOf(shortId);
    const view = match.roundSnapshot(`socket-${idx}`);
    expect(view.players.find((p) => p.id === shortId)!.status).toBe('awaiting_round');
    expect(view.results).toEqual([]);
    expect(act(match, idx, { type: 'buy_xp' }).reason).toBe('wrong-phase');
    advance(match.clock.snapshot().remainingMs);
    expect(match.settlements.size).toBe(4);
    expect(match.clock.snapshot().phaseDuration).toBe(5000);
  });
  it('disconnected players stay paired, clock advances and no replacement joins', () => {
    const { match, advance } = multiFixture(4);
    match.disconnect('socket-3');
    expect(act(match, 3, { type: 'buy_xp' }).reason).toBe('identity');
    expect(() => match.join('new')).toThrow();
    advance(30000);
    advance(600);
    advance(5000);
    expect(match.players[3]!.state.round).toBe(2);
    expect(match.settlements.size).toBe(4);
    expect(match.roundSnapshot('socket-0').players[3]!.connected).toBe(false);
  });
  it('bounds simultaneous Overtime at 450 ticks plus exactly 600ms tail', () => {
    const { match, advance } = multiFixture(4);
    equip(match, undefined, ['test-k01']);
    advance(30000);
    expect(
      match.duels.every(
        (d) =>
          d.replay.result.tick === 450 && d.replay.events.some((e) => e.type === 'overtime_start'),
      ),
    ).toBe(true);
    expect(match.clock.snapshot().phaseDuration).toBe(45600);
    advance(45599);
    expect(match.settlements.size).toBe(0);
    advance(1);
    expect(match.settlements.size).toBe(4);
    expect(match.players.every((p) => p.state.lastReward!.outcome === 'double_loss')).toBe(true);
  });
  it('public standings are provisional with ties and no elimination invented', () => {
    const { match } = multiFixture(4);
    const view = RoundSnapshotSchema.parse(match.roundSnapshot('socket-0'));
    expect(view.players.every((p) => p.provisionalPosition === 1 && p.eliminated === false)).toBe(
      true,
    );
    expect(view.players.every((p) => p.avatarId === 'jade')).toBe(true);
    expect(view.own).not.toHaveProperty('health');
    expect(view.own).not.toHaveProperty('shopRng');
    expect(view.own).not.toHaveProperty('pool');
    expect(view.own).not.toHaveProperty('history');
    for (const other of match.players.slice(1)) {
      expect(JSON.stringify(view)).not.toContain(other.state.shop[0]!.id);
      const publicPlayer = view.players.find((p) => p.id === other.id)!;
      for (const field of ['shop', 'gold', 'units', 'xp', 'streak', 'ledger'])
        expect(publicPlayer).not.toHaveProperty(field);
    }
  });
  it('rejects spoofed identities, foreign units, duplicated commands and DEV', () => {
    const { match } = multiFixture(4);
    const c = intent(match, 0, { type: 'buy_xp' });
    expect(match.submit('socket-1', c).reason).toBe('identity');
    const receipt = match.submit('socket-0', c);
    expect(match.submit('socket-0', c)).toEqual(receipt);
    expect(match.players[0]!.state.gold).toBe(6);
    expect(
      act(match, 0, { type: 'buy_unit', offerId: match.players[3]!.state.shop[0]!.id }).accepted,
    ).toBe(false);
    expect(match.submit('socket-0', { ...c, type: 'dev_add_gold' }).accepted).toBe(false);
    expect(() => match.duelFor('outsider')).toThrow();
    expect(() => match.roundSnapshot('outsider')).toThrow();
  });
});

describe('ghost formation isolation', () => {
  it('copies stars, abilities and traits with no inventory, economy or extra pool', () => {
    const { match, advance } = multiFixture(3);
    equip(match, [0, 1, 2], ['dolea', 'vargas'], 2);
    const originals = structuredClone(match.players.map((p) => p.state.units));
    const pool = structuredClone(match.pool);
    advance(30000);
    expect(match.players).toHaveLength(3);
    expect(match.players.map((p) => p.state.units)).toEqual(originals);
    expect(match.pool).toEqual(pool);
    const ghost = match.duels.find((d) => d.pairing.kind === 'ghost')!;
    const owner = match.players.find((p) => p.id === ghost.pairing.ghostOwnerId)!;
    const ownDuel = match.duelFor(owner.sessionId)!;
    expect(ownDuel.pairing.kind).toBe('human');
    const source = ownDuel.replay.input.units.filter((u) => u.id.startsWith(owner.id));
    const copy = ghost.replay.input.units.filter((u) => u.owner === 'north');
    expect(copy.map((u) => u.profile)).toEqual(source.map((u) => u.profile));
    expect(copy.every((u) => u.profile.starLevel === 2)).toBe(true);
    expect(ghost.replay.events.some((e) => e.type === 'trait_activate')).toBe(true);
    expect(ghost.replay.events.some((e) => e.type === 'passive_trigger')).toBe(true);
    const ownerTrace = structuredClone(ownDuel.replay);
    ghost.replay.snapshots[0]!.units[0]!.hp = 1;
    expect(ownDuel.replay).toEqual(ownerTrace);
    ghost.replay = runCombat(ghost.replay.input);
    advance(match.clock.snapshot().remainingMs);
    expect(match.settlements.size).toBe(3);
    expect(match.players.every((p) => p.state.healthLedger.length === 2)).toBe(true);
    expect(match.settlements.get(`${match.settlementId}/${owner.id}`)!.combatId).toBe(
      ownDuel.pairing.combatId,
    );
    match.assertConservation();
  });
  it.each(['win', 'loss', 'double_loss'] as const)(
    'settles ghost opponent %s through unchanged economic and damage rules',
    (expected) => {
      const { match, advance } = multiFixture(3);
      const plan = pairRound(fixtureUsers.slice(0, 3), 1, [], 360, match.id);
      const ghostPair = plan.pairings.find((p) => p.kind === 'ghost')!;
      if (expected !== 'double_loss')
        equip(match, [
          fixtureUsers.indexOf(
            expected === 'win' ? ghostPair.southPlayerId : ghostPair.northPlayerId,
          ),
        ]);
      advance(30000);
      const ghost = match.duels.find((d) => d.pairing.kind === 'ghost')!;
      const player = match.players.find((p) => p.id === ghostPair.southPlayerId)!;
      const damage = calculateRoundDamage(
        1,
        ghost.replay.result,
        ghost.replay.snapshots
          .at(-1)!
          .units.filter((u) => u.hp > 0)
          .map((u) => ({ side: u.owner, stars: u.profile.starLevel ?? 1 })),
        player.state.config.roundDamage,
      );
      advance(match.clock.snapshot().remainingMs);
      expect(player.state.lastReward!.outcome).toBe(expected);
      expect(player.state.health.south).toBe(100 - damage.south.requested);
      expect(player.state.lastReward!.victory).toBe(
        expected === 'win' ? player.state.config.victoryGold : 0,
      );
      expect(match.settlements.size).toBe(3);
      expect(match.roundSnapshot(player.sessionId).own.healthLedger).toHaveLength(1);
    },
  );
  it('rotates across full authoritative rounds and keeps all economic ledgers valid', () => {
    const { match, advance } = multiFixture(3);
    for (let i = 0; i < 6; i++) {
      advance(30000);
      advance(600);
      expect(match.settlements.size).toBe((i + 1) * 3);
      advance(5000);
      match.assertConservation();
    }
    expect(match.players.every((p) => p.opponents.length === 6)).toBe(true);
    for (const p of match.players) expect(p.opponents.filter((o) => o.ghost)).toHaveLength(2);
  });
});
