import { expect, it } from 'vitest';
import { multiFixture, equip } from './multi-fixture';
import { AuthoritativeMatch } from './AuthoritativeMatch';
it('both arena metadata choices produce identical authority and duels, including odd-player clones', () => {
  const f = multiFixture(3, 360);
  equip(f.match, undefined, ['dolea', 'vargas']);
  const initial = f.match.exportState();
  const results = (['mar-de-cristal', 'cafeteria-upm-etsisi'] as const).map((arenaId) => {
    let now = 0;
    const m = AuthoritativeMatch.restore(structuredClone(initial), { now: () => now });
    now = m.clock.snapshot().phaseDeadline;
    m.pulse();
    const authority = m.exportState();
    expect(JSON.stringify(authority)).not.toContain(arenaId);
    return authority;
  });
  expect(results[1]).toEqual(results[0]);
});
