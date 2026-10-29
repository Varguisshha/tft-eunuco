/** Geometry only: no DOM order, phase permissions, state mutation or commands. */
export type DropArea = { id: string; left: number; top: number; width: number; height: number };
export function resolveDropArea(
  point: { x: number; y: number },
  areas: readonly DropArea[],
  padding = 8,
  ambiguity = 0.12,
): { id: string | null; ambiguous: boolean } {
  const ranked = areas
    .map((a) => {
      const dx = Math.abs(point.x - a.left - a.width / 2),
        dy = Math.abs(point.y - a.top - a.height / 2);
      return {
        id: a.id,
        score: Math.max(dx / (a.width / 2 + padding), dy / (a.height / 2 + padding)),
      };
    })
    .filter((a) => a.score <= 1)
    .sort((a, b) => a.score - b.score || a.id.localeCompare(b.id));
  if (!ranked[0]) return { id: null, ambiguous: false };
  if (ranked[1] && ranked[1].score - ranked[0].score < ambiguity)
    return { id: null, ambiguous: true };
  return { id: ranked[0].id, ambiguous: false };
}
export function resolveElementDrop(
  x: number,
  y: number,
  elements: readonly HTMLElement[],
  key: string,
) {
  return resolveDropArea(
    { x, y },
    elements.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        id: el.getAttribute(key)!,
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
      };
    }),
  );
}
