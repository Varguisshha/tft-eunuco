import { it, expect } from 'vitest';
import {
  FLORIN_ECONOMY_CONFIG as config,
  EXECUTABLE_ITEM_CATALOG,
  JARAMILLO_ECONOMY_CONFIG,
} from '@tft/game-data';
import type { MatchCommand, MatchState } from '@tft/shared';
import { createMatch, applyMatchAction, commandFor, replayMatch } from './engine';
import { scaledOwnedProfile } from './selectors';
import { validateMatchState } from './invariants';
import { grantItemInstances } from '../items/inventory';
const act = (s: MatchState, c: MatchCommand) => {
  const r = applyMatchAction(s, commandFor(s, c));
  expect(r.ok).toBe(true);
  return r.state;
};
it('offers Florin in natural shops and replays purchase, deployment and sale with conserved pool', () => {
  let s: MatchState | undefined;
  for (let seed = 0; seed < 1000; seed++) {
    let t = createMatch(seed, config);
    t = act(t, { type: 'buy_xp' });
    t = act(t, { type: 'reroll_shop' });
    if (t.shop.some((o) => o?.definitionId === 'florin')) {
      s = t;
      break;
    }
  }
  expect(s).toBeDefined();
  let state = s!;
  const gold = state.gold;
  state = act(state, {
    type: 'buy_unit',
    offerId: state.shop.find((o) => o?.definitionId === 'florin')!.id,
  });
  expect(state.gold).toBe(gold - 3);
  state = act(state, {
    type: 'move_unit',
    unitId: state.units[0]!.id,
    to: { kind: 'board', hex: { q: 0, r: 4 } },
  });
  state = act(state, { type: 'sell_unit', unitId: state.units[0]!.id });
  expect(state.gold).toBe(gold);
  expect(state.pool.florin! + state.shop.filter((o) => o?.definitionId === 'florin').length).toBe(
    18,
  );
  expect(replayMatch(state.seed, state.history, config)).toEqual(state);
  expect(createMatch(42, JARAMILLO_ECONOMY_CONFIG).pool).not.toHaveProperty('florin');
});
it('fuses nine Florin copies to 3 stars, carries three full items, validates restore and returns items on sale', () => {
  let s = createMatch(42, { ...config, initialGold: 100 });
  for (const o of s.shop) if (o) s.pool[o.definitionId]!++;
  s.shop.fill(null);
  for (let i = 0; i < 9; i++) {
    s.pool.florin!--;
    s.shop[0] = { id: `florin-${i}`, definitionId: 'florin' };
    s = act(s, { type: 'buy_unit', offerId: s.shop[0]!.id });
  }
  expect(s.units).toHaveLength(1);
  expect(s.units[0]).toMatchObject({ definitionId: 'florin', stars: 3 });
  const definitions = [
    'item-forge-ad--ad',
    'item-forge-ap--ap',
    'item-forge-armor--armor',
    'item-forge-health--health',
  ];
  expect(
    EXECUTABLE_ITEM_CATALOG.definitions.filter((d) => definitions.includes(d.id)),
  ).toHaveLength(4);
  grantItemInstances(s, 'florin-items', definitions);
  for (let i = 0; i < 3; i++)
    s = act(s, { type: 'equip_item', unitId: s.units[0]!.id, itemId: s.items!.completed[0]!.id });
  const denied = applyMatchAction(
    s,
    commandFor(s, {
      type: 'equip_item',
      unitId: s.units[0]!.id,
      itemId: s.items!.completed[0]!.id,
    }),
  );
  expect(denied.ok).toBe(false);
  const p = scaledOwnedProfile(s.units[0]!, config, s.items);
  expect(p.itemLoadout!.instances).toHaveLength(3);
  expect(validateMatchState(JSON.parse(JSON.stringify(s)))).toEqual(s);
  s = act(s, { type: 'sell_unit', unitId: s.units[0]!.id });
  expect(s.items!.completed).toHaveLength(4);
  expect(s.pool.florin).toBe(18);
});
