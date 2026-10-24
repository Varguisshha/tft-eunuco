import { describe, it, expect } from 'vitest';
import {
  NETWORK_VERSION,
  NetworkSnapshotSchema,
  reversePerspective,
  type MatchCommand,
} from '@tft/shared';
import { commandFor, runCombat } from '@tft/game-core';
import { AuthoritativeMatch } from './AuthoritativeMatch';
function fixture(seed = 360) {
  let now = 0;
  const m = new AuthoritativeMatch('test', { now: () => now }, () => seed);
  m.join('a');
  m.join('b');
  m.start('a');
  return {
    m,
    advance: (n: number) => {
      now += n;
      m.pulse();
    },
  };
}
function envelope(m: AuthoritativeMatch, i: number, command: MatchCommand) {
  const p = m.players[i]!;
  return {
    version: NETWORK_VERSION,
    sessionId: p.sessionId,
    requestId: `r-${i}-${p.sequence}`,
    sequence: p.sequence,
    matchId: m.id,
    phaseId: m.clock.snapshot().phaseId,
    action: commandFor(p.state, command),
  };
}
function send(m: AuthoritativeMatch, i: number, command: MatchCommand) {
  const c = envelope(m, i, command);
  return m.submit(c.sessionId, c);
}
describe('authoritative two-player match', () => {
  it('assigns seats, refuses third and requires two connected players to start', () => {
    const m = new AuthoritativeMatch('test');
    m.join('a');
    expect(m.start('a')).toBe(false);
    m.join('b');
    expect(m.players.map((p) => p.name)).toEqual(['Vargas', 'Florin']);
    expect(() => m.join('c')).toThrow();
    expect(m.start('outsider')).toBe(false);
    expect(m.start('b')).toBe(true);
    expect(m.start('a')).toBe(false);
  });
  it('private projections exclude RNG, pool, opponent shop/bench/economy/history', () => {
    const { m } = fixture();
    const s = NetworkSnapshotSchema.parse(m.snapshot('a'));
    expect(Object.keys(s.own)).not.toContain('pool');
    expect(Object.keys(s.own)).not.toContain('shopRng');
    expect(Object.keys(s.own)).not.toContain('history');
    expect(Object.keys(s.players[1]!)).toEqual([
      'id',
      'name',
      'side',
      'connected',
      'hp',
      'level',
      'formation',
    ]);
    expect(m.players[0]!.state.shop).not.toEqual(m.players[1]!.state.shop);
  });
  it('serializes concurrent buys against reserved copies and maintains global conservation', async () => {
    const { m } = fixture();
    const commands = m.players.map((p, i) =>
      envelope(m, i, { type: 'buy_unit', offerId: p.state.shop[0]!.id }),
    );
    const r = await Promise.all(
      commands.map((c) => Promise.resolve().then(() => m.submit(c.sessionId, c))),
    );
    expect(r.every((x) => x.accepted)).toBe(true);
    expect(m.players.map((p) => p.state.units.length)).toEqual([1, 1]);
    m.assertConservation();
    expect(m.players[0]!.state.pool).toEqual(m.players[1]!.state.pool);
  });
  it('keeps XP and gold private and independent', () => {
    const { m } = fixture();
    const b = structuredClone(m.players[1]!.state);
    expect(send(m, 0, { type: 'buy_xp' }).accepted).toBe(true);
    expect(m.players[0]!.state.gold).toBe(6);
    expect(m.players[1]!.state).toEqual(b);
  });
  it('returns sold copies and fuses three reserved DOLEA without minting copies', () => {
    const { m } = fixture();
    const p = m.players[0]!;
    const offers = p.state.shop.filter((o) => o?.definitionId === 'dolea');
    expect(offers.length).toBe(3);
    for (const o of offers)
      expect(send(m, 0, { type: 'buy_unit', offerId: o!.id }).accepted).toBe(true);
    expect(p.state.units[0]!.stars).toBe(2);
    expect(p.state.units.length).toBe(1);
    m.assertConservation();
    const before = m.pool.dolea!;
    expect(send(m, 0, { type: 'sell_unit', unitId: p.state.units[0]!.id }).accepted).toBe(true);
    expect(m.pool.dolea).toBe(before + 3);
    m.assertConservation();
  });
  it('deduplicates requests and rejects conflicting replays/stale sequence', () => {
    const { m } = fixture();
    const c = envelope(m, 0, { type: 'buy_xp' });
    const r = m.submit('a', c);
    expect(r.accepted).toBe(true);
    expect(m.submit('a', c)).toEqual(r);
    expect(m.players[0]!.state.gold).toBe(6);
    expect(m.submit('a', { ...c, action: { ...c.action, type: 'reroll_shop' } }).reason).toBe(
      'request-conflict',
    );
    expect(m.submit('a', { ...c, requestId: 'different' }).reason).toBe('sequence');
  });
  it.each([
    null,
    {},
    { gold: 999 },
    { type: 'dev_add_gold' },
    { type: 'resolve_round' },
    { type: 'state_snapshot', state: {} },
    { sequence: NaN },
  ])('rejects malformed/DEV/state replacement %j', (raw) => {
    const { m } = fixture();
    const before = m.revision;
    expect(m.submit('a', raw).accepted).toBe(false);
    expect(m.revision).toBe(before);
  });
  it('rejects forged identity, foreign offers and units, insufficient gold', () => {
    const { m } = fixture();
    const c = envelope(m, 0, { type: 'buy_xp' });
    expect(m.submit('b', c).reason).toBe('identity');
    expect(send(m, 0, { type: 'buy_unit', offerId: m.players[1]!.state.shop[0]!.id }).reason).toBe(
      'missing-offer',
    );
    send(m, 1, { type: 'buy_unit', offerId: m.players[1]!.state.shop[0]!.id });
    expect(send(m, 0, { type: 'sell_unit', unitId: m.players[1]!.state.units[0]!.id }).reason).toBe(
      'missing-unit',
    );
    send(m, 0, { type: 'buy_xp' });
    send(m, 0, { type: 'buy_xp' });
    expect(send(m, 0, { type: 'buy_xp' }).reason).toBe('insufficient-gold');
  });
  it('checks deadline before action, one simulation and one settlement, progresses without clients', () => {
    let now = 0;
    const m = new AuthoritativeMatch('test', { now: () => now }, () => 42);
    m.join('a');
    m.join('b');
    m.start('a');
    const c = envelope(m, 0, { type: 'buy_xp' });
    now = 30000;
    expect(m.submit('a', c).reason).toBe('wrong-phase');
    expect(m.simulations).toBe(1);
    m.pulse();
    expect(m.simulations).toBe(1);
    m.disconnect('b');
    now = 30600;
    m.pulse();
    const hp = m.players[0]!.state.health.south;
    expect(m.settlementId).toBe('test/round/1/settlement');
    m.pulse();
    expect(m.players[0]!.state.health.south).toBe(hp);
    now = 35600;
    m.pulse();
    expect(m.players[0]!.state.round).toBe(2);
    expect(m.clock.snapshot().phaseDuration).toBe(30000);
  });
  it('uses one canonical replay and settles both perspectives with identical damage', () => {
    const { m, advance } = fixture();
    for (const i of [0, 1]) {
      send(m, i, { type: 'buy_unit', offerId: m.players[i]!.state.shop[0]!.id });
      send(m, i, {
        type: 'move_unit',
        unitId: m.players[i]!.state.units[0]!.id,
        to: { kind: 'board', hex: { q: 0, r: 4 } },
      });
    }
    advance(30000);
    expect(m.replay).toEqual(runCombat(m.replay!.input));
    expect(reversePerspective(reversePerspective(m.replay))).toEqual(m.replay);
    const canonical = m.replay!;
    expect(canonical.input.units.map((u) => u.owner).sort()).toEqual(['north', 'south']);
    for (let i = 1; i < canonical.events.length; i++) {
      const a = canonical.events[i - 1]!,
        b = canonical.events[i]!;
      expect(b.tick > a.tick || (b.tick === a.tick && b.order > a.order)).toBe(true);
    }
    advance(canonical.result.tick * 100 + 600);
    expect(m.players[0]!.state.health.south).toBe(m.players[1]!.state.health.north);
    expect(m.players[0]!.state.health.north).toBe(m.players[1]!.state.health.south);
    expect(m.players.every((p) => p.state.lastReward?.round === 1)).toBe(true);
  });
  it('rejects late intents from the previous phase even after next preparation', () => {
    const { m, advance } = fixture();
    const c = envelope(m, 0, { type: 'buy_xp' });
    advance(30000);
    advance(600);
    advance(5000);
    expect(m.submit('a', c).reason).toBe('wrong-phase');
  });
});

