import { expect, it } from 'vitest';
import { originOffset, placeholderMetadata, SpriteMetadataSchema } from './index';
it('provides all five animations and a stable support point', () => {
  const meta = placeholderMetadata('test');
  expect(Object.keys(meta.animations)).toEqual(['idle', 'walk', 'attack', 'ability', 'death']);
  expect(originOffset(meta, 2)).toEqual({ x: 0, y: 4 });
  expect(SpriteMetadataSchema.parse(JSON.parse(JSON.stringify(meta)))).toEqual(meta);
});
it('rejects out-of-sheet frames and out-of-clip impact markers', () => {
  const meta = placeholderMetadata('test');
  expect(
    SpriteMetadataSchema.safeParse({
      ...meta,
      animations: { ...meta.animations, attack: { ...meta.animations.attack, frames: [1] } },
    }).success,
  ).toBe(false);
  expect(
    SpriteMetadataSchema.safeParse({
      ...meta,
      animations: { ...meta.animations, attack: { ...meta.animations.attack, impactFrame: 1 } },
    }).success,
  ).toBe(false);
  expect(SpriteMetadataSchema.safeParse({ ...meta, foot: { x: 50, y: 38 } }).success).toBe(false);
});
it('mirrors an off-center support point around the declared origin', () => {
  const meta = { ...placeholderMetadata('test'), foot: { x: 12, y: 38 } };
  expect(originOffset(meta, 2)).toEqual({ x: 8, y: 4 });
  expect(originOffset(meta, 2, true)).toEqual({ x: -8, y: 4 });
});
