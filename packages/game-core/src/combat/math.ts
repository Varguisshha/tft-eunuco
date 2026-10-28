import {
  ADVANCED_STATS_DEFAULTS,
  STAT_LIMITS,
  CombatSeedSchema,
  type CombatStats,
  type CombatUnit,
  type DamageType,
} from '@tft/shared';
export const compareIds = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
export function randomUint32(state: number): { state: number; value: number } {
  CombatSeedSchema.parse(state);
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = Math.imul(next ^ (next >>> 15), 1 | next);
  t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
  return { state: next, value: (t ^ (t >>> 14)) >>> 0 };
}
export function mitigateDamage(
  raw: number,
  type: DamageType,
  armor: number,
  magicResist: number,
): number {
  if (![raw, armor, magicResist].every(Number.isFinite))
    throw new RangeError('Damage statistics must be finite');
  const damage = Math.max(0, Math.min(1_000_000, Math.floor(raw)));
  if (!damage || type === 'true') return damage;
  const resistance = Math.max(-10000, Math.min(10000, type === 'physical' ? armor : magicResist));
  // Rational arithmetic; multiply before dividing, round once at the end.
  const numerator = resistance >= 0 ? 100 : 100 - 2 * resistance;
  const denominator = resistance >= 0 ? 100 + resistance : 100 - resistance;
  return Math.max(1, Math.floor((damage * numerator) / denominator));
}
export type EffectiveStat =
  | 'maxHp'
  | 'attack'
  | 'abilityPower'
  | 'critChanceMilli'
  | 'critMultiplierMilli'
  | 'armor'
  | 'magicResist'
  | 'attackSpeedMilli'
  | 'moveSpeedMilli'
  | 'manaRegenMilli';
/** Flat and percent sources add independently. Percentages reference the star-scaled base only. */
export function effectiveStat(
  unit: Pick<CombatUnit, 'profile' | 'statuses'>,
  stat: EffectiveStat,
): number {
  const base =
    unit.profile.stats[stat] ??
    (stat === 'manaRegenMilli'
      ? 0
      : stat === 'moveSpeedMilli'
        ? 1000
        : ADVANCED_STATS_DEFAULTS[stat as keyof typeof ADVANCED_STATS_DEFAULTS]);
  const modifiers = unit.statuses.filter(
    (s) =>
      s.kind === 'modifier' &&
      s.stat === stat &&
      s.group !== 'armor-reduction' &&
      s.group !== 'magic-reduction',
  );
  const flat = modifiers
    .filter((s) => s.mode !== 'percent_milli')
    .reduce((sum, s) => sum + s.amount, 0);
  const percent = modifiers
    .filter((s) => s.mode === 'percent_milli')
    .reduce((sum, s) => sum + s.amount, 0);
  // BigInt keeps the sum exact even with many simultaneous percent sources.
  const product = BigInt(base) * BigInt(percent);
  const percentValue = Number(product >= 0n ? product / 1000n : (product - 999n) / 1000n);
  let total = base + flat + percentValue;
  if (['f0p11b-18.5-1', 'f0p11h-18.5-1'].includes(unit.profile.itemLoadout?.version ?? '')) {
    if (stat === 'maxHp') total = Math.floor(((base + flat) * (1000 + percent)) / 1000);
    if (stat === 'attack' || stat === 'abilityPower') {
      const extra = unit.statuses.reduce(
        (n, s) => n + (s.group === 'item-power-multiplier' ? s.amount : 0),
        0,
      );
      total = Math.floor((total * (1000 + extra)) / 1000);
    }
  }
  if (stat === 'manaRegenMilli') return Math.max(0, Math.min(STAT_LIMITS.amount, total));
  if ((stat === 'armor' || stat === 'magicResist') && total > 0) {
    const reduction = unit.statuses.reduce(
      (max, s) =>
        s.group === (stat === 'armor' ? 'armor-reduction' : 'magic-reduction')
          ? Math.max(max, s.amount)
          : max,
      0,
    );
    total = Math.floor((total * (1000 - Math.min(1000, reduction))) / 1000);
  }
  if (stat === 'moveSpeedMilli') return Math.max(1, Math.min(5000, total));
  if (stat === 'attackSpeedMilli')
    return Math.max(1, Math.min(STAT_LIMITS.attackSpeedMilli, total));
  if (stat === 'critChanceMilli') return Math.max(0, Math.min(STAT_LIMITS.critChanceMilli, total));
  if (stat === 'critMultiplierMilli')
    return Math.max(1000, Math.min(STAT_LIMITS.critMultiplierMilli, total));
  if (stat === 'maxHp') return Math.max(1, Math.min(STAT_LIMITS.amount, total));
  if (stat === 'attack' || stat === 'abilityPower')
    return Math.max(0, Math.min(STAT_LIMITS.amount, total));
  return Math.max(-STAT_LIMITS.defense, Math.min(STAT_LIMITS.defense, total));
}
export function attackIntervalMs(stats: CombatStats): number {
  return 1_000_000 / stats.attackSpeedMilli;
}
export const isAlive = (unit: CombatUnit): boolean => unit.hp > 0 && unit.deathTick === null;
export const shieldTotal = (unit: CombatUnit): number =>
  unit.statuses.filter((s) => s.kind === 'shield').reduce((sum, s) => sum + s.amount, 0);
export const isStunned = (unit: CombatUnit): boolean =>
  unit.statuses.some((s) => s.kind === 'stun');

/** Alive units temporarily recovering off board still count toward victory. */
export const isPresent = (unit: CombatUnit): boolean =>
  isAlive(unit) && !unit.mechanics?.recovery?.away;
