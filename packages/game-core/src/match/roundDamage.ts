import {
  CombatResultSchema,
  RoundDamageConfigSchema,
  StarsSchema,
  type CombatResult,
  type RoundDamageConfig,
  type Side,
} from '@tft/shared';
/** Pure per-participant damage. A double loss treats BOTH sides as losers, including mutual elimination. */
export function calculateRoundDamage(
  round: number,
  result: CombatResult,
  survivors: { side: Side; stars: 1 | 2 | 3 }[],
  config: RoundDamageConfig,
) {
  if (!Number.isSafeInteger(round) || round < 1) throw new RangeError('Invalid round');
  CombatResultSchema.parse(result);
  RoundDamageConfigSchema.parse(config);
  if (
    survivors.length > 56 ||
    survivors.some(
      (u) => !['north', 'south'].includes(u.side) || !StarsSchema.safeParse(u.stars).success,
    )
  )
    throw new RangeError('Invalid survivors');
  const stage = Math.floor((round - 1) / config.roundsPerStage);
  const stageBase = config.baseByStage[Math.min(stage, config.baseByStage.length - 1)]!;
  const forSide = (side: Side) => {
    const lost = result.outcome === 'double_loss' || result.winner !== side;
    const base = lost ? stageBase : 0;
    const opposing = lost
      ? survivors
          .filter((u) => u.side !== side)
          .reduce((sum, u) => sum + config.survivorByStars[u.stars - 1]!, 0)
      : 0;
    return {
      outcome: lost ? ('loss' as const) : ('win' as const),
      base,
      survivors: opposing,
      requested: base + opposing,
    };
  };
  return { north: forSide('north'), south: forSide('south') };
}
