import { effectiveStat, shieldTotal } from '@tft/game-core';
import { TICK_MS, type CombatEventV3, type CombatProfile, type CombatUnit } from '@tft/shared';

export const FEEDBACK_WINDOW_MS = 1600;
/** Stable lanes for simultaneous bursts. Numeric shield bars remain visible on every unit. */
export function feedbackLanes(
  groups: readonly { id: string; x: number; y: number; width: number }[],
  selectedId: string | null,
) {
  const placed: { x: number; y: number; width: number }[] = [];
  const offsets = new Map<string, number>();
  for (const group of [...groups].sort(
    (a, b) => Number(b.id === selectedId) - Number(a.id === selectedId) || a.id.localeCompare(b.id),
  )) {
    if (placed.length >= 6) break;
    for (const offset of [0, -44, -88]) {
      const candidate = { ...group, y: group.y + offset };
      if (
        placed.some(
          (p) =>
            Math.abs(p.x - candidate.x) < (p.width + candidate.width) / 2 + 6 &&
            Math.abs(p.y - candidate.y) < 42,
        )
      )
        continue;
      placed.push(candidate);
      offsets.set(group.id, offset);
      break;
    }
  }
  return offsets;
}
export type PassiveReadout = {
  state: 'available' | 'activated' | 'consumed' | 'inactive';
  label: string;
  detail: string;
};
/** Read authoritative counters only; never reconstruct a trigger from HP or shield. */
export function passiveReadout(
  profile: CombatProfile,
  unit: CombatUnit | undefined,
  tick: number,
  deployed = true,
): PassiveReadout {
  const passive = profile.championAbility?.passive;
  if (!passive)
    return {
      state: 'inactive',
      label: 'No aplicable',
      detail: 'Sin pasiva con estado disponible.',
    };
  if (!deployed)
    return {
      state: 'inactive',
      label: 'Inactiva',
      detail: 'En el banquillo no participa en combate.',
    };
  if (!unit)
    return {
      state: 'available',
      label: 'Disponible al iniciar',
      detail: 'Su disponibilidad se reinicia en cada combate.',
    };
  if (!unit.passiveState)
    return {
      state: 'inactive',
      label: 'Sin datos',
      detail: 'Este registro no confirma el estado de la pasiva.',
    };
  if (unit.hp <= 0 || unit.deathTick !== null)
    return { state: 'inactive', label: 'Inactiva', detail: 'Unidad eliminada.' };
  const rules = passive.rules.map((r) => ({ rule: r, runtime: unit.passiveState![r.id] }));
  const activated = rules.some(
    ({ runtime }) =>
      runtime &&
      runtime.count > 0 &&
      tick >= runtime.lastTick &&
      (tick - runtime.lastTick) * TICK_MS < FEEDBACK_WINDOW_MS,
  );
  const remaining = rules.reduce(
    (n, { rule, runtime }) => n + Math.max(0, rule.maxActivations - (runtime?.count ?? 0)),
    0,
  );
  if (activated)
    return {
      state: 'activated',
      label: 'Activada',
      detail:
        remaining === 0
          ? 'Ya se activó; no quedan activaciones en este combate.'
          : `Activaciones restantes: ${remaining}.`,
    };
  if (remaining === 0)
    return {
      state: 'consumed',
      label: 'Consumida',
      detail: 'No volverá a activarse durante este combate.',
    };
  const ready = rules.some(
    ({ rule, runtime }) =>
      (runtime?.count ?? 0) < rule.maxActivations &&
      (!runtime || tick - runtime.lastTick >= rule.cooldownTicks),
  );
  return ready
    ? {
        state: 'available',
        label: 'Disponible',
        detail: `Activaciones restantes: ${remaining}. Espera su condición.`,
      }
    : { state: 'inactive', label: 'En recarga', detail: 'Espera el cooldown lógico de la pasiva.' };
}

