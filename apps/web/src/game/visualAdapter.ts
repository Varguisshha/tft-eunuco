import Phaser from 'phaser';
import {
  ANIMATION_NAMES,
  originOffset,
  placeholderMetadata,
  SpriteMetadataSchema,
  type AnimationName,
  type SpriteMetadata,
  type UnitVisual,
} from '@tft/sprite-contract';
import type { UnitDefinition } from '@tft/shared';
import { pixelRects } from './pixelArt';

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
  private foot = { x: 0, y: 0 };
  private flipped = false;
  private readonly meta: SpriteMetadata;
  private readonly scale = 1.65;
  constructor(
    private scene: Phaser.Scene,
    metadata: SpriteMetadata,
    side: 'north' | 'south',
  ) {
    this.meta = SpriteMetadataSchema.parse(metadata);
    this.marker = scene.add
      .ellipse(0, 0, 42, 14, 0x080e0b, 0.55)
      .setStrokeStyle(1, side === 'south' ? 0x8bc4a2 : 0xdfb579, 0.65);
    this.sprite = scene.add
      .sprite(0, 0, this.meta.textureKey)
      .setOrigin(this.meta.origin.x, this.meta.origin.y)
      .setScale(this.scale);
    if (this.meta.frameCount > 1)
      for (const name of ANIMATION_NAMES) {
        const key = `${this.meta.id}:${name}`;
        const clip = this.meta.animations[name];
        if (!scene.anims.exists(key))
          scene.anims.create({
            key,
            frames: clip.frames.map((frame) => ({ key: this.meta.textureKey, frame })),
            frameRate: clip.fps,
            repeat: clip.loop ? -1 : 0,
          });
      }
    this.setFacing(side === 'south' ? 'right' : 'left');
    this.play('idle');
  }
  setFootPosition(x: number, y: number): void {
    this.foot = { x, y };
    const offset = originOffset(this.meta, this.scale, this.flipped);
    this.marker.setPosition(x, y).setDepth(y + 9);
    this.sprite.setPosition(x + offset.x, y + offset.y).setDepth(y + 10);
  }
  setSelected(selected: boolean): void {
    this.marker.setStrokeStyle(
      selected ? 2 : 1,
      selected ? 0xe5e8c9 : 0x81ac91,
      selected ? 1 : 0.5,
    );
  }
  setFacing(facing: 'left' | 'right'): void {
    this.flipped = this.meta.mirrorAllowed && facing !== this.meta.facing;
    this.sprite.setFlipX(this.flipped);
    this.setFootPosition(this.foot.x, this.foot.y);
  }
  play(animation: AnimationName): void {
    if (this.meta.frameCount > 1 && this.scene.anims.exists(`${this.meta.id}:${animation}`))
      this.sprite.play(`${this.meta.id}:${animation}`, true);
  }
  setOpacity(alpha: number): void {
    this.sprite.setAlpha(alpha);
    this.marker.setAlpha(alpha);
  }
  destroy(): void {
    this.marker.destroy();
    this.sprite.destroy();
  }
}
