import { expect, it } from 'vitest';
import fs from 'node:fs';
import sharp from 'sharp';
import { characterManifest } from './characterAssets';
import { resolveAnimation, resolveComposite, sampleAnimationFrame } from '@tft/sprite-contract';
import { scaledProfile } from '@tft/game-core';
import { EDU_ECONOMY_CONFIG, P13U_ECONOMY_CONFIG, matchCatalog } from '@tft/game-data';
it.each([1, 2, 3] as const)(
  'Edu %i stars keeps body visible, uses own effects, and holds final death pose',
  async (stars) => {
    const m = characterManifest('edu')!,
      c = resolveComposite(m, stars);
    expect(resolveAnimation(m, stars, 'walk')).toMatchObject({
      selected: 'idle',
      status: 'fallback',
    });
    for (const state of ['idle', 'attack', 'death'] as const) {
      const a = resolveAnimation(m, stars, state).asset!;
      expect(a.textureKey).toContain(`star${stars}`);
      expect(a.frameCount).toBe(state === 'idle' ? 4 : state === 'attack' ? 8 : 6);
      const meta = await sharp('apps/web/public' + a.url).metadata();
      expect(meta.width).toBe(a.frameWidth * a.frameCount);
      expect(meta.hasAlpha).toBe(true);
      for (const source of a.sources) expect(fs.existsSync(source.file)).toBe(true);
    }
    expect(c).toBeUndefined();
    expect(resolveAnimation(m, stars, 'ability').asset).toEqual(
      m.evolutions[`star${stars}`].attack,
    );
    const death = m.evolutions[`star${stars}`].death!;
    expect(sampleAnimationFrame(death, 'death', 5000, { startMs: 0, endMs: 550 })).toBe(5);
    expect(scaledProfile('edu', stars, EDU_ECONOMY_CONFIG).stats.range).toBe(4);
    expect(scaledProfile('edu', stars, P13U_ECONOMY_CONFIG).stats.range).toBe(1);
  },
);
it('only Edu changes in the new roster', () => {
  expect(characterManifest('provisional-edu')).toBe(characterManifest('edu'));
  expect(matchCatalog(EDU_ECONOMY_CONFIG).filter((u) => u.id !== 'edu')).toEqual(
    matchCatalog(P13U_ECONOMY_CONFIG).filter((u) => u.id !== 'edu'),
  );
  expect(matchCatalog(EDU_ECONOMY_CONFIG).find((u) => u.id === 'edu')!.spriteId).toBe('edu');
});
