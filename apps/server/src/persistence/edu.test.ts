import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { EDU_ECONOMY_CONFIG, P13U_ECONOMY_CONFIG } from '@tft/game-data';
import { runCombat } from '@tft/game-core';
import { AuthoritativeMatch } from '../AuthoritativeMatch';
import { equip, fixtureUsers } from '../multi-fixture';
import { EDU_CATALOG_HASH, P13U_CATALOG_HASH } from './snapshot';
it('Edu uses ranged attacks and a support ultimate and restores without changing old saved catalogs', () => {
  const old = new AuthoritativeMatch(
    randomUUID(),
    { now: () => 0 },
    () => 42,
    2,
    P13U_ECONOMY_CONFIG,
  );
  expect(old.exportState().catalog).toBe(P13U_CATALOG_HASH);
  expect(AuthoritativeMatch.restore(old.exportState()).config.eduPolicy).toBeUndefined();
  const m = new AuthoritativeMatch(randomUUID(), { now: () => 0 }, () => 42, 2, EDU_ECONOMY_CONFIG);
  for (let i = 0; i < 2; i++) m.join(`edu-${i}`, { userId: fixtureUsers[i]!, name: `Local ${i}` });
  m.start('edu-0');
  equip(m, undefined, ['edu']);
  m.clock.restore({ ...m.clock.snapshot(), remainingMs: 0 });
  m.pulse();
  expect(m.duels.length).toBeGreaterThan(0);
  for (const d of m.duels) {
    expect(d.replay.events.some((e) => e.type === 'projectile_launch')).toBe(true);
    expect(d.replay.events.some((e) => e.type === 'damage' && !!e.payload.projectileId)).toBe(true);
    expect(runCombat(d.replay.input)).toEqual(d.replay);
  }
  const snapshot = m.exportState();
  expect(snapshot.catalog).toBe(EDU_CATALOG_HASH);
  const restored = AuthoritativeMatch.restore(snapshot, { now: () => 0 }, false);
  expect(restored.config.eduPolicy).toBe('edu-support-1');
  restored.assertConservation();
});
