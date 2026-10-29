import { TICK_MS, type CombatEventV3, type CombatUnit } from '@tft/shared';
import type { Point } from '@tft/game-core';
/** Samples only already-released presence events. No future return time is inferred. */
export function recoveryVisual(
  unit: CombatUnit,
  events: readonly CombatEventV3[],
  timeMs: number,
  position: Point,
  edge: Point,
  reduced = false,
) {
  const event = [...events]
    .reverse()
    .find(
      (e) =>
        e.type === 'unit_presence' && e.payload.unitId === unit.id && e.tick * TICK_MS <= timeMs,
    );
  const away = !!unit.mechanics?.recovery?.away;
  if (!away && (!event || event.type !== 'unit_presence' || event.payload.away)) return null;
  const duration = reduced ? 120 : away ? 450 : 400;
  const age = event ? Math.max(0, timeMs - event.tick * TICK_MS) : duration;
  const progress = Math.min(1, age / duration);
  const eased = 1 - (1 - progress) ** 3;
  const from = away ? position : edge,
    to = away ? edge : position;
  return {
    away,
    active: away || progress < 1,
    position: reduced
      ? position
      : { x: from.x + (to.x - from.x) * eased, y: from.y + (to.y - from.y) * eased },
    opacity: away ? 1 - progress : 0.35 + progress * 0.65,
    marker: edge,
    // Healing and last-ally conditions govern the return, so a timer would be misleading.
    label: `${Math.round((unit.hp / unit.profile.stats.maxHp) * 100)} % vida · recuperándose`,
  };
}
