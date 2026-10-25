import { describe, it, expect } from 'vitest';
import { CHARACTER_ASSETS } from './characterAssets';
import { compositeBody, compositeFlight } from './compositeVisuals';
import { resolveAnimation } from '@tft/sprite-contract';
const manifest = CHARACTER_ASSETS.find((m) => m.id === 'jaramillo')!;
describe('composite presentation is seekable and body never becomes a projectile', () => {
  it('provides real clips, unknown appearance and explicit ability/star fallbacks', () => {
    expect(manifest.provenance?.sourceStarLevel).toBeNull();
    for (const stars of [1, 2, 3] as const)
      for (const state of ['idle', 'walk', 'attack', 'death', 'ability'] as const)
        expect(resolveAnimation(manifest, stars, state).asset).not.toBeNull();
    expect(resolveAnimation(manifest, 3, 'ability').status).toBe('fallback');
  });
  it('samples windup, release, recovery and idle without ever selecting VFX as body', () => {
    for (const time of [0, 99, 200, 239, 280, 359, 360, 900]) {
      const sample = compositeBody(manifest, 'attack', time, 0, 200);
      expect(sample.asset.textureKey).not.toMatch(/projectile|impact/);
      expect(sample).toEqual(compositeBody(manifest, 'attack', time, 0, 200));
    }
    expect(compositeBody(manifest, 'attack', 200, 0, 200).frame).toBe(1);
    expect(compositeBody(manifest, 'attack', 245, 0, 200).frame).toBe(2);
    expect(compositeBody(manifest, 'attack', 300, 0, 200).asset.textureKey).toContain('recovery');
    expect(compositeBody(manifest, 'attack', 360, 0, 200).state).toBe('idle');
  });
  it('mirrors launch origin, varies distance and is independent of update rate', () => {
    const origin = { x: 20, y: -43 },
      target = { x: 0, y: -30 };
    const a = compositeFlight({ x: 0, y: 100 }, { x: 200, y: 100 }, 0, 200, 0, origin, target, 1);
    const b = compositeFlight({ x: 0, y: 100 }, { x: -200, y: 100 }, 0, 200, 0, origin, target, 1);
    expect(a.x).toBe(20);
    expect(b.x).toBe(-20);
    expect(
      compositeFlight({ x: 0, y: 100 }, { x: 200, y: 100 }, 0, 200, 200, origin, target, 1),
    ).toMatchObject({ x: 200, y: 70 });
  });
});
