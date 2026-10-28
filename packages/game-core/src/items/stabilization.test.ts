import { it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { INTEGRATED_ECONOMY_CONFIG, traitsFor } from '@tft/game-data';
import { CombatInputSchema, CombatStateSchema, DEFAULT_OVERTIME } from '@tft/shared';
import { createMatch } from '../match/engine';
import { scaledOwnedProfile } from '../match/selectors';
import { grantItemInstances } from './inventory';
import { act, unit } from './fixture.test-support';
import { runCombat } from '../combat/engine';
it('P8F integrated 7v7 with four champions, 42 equipped items and Florin recovery remains deterministic', () => {
  const units = [];
  for (let i = 0; i < 14; i++) {
    let state = createMatch(80126 + i, INTEGRATED_ECONOMY_CONFIG);
    const champion = ['dolea', 'vargas', 'jaramillo', 'florin'][i % 4]!;
    unit(state, `p8f-${i}`, 1, 0, champion);
    grantItemInstances(state, 'stress', [
      'item-forge-ap--armor',
      'item-forge-armor--health',
      'item-forge-attack_speed--magic_resist',
    ]);
    for (const item of [...state.items!.completed])
      state = act(state, { type: 'equip_item', itemId: item.id, unitId: `p8f-${i}` });
    const profile = scaledOwnedProfile(state.units[0]!, state.config, state.items, 6, state.seed);
    // Isolated stress durability, not a competitive balance change.
    profile.stats.maxHp = 10000;
    units.push({
      id: `p8f-${i}`,
      definitionId: champion,
      owner: i < 7 ? 'north' : 'south',
      position: { q: (i % 7) - (i < 7 ? 1 : 2), r: i < 7 ? 3 : 4 },
      profile,
    });
  }
  const input = CombatInputSchema.parse({
    protocolVersion: 3,
    rulesVersion: 'florin-1',
    combatId: 'p8f-stress',
    seed: 80126,
    maxTicks: 450,
    overtime: DEFAULT_OVERTIME,
    obstacles: [],
    traits: traitsFor(INTEGRATED_ECONOMY_CONFIG.catalog),
    units,
  });
  const start = performance.now();
  const replay = runCombat(input);
  const ms = performance.now() - start;
  expect(runCombat(input)).toEqual(replay);
  for (const snapshot of replay.snapshots) CombatStateSchema.parse(snapshot);
  expect(replay.events.some((e) => e.type === 'mechanics_limit')).toBe(false);
  const json = JSON.stringify(replay);
  const metrics = {
    ms,
    ticks: replay.result.tick,
    events: replay.events.length,
    bytes: Buffer.byteLength(json),
    gzip: gzipSync(json).length,
    types: [...new Set(replay.events.map((e) => e.type))],
  };
  expect(ms).toBeLessThan(5000);
  expect(metrics.bytes * 2).toBeLessThan(128 * 1024 * 1024);
  expect(Math.ceil((metrics.gzip * 2 * 4) / 3)).toBeLessThan(12 * 1024 * 1024);
  mkdirSync('artifacts/p8f', { recursive: true });
  writeFileSync('artifacts/p8f/integrated-stress.json', JSON.stringify(metrics, null, 2));
});
