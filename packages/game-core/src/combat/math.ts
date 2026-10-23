import { CombatSeedSchema, type CombatStats, type CombatUnit, type DamageType } from '@tft/shared';
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
export function effectiveStat(
  unit: CombatUnit,
  stat: 'maxHp' | 'attack' | 'armor' | 'magicResist' | 'attackSpeedMilli',
): number {
  const total =
    unit.profile.stats[stat] +
    unit.statuses
      .filter((s) => s.kind === 'modifier' && s.stat === stat)
      .reduce((sum, s) => sum + s.amount, 0);
  if (stat === 'attackSpeedMilli') return Math.max(1, Math.min(5000, total));
  if (stat === 'maxHp') return Math.max(1, Math.min(1_000_000, total));
  if (stat === 'attack') return Math.max(0, Math.min(1_000_000, total));
  return Math.max(-10000, Math.min(10000, total));
}
export function attackIntervalMs(stats: CombatStats): number {
  return 1_000_000 / stats.attackSpeedMilli;
}
export const isAlive = (unit: CombatUnit): boolean => unit.hp > 0 && unit.deathTick === null;
export const shieldTotal = (unit: CombatUnit): number =>
  unit.statuses.filter((s) => s.kind === 'shield').reduce((sum, s) => sum + s.amount, 0);
export const isStunned = (unit: CombatUnit): boolean =>
  unit.statuses.some((s) => s.kind === 'stun');
