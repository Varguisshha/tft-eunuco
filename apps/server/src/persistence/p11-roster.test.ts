import { it, expect } from 'vitest';
import { AuthoritativeMatch } from '../AuthoritativeMatch';
import { act, fixtureUsers } from '../multi-fixture';
import {
  P11_ECONOMY_CONFIG,
  P11_ROSTER,
  P11_PROVISIONAL,
  ROSTER_SOURCE,
  ROSTER_PLAYABLE,
  ROSTER_ECONOMY_CONFIG,
  traitsFor,
  matchCatalog,
} from '@tft/game-data';
import { scaledProfile, runCombat } from '@tft/game-core';
import { CombatInputSchema } from '@tft/shared';
import { ROSTER_CATALOG_HASH, P11_CATALOG_HASH } from './snapshot';
function fixture(n: 2 | 3 | 4 = 4) {
  const m = new AuthoritativeMatch(
    'p11-roster',
    { now: () => 0 },
    () => 360,
    n,
    P11_ECONOMY_CONFIG,
  );
  for (let i = 0; i < n; i++)
    m.join(`socket-${i}`, { userId: fixtureUsers[i]!, name: `Player ${i}` });
  m.start('socket-0');
  return m;
}
it('P11A preserves P10A and adds exactly the Excel identities without fictional prototypes', () => {
  expect(P11_ROSTER.map((x) => x.id)).toEqual(ROSTER_SOURCE.characters.map((x) => x.id));
  expect(P11_ROSTER).toHaveLength(34);
  expect(ROSTER_PLAYABLE).toHaveLength(4);
  expect(matchCatalog(ROSTER_ECONOMY_CONFIG)).toHaveLength(4);
  expect(ROSTER_CATALOG_HASH).toBe(
    '9e0b5ff3ed81c653c8cc05ae2cfa72b50b9f8d7fc5d53850d37f07daeb5510f0',
  );
  expect(P11_CATALOG_HASH).not.toBe(ROSTER_CATALOG_HASH);
  expect(P11_PROVISIONAL.characters).toHaveLength(30);
  expect(P11_ECONOMY_CONFIG.copiesByCost).toEqual([30, 25, 18, 10, 9]);
  expect(P11_ECONOMY_CONFIG.levels).toEqual(ROSTER_ECONOMY_CONFIG.levels);
  for (const u of P11_ROSTER) {
    expect(u.id).not.toMatch(/^test-/);
    expect(u.synergies).toEqual(ROSTER_SOURCE.characters.find((x) => x.id === u.id)!.synergies);
    expect(u.synergies).not.toContain('llama-de-padel');
  }
  for (const t of P11_ECONOMY_CONFIG.opponents)
    expect(t.definitions.every((id) => P11_ROSTER.some((u) => u.id === id))).toBe(true);
  const traits = traitsFor('f0p11a-1');
  expect(traits.find((t) => t.id === 'mus')!.thresholds.map((t) => t.count)).toEqual([2, 4]);
  for (const t of traits.filter((t) => t.planning?.effectState === 'pending_effects'))
    for (const tier of t.thresholds) {
      expect(tier.effects).toEqual([]);
      expect(tier.bonuses).toEqual([]);
    }
});
it.each(P11_PROVISIONAL.characters.map((x) => x.id))(
  '%s has only basic attacks, explicit provisional stats and safe star scaling',
  (id) => {
    const u = P11_ROSTER.find((x) => x.id === id)!;
    const p = scaledProfile(id, 1, P11_ECONOMY_CONFIG);
    expect(u.provisional).toBe(true);
    expect(u.spriteId).toBe(`provisional-${id}`);
    expect(u.activeAbilityId).toBeNull();
    expect(u.passiveAbilityId).toBeNull();
    expect(p.ability).toBeNull();
    expect(p.passive).toBeNull();
    expect(p.championAbility).toBeUndefined();
    const hp = [1, 2, 3].map(
      (s) => scaledProfile(id, s as 1 | 2 | 3, P11_ECONOMY_CONFIG).stats.maxHp,
    );
    expect(hp[2]).toBeGreaterThan(hp[1]!);
    expect(hp[1]).toBeGreaterThan(hp[0]!);
    const input = CombatInputSchema.parse({
      protocolVersion: 3,
      rulesVersion: 'f0p11a-1',
      combatId: 'provisional-basic',
      seed: 42,
      maxTicks: 100,
      obstacles: [],
      units: [
        {
          id: 'a',
          definitionId: id,
          owner: 'south',
          position: { q: 0, r: 4 },
          profile: { ...p, traits: [] },
        },
        {
          id: 'b',
          definitionId: id,
          owner: 'north',
          position: { q: 0, r: 3 },
          profile: { ...p, traits: [] },
        },
      ],
    });
    const replay = runCombat(input);
    expect(replay.events.some((e) => e.type === 'damage')).toBe(true);
    expect(runCombat(input)).toEqual(replay);
  },
);
it.each([2, 3, 4] as const)(
  'P11A %i players conserve shared copies over buys, locked refresh, restore, rounds and elimination',
  (n) => {
    let m = fixture(n);
    const initial = m.exportState();
    initial.rng = 42;
    initial.itemDrops!.seed = 42;
    m = AuthoritativeMatch.restore(initial, { now: () => 0 }, false);
    expect(Object.keys(m.pool)).toHaveLength(34);
    for (let i = 0; i < n; i++) {
      const p = m.players[i]!;
      expect(act(m, i, { type: 'buy_unit', offerId: p.state.shop[0]!.id }).accepted).toBe(true);
      expect(
        act(m, i, {
          type: 'move_unit',
          unitId: p.state.units[0]!.id,
          to: { kind: 'board', hex: { q: 0, r: 4 } },
        }).accepted,
      ).toBe(true);
    }
    expect(act(m, 0, { type: 'lock_shop', locked: true }).accepted).toBe(true);
    const locked = structuredClone(m.players[0]!.state.shop);
    for (let i = 0; i < 3; i++) {
      m.clock.restore({ ...m.clock.snapshot(), remainingMs: 0 });
      m.pulse();
      m.assertConservation();
    }
    expect(m.players[0]!.state.shop).toEqual(locked);
    const saved = m.exportState();
    m = AuthoritativeMatch.restore(saved, { now: () => 0 }, false);
    expect(m.exportState()).toEqual(saved);
    const p = m.players[0]!,
      unit = p.state.units[0]!;
    expect(act(m, 0, { type: 'sell_unit', unitId: unit.id }).accepted).toBe(true);
    m.assertConservation();
    for (let i = 0; i < 150 && !m.exportState().finalResult; i++) {
      m.clock.restore({ ...m.clock.snapshot(), remainingMs: 0 });
      m.pulse();
      m.assertConservation();
    }
    expect(m.exportState().finalResult).not.toBeNull();
    m.assertConservation();
  },
);
it.each(P11_PROVISIONAL.characters.map((x) => x.id))(
  '%s can buy nine, cascade to 3★ and sell exactly nine copies',
  (id) => {
    const m = fixture(),
      p = m.players[0]!;
    // Test-only initial budget; the production ledger, prices and grants are unchanged.
    p.state.gold = 100;
    p.state.ledger[0]!.delta = 100;
    p.state.ledger[0]!.balance = 100;
    for (let i = 0; i < 9; i++) {
      for (const o of p.state.shop) if (o) m.pool[o.definitionId]!++;
      m.pool[id]!--;
      p.state.shop = [{ id: `copy-${i}`, definitionId: id }, null, null, null, null];
      for (const player of m.players) player.state.pool = { ...m.pool };
      m.assertConservation();
      expect(act(m, 0, { type: 'buy_unit', offerId: `copy-${i}` }).accepted).toBe(true);
      m.assertConservation();
    }
    expect(p.state.units).toHaveLength(1);
    expect(p.state.units[0]!.stars).toBe(3);
    const before = m.pool[id]!;
    expect(act(m, 0, { type: 'sell_unit', unitId: p.state.units[0]!.id }).accepted).toBe(true);
    expect(m.pool[id]).toBe(before + 9);
    m.assertConservation();
  },
);
