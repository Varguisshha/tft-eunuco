import { compositeBody } from './compositeVisuals';
import { characterVisualScale, originalHitBounds } from './visualScale';
import Phaser from 'phaser';
import {
  originOffset,
  placeholderMetadata,
  SpriteMetadataSchema,
  type AnimationName,
  type SpriteMetadata,
  type UnitVisual,
  resolveAnimation,
  sampleAnimationFrame,
  type AnimationTiming,
  type AnimationAsset,
  type VisualStars,
} from '@tft/sprite-contract';
import type { UnitDefinition } from '@tft/shared';
import { characterManifest } from './characterAssets';
import { pixelRects } from './pixelArt';
import { characterDepth, characterScale, type ArenaDefinition } from '../arenas/arena';

export function registerPlaceholder(
  scene: Phaser.Scene,
  definition: UnitDefinition,
): SpriteMetadata {
  const meta = placeholderMetadata(definition.spriteId);
  if (!scene.textures.exists(meta.textureKey)) {
    const canvas = document.createElement('canvas');
    canvas.width = meta.frameWidth;
    canvas.height = meta.frameHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo crear el sprite provisional.');
    for (const [x, y, w, h, color] of pixelRects(definition.role)) {
      context.fillStyle = color;
      context.fillRect(x, y, w, h);
    }
    scene.textures.addCanvas(meta.textureKey, canvas);
  }
  return meta;
}
/** A real spritesheet can use the same adapter after preload + metadata validation. */
export class PhaserUnitVisual implements UnitVisual {
  readonly sprite: Phaser.GameObjects.Sprite;
  private marker: Phaser.GameObjects.Ellipse;
  private stars: Phaser.GameObjects.Text;
  private foot = { x: 0, y: 0 };
  private flipped = false;
  private readonly meta: SpriteMetadata;
  private scale = 1.65;
  private count: VisualStars = 1;
  private asset: AnimationAsset | null = null;
  private animation: AnimationName = 'idle';
  private timeMs = 0;
  private timing: AnimationTiming | undefined;
  private manifest;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  constructor(
    private scene: Phaser.Scene,
    definition: UnitDefinition,
    side: 'north' | 'south',
    private arena?: ArenaDefinition,
  ) {
    this.meta = SpriteMetadataSchema.parse(registerPlaceholder(scene, definition));
    this.manifest = characterManifest(definition.spriteId);
    this.stars = scene.add
      .text(0, 0, '', { fontSize: '16px', color: '#e7cb85', stroke: '#101916', strokeThickness: 3 })
      .setOrigin(0.5);
    this.marker = scene.add
      .ellipse(0, 0, 42, 14, 0x080e0b, 0.55)
      .setStrokeStyle(1, side === 'south' ? 0x8bc4a2 : 0xdfb579, 0.65);
    this.sprite = scene.add
      .sprite(0, 0, this.meta.textureKey)
      .setOrigin(this.meta.origin.x, this.meta.origin.y)
      .setScale(this.scale);
    this.setFacing(side === 'south' ? 'right' : 'left');
    this.play('idle');
  }
  private visualMultiplier = 1;
  setVisualMultiplier(value: number): void {
    this.visualMultiplier = value;
    this.setFootPosition(this.foot.x, this.foot.y);
  }
  containsPoint(x: number, y: number): boolean {
    const b = this.hitBounds;
    return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
  }
  get hitBounds() {
    const bounds = this.sprite.getBounds();
    return originalHitBounds(
      bounds,
      this.foot,
      this.asset && this.arena ? this.visualMultiplier : 1,
    );
  }
  get renderScale(): number {
    return characterVisualScale(
      this.arena ? characterScale(this.arena, this.foot.y) : 1,
      !!this.asset && !!this.arena,
      this.visualMultiplier,
    );
  }
  setFootPosition(x: number, y: number): void {
    this.foot = { x, y };
    const factor = this.renderScale;
    const depth = this.arena ? characterDepth(y) : y + 10;
    this.sprite.setScale(this.scale * factor);
    this.stars
      .setPosition(x, y + 14 * factor)
      .setScale(factor)
      .setDepth(this.arena ? 4200 : y + 12);
    const offset = this.asset
      ? { x: 0, y: 0 }
      : originOffset(this.meta, this.scale * factor, this.flipped);
    this.marker
      .setPosition(x, y)
      .setScale(factor)
      .setDepth(this.arena ? 100 : y + 9);
    this.sprite.setPosition(x + offset.x, y + offset.y).setDepth(depth);
  }
  setSelected(selected: boolean): void {
    this.marker.setStrokeStyle(
      selected ? 2 : 1,
      selected ? 0xe5e8c9 : 0x81ac91,
      selected ? 1 : 0.5,
    );
  }
  setFacing(facing: 'left' | 'right'): void {
    this.flipped =
      (this.asset?.mirrorAllowed ?? this.meta.mirrorAllowed) &&
      facing !== (this.asset?.facing ?? this.meta.facing);
    this.sprite.setFlipX(this.flipped);
    if (this.asset)
      this.sprite.setOrigin(
        this.flipped
          ? 1 - this.asset.foot.x / this.asset.frameWidth
          : this.asset.foot.x / this.asset.frameWidth,
        this.asset.foot.y / this.asset.frameHeight,
      );
    this.setFootPosition(this.foot.x, this.foot.y);
  }
  play(animation: AnimationName, timeMs = this.timeMs, timing?: AnimationTiming): void {
    this.animation = animation;
    this.timeMs = timeMs;
    this.timing = timing;
    const resolved = resolveAnimation(this.manifest, this.count, animation);
    const compound =
      this.manifest?.composite && timing && (animation === 'attack' || animation === 'ability')
        ? compositeBody(
            this.manifest,
            animation,
            timeMs,
            timing.startMs,
            timing.impactMs ?? timing.endMs,
          )
        : null;
    const chosen = compound?.asset ?? resolved.asset;
    const asset = chosen && this.scene.textures.exists(chosen.textureKey) ? chosen : null;
    this.asset = asset;
    if (asset) {
      this.scale = asset.scale;
      this.sprite
        .setTexture(
          asset.textureKey,
          compound?.frame ??
            sampleAnimationFrame(
              asset,
              animation,
              this.reducedMotion.matches && (animation === 'idle' || animation === 'walk')
                ? 0
                : timeMs,
              timing,
            ),
        )
        .setOrigin(
          this.flipped ? 1 - asset.foot.x / asset.frameWidth : asset.foot.x / asset.frameWidth,
          asset.foot.y / asset.frameHeight,
        )
        .setScale(this.scale);
    } else {
      this.scale = 1.65;
      this.sprite
        .setTexture(this.meta.textureKey)
        .setOrigin(this.meta.origin.x, this.meta.origin.y)
        .setScale(this.scale);
    }
    this.setFootPosition(this.foot.x, this.foot.y);
  }
  get hasRealAsset(): boolean {
    return this.asset !== null;
  }
  setStars(count: number): void {
    const stars = Math.max(1, Math.min(3, count)) as VisualStars;
    if (this.count !== stars) {
      this.count = stars;
      this.play(this.animation, this.timeMs, this.timing);
    }
    this.stars.setText(count > 1 ? '★'.repeat(count) : '');
  }
  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
    this.marker.setVisible(visible);
    this.stars.setVisible(visible);
  }
  setOpacity(alpha: number): void {
    this.stars.setAlpha(alpha);
    this.sprite.setAlpha(alpha);
    this.marker.setAlpha(alpha);
  }
  destroy(): void {
    this.marker.destroy();
    this.stars.destroy();
    this.sprite.destroy();
  }
}
