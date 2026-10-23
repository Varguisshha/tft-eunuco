import { EconomyConfigSchema } from '@tft/shared';
/** Own provisional 3-cost rules, not the live TFT tables. */
export const ECONOMY_CONFIG = EconomyConfigSchema.parse({
  version: 'f0p3.1-1',
  initialGold: 10,
  roundDamage: {
    initialHp: 100,
    roundsPerStage: 3,
    baseByStage: [2, 3, 4, 5, 6],
    survivorByStars: [1, 2, 3],
  },
  goldCap: 999,
  initialLevel: 2,
  maxLevel: 7,
  benchSize: 9,
  shopSize: 5,
  rerollCost: 2,
  xpCost: 4,
  xpPurchase: 4,
  passiveXp: 2,
  baseIncome: [2, 3, 4, 5],
  victoryGold: 1,
  interestDivisor: 10,
  interestCap: 5,
  streaks: [
    { from: 1, gold: 0 },
    { from: 2, gold: 1 },
    { from: 4, gold: 2 },
    { from: 6, gold: 3 },
  ],
  levels: [
    { level: 2, xpToNext: 2, odds: [80, 20, 0] },
    { level: 3, xpToNext: 6, odds: [60, 35, 5] },
    { level: 4, xpToNext: 10, odds: [40, 45, 15] },
    { level: 5, xpToNext: 20, odds: [25, 45, 30] },
    { level: 6, xpToNext: 36, odds: [15, 40, 45] },
    { level: 7, xpToNext: 0, odds: [10, 30, 60] },
  ],
  copiesByCost: [29, 22, 18],
  starCopies: [1, 3, 9],
  statScaleMilli: [1000, 1800, 3240],
  sellCopyMultipliers: [1, 3, 9],
  opponents: [
    { fromRound: 1, definitions: ['test-v02'], stars: 1 },
    { fromRound: 3, definitions: ['test-k01', 'test-r03'], stars: 1 },
    { fromRound: 5, definitions: ['test-k01', 'test-v02', 'test-m04'], stars: 1 },
    { fromRound: 8, definitions: ['test-k01', 'test-v02', 'test-r03', 'test-m04'], stars: 2 },
    {
      fromRound: 12,
      definitions: ['test-k01', 'test-v02', 'test-r03', 'test-m04', 'test-r03'],
      stars: 2,
    },
  ],
});

/** New games opt into the expanded catalog; historic config remains byte-stable. */
export const CURRENT_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...ECONOMY_CONFIG,
  catalog: 'f0p6a',
});

/** Same economy; explicit combat catalog opt-in only. */
export const ADVANCED_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...CURRENT_ECONOMY_CONFIG,
  catalog: 'f0p6b1',
});

/** New engine contract; economic values and playable content remain identical. */
export const MECHANICS_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...ADVANCED_ECONOMY_CONFIG,
  catalog: 'f0p6b2',
});

export const VARGAS_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...MECHANICS_ECONOMY_CONFIG,
  catalog: 'f0p6b3',
});
