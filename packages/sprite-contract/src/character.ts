import { z } from 'zod';
import { ANIMATION_NAMES, type AnimationName } from './index';
const point = z.strictObject({ x: z.number().min(0), y: z.number().min(0) });
export const AnimationAssetSchema = z
  .strictObject({
    textureKey: z.string().min(1),
    url: z.string().min(1),
    frameWidth: z.number().int().positive(),
    frameHeight: z.number().int().positive(),
    frames: z.array(z.number().int().nonnegative()).min(1),
    frameCount: z.number().int().positive(),
    fps: z.number().positive().max(60),
    loop: z.boolean(),
    scale: z.number().positive(),
    foot: point,
    facing: z.enum(['left', 'right']),
    mirrorAllowed: z.boolean(),
    impactFrame: z.number().int().nonnegative().nullable(),
    status: z.enum(['provisional', 'final']),
    sources: z
      .array(
        z.strictObject({ file: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/) }),
      )
      .min(1),
  })
  .superRefine((a, ctx) => {
    if (a.frames.some((f) => f >= a.frameCount) || new Set(a.frames).size !== a.frames.length)
      ctx.addIssue({ code: 'custom', message: 'Invalid frame indices' });
    if (a.impactFrame !== null && a.impactFrame >= a.frames.length)
      ctx.addIssue({ code: 'custom', message: 'Impact outside clip' });
    if (a.foot.x > a.frameWidth || a.foot.y > a.frameHeight)
      ctx.addIssue({ code: 'custom', message: 'Foot outside canvas' });
    if (a.sources.length !== a.frameCount)
      ctx.addIssue({ code: 'custom', message: 'Source/frame count mismatch' });
  });
const slots = z.strictObject({
  idle: AnimationAssetSchema.nullable(),
  walk: AnimationAssetSchema.nullable(),
  attack: AnimationAssetSchema.nullable(),
  ability: AnimationAssetSchema.nullable(),
  death: AnimationAssetSchema.nullable(),
});
export const CharacterManifestSchema = z.strictObject({
  version: z.literal(2),
  id: z.string().min(1),
  provenance: z
    .strictObject({
      characterId: z.string().min(1),
      sourceStarLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      nativeAppearance: z.enum(['star1', 'star2', 'star3']),
      pending: z.array(z.enum(['idle', 'walk', 'attack', 'ability', 'death'])),
    })
    .optional(),
  fallbacks: z
    .strictObject({
      star1: z.array(z.union([z.literal(1), z.literal(2), z.literal(3)])),
      star2: z.array(z.union([z.literal(1), z.literal(2), z.literal(3)])),
      star3: z.array(z.union([z.literal(1), z.literal(2), z.literal(3)])),
    })
    .optional(),
  evolutions: z.strictObject({ star1: slots, star2: slots, star3: slots }),
});
export type CharacterManifest = z.infer<typeof CharacterManifestSchema>;
export type AnimationAsset = z.infer<typeof AnimationAssetSchema>;
export type VisualStars = 1 | 2 | 3;
export interface ResolvedAnimation {
  requested: AnimationName;
  requestedStars: VisualStars;
  selected: AnimationName | null;
  selectedStars: VisualStars | null;
  status: 'available' | 'fallback' | 'absent';
  asset: AnimationAsset | null;
}
/** Only describes art. No combat imports, events, callbacks or authority. */
export function resolveAnimation(
  manifest: CharacterManifest | undefined,
  stars: VisualStars,
  requested: AnimationName,
): ResolvedAnimation {
  const order: VisualStars[] = manifest?.fallbacks
    ? [stars, ...manifest.fallbacks[`star${stars}`]]
    : ([3, 2, 1] as const).filter((n) => n <= stars);
  for (const n of [...new Set(order)])
    for (const state of requested === 'attack'
      ? (['attack'] as const)
      : ([requested, 'attack'] as const)) {
      const asset = manifest?.evolutions[`star${n as VisualStars}`][state];
      if (asset)
        return {
          requested,
          requestedStars: stars,
          selected: state,
          selectedStars: n as VisualStars,
          status: n === stars && state === requested ? 'available' : 'fallback',
          asset,
        };
    }
  return {
    requested,
    requestedStars: stars,
    selected: null,
    selectedStars: null,
    status: 'absent',
    asset: null,
  };
}
export function animationCoverage(manifest: CharacterManifest) {
  return ([1, 2, 3] as const).flatMap((stars) =>
    ANIMATION_NAMES.map((state) => resolveAnimation(manifest, stars, state)),
  );
}
export interface AnimationTiming {
  startMs: number;
  endMs: number;
  impactMs?: number;
}
/** Pure seekable sampling: pause/speed are supplied by the caller's playback clock. */
export function sampleAnimationFrame(
  asset: AnimationAsset,
  requested: AnimationName,
  timeMs: number,
  timing?: AnimationTiming,
): number {
  const count = asset.frames.length;
  let index: number;
  if (timing) {
    const elapsed = Math.max(0, timeMs - timing.startMs);
    const impact = asset.impactFrame;
    if (requested === 'attack' && impact !== null && timing.impactMs !== undefined) {
      const windup = Math.max(1, timing.impactMs - timing.startMs);
      index =
        elapsed < windup
          ? Math.floor((elapsed / windup) * impact)
          : impact +
            Math.floor(
              ((elapsed - windup) / Math.max(1, timing.endMs - timing.impactMs)) * (count - impact),
            );
    } else index = Math.floor((elapsed / Math.max(1, timing.endMs - timing.startMs)) * count);
  } else index = Math.floor((Math.max(0, timeMs) * asset.fps) / 1000) % count;
  return asset.frames[Math.min(count - 1, Math.max(0, index))]!;
}
