import { it, expect } from 'vitest';
import fs from 'node:fs';
import sharp from 'sharp';
import {
  CharacterManifestSchema,
  resolveAnimation,
  sampleAnimationFrame,
} from '@tft/sprite-contract';
import { SPLASH_ARTS } from './splashArtCatalog';
import { CHARACTER_ASSETS } from './characterAssets';
import { FLORIN_FRAMES } from '../../../../scripts/sprites/florin.mjs';
it('ships four original splash arts, valid focal points and real portrait fallbacks', async () => {
  for (const [id, art] of Object.entries(SPLASH_ARTS)) {
    expect(art.splashArtKey).toContain(id);
    const m = await sharp('apps/web/public' + art.url).metadata();
    expect(m.width).toBe(1280);
    expect(m.format).toBe('webp');
    expect(fs.statSync('apps/web/public' + art.url).size).toBeLessThan(250000);
    expect(fs.existsSync(art.provenance.source)).toBe(true);
    expect(art.focal.x).toBeGreaterThanOrEqual(0);
    expect(art.focal.x).toBeLessThanOrEqual(100);
    expect(art.focal.y).toBeGreaterThanOrEqual(0);
    expect(art.focal.y).toBeLessThanOrEqual(100);
    const fallback = resolveAnimation(
      CHARACTER_ASSETS.find((m) => m.id === id),
      1,
      'idle',
    );
    expect(
      fs.existsSync('apps/web/public' + fallback.asset!.url.replace('.png', '-portrait.png')),
    ).toBe(true);
  }
  expect(SPLASH_ARTS.jaramillo!.provenance.source).toContain('Erik');
});
it('keeps ordered, transparent native attacks for all three evolutions with explicit same-star fallbacks', async () => {
  const m = CharacterManifestSchema.parse(CHARACTER_ASSETS.find((m) => m.id === 'florin'));
  for (const stars of [1, 2, 3] as const) {
    const a = resolveAnimation(m, stars, 'attack');
    expect(a.status).toBe('available');
    expect(a.asset!.frameCount).toBe(stars === 1 ? 4 : 8);
    expect(a.asset!.sources.map((s) => s.file.match(/_([^_]+)\.png$/)![1])).toEqual(
      FLORIN_FRAMES[stars - 1],
    );
    expect(a.asset!.foot).toEqual({ x: 96, y: 160 });
    expect(a.asset!.facing).toBe('right');
    expect(a.asset!.mirrorAllowed).toBe(true);
    const stats = await sharp('apps/web/public' + a.asset!.url).stats();
    expect(stats.channels[3]!.min).toBe(0);
    const raw = await sharp('apps/web/public' + a.asset!.url)
      .ensureAlpha()
      .raw()
      .toBuffer();
    for (let n = 0; n < a.asset!.frameCount; n++) {
      let ink = 0;
      for (let y = 0; y < a.asset!.frameHeight; y++)
        for (let x = 0; x < a.asset!.frameWidth; x++)
          if (
            raw[
              (y * a.asset!.frameWidth * a.asset!.frameCount + n * a.asset!.frameWidth + x) * 4 + 3
            ]! > 0
          )
            ink++;
      expect(ink).toBeGreaterThan(400);
    }
    for (const state of ['idle', 'walk', 'death', 'ability'] as const) {
      const f = resolveAnimation(m, stars, state);
      expect(f.status).toBe('fallback');
      expect(f.selectedStars).toBe(stars);
      expect(sampleAnimationFrame(f.asset!, state, 0)).toBe(0);
    }
  }
  expect(m.composite).toBeUndefined();
});
