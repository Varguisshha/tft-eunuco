import { it, expect } from 'vitest';
import { P11K_ECONOMY_CONFIG, P11H_ITEM_CATALOG } from '@tft/game-data';
import { runCombat } from '@tft/game-core';
import { AuthoritativeMatch } from '../AuthoritativeMatch';
import { equip, act, intent, fixtureUsers } from '../multi-fixture';
import { P11K_CATALOG_HASH, P11H_CATALOG_HASH } from './snapshot';
it.each([2, 3, 4] as const)(
  '%i players: initial removers are private, durable, idempotent and combat-bench only without changing real/ghost replays',
  (count) => {
    let now = 0;
    const m = new AuthoritativeMatch(
      'k-remover',
      { now: () => now },
      () => 360,
      count,
      P11K_ECONOMY_CONFIG,
    );
    for (let i = 0; i < count; i++)
      m.join(`socket-${i}`, { userId: fixtureUsers[i]!, name: `Player ${i}` });
    m.start('socket-0');
    equip(m);
    for (const p of m.players) {
      expect(p.state.items!.removers!.issued).toHaveLength(1);
      expect(p.state.items!.removers!.issued[0]!.id).toContain(p.id);
    }
    const p = m.players[0]!,
      u = {
        id: 'k-bench',
        definitionId: 'florin',
        stars: 1 as const,
        location: { kind: 'bench' as const, slot: 0 },
      };
    p.state.units.push(u);
    m.pool.florin!--;
    for (const player of m.players) player.state.pool = { ...m.pool };
    const definition = P11H_ITEM_CATALOG.definitions.find(
      (d) => d.content?.sourceRecordId === 'TFT_Item_Deathblade',
    )!;
    m.grantItems(p.id, 'bench-item', [definition.id]);
    const item = p.state.items!.completed[0]!;
    expect(act(m, 0, { type: 'equip_item', itemId: item.id, unitId: u.id }).accepted).toBe(true);
    m.grantItems(p.id, 'fill-bag', Array(16).fill(definition.id));
    const removerId = p.state.items!.removers!.issued[0]!.id;
    expect(act(m, 1, { type: 'remove_unit_items', unitId: u.id, removerId }).accepted).toBe(false);
    now = 31000;
    m.pulse();
    expect(p.state.phase).toBe('combat');
    const frozen = structuredClone(p.state.combat!),
      duels = structuredClone(m.exportState().duels),
      simulations = m.exportState().simulations,
      trace = runCombat(frozen.input);
    const invalid = intent(m, 0, {
      type: 'remove_unit_items',
      unitId: p.state.units[0]!.id,
      removerId,
    });
    expect(m.submit(invalid.sessionId, invalid).accepted).toBe(false);
    expect(p.state.items!.removers!.consumed).toHaveLength(0);
    const command = intent(m, 0, { type: 'remove_unit_items', unitId: u.id, removerId });
    expect(m.submit(command.sessionId, command).accepted).toBe(true);
    expect(p.state.items!.removers!.consumed).toEqual([
      { id: removerId, unitId: u.id, returnedIds: [item.id] },
    ]);
    expect(p.state.items!.pending).toContainEqual(item);
    expect(p.state.units.find((x) => x.id === u.id)!.equipment).toBeUndefined();
    expect(p.state.combat).toEqual(frozen);
    expect(runCombat(p.state.combat!.input)).toEqual(trace);
    expect(m.exportState().duels).toEqual(duels);
    expect(m.exportState().simulations).toBe(simulations);
    const confirmed = structuredClone(p.state);
    expect(m.submit(command.sessionId, command).accepted).toBe(true);
    expect(p.state).toEqual(confirmed);
    expect(act(m, 0, { type: 'remove_unit_items', unitId: u.id, removerId }).accepted).toBe(false);
    m.assertConservation();
    const saved = m.exportState();
    expect(saved.catalog).toBe(P11K_CATALOG_HASH);
    expect(saved.catalog).not.toBe(P11H_CATALOG_HASH);
    const restored = AuthoritativeMatch.restore(saved, { now: () => now });
    restored.resume('resumed', fixtureUsers[0]!);
    expect(restored.roundSnapshot('resumed').own.items!.removers!.issued).toHaveLength(1);
    expect(restored.roundSnapshot('resumed').own.items!.removers!.consumed).toHaveLength(1);
    const oldCount = restored.players[0]!.state.items!.pending.length;
    expect(restored.submit('resumed', { ...command, sessionId: 'resumed' }).accepted).toBe(true);
    expect(restored.players[0]!.state.items!.pending).toHaveLength(oldCount);
    expect(restored.exportState().duels).toEqual(duels);
    restored.assertConservation();
    // Buying/selling on the combat bench cannot turn a spent remover into another grant.
    expect(act(restored, 0, { type: 'sell_unit', unitId: u.id }).accepted).toBe(true);
    expect(restored.players[0]!.state.items!.removers!.issued).toHaveLength(1);
  },
);
