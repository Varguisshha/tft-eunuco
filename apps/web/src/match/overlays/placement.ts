export type SurfaceRect = { left: number; top: number; right: number; bottom: number };
export type SurfaceOrigin = 'inventory' | 'inspector' | 'context';
/** Source policy chooses a nearby side; collision ties use distance, never unrelated DOM order. */
export function placeSurface(
  anchor: SurfaceRect,
  width: number,
  height: number,
  viewport: { width: number; height: number },
  obstacles: SurfaceRect[] = [],
  context?: { origin: SurfaceOrigin; bounds: SurfaceRect },
) {
  const gap = 10,
    margin = 8,
    w = Math.min(width, viewport.width - 2 * margin),
    h = Math.min(height, viewport.height - 2 * margin);
  const top = Math.max(margin, Math.min(viewport.height - h - margin, anchor.top));
  const source = context?.bounds ?? anchor;
  const preferred =
    context?.origin === 'inspector'
      ? [source.left - w - gap, source.right + gap]
      : [source.right + gap, source.left - w - gap];
  const candidates = [
    ...preferred,
    anchor.right + gap,
    anchor.left - w - gap,
    ...obstacles.flatMap((r) => [r.right + gap, r.left - w - gap]),
  ].map((x) => Math.max(margin, Math.min(viewport.width - w - margin, x)));
  const overlap = (left: number) =>
    obstacles.reduce(
      (n, r) =>
        n +
        Math.max(0, Math.min(left + w, r.right) - Math.max(left, r.left)) *
          Math.max(0, Math.min(top + h, r.bottom) - Math.max(top, r.top)),
      0,
    );
  const distance = (left: number) => Math.max(0, source.left - left - w, left - source.right);
  const closest = candidates.reduce((best, x) => {
    const delta = overlap(x) - overlap(best);
    return delta < 0 || (delta === 0 && distance(x) < distance(best)) ? x : best;
  }, candidates[0]!);
  const primary = preferred[0]!;
  const primaryFits = primary >= margin && primary + w <= viewport.width - margin;
  const left = context && primaryFits && overlap(primary) === 0 ? primary : closest;
  return { left, top, width: w, maxHeight: viewport.height - 2 * margin };
}
