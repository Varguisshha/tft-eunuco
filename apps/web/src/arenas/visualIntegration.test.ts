import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { getUnitDefinition } from '@tft/game-data';
import { resolveAnimation } from '@tft/sprite-contract';
import { PhaserUnitVisual } from '../game/visualAdapter';
import { characterManifest } from '../game/characterAssets';
import { MAR_DE_CRISTAL as arena } from './marDeCristal';
import { ArenaRegistry } from './registry';
import { characterScale } from './arena';
vi.mock('phaser', () => ({ default: {} }));
// Observable rendering boundary; actual adapter, manifests and animation sampler remain real.
class DisplayObject {
  x = 0;
  y = 0;
  depth = 0;
  scaleX = 1;
  scaleY = 1;
  originX = 0;
  originY = 0;
  flipX = false;
  texture = '';
  frame = 0;
  destroyed = false;
  visible = true;
  setVisible(visible: boolean) {
    this.visible = visible;
    return this;
  }
  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
    return this;
  }
  setDepth(v: number) {
    this.depth = v;
    return this;
  }
  setScale(x: number, y = x) {
    this.scaleX = x;
    this.scaleY = y;
    return this;
  }
  setOrigin(x: number, y = x) {
    this.originX = x;
    this.originY = y;
    return this;
  }
  setFlipX(v: boolean) {
    this.flipX = v;
    return this;
  }
  setTexture(key: string, frame = 0) {
    this.texture = key;
    this.frame = frame;
    return this;
  }
  setStrokeStyle() {
    return this;
  }
  setText() {
    return this;
  }
  setAlpha() {
    return this;
  }
  clear() {
    return this;
  }
  lineStyle() {
    return this;
  }
  fillStyle() {
    return this;
  }
  fillRect() {
    return this;
  }
  strokeRect() {
    return this;
  }
  destroy() {
    this.destroyed = true;
  }
}
function scene() {
  const objects: DisplayObject[] = [];
  const make = () => {
    const o = new DisplayObject();
    objects.push(o);
    return o;
  };
  return {
    objects,
    value: {
      textures: { exists: () => true },
      add: {
        sprite: make,
        ellipse: make,
        text: make,
        graphics: () => new DisplayObject(),
        container: () => new DisplayObject(),
      },
    } as unknown as Phaser.Scene,
  };
}
beforeEach(() => vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) }));
afterEach(() => vi.unstubAllGlobals());
it.each(
  Object.values(ArenaRegistry).flatMap((arena) =>
    ([1, 2, 3] as const).map((stars) => ({ arena, stars })),
  ),
)(
  '$arena.id: resized Jaramillo $stars★ keeps feet and scale through combat and fallback poses',
  ({ arena, stars }) => {
    const fake = scene();
    const visual = new PhaserUnitVisual(
      fake.value,
      getUnitDefinition('jaramillo')!,
      'south',
      arena,
    );
    visual.setStars(stars);
    visual.setVisualMultiplier(1.4);
    visual.setFootPosition(800, 600);
    const sprite = visual.sprite as unknown as DisplayObject;
    const asset = resolveAnimation(characterManifest('jaramillo'), stars, 'attack').asset!;
    const expectedScale = asset.scale * characterScale(arena, 600) * 1.4;
    for (const facing of ['right', 'left'] as const) {
      visual.setFacing(facing);
      for (const animation of ['idle', 'walk', 'attack', 'ability', 'death'] as const)
        for (const ms of [0, 100, 199, 200, 250, 419, 420, 800]) {
          visual.play(animation, ms, { startMs: 0, impactMs: 200, endMs: 800 });
          expect(sprite.x).toBe(800);
          expect(sprite.y).toBe(600);
          expect(sprite.scaleX).toBeCloseTo(expectedScale);
          expect(sprite.scaleY).toBeCloseTo(expectedScale);
          expect(sprite.originY).toBe(asset.foot.y / asset.frameHeight);
          expect(sprite.originX).toBe(
            facing === 'left'
              ? 1 - asset.foot.x / asset.frameWidth
              : asset.foot.x / asset.frameWidth,
          );
          expect(sprite.depth).toBe(1600);
        }
    }
    visual.destroy();
  },
);
it.each(
  Object.values(ArenaRegistry).flatMap((arena) =>
    ([1, 2, 3] as const).map((stars) => ({ arena, stars })),
  ),
)(
  '$arena.id: DOLEA $stars★ keeps feet, uniform scale and depth for all attack frames and fallbacks',
  ({ arena, stars }) => {
    const fake = scene();
    const visual = new PhaserUnitVisual(fake.value, getUnitDefinition('dolea')!, 'south', arena);
    visual.setStars(stars);
    visual.setFootPosition(800, 600);
    const sprite = visual.sprite as unknown as DisplayObject;
    const manifest = characterManifest('dolea')!;
    const asset = resolveAnimation(manifest, stars, 'attack').asset!;
    const frames = new Set<number>();
    for (let ms = 0; ms <= 1000; ms += 5) {
      visual.play('attack', ms, { startMs: 0, impactMs: 450, endMs: 1000 });
      frames.add(sprite.frame);
      expect(sprite.x).toBe(800);
      expect(sprite.y).toBe(600);
      expect(sprite.scaleX).toBe(sprite.scaleY);
      expect(sprite.scaleX).toBeCloseTo(asset.scale * characterScale(arena, 600));
      expect(sprite.depth).toBe(1600);
      expect(sprite.originY).toBe(asset.foot.y / asset.frameHeight);
    }
    expect(frames.size).toBe(stars === 1 ? 5 : 8);
    expect(frames).toEqual(new Set(asset.frames));
    for (const animation of ['idle', 'walk', 'death'] as const) {
      visual.play(animation, 220);
      const fallback = resolveAnimation(manifest, stars, animation).asset!;
      expect(sprite.scaleX).toBeCloseTo(fallback.scale * characterScale(arena, 600));
      expect(sprite.originY).toBe(fallback.foot.y / fallback.frameHeight);
      expect(visual.hasRealAsset).toBe(true);
      expect(sprite.x).toBe(800);
      expect(sprite.y).toBe(600);
      expect(sprite.scaleX).toBe(sprite.scaleY);
    }
    visual.setFacing('left');
    expect(sprite.flipX).toBe(true);
    expect(sprite.x).toBe(800);
    const death = resolveAnimation(manifest, stars, 'death').asset!;
    expect(sprite.originX).toBe(1 - death.foot.x / death.frameWidth);
    const oldScale = sprite.scaleX;
    visual.setFootPosition(700, 700);
    expect(sprite.depth).toBe(1700);
    expect(sprite.scaleX).toBeGreaterThan(oldScale);
    visual.setVisible(false);
    expect(fake.objects.every((o) => !o.visible)).toBe(true);
    visual.setVisible(true);
    expect(fake.objects.every((o) => o.visible)).toBe(true);
    visual.destroy();
    expect(fake.objects.every((o) => o.destroyed)).toBe(true);
  },
);
it('technical sprites keep their old scale and depth, while arena shadows stay under every character', () => {
  const fake = scene();
  const def = getUnitDefinition('dolea')!;
  const technical = new PhaserUnitVisual(fake.value, def, 'south');
  technical.setFootPosition(200, 300);
  expect(technical.renderScale).toBe(1);
  expect(technical.sprite.depth).toBe(310);
  const localScene = scene();
  const local = new PhaserUnitVisual(localScene.value, def, 'north', arena);
  local.setFootPosition(600, 700);
  const shadow = localScene.objects[1]!;
  expect(shadow.depth).toBe(100);
  expect(local.sprite.depth).toBeGreaterThan(shadow.depth);
});
