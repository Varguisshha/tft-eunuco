import type { CombatState, CombatUnit } from '@tft/shared';
const statNames: Record<string, string> = {
  attack: 'AD',
  abilityPower: 'AP',
  attackSpeedMilli: 'Velocidad',
  maxHp: 'Vida máxima',
  armor: 'Armadura',
  magicResist: 'Resistencia mágica',
  critChanceMilli: 'Prob. crítico',
  critMultiplierMilli: 'Daño crítico',
};
export function mechanicsReadout(unit: CombatUnit | undefined, state: CombatState | undefined) {
  if (!unit?.mechanics || !state) return null;
  const progress =
    state.mechanics?.traits.filter(
      (t) => t.side === unit.owner && (t.unitId === unit.id || t.scope === 'team'),
    ) ?? [];
  const useful =
    unit.mechanics.stacks.length > 0 ||
    unit.mechanics.casts > 0 ||
    unit.mechanics.kills > 0 ||
    progress.length > 0;
  if (!useful) return null;
  const remaining = (tick: number | null) =>
    tick === null ? 'Este combate' : `${Math.max(0, (tick - state.tick) / 10).toFixed(1)} s`;
  return {
    casts: unit.mechanics.casts,
    kills: unit.mechanics.kills,
    stacks: unit.mechanics.stacks.map((s) => ({
      id: s.id,
      name: unit.profile.mechanics?.stacks.find((d) => d.id === s.definitionId)?.name ?? s.id,
      count: s.count,
      max: s.maxStacks,
      duration: s.count ? remaining(s.expiresTick) : 'Sin acumulaciones',
    })),
    effects: unit.statuses
      .filter((s) => s.kind === 'modifier' || s.kind === 'shield' || s.kind === 'stun')
      .map((s) => ({
        id: s.id,
        name:
          s.kind === 'modifier'
            ? `${statNames[s.stat!] ?? s.stat} ${s.amount >= 0 ? '+' : ''}${s.mode === 'percent_milli' ? `${s.amount / 10}%` : s.amount}`
            : s.kind === 'shield'
              ? `Escudo ${s.amount}`
              : 'Aturdimiento',
        duration: remaining(s.expiresTick),
      })),
    progress: progress.map((p) => ({
      id: `${p.traitId}:${p.unitId ?? 'team'}`,
      name: p.traitId,
      scope: p.scope === 'team' ? 'Equipo' : 'Esta unidad',
      casts: p.casts,
      kills: p.kills,
    })),
  };
}
export type MechanicsReadout = ReturnType<typeof mechanicsReadout>;
