import { it, expect } from 'vitest';
import { P11B_ECONOMY_CONFIG, P11C_ECONOMY_CONFIG } from '@tft/game-data';
import type { CombatInput, MatchCommand } from '@tft/shared';
import { createMatch, commandFor, applyMatchAction } from '../match/engine';
import { unit, act } from '../items/fixture.test-support';
import { runCombat } from './engine';
import { combatStatistics } from './statistics';
import { grantItemInstances, allItemInstances } from '../items/inventory';
import { TFT185_ITEM_CATALOG } from '@tft/game-data';
function battle(armor = 25, itemRecord = 'TFT_Item_NightHarvester'): CombatInput {
  let s = createMatch(42, P11C_ECONOMY_CONFIG);
  unit(s, 'holder', 1, 0, 'dolea');
  const shield = TFT185_ITEM_CATALOG.definitions.find(
    (d) => d.content?.sourceRecordId === itemRecord,
  )!;
  if (shield) {
    grantItemInstances(s, 'shield', [shield.id]);
    s = act(s, { type: 'equip_item', unitId: 'holder', itemId: allItemInstances(s)[0]!.id });
  }
  s = act(s, { type: 'move_unit', unitId: 'holder', to: { kind: 'board', hex: { q: 0, r: 4 } } });
  s = act(s, { type: 'start_combat' });
  const input = structuredClone(s.combat!.input);
  input.units[0]!.profile.stats.armor = armor;
  return input;
}
it.each([25, -50, 0])(
  'accounting conserves damage/shields/overkill and effective/prevented/excess healing with armor %i',
  (armor) => {
    const input = battle(armor),
      r = runCombat(input);
    const damage = r.events.filter((e) => e.type === 'damage');
    expect(damage.length).toBeGreaterThan(0);
    for (const e of damage) {
      const p = e.payload,
        a = p.accounting!;
      expect(a).toBeDefined();
      expect(a.requested + a.defenseAmplification).toBe(
        a.mitigated + p.absorbed + p.amount + a.overkill,
      );
    }
    for (const e of r.events)
      if (e.type === 'heal') {
        const a = e.payload.accounting!;
        expect(a.requested).toBe(a.prevented + e.payload.amount + a.overheal);
      }
    const stats = combatStatistics({
      combatId: 'test',
      round: 1,
      units: input.units,
      events: r.events,
      observedTick: r.result.tick,
      complete: true,
    });
    expect(stats.units.reduce((n, u) => n + u.dealt, stats.unattributedDamage)).toBe(
      stats.units.reduce((n, u) => n + u.received, 0),
    );
  },
);
it('cuts future and duplicate events, separates item/periodic subsets, and marks missing historical coverage', () => {
  const input = battle(),
    r = runCombat(input),
    first = r.events.find((e) => e.type === 'damage')!;
  const events = [first, first, ...r.events.filter((e) => e.tick > first.tick)];
  const stats = combatStatistics({
    combatId: 'cut',
    round: 1,
    units: input.units,
    events,
    observedTick: first.tick,
    complete: false,
  });
  expect(stats.units.reduce((n, u) => n + u.received, 0)).toBe(first.payload.amount);
  const legacy = structuredClone(first);
  delete legacy.payload.accounting;
  expect(
    combatStatistics({
      combatId: 'old',
      round: 1,
      units: input.units,
      events: [legacy],
      observedTick: first.tick,
      complete: false,
    }).coverage.mitigation,
  ).toBe(false);
});
it('combat economy is versioned, returns equipment intact and refuses all formation edits', () => {
  let s = createMatch(42, P11C_ECONOMY_CONFIG);
  unit(s, 'fighter', 1, 0, 'dolea');
  unit(s, 'bench', 1, 1, 'peibol');
  const item = TFT185_ITEM_CATALOG.definitions.find((d) => d.kind === 'component')!;
  grantItemInstances(s, 'sample', [item.id]);
  s = act(s, { type: 'equip_item', unitId: 'bench', itemId: allItemInstances(s)[0]!.id });
  const equipped = structuredClone(s.units.find((u) => u.id === 'bench')!.equipment);
  s = act(s, { type: 'move_unit', unitId: 'fighter', to: { kind: 'board', hex: { q: 0, r: 4 } } });
  s = act(s, { type: 'start_combat' });
  const input = structuredClone(s.combat!.input);
  for (const command of [
    { type: 'sell_unit', unitId: 'fighter' },
    { type: 'move_unit', unitId: 'bench', to: { kind: 'board', hex: { q: 1, r: 4 } } },
    { type: 'reroll_shop' },
    { type: 'buy_xp' },
  ] as MatchCommand[])
    expect(applyMatchAction(s, commandFor(s, command)).ok).toBe(false);
  s = act(s, { type: 'sell_unit', unitId: 'bench' });
  expect(s.items!.components).toEqual(equipped);
  expect(s.combat!.input).toEqual(input);
  s = act(s, { type: 'lock_shop', locked: true });
  expect(s.shopLocked).toBe(true);
  const old = { ...s, config: P11B_ECONOMY_CONFIG };
  expect(applyMatchAction(old, commandFor(old, { type: 'lock_shop', locked: false })).ok).toBe(
    false,
  );
});

it('records overheal even when periodic healing restores zero HP', () => {
  const input = battle(25, 'TFT_Item_DragonsClaw');
  input.units[1]!.position = { q: 6, r: 0 };
  input.units[1]!.profile.stats.maxHp = 20000;
  const replay = runCombat(input),
    heals = replay.events.filter((e) => e.type === 'heal');
  expect(heals.length).toBeGreaterThan(0);
  const excess = heals.find((e) => e.payload.amount === 0 && e.payload.accounting!.overheal > 0);
  expect(excess).toBeDefined();
  for (const e of heals) {
    const a = e.payload.accounting!;
    expect(a.requested).toBe(e.payload.amount + a.prevented + a.overheal);
  }
});