describe('shared pool and real character combat regressions', () => {
  it('exhausts a finite pool without negative counts or duplicate reservations', () => {
    const { m } = fixture();
    // Test-only full inventory: no network route can inject units or alter pool.
    for (const p of m.players) for (const o of p.state.shop) if (o) m.pool[o.definitionId]!++;
    for (const p of m.players) p.state.shop = Array(5).fill(null);
    const p = m.players[0]!;
    const count = m.pool.dolea!;
    p.state.units = [
      {
        id: 'vargas-stock-1',
        definitionId: 'dolea',
        stars: 3,
        location: { kind: 'bench', slot: 0 },
      },
      {
        id: 'vargas-stock-2',
        definitionId: 'dolea',
        stars: 3,
        location: { kind: 'bench', slot: 1 },
      },
      {
        id: 'vargas-stock-3',
        definitionId: 'dolea',
        stars: 2,
        location: { kind: 'bench', slot: 2 },
      },
      {
        id: 'vargas-stock-4',
        definitionId: 'dolea',
        stars: 1,
        location: { kind: 'bench', slot: 3 },
      },
    ];
    expect(count).toBe(22);
    m.pool.dolea = 0;
    for (const x of m.players) x.state.pool = { ...m.pool };
    m.assertConservation();
    for (const i of [0, 1, 0, 1]) {
      expect(send(m, i, { type: 'reroll_shop' }).accepted).toBe(true);
      expect(m.players[i]!.state.shop.some((o) => o?.definitionId === 'dolea')).toBe(false);
      m.assertConservation();
    }
  });
  it('upgrades 2-star copies to 3-star with the same transaction and returns nine copies on sale', () => {
    const { m } = fixture();
    const p = m.players[0]!;
    for (const o of p.state.shop) if (o) m.pool[o.definitionId]!++;
    p.state.shop = [{ id: 'vargas-final-copy', definitionId: 'dolea' }, null, null, null, null];
    m.pool.dolea!--;
    p.state.units = [2, 2, 1, 1].map((stars, i) => ({
      id: `vargas-fusion-${i}`,
      definitionId: 'dolea',
      stars: stars as 1 | 2,
      location: { kind: 'bench', slot: i },
    }));
    m.pool.dolea! -= 8;
    for (const x of m.players) x.state.pool = { ...m.pool };
    m.assertConservation();
    expect(send(m, 0, { type: 'buy_unit', offerId: 'vargas-final-copy' }).accepted).toBe(true);
    expect(p.state.units.length).toBe(1);
    expect(p.state.units[0]!.stars).toBe(3);
    m.assertConservation();
    const before = m.pool.dolea!;
    send(m, 0, { type: 'sell_unit', unitId: p.state.units[0]!.id });
    expect(m.pool.dolea).toBe(before + 9);
  });
  it('runs DOLEA, VARGAS, passives and traits on the server, not a second simulation per player', () => {
    const { m, advance } = fixture();
    for (const [i, p] of m.players.entries()) {
      p.state.units = ['dolea', 'vargas'].map((definitionId, j) => ({
        id: `${p.id}-fixture-${j}`,
        definitionId,
        stars: 2,
        location: { kind: 'board', hex: { q: j, r: 4 } },
      }));
      for (const u of p.state.units) m.pool[u.definitionId]! -= 3;
      expect(i).toBeLessThan(2);
    }
    for (const p of m.players) p.state.pool = { ...m.pool };
    m.assertConservation();
    advance(30000);
    const replay = m.replay!;
    expect(m.simulations).toBe(1);
    expect(replay.events.some((e) => e.type === 'trait_activate')).toBe(true);
    expect(replay.events.some((e) => e.type === 'passive_trigger')).toBe(true);
    expect(replay.events.some((e) => e.type === 'ability_cast')).toBe(true);
    expect(reversePerspective(reversePerspective(replay))).toEqual(replay);
    advance(replay.result.tick * 100 + 600);
    m.assertConservation();
    expect(m.players[0]!.state.health).toEqual(reversePerspective(m.players[1]!.state.health));
  });
  it('locked shops preserve reservations and disconnected players cannot issue actions', () => {
    const { m, advance } = fixture();
    send(m, 0, { type: 'lock_shop', locked: true });
    const shop = structuredClone(m.players[0]!.state.shop);
    m.disconnect('b');
    expect(send(m, 1, { type: 'buy_xp' }).reason).toBe('identity');
    advance(30000);
    advance(600);
    advance(5000);
    expect(m.players[0]!.state.shop).toEqual(shop);
    m.assertConservation();
  });
});
it('terminates when either real player reaches zero and never pays another round', () => {
  const { m, advance } = fixture();
  for (let i = 0; i < 100 && m.clock.snapshot().currentPhase !== 'finished'; i++) {
    advance(m.clock.snapshot().remainingMs);
  }
  expect(m.clock.snapshot().currentPhase).toBe('finished');
  const ledgers = m.players.map((p) => p.state.ledger.length);
  advance(100000);
  expect(m.players.map((p) => p.state.ledger.length)).toEqual(ledgers);
  expect(m.players.some((p) => p.state.health.south === 0)).toBe(true);
});
