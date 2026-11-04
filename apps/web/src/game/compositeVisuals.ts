import {
  resolveAnimation,
  resolveComposite,
  sampleAnimationFrame,
  type CharacterManifest,
  type VisualStars,
} from '@tft/sprite-contract';
import type { Point } from '@tft/game-core';
/** Pure sampling of a server-owned launch; no physics or gameplay callbacks. */
export function compositeFlight(
  from: Point,
  to: Point,
  launchMs: number,
  impactMs: number,
  timeMs: number,
  origin: Point,
  target: Point,
  scale: number,
) {
  const facing = to.x < from.x ? -1 : 1;
  const start = { x: from.x + origin.x * scale * facing, y: from.y + origin.y * scale };
  const end = { x: to.x + target.x * scale, y: to.y + target.y * scale };
  const t = Math.max(0, Math.min(1, (timeMs - launchMs) / Math.max(1, impactMs - launchMs)));
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
    angle: Math.atan2(end.y - start.y, end.x - start.x),
  };
}
export function compositeBody(
  manifest: CharacterManifest,
  state: 'attack' | 'ability',
  timeMs: number,
  startMs: number,
  releaseMs: number,
  stars: VisualStars = 1,
) {
  const c = resolveComposite(manifest, stars)!;
  const body = resolveAnimation(manifest, stars, c.bodyAnimation).asset!;
  const idle = resolveAnimation(manifest, stars, 'idle').asset!;
  if (timeMs >= releaseMs + c.visualTiming.recoveryMs)
    return {
      state: 'idle' as const,
      asset: idle,
      frame: sampleAnimationFrame(idle, 'idle', timeMs),
    };
  if (timeMs >= releaseMs && timeMs < releaseMs + c.visualTiming.releaseMs) {
    const asset = body;
    return {
      state,
      asset,
      frame:
        asset.frames[
          Math.min(
            asset.frames.length - 1,
            c.releaseMarker +
              Math.floor(
                ((timeMs - releaseMs) / c.visualTiming.releaseMs) *
                  (asset.frames.length - c.releaseMarker),
              ),
          )
        ]!,
    };
  }
  if (timeMs >= releaseMs)
    return {
      state,
      asset: c.recoveryAnimation,
      frame: sampleAnimationFrame(c.recoveryAnimation, state, timeMs, {
        startMs: releaseMs,
        endMs: releaseMs + c.visualTiming.recoveryMs,
      }),
    };
  const asset = body;
  return {
    state,
    asset,
    frame: sampleAnimationFrame(asset, 'attack', timeMs, {
      startMs,
      endMs: releaseMs,
      impactMs: releaseMs,
    }),
  };
}
