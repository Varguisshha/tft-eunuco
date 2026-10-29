import { expect, it } from 'vitest';
import { runCombat, scaledProfile } from '@tft/game-core';
import { FLORIN_ECONOMY_CONFIG as config, traitsFor } from '@tft/game-data';
import { CombatInputSchema } from '@tft/shared';
import { recoveryVisual } from './recoveryVisual';
import { CombatPlayback } from './combatPlayback';
function replay() {
  const foe = scaledProfile('test-k01', 1, config);
  foe.stats = {
    ...foe.stats,
    maxHp: 100000,
    attack: 160,
    range: 14,
    critChanceMilli: 0,
    maxMana: 0,
    startingMana: 0,
  };
  delete foe.championAbility;
  foe.ability = null;
  foe.passive = null;
  foe.traits = [];
  const ally = structuredClone(foe);
  ally.stats.attack = 0;
  return runCombat(
    CombatInputSchema.parse({
      protocolVersion: 3,
      rulesVersion: 'florin-1',
      combatId: 'recovery-visual',
      seed: 42,
      maxTicks: 450,
      obstacles: [],
      traits: traitsFor(config.catalog),
      units: [
        {
          id: 'florin',
          definitionId: 'florin',
          owner: 'south',
          position: { q: 1, r: 4 },
          profile: scaledProfile('florin', 1, config),
        },
        {
          id: 'foe',
          definitionId: 'test-k01',
          owner: 'north',
          position: { q: 1, r: 3 },
          profile: foe,
        },
        {
          id: 'ally',
          definitionId: 'dolea',
          owner: 'south',
          position: { q: -2, r: 6 },
          profile: ally,
        },
      ],
    }),
  );
}
it('retreat, absent indicator and return sample only authoritative events, with no fake countdown', () => {
  const r = replay(),
    before = JSON.stringify(r),
    p = { x: 500, y: 350 },
    edge = { x: 115, y: 180 };
  const events = r.events.filter((e) => e.type === 'unit_presence');
  expect(events.length).toBeGreaterThanOrEqual(2);
  for (const e of events) {
    if (e.type !== 'unit_presence') continue;
    const unit = r.snapshots[e.tick]!.units.find((u) => u.id === 'florin')!;
    const a = recoveryVisual(unit, r.events, e.tick * 100, p, edge)!;
    expect(a.active).toBe(true);
    expect(a.position).toEqual(e.payload.away ? p : edge);
    const b = recoveryVisual(
      unit,
      r.events.filter((x) => x.tick <= e.tick),
      e.tick * 100 + 450,
      p,
      edge,
    )!;
    expect(b.opacity).toBe(e.payload.away ? 0 : 1);
    expect(b.label).not.toMatch(/\d+\s*s/);
    const reduced = recoveryVisual(unit, r.events, e.tick * 100 + 120, p, edge, true)!;
    expect(reduced.position).toEqual(p);
    expect(reduced.opacity).toBe(e.payload.away ? 0 : 1);
    const x1 = new CombatPlayback(r),
      x2 = new CombatPlayback(r);
    x1.seek(e.tick * 100);
    x2.seek(e.tick * 100);
    x2.setSpeed(2);
    x1.advance(200);
    x2.advance(100);
    expect(x1.frame()).toEqual(x2.frame());
  }
  expect(JSON.stringify(r)).toBe(before);
});
