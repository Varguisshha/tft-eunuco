import { expect, it } from 'vitest';
import sharp from 'sharp';
import fs from 'node:fs';
import { resolveAnimation, resolveComposite, sampleAnimationFrame } from '@tft/sprite-contract';
import { characterManifest } from './characterAssets';
import { compositeBody } from './compositeVisuals';
it.each([1, 2, 3] as const)(
  'Sanchez %i★ retains eight body frames and an independent musical projectile',
  async (stars) => {
    const m = characterManifest('sanchez')!,
      c = resolveComposite(m, stars)!;
    expect(characterManifest('provisional-sanchez')).toBe(m);
    for (const state of ['idle', 'attack', 'death'] as const) {
      const a = resolveAnimation(m, stars, state).asset!;
      expect(a.frameCount).toBe(state === 'idle' ? 4 : state === 'attack' ? 8 : 6);
      const meta = await sharp('apps/web/public' + a.url).metadata();
      expect(meta.width).toBe(a.frameWidth * a.frameCount);
      expect(meta.hasAlpha).toBe(true);
      expect((await sharp('apps/web/public' + a.url).stats()).channels[3]!.min).toBe(0);
      for (const s of a.sources) expect(fs.existsSync(s.file)).toBe(true);
    }
    for (const time of [0, 100, 599, 600, 650, 750, 900]) {
      const body = compositeBody(m, 'ability', time, 0, 600, stars);
      expect(body.asset).not.toBe(c.projectileAnimation);
      expect(body.asset.textureKey).toContain(`star${stars}`);
    }
    expect(c.projectileAnimation.sources[0]!.file).toContain('/projectile/');
    expect(resolveAnimation(m, stars, 'walk').selected).toBe('idle');
    expect(
      sampleAnimationFrame(m.evolutions[`star${stars}`].death!, 'death', 1000, {
        startMs: 0,
        endMs: 550,
      }),
    ).toBe(5);
  },
);
