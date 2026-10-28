/** Competition ranking: ties use competition positions (1,1,3), never identity. */
export function eliminationPlaces<T extends { id: string; hpBefore: number; damage: number }>(
  eliminated: readonly T[],
  survivors: number,
): Map<string, number> {
  return new Map(
    eliminated.map((p) => [
      p.id,
      survivors +
        1 +
        eliminated.filter(
          (other) =>
            other.hpBefore > p.hpBefore ||
            (other.hpBefore === p.hpBefore && other.damage < p.damage),
        ).length,
    ]),
  );
}
