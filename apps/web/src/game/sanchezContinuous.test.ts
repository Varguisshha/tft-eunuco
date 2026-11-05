import { ADVANCED_STATS_DEFAULTS } from '@tft/shared';
import { expect, it } from 'vitest';
import { runCombat, scaledProfile } from '@tft/game-core';
import { RANGED_AP_ECONOMY_CONFIG } from '@tft/game-data';
import { unitAnimationCue } from './animationPlayback';
import { spec, input } from '../../../../packages/game-core/src/combat/fixtures.test-support';
import { compositeBody } from './compositeVisuals';
import { characterManifest } from './characterAssets';
it('keeps drumming between attacks without creating extra launches, and stops for death or combat end', () => {
  const profile = scaledProfile('sanchez', 1, RANGED_AP_ECONOMY_CONFIG);
  profile.traits = [];
  const r = runCombat(
    input(
      [
        { ...spec('s', 'south', { q: 0, r: 4 }), definitionId: 'sanchez', profile },
        spec('foe', 'north', { q: 0, r: 0 }, { maxHp: 10000, attack: 0 }),
      ].map((u) => ({
        ...u,
        profile: {
          ...u.profile,
          starLevel: 1,
          stats: { ...ADVANCED_STATS_DEFAULTS, ...u.profile.stats },
        },
      })),
      { combatId: 'ranged-ap-test', rulesVersion: 'f0p13u-1', maxTicks: 60 },
    ),
  );
  const unit = r.snapshots[0]!.units.find((u) => u.id === 's')!;
  const frames = new Set<number>();
  const before = JSON.stringify(r.events);
  for (const t of [0, 100, 300, 500, 700, 800, 1100, 1500, 2400]) {
    const cue = unitAnimationCue({ ...unit, action: null }, t, r.events);
    expect(cue.state).toBe('attack');
    const body = compositeBody(
      characterManifest('sanchez')!,
      'attack',
      t,
      cue.timing!.startMs,
      cue.timing!.impactMs!,
    );
    frames.add(body!.frame);
  }
  expect(frames.size).toBeGreaterThan(3);
  expect(JSON.stringify(r.events)).toBe(before);
  expect(unitAnimationCue(unit, 300, r.events, false).state).toBe('idle');
  expect(unitAnimationCue({ ...unit, deathTick: 2 }, 300, r.events).state).toBe('death');
});
