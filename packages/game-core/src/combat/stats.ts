import {
  ADVANCED_COMBAT_RULES,
  MECHANICS_RULES,
  CHARACTER_RULES,
  COMPOSITE_RULES,
  ADVANCED_STATS_DEFAULTS,
  STAT_LIMITS,
  type CombatProfile,
  type CombatEffect,
  type CombatUnit,
  type OvertimeConfig,
} from '@tft/shared';
import { effectiveStat, randomUint32 } from './math';
import { overtimeModifiers, scaleCombatAmount } from './overtime';
/** One floor after summing integer-milli AD/AP terms. No implicit star multiplier. */
export function effectAmount(effect: CombatEffect, source: CombatUnit, target: CombatUnit): number {
  if (!('amount' in effect)) return 0;
  const star = (source.profile.starLevel ?? 1) - 1;
  const base =
    'amountByStars' in effect && effect.amountByStars ? effect.amountByStars[star]! : effect.amount;
  if ('powerScaling' in effect && effect.powerScaling) {
    const ratio = (v: number | [number, number, number]) => (typeof v === 'number' ? v : v[star]!);
    return Math.min(
      STAT_LIMITS.amount,
      Math.floor(
        (base * 1000 +
          effectiveStat(source, 'attack') * ratio(effect.powerScaling.adRatioMilli) +
          effectiveStat(source, 'abilityPower') * ratio(effect.powerScaling.apRatioMilli)) /
          1000,
      ),
    );
  }
  return (
    base +
    ('scaling' in effect && effect.scaling
      ? Math.floor(
          (effectiveStat(effect.scaling.basis === 'source' ? source : target, effect.scaling.stat) *
            effect.scaling.ratioMilli) /
            1000,
        )
      : 0)
  );
}
/** 0% / 100% consume no random number. Intermediate chance uses one uint32 draw. */
export function criticalRoll(unit: CombatUnit, raw: number, rngState: number) {
  const chance = effectiveStat(unit, 'critChanceMilli');
  const random = chance > 0 && chance < 1000 ? randomUint32(rngState) : null;
  const critical =
    chance === 1000 || (random !== null && random.value * 1000 < chance * 4294967296);
  return {
    critical,
    rngState: random?.state ?? rngState,
    amount: critical ? scaleCombatAmount(raw, effectiveStat(unit, 'critMultiplierMilli')) : raw,
  };
}
/** Shared authority selector for both inspectors. Overtime is the final speed layer. */
export function combatStatsView(unit: CombatUnit, tick = 0, overtime?: OvertimeConfig) {
  return {
    maxHp: effectiveStat(unit, 'maxHp'),
    attack: effectiveStat(unit, 'attack'),
    abilityPower: effectiveStat(unit, 'abilityPower'),
    attackSpeedMilli: Math.max(
      1,
      Math.floor(
        (effectiveStat(unit, 'attackSpeedMilli') *
          overtimeModifiers(tick, overtime).attackSpeedMilli) /
          1000,
      ),
    ),
    critChanceMilli: effectiveStat(unit, 'critChanceMilli'),
    critMultiplierMilli: effectiveStat(unit, 'critMultiplierMilli'),
    armor: effectiveStat(unit, 'armor'),
    magicResist: effectiveStat(unit, 'magicResist'),
    range: unit.profile.stats.range,
    maxMana: unit.profile.stats.maxMana,
    startingMana: unit.profile.stats.startingMana,
  };
}
export const advancedRules = (version: string) =>
  version === ADVANCED_COMBAT_RULES ||
  version === MECHANICS_RULES ||
  version === CHARACTER_RULES ||
  version === COMPOSITE_RULES;

export function baseStatsView(profile: CombatProfile) {
  return {
    ...profile.stats,
    abilityPower: profile.stats.abilityPower ?? ADVANCED_STATS_DEFAULTS.abilityPower,
    critChanceMilli: profile.stats.critChanceMilli ?? ADVANCED_STATS_DEFAULTS.critChanceMilli,
    critMultiplierMilli:
      profile.stats.critMultiplierMilli ?? ADVANCED_STATS_DEFAULTS.critMultiplierMilli,
  };
}
