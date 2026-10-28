import { it, expect } from 'vitest';
import { multiFixture, equip, act, intent } from './multi-fixture';
import { CombatPlayback } from '../../web/src/game/combatPlayback';
it.each([2, 3, 4] as const)(
  'retains %i-player economy and deadline and rejects the superseded socket',
  (n) => {
    const f = multiFixture(n),
      m = f.match,
      p = m.players[0]!;
    expect(act(m, 0, { type: 'buy_unit', offerId: p.state.shop[0]!.id }).accepted).toBe(true);
    const before = structuredClone(p.state),
      pool = { ...m.pool },
      clock = m.clock.snapshot();
    const stale = intent(m, 0, { type: 'reroll_shop' });
    m.disconnect(p.sessionId);
    f.advance(1200);
    m.resume('replacement', p.id);
    expect(p.generation).toBe(2);
    expect(p.state).toEqual(before);
    expect(m.pool).toEqual(pool);
    expect(m.clock.snapshot().phaseDeadline).toBe(clock.phaseDeadline);
    expect(m.submit('socket-0', stale).accepted).toBe(false);
    m.disconnect('socket-0');
    expect(p.connected).toBe(true);
    expect(m.players).toHaveLength(n);
    expect(() => m.resume('foreign', 'unknown')).toThrow();
    f.advance(30000);
    expect(m.submit('replacement', { ...stale, sessionId: 'replacement' }).accepted).toBe(false);
    m.assertConservation();
  },
);
it.each([0, 10000, 30000, 40000])(
  'recovers authorized replay at %ims without simulation or visual divergence',
  (ms) => {
    const f = multiFixture(4),
      m = f.match;
    equip(m, undefined, ['test-k01']);
    f.advance(30000);
    const p = m.players[0]!,
      replay = m.duelFor(p.sessionId)!.replay;
    const simulations = m.simulations;
    expect(replay.result.tick).toBe(450);
    const elapsed = ms;
    m.disconnect(p.sessionId);
    f.advance(elapsed);
    m.resume('new', p.id);
    expect(m.simulations).toBe(simulations);
    expect(m.duelFor('new')!.replay).toBe(replay);
    const continuous = new CombatPlayback(replay),
      recovered = new CombatPlayback(replay);
    for (let t = 0; t < elapsed; t += 100) continuous.advance(Math.min(100, elapsed - t));
    recovered.seek(elapsed);
    expect(recovered.frame()).toEqual(continuous.frame());
    expect(recovered.frame().state).toEqual(replay.snapshots[Math.floor(elapsed / 100)]);
  },
);
it('keeps settlements and final standings immutable through repeated recovery', () => {
  const f = multiFixture(2),
    m = f.match;
  const p = m.players[0]!;
  while (!m.finalResults) f.advance(m.clock.snapshot().remainingMs);
  const before = JSON.stringify(m.finalResults),
    state = structuredClone(p.state),
    count = m.settlements.size;
  for (let i = 0; i < 8; i++) {
    m.disconnect(p.sessionId);
    m.resume(`replacement-${i}`, p.id);
    f.advance(100);
    expect(m.competitiveSnapshot(p.sessionId).finalResults).toEqual(JSON.parse(before));
    expect(p.state).toEqual(state);
    expect(m.settlements.size).toBe(count);
    expect(p.eliminated).toBe(true);
  }
});
