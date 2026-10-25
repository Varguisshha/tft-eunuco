import { describe, it, expect } from 'vitest';
import { COMPETITIVE_VERSION, CompetitiveSnapshotSchema } from '@tft/shared';
import { eliminationPlaces } from './competition';
import { multiFixture, equip, act } from './multi-fixture';
function hp(match: ReturnType<typeof multiFixture>['match'], values: number[]) {
  match.players.forEach((p, i) => {
    p.state.config = structuredClone(p.state.config);
    p.state.config.roundDamage.initialHp = values[i]!;
    p.state.health = { north: values[i]!, south: values[i]! };
  });
}
function spectate(
  match: ReturnType<typeof multiFixture>['match'],
  i: number,
  duelId: string | null,
  sequence = 0,
) {
  return match.spectate(`socket-${i}`, {
    version: COMPETITIVE_VERSION,
    matchId: match.id,
    phaseId: match.clock.snapshot().phaseId,
    sequence,
    duelId,
  });
}
describe('competitive closure', () => {
  it('keeps an already-zero eliminated participant at zero without a second settlement', () => {
    const { match, advance } = multiFixture(3);
    hp(match, [1, 100, 100]);
    advance(30000);
    expect(match.players[0]!.eliminated).toBe(false);
    advance(match.clock.snapshot().remainingMs);
    expect(match.players[0]).toMatchObject({
      eliminated: true,
      eliminatedRound: 1,
      finalPosition: 3,
    });
    expect(match.players[0]!.state.health.south).toBe(0);
    const ledger = JSON.stringify(match.players[0]!.state.healthLedger);
    advance(5000);
    advance(30000);
    advance(match.clock.snapshot().remainingMs);
    expect(JSON.stringify(match.players[0]!.state.healthLedger)).toBe(ledger);
    expect(match.players[0]!.eliminated).toBe(true);
  });
  it.each([2, 3, 4] as const)(
    '%i empty teams share first without a random winner; final is immutable',
    (capacity) => {
      const { match, advance } = multiFixture(capacity);
      hp(match, Array(capacity).fill(1));
      advance(30000);
      expect(match.players.every((p) => !p.eliminated)).toBe(true);
      advance(match.clock.snapshot().remainingMs);
      expect(
        match.players.every(
          (p) => p.eliminated && p.state.health.south === 0 && p.finalPosition === 1,
        ),
      ).toBe(true);
      expect(match.finalResults?.winnerIds).toHaveLength(capacity);
      expect(match.finalResults?.sharedFirst).toBe(true);
      const end = JSON.stringify(match.finalResults),
        count = match.settlements.size,
        pool = { ...match.pool };
      for (let i = 0; i < 3; i++) advance(100000);
      expect(JSON.stringify(match.finalResults)).toBe(end);
      expect(match.settlements.size).toBe(count);
      expect(match.pool).toEqual(pool);
      expect(match.clock.snapshot()).toMatchObject({
        currentPhase: 'finished',
        clockState: 'stopped',
        remainingMs: 0,
      });
      expect(act(match, 0, { type: 'reroll_shop' }).accepted).toBe(false);
      const copy = match.finalResults!;
      copy.standings[0]!.hp = 999;
      expect(match.finalResults!.standings[0]!.hp).toBe(0);
    },
  );
  it('ranks simultaneous eliminations by prior HP and effective damage, with competition ties', () => {
    expect([
      ...eliminationPlaces(
        [
          { id: 'a', hpBefore: 10, damage: 10 },
          { id: 'b', hpBefore: 5, damage: 5 },
          { id: 'c', hpBefore: 5, damage: 5 },
        ],
        1,
      ).values(),
    ]).toEqual([2, 3, 3]);
    expect([
      ...eliminationPlaces(
        [
          { id: 'a', hpBefore: 10, damage: 9 },
          { id: 'b', hpBefore: 10, damage: 8 },
        ],
        0,
      ).values(),
    ]).toEqual([2, 1]);
    const tied = [
      { id: 'z', hpBefore: 1, damage: 1 },
      { id: 'a', hpBefore: 1, damage: 1 },
    ];
    expect([...eliminationPlaces(tied, 2).values()]).toEqual([3, 3]);
    expect([...eliminationPlaces(tied.reverse(), 2).values()]).toEqual([3, 3]);
  });
  it('continues 4→3→2→winner, excludes eliminated ghosts, freezes economy and releases copies once', () => {
    const { match, advance } = multiFixture(4);
    hp(match, [1, 9, 30, 100]);
    equip(match, [1, 2], ['dolea']);
    equip(match, [3], ['vargas'], 3);
    const counts = new Set<number>();
    let sawGhost = false;
    let frozen: string | undefined;
    for (let n = 0; n < 200 && !match.finalResults; n++) {
      advance(match.clock.snapshot().remainingMs);
      const alive = match.players.filter((p) => !p.eliminated);
      counts.add(alive.length);
      if (match.clock.snapshot().currentPhase === 'combat') {
        for (const d of match.duels)
          expect(alive.map((p) => p.id)).toEqual(
            expect.arrayContaining([d.pairing.southPlayerId, d.pairing.northPlayerId]),
          );
        if (alive.length === 3) sawGhost ||= match.duels.some((d) => d.pairing.kind === 'ghost');
      }
      if (match.players[0]!.eliminated) {
        const p = match.players[0]!;
        const economy = JSON.stringify({
          gold: p.state.gold,
          xp: p.state.totalXp,
          units: p.state.units,
          shop: p.state.shop,
          round: p.state.round,
          ledger: p.state.ledger,
        });
        frozen ??= economy;
        expect(economy).toBe(frozen);
        expect(p.poolReleased).toBe(true);
        expect(p.state.shop.every((o) => o === null)).toBe(true);
        expect(act(match, 0, { type: 'reroll_shop' }).accepted).toBe(false);
      }
      match.assertConservation();
    }
    expect([...counts]).toEqual(expect.arrayContaining([3, 2, 1]));
    expect(sawGhost).toBe(true);
    expect(match.finalResults?.winnerIds).toEqual([match.players[3]!.id]);
    expect(match.finalResults?.standings.map((p) => p.finalPosition)).toEqual([1, 2, 3, 4]);
  });
  it('returns fused units, bench and offers atomically without paying sales', () => {
    const { match, advance } = multiFixture(3);
    hp(match, [1, 100, 100]);
    equip(match, [0], ['dolea'], 3);
    match.players[0]!.state.units[0]!.location = { kind: 'bench', slot: 0 };
    equip(match, [1, 2], ['vargas']);
    const before = { ...match.pool };
    const offers = match.players[0]!.state.shop.filter((o) => o !== null);
    advance(30000);
    advance(match.clock.snapshot().remainingMs);
    expect(match.players[0]!.eliminated).toBe(true);
    for (const key of Object.keys(before))
      expect(match.pool[key]).toBe(
        before[key]! +
          (key === 'dolea' ? 9 : 0) +
          offers.filter((o) => o.definitionId === key).length,
      );
    expect(match.players[0]!.state.ledger.some((e) => e.reason === 'sell')).toBe(false);
    match.assertConservation();
  });
  it('releases only clock-reached spectator data; rejects living, stale and foreign requests', () => {
    const { match, advance } = multiFixture(4);
    hp(match, [1, 100, 100, 100]);
    equip(match, [1, 2, 3]);
    expect(spectate(match, 1, null)).toBe(false);
    advance(30000);
    advance(match.clock.snapshot().remainingMs);
    expect(match.players[0]!.eliminated).toBe(true);
    expect(spectate(match, 0, null)).toBe(true);
    expect(match.spectatorFrame('socket-0')).toBeNull();
    advance(5000);
    advance(30000);
    const d = match.duels[0]!;
    expect(spectate(match, 0, 'foreign', 1)).toBe(false);
    expect(spectate(match, 0, d.pairing.combatId, 1)).toBe(true);
    expect(spectate(match, 0, d.pairing.combatId, 1)).toBe(false);
    let f = match.spectatorFrame('socket-0')!;
    expect(f.state.tick).toBe(0);
    expect(f.state.result).toBeNull();
    expect(f.state).not.toHaveProperty('rngState');
    expect(JSON.stringify(f)).not.toContain('combat_start');
    expect(f).not.toHaveProperty('replay');
    expect(f).not.toHaveProperty('pool');
    advance(500);
    f = match.spectatorFrame('socket-0')!;
    expect(f.state.tick).toBe(5);
    expect(f.events.every((e) => e.tick <= 5)).toBe(true);
    expect(spectate(match, 0, match.duels[1]!.pairing.combatId, 2)).toBe(true);
    expect(match.spectatorFrame('socket-0')!.combatId).not.toBe(d.pairing.combatId);
    const view = CompetitiveSnapshotSchema.parse(match.competitiveSnapshot('socket-0'));
    expect(view.players.every((p) => p.formation.every((u) => u.location.kind === 'board'))).toBe(
      true,
    );
    expect(view.own.units).toEqual([]);
    expect(view.own.shop.every((o) => o === null)).toBe(true);
    match.disconnect('socket-0');
    expect(match.spectatorFrame('socket-0')).toBeNull();
    expect(spectate(match, 0, null, 3)).toBe(false);
  });
});
