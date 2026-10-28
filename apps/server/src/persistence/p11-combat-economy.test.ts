import { it, expect } from 'vitest';
import { P11C_ECONOMY_CONFIG } from '@tft/game-data';
import { AuthoritativeMatch } from '../AuthoritativeMatch';
import { fixtureUsers, equip, act, intent } from '../multi-fixture';
import { P11C_CATALOG_HASH } from './snapshot';
it.each([2, 3, 4] as const)(
  'P11C %i players: combat bench sale/lock preserve frozen inputs, reservations, receipts and restoration',
  (count) => {
    let now = 0;
    const m = new AuthoritativeMatch(
      'combat-economy',
      { now: () => now },
      () => 360,
      count,
      P11C_ECONOMY_CONFIG,
    );
    for (let i = 0; i < count; i++)
      m.join(`socket-${i}`, { userId: fixtureUsers[i]!, name: `Player ${i}` });
    m.start('socket-0');
    expect(m.roundSnapshot('socket-0').own).not.toHaveProperty('lastCombatStatistics');
    equip(m);
    const p = m.players[0]!,
      bench = {
        id: `${p.id}-bench`,
        definitionId: 'peibol',
        stars: 1 as const,
        location: { kind: 'bench' as const, slot: 0 },
      };
    p.state.units.push(bench);
    m.pool.peibol!--;
    for (const p of m.players) p.state.pool = { ...m.pool };
    now = 31000;
    m.pulse();
    expect(p.state.phase).toBe('combat');
    const input = structuredClone(p.state.combat!.input),
      shop = structuredClone(p.state.shop),
      gold = p.state.gold;
    const lock = intent(m, 0, { type: 'lock_shop', locked: true });
    expect(m.submit(lock.sessionId, lock).accepted).toBe(true);
    expect(m.submit(lock.sessionId, lock).accepted).toBe(true);
    expect(p.state.gold).toBe(gold);
    expect(p.state.shop).toEqual(shop);
    expect(act(m, 0, { type: 'sell_unit', unitId: p.state.units[0]!.id }).accepted).toBe(false);
    expect(act(m, 1, { type: 'sell_unit', unitId: bench.id }).accepted).toBe(false);
    expect(act(m, 0, { type: 'reroll_shop' }).accepted).toBe(false);
    expect(act(m, 0, { type: 'buy_xp' }).accepted).toBe(false);
    expect(act(m, 0, { type: 'sell_unit', unitId: bench.id }).accepted).toBe(true);
    expect(p.state.units.some((u) => u.id === bench.id)).toBe(false);
    expect(p.state.gold).toBeGreaterThan(gold);
    expect(p.state.combat!.input).toEqual(input);
    m.assertConservation();
    const saved = m.exportState();
    expect(saved.catalog).toBe(P11C_CATALOG_HASH);
    const restored = AuthoritativeMatch.restore(saved, { now: () => now });
    restored.assertConservation();
    expect(restored.players[0]!.state.shopLocked).toBe(true);
    expect(restored.players[0]!.state.combat!.input).toEqual(input);
    now += 60000;
    restored.pulse();
    const settled = restored.players[0]!.state.lastCombatStatistics;
    expect(settled?.complete).toBe(true);
    expect(settled?.units.some((u) => u.unitId === bench.id)).toBe(false);
    const wire = restored.roundSnapshot(restored.players[0]!.sessionId);
    expect(wire.own.lastCombatStatistics).toEqual(settled);
    expect(wire.players.every((p) => !('lastCombatStatistics' in p))).toBe(true);
    const again = AuthoritativeMatch.restore(restored.exportState(), { now: () => now });
    expect(again.players[0]!.state.lastCombatStatistics).toEqual(settled);
  },
);
