import { expect, it } from 'vitest';
import baseline from './fixtures/p12j-fingerprints.json';
import * as fingerprints from './snapshot';
import { AuthoritativeMatch } from '../AuthoritativeMatch';
import { fixtureUsers } from '../multi-fixture';
it.each(Object.entries(baseline.fingerprints))(
  'P12J immutable fingerprint %s, read/write/restore retains the historical contract',
  (name, hash) => {
    expect((fingerprints as Record<string, unknown>)[name]).toBe(hash);
    const rules = [
      'f0p6b3-1',
      'f0p6c-1',
      'florin-1',
      'f0p8d-florin-1',
      'f0p10a-1',
      'f0p11a-1',
      'f0p11b-1',
      'f0p11c-1',
      'f0p11h-1',
    ];
    const config = rules.flatMap((rule) => {
      try {
        return [fingerprints.snapshotConfig(rule, hash)];
      } catch {
        return [];
      }
    })[0]!;
    expect(config).toBeDefined();
    const m = new AuthoritativeMatch('p12j-compatibility', { now: () => 0 }, () => 42, 2, config);
    for (let i = 0; i < 2; i++)
      m.join(`s-${i}`, { userId: fixtureUsers[i]!, name: `Historic ${i}` });
    m.start('s-0');
    const state = m.exportState();
    expect(state.catalog).toBe(hash);
    expect(state.players.every((p) => p.state.config.characterPolicy === undefined)).toBe(true);
    const restored = AuthoritativeMatch.restore(state, { now: () => 0 }, false);
    expect(restored.exportState()).toEqual(state);
  },
);
