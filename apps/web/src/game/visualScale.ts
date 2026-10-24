/** Presentation only. Never changes hex coordinates, reach, pathfinding or saved data. */
export const CHARACTER_SCALE_CANDIDATES = [1, 1.2, 1.3, 1.4] as const;
export const DEFAULT_CHARACTER_SCALE = 1.4;
export function characterVisualScale(
  perspective: number,
  realAsset: boolean,
  multiplier = DEFAULT_CHARACTER_SCALE,
): number {
  return perspective * (realAsset ? multiplier : 1);
}
/** A scaled drawing retains the previous input footprint around its anchored feet. */
export function originalHitBounds(
  bounds: { x: number; y: number; width: number; height: number },
  foot: { x: number; y: number },
  multiplier: number,
) {
  return {
    x: foot.x + (bounds.x - foot.x) / multiplier,
    y: foot.y + (bounds.y - foot.y) / multiplier,
    width: bounds.width / multiplier,
    height: bounds.height / multiplier,
  };
}
