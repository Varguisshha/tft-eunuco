import { it, expect } from 'vitest';
import { P12B_ECONOMY_CONFIG, P11K_ECONOMY_CONFIG } from '@tft/game-data';
import { createMatch } from '../match/engine';
import { LocalMatchCoordinator } from '../match/coordinator';
import { validateMatchState } from '../match/invariants';
import { grantItemInstances, grantRoundRemover, validateItemState } from './inventory';
import { planItemDrop } from './drops';
it('new deterministic rewards do not draw RNG, keep eight components and retain historical 50/50 draws', () => {
  const players = ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002'];
  const count = [0, 0],
    types = new Set<string>();
  for (let seed = 0; seed < 4096; seed++) {
    const legacy = planItemDrop('same', 3, seed, players),
      modern = planItemDrop('same', 3, seed, players, true);
    expect({ ...modern, version: legacy.version }).toEqual(legacy);
    count[modern.quantity - 2]!++;
    modern.players.flatMap((p) => p.definitionIds).forEach((id) => types.add(id));
  }
  expect(count[0]).toBeGreaterThan(1900);
  expect(count[0]).toBeLessThan(2200);
  expect(types.size).toBe(8);
});
it('local coordinator commits component + remover journal once, restores without regrant and keeps full bag pending', () => {
  const s = createMatch(42, P12B_ECONOMY_CONFIG);
  grantItemInstances(s, 'fill', Array(16).fill('component-ad'));
  let now = 0;
  let c = new LocalMatchCoordinator(s, { matchId: 'p12b-local', time: { now: () => now } });
  c.start();
  for (
    let i = 0;
    i < 10000 && !(c.getMatch().round === 3 && c.getClock().currentPhase === 'resolution');
    i++
  ) {
    now += 100;
    c.pulse();
  }
  expect(c.getMatch().items!.removers!.issued.length).toBeGreaterThan(1);
  const match = c.getMatch(),
    serial = c.exportSave();
  expect(match.items!.distributions.every((d) => d.removerIds?.length === 1)).toBe(true);
  expect(match.items!.pending.length).toBeGreaterThan(0);
  c = LocalMatchCoordinator.restore(serial, { now: () => now });
  expect(c.getMatch().items).toEqual(match.items);
  expect(validateMatchState(c.getMatch())).toEqual(c.getMatch());
});
it('periodic lineage is required, no grants appear merely on loading, and historical policy cannot issue one', () => {
  const s = createMatch(42, P12B_ECONOMY_CONFIG),
    old = createMatch(42, P11K_ECONOMY_CONFIG);
  expect(grantRoundRemover(old, 'absent')).toBeUndefined();
  expect(validateMatchState(s).items!.removers!.issued).toHaveLength(1);
  grantRoundRemover(s, 'orphan');
  expect(() => validateItemState(s)).toThrow('lineage');
});
