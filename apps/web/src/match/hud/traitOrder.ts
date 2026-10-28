import type { analyzeTraits } from '@tft/game-core';
export type TraitRow = ReturnType<typeof analyzeTraits>[number];
/** Presentation only: canonical activation comes from the analyzer, never from member count alone. */
export function traitState(row: TraitRow) {
  const live = row.thresholds.filter(
    (t) => t.effectState !== 'pending_effects' && t.availability !== 'reserved',
  );
  const active = row.active && live.length > 0;
  const implementedLevel = active
    ? Math.max(...live.map((t) => row.trait.thresholds.indexOf(t) + 1))
    : 0;
  const pending = row.trait.thresholds.some(
    (t) => t.count <= row.count && t.effectState === 'pending_effects',
  );
  const unique =
    row.trait.planning?.kind === 'unique' ||
    (row.trait.thresholds.length === 1 && row.trait.thresholds[0]!.count === 1);
  const goal = row.nextThreshold ?? row.trait.thresholds.at(-1)!.count;
  return { active, implementedLevel, pending, unique, goal, numerator: Math.min(row.count, goal) };
}
/** Active effects first, then reached level, then exact count/next-threshold progress and stable ID. */
export function sortTraitRows(rows: readonly TraitRow[]): TraitRow[] {
  const state = new Map(rows.map((r) => [r, traitState(r)]));
  return [...rows].sort((a, b) => {
    const x = state.get(a)!,
      y = state.get(b)!;
    const group = (r: TraitRow, s: ReturnType<typeof traitState>) =>
      s.active ? 0 : r.count > 0 ? 1 : 2;
    const category = group(a, x) - group(b, y);
    if (category) return category;
    if (x.active && y.active && a.level !== b.level) return b.level - a.level;
    const progress = y.numerator * x.goal - x.numerator * y.goal;
    if (progress) return progress;
    return a.trait.id < b.trait.id ? -1 : a.trait.id > b.trait.id ? 1 : 0;
  });
}
export function traitStatus(row: TraitRow) {
  const s = traitState(row);
  if (s.unique)
    return `Atributo único · ${s.active ? 'Activo' : s.pending ? 'Efecto pendiente' : 'Inactivo'}`;
  if (s.pending)
    return s.active
      ? `Nivel ${row.level} · Escalón pendiente; efecto activo ${s.implementedLevel}`
      : `Nivel ${row.level} · Efectos pendientes`;
  return s.active ? `Nivel ${row.level} · Activa` : 'Inactiva';
}
