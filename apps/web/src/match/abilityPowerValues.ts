import { effectAmount } from '@tft/game-core';
import type { CombatEffect, CombatProfile } from '@tft/shared';

export type AbilityValue = { label: string; value: number | null; formula: string };
const number = (n: number) =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(n);
/** Input already contains the inspector's effective stats; do not apply equipment/modifiers twice. */
export function abilityValues(
  profile: CombatProfile,
  effects: readonly CombatEffect[],
): AbilityValue[] {
  const star = (profile.starLevel ?? 1) - 1;
  const ratio = (v: number | [number, number, number]) => (typeof v === 'number' ? v : v[star]!);
  const source = { profile, statuses: [] };
  return effects.flatMap((effect) => {
    if (effect.kind !== 'damage' && effect.kind !== 'heal' && effect.kind !== 'shield') return [];
    const base = effect.amountByStars?.[star] ?? effect.amount;
    const terms: string[] = base ? [number(base)] : [];
    if (effect.powerScaling) {
      const ad = ratio(effect.powerScaling.adRatioMilli),
        ap = ratio(effect.powerScaling.apRatioMilli);
      if (ad) terms.push(`${number(ad / 10)}% AD`);
      if (ap) terms.push(`${number(ap / 10)}% AP`);
    } else if (effect.scaling) {
      const stat = {
        maxHp: 'vida máxima',
        attack: 'AD',
        armor: 'armadura',
        magicResist: 'resistencia mágica',
        attackSpeedMilli: 'velocidad de ataque',
      }[effect.scaling.stat];
      terms.push(
        `${number(effect.scaling.ratioMilli / 10)}% ${stat}${effect.scaling.basis === 'target' ? ' del objetivo' : ''}`,
      );
    }
    const label =
      effect.kind === 'damage'
        ? `Daño ${effect.damageType === 'physical' ? 'físico' : effect.damageType === 'magic' ? 'mágico' : 'verdadero'}${effect.target === 'enemies' ? (effect.excludePrimary ? ' · secundarios' : ' · área') : ''}`
        : effect.kind === 'heal'
          ? 'Curación'
          : 'Escudo';
    return [
      {
        label,
        value: effect.scaling?.basis === 'target' ? null : effectAmount(effect, source, source),
        formula:
          effect.powerScaling || effect.scaling ? terms.join(' + ') || '0' : `${number(base)} fijo`,
      },
    ];
  });
}

/** Passive rule effects, including explicitly authored stack-threshold rewards. No item/trait effects inferred. */
export function passiveValueEffects(profile: CombatProfile): CombatEffect[] {
  const passive = profile.championAbility?.passive;
  if (!passive) return profile.passive?.effects ?? [];
  const effects = passive.rules.flatMap((r) => r.effects);
  const stackIds = new Set(effects.flatMap((e) => (e.kind === 'stack_gain' ? [e.stackId] : [])));
  const rewards = (profile.mechanics?.stacks ?? [])
    .filter((s) => stackIds.has(s.id))
    .flatMap((s) => s.thresholds.flatMap((t) => t.effects));
  const cycle = passive.attackCycle;
  return [
    ...effects,
    ...rewards,
    ...(cycle
      ? [
          {
            kind: 'damage' as const,
            target: 'target' as const,
            radius: 0,
            amount: 0,
            damageType: 'physical' as const,
            powerScaling: {
              version: 1 as const,
              adRatioMilli: [...cycle.bonusAdMilli] as [number, number, number],
              apRatioMilli: 0,
            },
          },
        ]
      : []),
  ];
}
