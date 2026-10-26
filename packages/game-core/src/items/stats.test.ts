import { it, expect } from 'vitest';
import { ITEMS_ECONOMY_CONFIG, JARAMILLO_ECONOMY_CONFIG, traitsFor } from '@tft/game-data';
import { DEFAULT_OVERTIME } from '@tft/shared';
import { fixture, unit, grant, act } from './fixture.test-support';
import { scaledOwnedProfile, formationProfiles, equippedStatsPreview } from '../match/selectors';
import { createMatch, RoundAuthority } from '../match/engine';
import { runCombat } from '../combat/engine';
import { effectiveStat } from '../combat/math';
import { LocalMatchCoordinator } from '../match/coordinator';
it.each(['dolea', 'vargas', 'jaramillo'])(
  'equipment composes %s stats once using identified initial modifiers',
  (definitionId) => {
    let s = fixture();
    unit(s, 'carrier', 2, 0, definitionId);
    s = grant(s, ['diagnostic-double-ad']);
    s = act(s, { type: 'equip_item', itemId: s.items!.completed[0]!.id, unitId: 'carrier' });
    s = act(s, {
      type: 'move_unit',
      unitId: 'carrier',
      to: { kind: 'board', hex: { q: 0, r: 4 } },
    });
    const base = scaledOwnedProfile(s.units[0]!, s.config),
      profile = scaledOwnedProfile(s.units[0]!, s.config, s.items);
    expect(profile.stats).toEqual(base.stats);
    expect(equippedStatsPreview(profile).attack).toBe(base.stats.attack + 20);
    expect(profile.initialItemModifiers).toMatchObject([
      { amount: 20, stat: 'attack', sourceId: s.units[0]!.equipment![0]!.id },
    ]);
    const input = {
      protocolVersion: 3 as const,
      rulesVersion: 'f0p6c-1' as const,
      combatId: 'items-test',
      seed: 42,
      maxTicks: 15,
      overtime: DEFAULT_OVERTIME,
      obstacles: [],
      traits: [...traitsFor('f0p6c')],
      units: [
        { id: 'carrier', definitionId, owner: 'south' as const, position: { q: 0, r: 4 }, profile },
        {
          id: 'target',
          definitionId,
          owner: 'north' as const,
          position: { q: 0, r: 2 },
          profile: base,
        },
      ],
    };
    const one = runCombat(input),
      two = runCombat(input);
    expect(one).toEqual(two);
    expect(effectiveStat(one.snapshots[0]!.units[0]!, 'attack')).toBe(base.stats.attack + 20);
    expect(profile.stats.attack).toBe(base.stats.attack);
    expect(formationProfiles(s)[0]!.profile.stats.attack).toBe(base.stats.attack + 20);
  },
);
it('items coexist with Kilómetros and Hortaleza without scaling flat item AD by stars', () => {
  let s = fixture();
  unit(s, 'jaramillo', 2);
  unit(s, 'dolea', 1, 1, 'dolea');
  s.units[0]!.progress = { version: 1, stacks: [{ id: 'kilometros', count: 2, lastRound: 1 }] };
  s = grant(s, ['diagnostic-double-ad']);
  s = act(s, { type: 'equip_item', itemId: s.items!.completed[0]!.id, unitId: 'jaramillo' });
  for (const [i, id] of ['jaramillo', 'dolea'].entries())
    s = act(s, { type: 'move_unit', unitId: id, to: { kind: 'board', hex: { q: i, r: 4 } } });
  const profile = formationProfiles(s).find((u) => u.id === 'jaramillo')!.profile;
  expect(profile.stats.attack).toBe(Math.floor(Math.floor(48 * 1.8) * 1.06) + 20);
  expect(profile.stats.maxHp).toBe(550 * 1.8 + 100);
});
it('an empty item inventory leaves normal shop, gold, pool, RNG and combat byte-identical', () => {
  const old = createMatch(42, JARAMILLO_ECONOMY_CONFIG),
    next = createMatch(42, ITEMS_ECONOMY_CONFIG);
  expect(next).toEqual({ ...old, config: ITEMS_ECONOMY_CONFIG, items: next.items });
  unit(old);
  unit(next);
  const a = act(old, {
      type: 'move_unit',
      unitId: 'unit-a',
      to: { kind: 'board', hex: { q: 0, r: 4 } },
    }),
    b = act(next, {
      type: 'move_unit',
      unitId: 'unit-a',
      to: { kind: 'board', hex: { q: 0, r: 4 } },
    });
  expect(new RoundAuthority().begin(a).replay).toEqual(new RoundAuthority().begin(b).replay);
});
it('automatic rounds 3 and 6 do not award any components or consume a drop RNG stream', () => {
  let now = 0;
  const c = new LocalMatchCoordinator(createMatch(42, ITEMS_ECONOMY_CONFIG), {
    matchId: 'item-no-drops',
    time: { now: () => now },
  });
  c.start();
  while (c.getMatch().round < 7 && c.getClock().currentPhase !== 'finished') {
    now += Math.max(1, c.getClock().remainingMs);
    c.pulse();
  }
  expect(c.getMatch().round).toBe(7);
  expect(c.getMatch().items).toMatchObject({
    nextInstance: 0,
    components: [],
    completed: [],
    pending: [],
    grants: [],
    distributions: [],
  });
});
