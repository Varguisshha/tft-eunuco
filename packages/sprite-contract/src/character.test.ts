import { describe, expect, it } from 'vitest';
import {
  CharacterManifestSchema,
  resolveAnimation,
  sampleAnimationFrame,
  animationCoverage,
} from './index';
const asset = {
  textureKey: 'test',
  url: '/test.png',
  frameWidth: 128,
  frameHeight: 128,
  frames: [0, 1, 2, 3, 4, 5, 6, 7],
  frameCount: 8,
  fps: 10,
  loop: false,
  scale: 1,
  foot: { x: 64, y: 120 },
  facing: 'right',
  mirrorAllowed: true,
  impactFrame: 2,
  status: 'provisional',
  sources: Array.from({ length: 8 }, (_, i) => ({ file: `${i}.png`, sha256: 'a'.repeat(64) })),
};
const empty = { idle: null, walk: null, attack: null, ability: null, death: null };
const manifest = CharacterManifestSchema.parse({
  version: 2,
  id: 'test',
  evolutions: {
    star1: { ...empty, attack: asset },
    star2: { ...empty, attack: { ...asset, impactFrame: 5 } },
    star3: empty,
  },
});
describe('universal visual contract', () => {
  it('accepts optional resources but requires all logical slots', () => {
    const m = structuredClone(manifest);
    m.evolutions.star1.attack = null;
    expect(CharacterManifestSchema.safeParse(m).success).toBe(true);
    expect(CharacterManifestSchema.safeParse({ ...m, evolutions: { star1: {} } }).success).toBe(
      false,
    );
  });
  it.each([1, 2] as const)('resolves missing states to same evolution attack: %s', (stars) => {
    for (const state of ['idle', 'walk', 'ability', 'death'] as const) {
      const r = resolveAnimation(manifest, stars, state);
      expect(r.status).toBe('fallback');
      expect(r.selected).toBe('attack');
      expect(r.selectedStars).toBe(stars);
      expect(r.requested).toBe(state);
    }
  });
  it('keeps 3-star request while selecting real 2-star appearance', () => {
    const r = resolveAnimation(manifest, 3, 'attack');
    expect(r.requestedStars).toBe(3);
    expect(r.selectedStars).toBe(2);
    expect(r.asset).toBe(manifest.evolutions.star2.attack);
  });
  it('prefers requested real state, then same-star attack, then earlier requested state', () => {
    const m = structuredClone(manifest);
    m.evolutions.star1.walk = m.evolutions.star1.attack;
    expect(resolveAnimation(m, 2, 'walk').selected).toBe('attack');
    m.evolutions.star2.attack = null;
    expect(resolveAnimation(m, 2, 'walk').selected).toBe('walk');
    m.evolutions.star2.walk = m.evolutions.star1.walk;
    expect(resolveAnimation(m, 2, 'walk').status).toBe('available');
  });
  it('falls through all absent evolutions and safely handles generic characters', () => {
    const m = structuredClone(manifest);
    m.evolutions.star2.attack = null;
    expect(resolveAnimation(m, 3, 'death').selectedStars).toBe(1);
    expect(resolveAnimation(undefined, 3, 'death')).toMatchObject({
      status: 'absent',
      asset: null,
    });
  });
  it('rejects invalid frame, impact, anchor and source metadata', () => {
    for (const patch of [
      { frames: [99] },
      { impactFrame: 8 },
      { foot: { x: 999, y: 0 } },
      { sources: [] },
      { scale: 0 },
    ]) {
      const m = structuredClone(manifest);
      Object.assign(m.evolutions.star1.attack!, patch);
      expect(CharacterManifestSchema.safeParse(m).success).toBe(false);
    }
  });
  it('reports two real clips and thirteen resolved fallbacks', () => {
    const c = animationCoverage(manifest);
    expect(c.filter((r) => r.status === 'available')).toHaveLength(2);
    expect(c.filter((r) => r.status === 'fallback')).toHaveLength(13);
  });
  it.each([1, 2] as const)(
    'plays all eight frames and pins impact to authority time: %s',
    (star) => {
      const a = manifest.evolutions[`star${star}`].attack!;
      const timing = { startMs: 100, impactMs: 300, endMs: 1400 };
      const frames = new Set(
        Array.from({ length: 1300 }, (_, i) => sampleAnimationFrame(a, 'attack', 100 + i, timing)),
      );
      expect([...frames]).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
      expect(sampleAnimationFrame(a, 'attack', 300, timing)).toBe(a.impactFrame);
      expect(sampleAnimationFrame(a, 'attack', 4000, timing)).toBe(7);
    },
  );
  it('idle/walk loop; death runs once and holds its last pose', () => {
    const a = manifest.evolutions.star1.attack!;
    expect(sampleAnimationFrame(a, 'idle', 800)).toBe(0);
    expect(sampleAnimationFrame(a, 'walk', 900)).toBe(1);
    expect(sampleAnimationFrame(a, 'death', 900, { startMs: 0, endMs: 550 })).toBe(7);
  });
});