/** Shield is an adjacent cyan segment, never additional green HP. */
export function shieldBar(unit: CombatUnit) {
  const shield = unit.hp > 0 && unit.deathTick === null ? shieldTotal(unit) : 0;
  const capacity = Math.max(effectiveStat(unit, 'maxHp'), unit.hp + shield);
  return { shield, hpFraction: unit.hp / capacity, shieldFraction: shield / capacity };
}
export function unitFeedback(unit: CombatUnit, events: readonly CombatEventV3[], timeMs: number) {
  const recent = events.filter(
    (e) => e.tick * TICK_MS <= timeMs && timeMs - e.tick * TICK_MS < FEEDBACK_WINDOW_MS,
  );
  const trigger = [...recent]
    .reverse()
    .find(
      (e) =>
        e.type === 'passive_trigger' &&
        e.payload.unitId === unit.id &&
        !e.payload.ruleId.startsWith('@'),
    );
  const grants = recent.filter(
    (e) => e.type === 'shield_apply' && e.payload.unitId === unit.id && e.payload.status.amount > 0,
  );
  const lastGrant = grants.at(-1);
  // One positive label per unit: combine simultaneous grants, replace older bursts.
  const shieldGained = grants.reduce(
    (sum, e) =>
      sum + (e.type === 'shield_apply' && e.tick === lastGrant?.tick ? e.payload.status.amount : 0),
    0,
  );
  return {
    passive:
      trigger?.type === 'passive_trigger'
        ? {
            key: `${trigger.tick}:${trigger.order}`,
            name:
              unit.profile.championAbility?.id === trigger.payload.abilityId
                ? (unit.profile.championAbility?.passive?.name ?? 'Pasiva activada')
                : 'Pasiva activada',
            age: timeMs - trigger.tick * TICK_MS,
          }
        : null,
    shield: lastGrant
      ? {
          key: `${lastGrant.tick}:${lastGrant.order}`,
          amount: shieldGained,
          age: timeMs - lastGrant.tick * TICK_MS,
        }
      : null,
  };
}

export type FeedbackMoment =
  | 'stack'
  | 'stack-consume'
  | 'stack-expiration'
  | 'kill'
  | 'empower'
  | 'repeat'
  | 'jump'
  | 'chain'
  | 'start'
  | 'passive'
  | 'shield'
  | 'absorption'
  | 'depleted'
  | 'expiration'
  | 'outgoing'
  | 'critical'
  | 'modifier'
  | 'modifier-expiration'
  | 'overtime';
export function feedbackMoment(
  events: readonly CombatEventV3[],
  unitId: string,
  moment: FeedbackMoment,
): number | null {
  if (moment === 'start') return 0;
  const shieldIds = new Set(
    events.flatMap((e) =>
      e.type === 'shield_apply' && e.payload.unitId === unitId ? [e.payload.status.id] : [],
    ),
  );
  const modifierIds = new Set(
    events.flatMap((e) =>
      e.type === 'status_apply' &&
      e.payload.unitId === unitId &&
      e.payload.status.kind === 'modifier'
        ? [e.payload.status.id]
        : [],
    ),
  );
  const event = events.find((e) => {
    if (moment === 'stack')
      return e.type === 'stack_gain' && e.payload.unitId === unitId && e.payload.count > 0;
    if (moment === 'stack-consume' || moment === 'stack-expiration')
      return (
        e.type === 'stack_consume' &&
        e.payload.unitId === unitId &&
        e.payload.reason === (moment === 'stack-consume' ? 'threshold' : 'duration')
      );
    if (moment === 'kill') return e.type === 'kill_attributed' && e.payload.killerId === unitId;
    if (moment === 'empower') return e.type === 'ability_empowered' && e.payload.unitId === unitId;
    if (moment === 'repeat')
      return (
        e.type === 'ability_repeat' && e.payload.unitId === unitId && e.payload.stage === 'resolve'
      );
    if (moment === 'jump') return e.type === 'jump_start' && e.payload.unitId === unitId;
    if (moment === 'chain') return e.type === 'chain_attack' && e.payload.unitId === unitId;
    if (moment === 'overtime') return e.type === 'overtime_start';
    if (moment === 'outgoing' || moment === 'critical')
      return (
        e.type === 'damage' &&
        e.payload.sourceId === unitId &&
        (moment !== 'critical' || e.payload.critical === true)
      );
    if (moment === 'modifier')
      return (
        e.type === 'status_apply' &&
        e.payload.unitId === unitId &&
        e.payload.status.kind === 'modifier'
      );
    if (moment === 'modifier-expiration')
      return (
        e.type === 'status_expire' &&
        e.payload.unitId === unitId &&
        e.payload.reason === 'duration' &&
        modifierIds.has(e.payload.statusId)
      );
    if (moment === 'passive') return e.type === 'passive_trigger' && e.payload.unitId === unitId;
    if (moment === 'shield')
      return (
        e.type === 'shield_apply' && e.payload.unitId === unitId && e.payload.status.amount > 0
      );
    if (moment === 'expiration')
      return (
        e.type === 'status_expire' &&
        e.payload.unitId === unitId &&
        e.payload.reason === 'duration' &&
        shieldIds.has(e.payload.statusId)
      );
    return (
      e.type === 'damage' &&
      e.payload.targetId === unitId &&
      e.payload.absorbed > 0 &&
      (moment !== 'depleted' || e.payload.shieldAfter === 0)
    );
  });
  return event ? event.tick + (moment === 'jump' ? 1 : 0) : null;
}
