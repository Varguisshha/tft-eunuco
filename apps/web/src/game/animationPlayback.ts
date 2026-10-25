import { TICK_MS, type CombatEventV3, type CombatUnit } from '@tft/shared';
import type { AnimationName, AnimationTiming } from '@tft/sprite-contract';
export interface VisualCue {
  state: AnimationName;
  timing?: AnimationTiming;
}
/** Samples authority history; never emits or mutates combat events. Recovery stops at interruptions. */
export function unitAnimationCue(
  unit: CombatUnit,
  timeMs: number,
  events: readonly CombatEventV3[],
): VisualCue {
  if (unit.deathTick !== null)
    return {
      state: 'death',
      timing: { startMs: unit.deathTick * TICK_MS, endMs: unit.deathTick * TICK_MS + 550 },
    };
  if (unit.statuses.some((s) => s.kind === 'stun')) return { state: 'idle' };
  const chain = [...events]
    .reverse()
    .find(
      (e) =>
        e.type === 'chain_attack' &&
        e.payload.unitId === unit.id &&
        e.tick * TICK_MS <= timeMs &&
        timeMs - e.tick * TICK_MS < 160,
    );
  if (chain)
    return {
      state: 'attack',
      timing: {
        startMs: chain.tick * TICK_MS,
        impactMs: chain.tick * TICK_MS,
        endMs: chain.tick * TICK_MS + 160,
      },
    };
  const action = unit.action;
  if (action?.kind === 'move' || action?.kind === 'jump') return { state: 'walk' };
  if (action?.kind === 'cast')
    return {
      state: 'ability',
      timing: { startMs: action.startTick * TICK_MS, endMs: action.endTick * TICK_MS },
    };
  const relevant = events.filter(
    (e) =>
      'unitId' in e.payload &&
      e.payload.unitId === unit.id &&
      (e.type === 'attack_start' ||
        e.type === 'chain_attack' ||
        e.type === 'jump_start' ||
        e.type === 'move_start' ||
        e.type === 'action_cancel' ||
        (e.type === 'status_apply' && e.payload.status.kind === 'stun') ||
        (e.type === 'ability_cast' && e.payload.stage === 'start')),
  );
  let index = relevant.length - 1;
  while (index >= 0 && relevant[index]!.tick * TICK_MS > timeMs) index--;
  const last = relevant[index];
  if (last?.type === 'chain_attack' && timeMs - last.tick * TICK_MS < 240)
    return {
      state: 'attack',
      timing: {
        startMs: last.tick * TICK_MS,
        impactMs: last.tick * TICK_MS,
        endMs: last.tick * TICK_MS + 240,
      },
    };
  if (
    last?.type === 'ability_cast' &&
    last.payload.additional &&
    timeMs - last.tick * TICK_MS < 300
  )
    return {
      state: 'ability',
      timing: { startMs: last.tick * TICK_MS, endMs: last.tick * TICK_MS + 300 },
    };
  if (
    last?.type === 'ability_cast' &&
    !last.payload.additional &&
    timeMs < last.payload.endTick * TICK_MS + 160
  ) {
    const released = events.some(
      (e) =>
        e.type === 'projectile_launch' &&
        e.payload.cause === 'ability' &&
        e.payload.sourceId === unit.id &&
        e.tick === last.payload.endTick,
    );
    if (released)
      return {
        state: 'ability',
        timing: {
          startMs: last.tick * TICK_MS,
          impactMs: last.payload.endTick * TICK_MS,
          endMs: last.payload.endTick * TICK_MS + 160,
        },
      };
  }
  if (last?.type === 'attack_start') {
    const next = relevant[index + 1];
    const startMs = last.tick * TICK_MS,
      impactMs = last.payload.releaseTick * TICK_MS;
    const endMs = next
      ? next.tick * TICK_MS
      : Math.max(impactMs + 100, startMs + 1_000_000 / unit.profile.stats.attackSpeedMilli);
    // An interrupted windup has no damage/release; do not continue its recovery pose.
    const released =
      action?.kind === 'attack' ||
      events.some(
        (e) =>
          e.tick === last.payload.releaseTick &&
          ((e.type === 'damage' &&
            e.payload.cause === 'attack' &&
            e.payload.sourceId === unit.id) ||
            (e.type === 'projectile_launch' && e.payload.sourceId === unit.id)),
      );
    if (timeMs < endMs && released)
      return { state: 'attack', timing: { startMs, impactMs, endMs } };
  }
  return { state: 'idle' };
}
