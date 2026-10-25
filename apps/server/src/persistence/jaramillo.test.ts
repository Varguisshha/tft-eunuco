import { createHash, randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { JARAMILLO_ECONOMY_CONFIG, VARGAS_ECONOMY_CONFIG, matchCatalog } from '@tft/game-data';
import { AuthoritativeMatch } from '../AuthoritativeMatch';
import { CATALOG } from './snapshot';
describe('P6C authority recovery compatibility', () => {
  it('preserves the exact P7D.2 catalog fingerprint formula', () => {
    const legacy = createHash('sha256')
      .update(JSON.stringify([VARGAS_ECONOMY_CONFIG, matchCatalog(VARGAS_ECONOMY_CONFIG)]))
      .digest('hex');
    expect(CATALOG).toBe(legacy);
    const old = new AuthoritativeMatch(randomUUID()).exportState();
    old.catalog = legacy;
    expect(AuthoritativeMatch.restore(old).config.catalog).toBe('f0p6b3');
  });
  it('roundtrips per-instance stacks and preserves the new catalog without reinterpreting old saves', () => {
    const m = new AuthoritativeMatch(
      randomUUID(),
      { now: () => 0 },
      () => 42,
      2,
      JARAMILLO_ECONOMY_CONFIG,
    );
    m.join('session-a', { userId: randomUUID(), name: 'Vargas' });
    const saved = m.exportState();
    saved.pool.jaramillo!--;
    for (const p of saved.players) p.state.pool = { ...saved.pool };
    saved.players[0]!.state.units.push({
      id: 'earned-jaramillo',
      definitionId: 'jaramillo',
      stars: 1,
      location: { kind: 'bench', slot: 0 },
      progress: { version: 1, stacks: [{ id: 'kilometros', count: 6, lastRound: 1 }] },
    });
    const restored = AuthoritativeMatch.restore(JSON.parse(JSON.stringify(saved)));
    expect(restored.players[0]!.state.units[0]!.progress).toEqual(
      saved.players[0]!.state.units[0]!.progress,
    );
    expect(restored.config).toEqual(JARAMILLO_ECONOMY_CONFIG);
    expect(() => AuthoritativeMatch.restore({ ...saved, catalog: CATALOG })).toThrow();
    const old = new AuthoritativeMatch(randomUUID()).exportState();
    expect(AuthoritativeMatch.restore(old).config.catalog).toBe('f0p6b3');
  });
});
