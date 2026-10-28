import { it, expect } from 'vitest';
import { P11B_ECONOMY_CONFIG, TFT185_ITEM_CATALOG } from '@tft/game-data';
import { AuthoritativeMatch } from '../AuthoritativeMatch';
import { act, equip, fixtureUsers } from '../multi-fixture';
import { P11B_CATALOG_HASH, P11_CATALOG_HASH } from './snapshot';
it.each([2, 3, 4] as const)(
  'P11B %i players: authoritative crafting, private remover receipt, history, restore and component delivery',
  (count) => {
    let now = 0;
    const m = new AuthoritativeMatch(
      'p11-items',
      { now: () => now },
      () => 360,
      count,
      P11B_ECONOMY_CONFIG,
    );
    for (let i = 0; i < count; i++)
      m.join(`socket-${i}`, { userId: fixtureUsers[i]!, name: `Player ${i}` });
    m.start('socket-0');
    expect(m.roundSnapshot('socket-0').own).not.toHaveProperty('lastCombatStatistics');
    equip(m);
    const p = m.players[0]!,
      d = TFT185_ITEM_CATALOG.definitions.find(
        (d) => d.content?.sourceRecordId === 'TFT_Item_Deathblade',
      )!;
    if (d.kind !== 'completed') throw Error('recipe');
    m.grantItems(p.id, 'source-pair', d.recipe);
    const ids = p.state.items!.components.map((i) => i.id);
    expect(
      act(m, 0, { type: 'equip_item', unitId: p.state.units[0]!.id, itemId: ids[0]! }).accepted,
    ).toBe(true);
    expect(
      act(m, 0, { type: 'equip_item', unitId: p.state.units[0]!.id, itemId: ids[1]! }).accepted,
    ).toBe(true);
    const item = p.state.units[0]!.equipment![0]!;
    expect(item.definitionId).toBe(d.id);
    // Explicit diagnostic authority fixture; there is no network grant or competitive reward policy.
    const removerId = `${p.id}/remover/network-fixture`;
    p.state.items!.removers = {
      issued: [{ id: removerId, grantId: 'network-fixture' }],
      consumed: [],
    };
    expect(
      act(m, 1, { type: 'remove_unit_items', unitId: p.state.units[0]!.id, removerId }).accepted,
    ).toBe(false);
    expect(p.state.items!.removers.consumed).toHaveLength(0);
    expect(
      act(m, 0, { type: 'remove_unit_items', unitId: p.state.units[0]!.id, removerId }).accepted,
    ).toBe(true);
    expect(p.state.items!.completed).toEqual([item]);
    expect(p.state.items!.removers.consumed).toHaveLength(1);
    expect(
      act(m, 0, { type: 'remove_unit_items', unitId: p.state.units[0]!.id, removerId }).accepted,
    ).toBe(false);
    const saved = m.exportState();
    expect(saved.catalog).toBe(P11B_CATALOG_HASH);
    expect(saved.catalog).not.toBe(P11_CATALOG_HASH);
    let restored = AuthoritativeMatch.restore(saved, { now: () => now });
    expect(restored.exportState()).toEqual({
      ...saved,
      players: saved.players.map((p) => ({ ...p, connected: false })),
    });
    restored.assertConservation();
    for (let n = 0; n < 12 && restored.players[0]!.state.round < 4; n++) {
      now += 60000;
      restored.pulse();
      restored = AuthoritativeMatch.restore(restored.exportState(), { now: () => now });
      restored.assertConservation();
    }
    expect(restored.exportState().itemDrops!.rounds.some((r) => r.round === 3)).toBe(true);
    expect(restored.players[0]!.state.items!.removers!.consumed).toHaveLength(1);
    expect(restored.players[1]!.state.items!.removers).toBeUndefined();
  },
);
