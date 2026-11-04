import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { P13T_ECONOMY_CONFIG, P12F_ECONOMY_CONFIG } from '@tft/game-data';
import { runCombat } from '@tft/game-core';
import { AuthoritativeMatch } from '../AuthoritativeMatch';
import { equip, fixtureUsers } from '../multi-fixture';
import { P13T_CATALOG_HASH, P12F_CATALOG_HASH } from './snapshot';
const advance = (m: AuthoritativeMatch) => {
  m.clock.restore({ ...m.clock.snapshot(), remainingMs: 0 });
  m.pulse();
};
it.each([2, 3, 4] as const)(
  '%i players restore P13T replay, clones, per-target states and settlement without historical reinterpretation',
  (n) => {
    let m = new AuthoritativeMatch(
      randomUUID(),
      { now: () => 0 },
      () => 42,
      n,
      P13T_ECONOMY_CONFIG,
    );
    for (let i = 0; i < n; i++)
      m.join(`p13t-${i}`, { userId: fixtureUsers[i]!, name: `Local ${i}` });
    for (const p of m.players) {
      p.state.level = 7;
      p.state.xp = 0;
    }
    m.start('p13t-0');
    equip(m, undefined, ['jaramillo', 'peibol', 'dolea']);
    advance(m);
    expect(m.exportState().catalog).toBe(P13T_CATALOG_HASH);
    expect(P13T_CATALOG_HASH).not.toBe(P12F_CATALOG_HASH);
    for (const d of m.duels) {
      expect(d.replay.input.rulesVersion).toBe('f0p13t-1');
      expect(runCombat(d.replay.input)).toEqual(d.replay);
    }
    if (n === 3)
      expect(m.duels.some((d) => d.replay.input.ghost?.damageMultiplierMilli === 800)).toBe(true);
    const saved = m.exportState();
    m = AuthoritativeMatch.restore(saved, { now: () => 0 }, false);
    expect(m.duels).toEqual(saved.duels);
    advance(m);
    m.assertConservation();
    expect(m.settlements.size).toBe(n);
    expect(m.players.flatMap((p) => p.state.units).every((u) => !u.progress)).toBe(true);
    const again = m.exportState();
    m.pulse();
    expect(m.exportState()).toEqual(again);
    expect(() => AuthoritativeMatch.restore({ ...saved, catalog: P12F_CATALOG_HASH })).toThrow();
    const old = new AuthoritativeMatch(randomUUID(), undefined, undefined, 2, P12F_ECONOMY_CONFIG);
    expect(AuthoritativeMatch.restore(old.exportState()).config).toEqual(P12F_ECONOMY_CONFIG);
  },
);
it.each([2, 3, 4] as const)(
  '%i players finish a P13T match across repeated restores and reconnect to the final standings',
  (n) => {
    let m = new AuthoritativeMatch(
      randomUUID(),
      { now: () => 0 },
      () => 42,
      n,
      P13T_ECONOMY_CONFIG,
    );
    for (let i = 0; i < n; i++)
      m.join(`final-${i}`, { userId: fixtureUsers[i]!, name: `Local ${i}` });
    for (const p of m.players) {
      p.state.level = 7;
      p.state.xp = 0;
    }
    m.start('final-0');
    equip(m, undefined, ['jaramillo', 'peibol', 'dolea']);
    for (let i = 0; i < 150 && !m.finalResults; i++) {
      advance(m);
      m = AuthoritativeMatch.restore(m.exportState(), { now: () => 0 }, false);
      m.assertConservation();
    }
    expect(m.finalResults).not.toBeNull();
    const before = structuredClone(m.finalResults),
      p = m.players[0]!;
    m.disconnect(p.sessionId);
    expect(m.resume('final-rejoined', p.id)).not.toBeNull();
    expect(m.finalResults).toEqual(before);
    expect(m.players.every((p) => p.state.units.every((u) => !u.progress))).toBe(true);
  },
  60000,
);
