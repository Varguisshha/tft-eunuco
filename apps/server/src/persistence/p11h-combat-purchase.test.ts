import { it, expect } from 'vitest';
import { P11H_ECONOMY_CONFIG, matchCatalog } from '@tft/game-data';
import { runCombat } from '@tft/game-core';
import { AuthoritativeMatch } from '../AuthoritativeMatch';
import { fixtureUsers, equip, act, intent } from '../multi-fixture';
import {
  P11H_CATALOG_HASH,
  P11G_CATALOG_HASH,
  P11C_CATALOG_HASH,
  P11B_CATALOG_HASH,
} from './snapshot';
function setup(count: 2 | 3 | 4) {
  let now = 0;
  const m = new AuthoritativeMatch(
    'h-combat',
    { now: () => now },
    () => 360,
    count,
    P11H_ECONOMY_CONFIG,
  );
  for (let i = 0; i < count; i++)
    m.join(`socket-${i}`, { userId: fixtureUsers[i]!, name: `Player ${i}` });
  m.start('socket-0');
  equip(m);
  return {
    m,
    advance: (ms: number) => {
      now += ms;
      m.pulse();
    },
    clock: () => now,
  };
}
function shop(m: AuthoritativeMatch, id = 'peibol') {
  const s = m.players[0]!.state;
  for (const o of s.shop) if (o) m.pool[o.definitionId]!++;
  s.shop = Array.from({ length: 5 }, (_, i) => {
    m.pool[id]!--;
    return { id: `h-offer-${i}`, definitionId: id };
  });
  s.shopRolls = s.shop.map(() => ({
    cost: matchCatalog(s.config).find((d) => d.id === id)!.cost,
    outcome: 'offered' as const,
  }));
  for (const p of m.players) p.state.pool = { ...m.pool };
  m.assertConservation();
}
function bench(m: AuthoritativeMatch, definitionId: string, slot: number) {
  const p = m.players[0]!;
  p.state.units.push({
    id: `h-bench-${slot}`,
    definitionId,
    stars: 1,
    location: { kind: 'bench', slot },
  });
  m.pool[definitionId]!--;
  for (const p of m.players) p.state.pool = { ...m.pool };
}
it.each([2, 3, 4] as const)(
  '%i players: combat buys are authoritative, idempotent, bench-only, persistent, with unchanged replay',
  (count) => {
    const { m, advance, clock } = setup(count);
    shop(m);
    advance(31000);
    const p = m.players[0]!,
      frozen = structuredClone(p.state.combat!),
      before = runCombat(frozen.input),
      gold = p.state.gold,
      command = intent(m, 0, { type: 'buy_unit', offerId: 'h-offer-0' });
    expect(m.submit(command.sessionId, command).accepted).toBe(true);
    const purchased = p.state.units.find((u) => u.definitionId === 'peibol')!;
    expect(purchased.location.kind).toBe('bench');
    expect(p.state.gold).toBeLessThan(gold);
    const confirmed = structuredClone(p.state);
    expect(m.submit(command.sessionId, command).accepted).toBe(true);
    expect(p.state).toEqual(confirmed);
    expect(
      act(m, 0, {
        type: 'move_unit',
        unitId: purchased.id,
        to: { kind: 'board', hex: { q: 2, r: 4 } },
      }).accepted,
    ).toBe(false);
    expect(act(m, 0, { type: 'buy_unit', offerId: 'h-offer-0' }).accepted).toBe(false);
    expect(p.state.combat).toEqual(frozen);
    expect(runCombat(p.state.combat!.input)).toEqual(before);
    m.assertConservation();
    const saved = m.exportState();
    expect(saved.catalog).toBe(P11H_CATALOG_HASH);
    const restored = AuthoritativeMatch.restore(saved, { now: clock });
    restored.resume('reconnected', fixtureUsers[0]!);
    expect(restored.roundSnapshot('reconnected').own.units).toContainEqual(purchased);
    expect(restored.players[0]!.state.combat).toEqual(frozen);
    restored.assertConservation();
  },
);
it('combat fuses only bench copies; active copies merge on preparation transition', () => {
  const { m, advance } = setup(2);
  shop(m, 'dolea');
  bench(m, 'dolea', 0);
  advance(31000);
  const frozen = structuredClone(m.players[0]!.state.combat);
  expect(act(m, 0, { type: 'buy_unit', offerId: 'h-offer-0' }).accepted).toBe(true);
  expect(m.players[0]!.state.units.filter((u) => u.definitionId === 'dolea')).toHaveLength(3);
  expect(m.players[0]!.state.combat).toEqual(frozen);
  advance(60000);
  advance(10000);
  expect(m.players[0]!.state.units.filter((u) => u.definitionId === 'dolea')).toHaveLength(1);
  expect(m.players[0]!.state.units.find((u) => u.definitionId === 'dolea')!.stars).toBe(2);
  m.assertConservation();
});
it('bench-only three-copy fusion works during combat without changing its input', () => {
  const { m, advance } = setup(2);
  shop(m);
  bench(m, 'peibol', 0);
  bench(m, 'peibol', 1);
  advance(31000);
  const frozen = structuredClone(m.players[0]!.state.combat);
  expect(act(m, 0, { type: 'buy_unit', offerId: 'h-offer-0' }).accepted).toBe(true);
  expect(m.players[0]!.state.units.filter((u) => u.definitionId === 'peibol')).toMatchObject([
    { stars: 2, location: { kind: 'bench' } },
  ]);
  expect(m.players[0]!.state.combat).toEqual(frozen);
  m.assertConservation();
});
it.each(['poor', 'full'] as const)(
  '%s combat purchase rejects atomically and remains recoverable',
  (kind) => {
    const { m, advance } = setup(2);
    shop(m);
    advance(31000);
    if (kind === 'full') {
      const ids = matchCatalog(m.config)
        .filter((d) => d.id !== 'peibol')
        .slice(0, 9)
        .map((d) => d.id);
      for (let i = 0; i < 9; i++) bench(m, ids[i]!, i);
    } else {
      const s = m.players[0]!.state;
      const last = s.ledger.at(-1)!;
      last.delta -= s.gold;
      last.balance = 0;
      s.gold = 0;
    }
    const before = structuredClone(m.players[0]!.state);
    expect(act(m, 0, { type: 'buy_unit', offerId: 'h-offer-0' }).accepted).toBe(false);
    expect(m.players[0]!.state).toEqual(before);
    expect(act(m, 0, { type: 'lock_shop', locked: true }).accepted).toBe(true);
    m.assertConservation();
  },
);

it('preserves independently recorded B/C/G fingerprints from the P11G base commit', () => {
  expect(P11B_CATALOG_HASH).toBe(
    'd2c3309ae90ff3a62420ee2a58825cd12bc99fd66cfbf00fae959ade9d4848ea',
  );
  expect(P11C_CATALOG_HASH).toBe(
    'f030371fbd8e8d9dd9cb20e9ecac35d4740965d12487bc04ff563f4909bef027',
  );
  expect(P11G_CATALOG_HASH).toBe(
    '0dfbe33e1f8edf9c43297ab913261fce17ce89ee760a23968ca0ea500b9ae9a4',
  );
  expect(P11H_CATALOG_HASH).not.toBe(P11G_CATALOG_HASH);
});
