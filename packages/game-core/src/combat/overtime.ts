import {
  DEFAULT_OVERTIME,
  OVERTIME_START_TICK,
  MAX_COMBAT_TICKS,
  type OvertimeConfig,
} from '@tft/shared';
/** Millipercent interpolation with nonnegative integer weights. Endpoints at ticks 300 and 449. */
export function overtimeModifiers(tick: number, config: OvertimeConfig = DEFAULT_OVERTIME) {
  if (!Number.isSafeInteger(tick) || tick < 0) throw new RangeError('Invalid logical tick');
  const progress = Math.min(
    MAX_COMBAT_TICKS - OVERTIME_START_TICK - 1,
    Math.max(0, tick - OVERTIME_START_TICK),
  );
  const span = MAX_COMBAT_TICKS - OVERTIME_START_TICK - 1;
  const interpolate = ([start, end]: [number, number]) =>
    tick < OVERTIME_START_TICK
      ? 1000
      : Math.floor((start * (span - progress) + end * progress) / span);
  return {
    damageMilli: interpolate(config.damageMilli),
    attackSpeedMilli: interpolate(config.attackSpeedMilli),
    healMilli: interpolate(config.healMilli),
    shieldMilli: interpolate(config.shieldMilli),
  };
}
export const scaleCombatAmount = (amount: number, multiplier: number) =>
  Math.min(1_000_000, Math.floor((amount * multiplier) / 1000));
