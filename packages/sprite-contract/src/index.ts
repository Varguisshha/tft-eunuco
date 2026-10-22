import { z } from 'zod';
export const ANIMATION_NAMES = ['idle', 'walk', 'attack', 'ability', 'death'] as const;
export type AnimationName = (typeof ANIMATION_NAMES)[number];
const pixelPoint = z.strictObject({ x: z.number().nonnegative(), y: z.number().nonnegative() });
const clipSchema = z
  .strictObject({
    frames: z.array(z.number().int().nonnegative()).min(1),
    fps: z.number().positive().max(60),
    loop: z.boolean(),
    impactFrame: z.number().int().nonnegative().nullable(),
  })
  .superRefine((clip, ctx) => {
    if (clip.impactFrame !== null && clip.impactFrame >= clip.frames.length)
      ctx.addIssue({ code: 'custom', message: 'Impact index outside clip' });
  });
export const SpriteMetadataSchema = z
  .strictObject({
    version: z.literal(1),
    id: z.string().min(1),
    textureKey: z.string().min(1),
    frameWidth: z.number().int().positive(),
    frameHeight: z.number().int().positive(),
    frameCount: z.number().int().positive(),
    origin: z.strictObject({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }),
    foot: pixelPoint,
    facing: z.enum(['left', 'right']),
    mirrorAllowed: z.boolean(),
    animations: z.strictObject({
      idle: clipSchema,
      walk: clipSchema,
      attack: clipSchema,
      ability: clipSchema,
      death: clipSchema,
    }),
  })
  .superRefine((meta, ctx) => {
    if (meta.foot.x > meta.frameWidth || meta.foot.y > meta.frameHeight)
      ctx.addIssue({ code: 'custom', message: 'Foot outside frame' });
    for (const name of ANIMATION_NAMES) {
      if (meta.animations[name].frames.some((frame) => frame >= meta.frameCount))
        ctx.addIssue({
          code: 'custom',
          message: 'Frame outside sheet',
          path: ['animations', name, 'frames'],
        });
    }
  });
export type SpriteMetadata = z.infer<typeof SpriteMetadataSchema>;
/** Engine-independent view port; implementing this does not grant authority over rules. */
export interface UnitVisual {
  setFootPosition(x: number, y: number): void;
  setSelected(selected: boolean): void;
  setFacing(facing: 'left' | 'right'): void;
  play(animation: AnimationName): void;
  destroy(): void;
}
export function placeholderMetadata(id: string): SpriteMetadata {
  const still = { frames: [0], fps: 1, loop: false, impactFrame: null };
  return SpriteMetadataSchema.parse({
    version: 1,
    id,
    textureKey: id,
    frameWidth: 32,
    frameHeight: 40,
    frameCount: 1,
    origin: { x: 0.5, y: 1 },
    foot: { x: 16, y: 38 },
    facing: 'right',
    mirrorAllowed: true,
    animations: {
      idle: { ...still, loop: true },
      walk: still,
      attack: still,
      ability: still,
      death: still,
    },
  });
}
/** Convert the support point into the render object's origin, keeping rules unaware of art. */
export function originOffset(
  meta: SpriteMetadata,
  scale: number,
  flipped = false,
): { x: number; y: number } {
  return {
    x: (meta.origin.x * meta.frameWidth - meta.foot.x) * scale * (flipped ? -1 : 1),
    y: (meta.origin.y * meta.frameHeight - meta.foot.y) * scale,
  };
}
