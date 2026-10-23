import { TICK_MS, type CombatEventV3, type CombatUnit } from '@tft/shared';
import { axialToCartesian } from '@tft/game-core';
import { hexToWorld, projectPoint, type Projection } from './projection';
/** One projection for walking and special movement; the arc only offsets the sprite, never the board. */
export function combatVisualPosition(unit: CombatUnit, timeMs: number, projection: Projection) {
  const a = unit.action;
  if (a?.kind !== 'move' && a?.kind !== 'jump') return hexToWorld(unit.position, projection);
  const from = axialToCartesian(a.from),
    to = axialToCartesian(a.to),
    t = Math.max(0, Math.min(1, (timeMs / TICK_MS - a.startTick) / (a.endTick - a.startTick)));
  return projectPoint(
    { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t },
    projection,
  );
}
export function mechanicsFeedback(
  unit: CombatUnit,
  events: readonly CombatEventV3[],
  timeMs: number,
) {
  const priority = (e: CombatEventV3) =>
    e.type === 'chain_attack'
      ? 5
      : e.type === 'ability_repeat'
        ? 4
        : e.type === 'ability_empowered'
          ? 3
          : e.type === 'stack_threshold'
            ? 3
            : e.type === 'kill_attributed'
              ? 2
              : 0;
  for (const e of [...events].sort(
    (a, b) => b.tick - a.tick || priority(b) - priority(a) || b.order - a.order,
  )) {
    const age = timeMs - e.tick * TICK_MS;
    if (age < 0 || age >= 1200) continue;
    let name: string | null = null;
    if (e.type === 'kill_attributed' && e.payload.killerId === unit.id) name = 'Eliminación +1';
    if ('unitId' in e.payload && e.payload.unitId === unit.id) {
      if (e.type === 'stack_threshold') name = 'Umbral activado';
      if (e.type === 'ability_empowered') name = `Habilidad ×${e.payload.powerMilli / 1000}`;
      if (e.type === 'ability_repeat' && e.payload.stage === 'resolve') name = 'Reejecución';
      if (e.type === 'chain_attack') name = 'Ataque encadenado';
      if (e.type === 'jump_start') name = 'Salto';
    }
    if (name) return { key: `mechanic:${e.tick}:${e.order}`, name, age };
  }
  return null;
}
