import { getTraitDefinition } from '@tft/game-data';
import type { CombatState, CombatUnit } from '@tft/shared';

/** Presentation-only v1. Values always come from the sampled authoritative snapshot. */
export interface CombatCounter {
  version: 1;
  id: string;
  name: string;
  value: number;
  max?: number;
  progressGoal?: number;
  source: 'unit' | 'stack' | 'trait' | 'passive';
  icon: string;
  thresholds: number[];
  milestones?: { value: number; label: string }[];
  state: 'building' | 'ready' | 'active';
  tooltip: string;
  detail: string;
}
const names: Record<string, string> = {
  attackSpeedMilli: 'velocidad de ataque',
  attack: 'AD',
  abilityPower: 'AP',
  maxHp: 'vida máxima',
  armor: 'armadura',
  magicResist: 'resistencia mágica',
};
export function combatCounters(unit: CombatUnit, state: CombatState): CombatCounter[] {
  const mechanics = unit.mechanics;
  if (!mechanics) return [];
  const base = { version: 1 as const, thresholds: [] as number[], state: 'building' as const };
  const result: CombatCounter[] = [
    {
      ...base,
      id: 'kills',
      name: 'Eliminaciones atribuidas',
      value: mechanics.kills,
      source: 'unit',
      icon: 'el-depredador',
      tooltip: 'Crédito de eliminación asignado por el motor a esta unidad.',
      detail: 'Este combate',
    },
    {
      ...base,
      id: 'casts',
      name: 'Lanzamientos naturales',
      value: mechanics.casts,
      source: 'unit',
      icon: 'upm',
      tooltip: 'No incluye repeticiones gratuitas.',
      detail: 'Este combate',
    },
  ];
  for (const stack of mechanics.stacks) {
    const definition = unit.profile.mechanics?.stacks.find((d) => d.id === stack.definitionId);
    if (!definition) continue;
    const traitRules = (unit.profile.traits ?? []).flatMap(
      (id) => getTraitDefinition(id)?.progress?.rules ?? [],
    );
    const conditions = (unit.profile.traits ?? [])
      .flatMap((id) => getTraitDefinition(id)?.progress?.rules ?? [])
      .flatMap((rule) => rule.conditions)
      .filter((c) => c.kind === 'stack_count' && c.stackId === stack.definitionId);
    const thresholds = [
      ...new Set([
        ...definition.thresholds.map((t) => t.count),
        ...conditions.map((c) => (c.kind === 'stack_count' ? c.minimum : 0)),
      ]),
    ].sort((a, b) => a - b);
    const bonuses = definition.modifiers.map(
      (m) =>
        `+${m.mode === 'percent_milli' ? `${(m.amount * stack.count) / 10}%` : m.amount * stack.count} ${names[m.stat] ?? m.stat}`,
    );
    const activeKeys = definition.thresholds
      .flatMap((t) => t.effects)
      .flatMap((e) => (e.kind === 'modifier' ? [e.key] : []));
    const active = unit.statuses.filter((s) => s.key && activeKeys.includes(s.key));
    const effects = active.map(
      (s) =>
        `${s.amount >= 0 ? '+' : ''}${s.mode === 'percent_milli' ? `${s.amount / 10}%` : s.amount} ${names[s.stat ?? ''] ?? s.stat} · ${s.expiresTick === null ? 'este combate' : `${Math.max(0, (s.expiresTick - state.tick) / 10).toFixed(1)} s`}`,
    );
    const next = thresholds.find((n) => n > stack.count);
    result.push({
      ...base,
      id: stack.id,
      name: definition.name,
      value: stack.count,
      ...(definition.consumption === 'threshold' ? { max: definition.maxStacks } : {}),
      progressGoal: next ?? thresholds.at(-1) ?? definition.maxStacks,
      milestones: thresholds.map((n) => ({
        value: n,
        label: traitRules.some(
          (r) =>
            r.conditions.some(
              (c) => c.kind === 'stack_count' && c.stackId === definition.id && c.minimum === n,
            ) && r.effects.some((e) => e.kind === 'jump'),
        )
          ? 'Salto en la próxima eliminación'
          : traitRules.some(
                (r) =>
                  r.conditions.some(
                    (c) =>
                      c.kind === 'stack_count' && c.stackId === definition.id && c.minimum === n,
                  ) && r.effects.some((e) => e.kind === 'heal'),
              )
            ? 'Curación extra en la próxima eliminación'
            : definition.thresholds
                  .find((t) => t.count === n)
                  ?.effects.some((e) => e.kind === 'modifier' && e.stat === 'attack')
              ? `+${definition.thresholds
                  .find((t) => t.count === n)
                  ?.effects.filter((e) => e.kind === 'modifier' && e.stat === 'attack')
                  .reduce(
                    (sum, e) => sum + ('amount' in e ? e.amount : 0),
                    0,
                  )} AD al alcanzar el umbral`
              : 'Completar ciclo',
      })),
      source: 'stack',
      icon:
        definition.id === 'resaca'
          ? 'copita-perhaps'
          : definition.id === 'depredador'
            ? 'el-depredador'
            : 'neutral',
      thresholds,
      state: active.length ? 'active' : next === undefined ? 'ready' : 'building',
      tooltip: `Acumulaciones reales. ${next === undefined ? 'Umbrales alcanzados.' : `Próximo umbral: ${next}.`} ${definition.consumption === 'threshold' ? 'Se consumen al completar el ciclo.' : 'Persisten durante este combate.'}`,
      detail: [...bonuses, ...effects].join(' · '),
    });
  }
  for (const progress of state.mechanics?.traits ?? []) {
    if (progress.side !== unit.owner || (progress.scope === 'unit' && progress.unitId !== unit.id))
      continue;
    const trait = getTraitDefinition(progress.traitId);
    if (!trait || progress.traitId === 'el-depredador') continue;
    result.push({
      ...base,
      id: `trait:${progress.traitId}`,
      name: progress.traitId === 'upm' ? 'Créditos UPM' : `${trait.name} · lanzamientos`,
      value: progress.casts,
      source: 'trait',
      icon: trait.icon,
      tooltip:
        progress.traitId === 'upm'
          ? 'Lanzamientos naturales de esta unidad. Los Créditos no añaden miembros a UPM.'
          : `Lanzamientos naturales confirmados ${progress.scope === 'unit' ? 'de esta unidad' : 'del equipo'}.`,
      detail:
        progress.traitId === 'upm'
          ? 'Progreso individual · el efecto de cada tercer lanzamiento requiere 6 miembros'
          : `Progreso ${progress.scope === 'unit' ? 'individual' : 'del equipo'}`,
    });
  }
  const passive = unit.profile.championAbility?.passive;
  if (passive && !mechanics.stacks.length) {
    for (const rule of passive.rules) {
      const runtime = unit.passiveState?.[rule.id];
      result.push({
        ...base,
        id: `passive:${rule.id}`,
        name: passive.name,
        value: runtime?.count ?? 0,
        source: 'passive',
        icon: unit.profile.championAbility!.icon,
        state: runtime?.count ? 'active' : 'building',
        tooltip: passive.description,
        detail: `${runtime?.count ?? 0} activaciones confirmadas · este combate`,
      });
    }
  }
  return result;
}
