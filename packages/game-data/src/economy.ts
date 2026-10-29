import { TFT185_SHOP_ODDS } from './shop-odds';
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

export const JARAMILLO_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...VARGAS_ECONOMY_CONFIG,
  catalog: 'f0p6c',
});

/** Infrastructure opt-in; all economic values and combat content remain P6C. */
export const ITEMS_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...JARAMILLO_ECONOMY_CONFIG,
  itemCatalog: 'f0p8a-1',
});

export const STANDARD_ITEMS_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...JARAMILLO_ECONOMY_CONFIG,
  itemCatalog: 'f0p8b-14.1-1',
});

export const EFFECT_ITEMS_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...JARAMILLO_ECONOMY_CONFIG,
  itemCatalog: 'f0p8c-1',
});

export const DROP_ITEMS_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...EFFECT_ITEMS_ECONOMY_CONFIG,
  itemCatalog: 'f0p8d-1',
});

/** Florin expansion: unchanged economy and executable 36-item catalog. */
export const FLORIN_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...EFFECT_ITEMS_ECONOMY_CONFIG,
  catalog: 'florin-1',
});

/** Consolidation only: historical configurations remain frozen. */
export const INTEGRATED_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...FLORIN_ECONOMY_CONFIG,
  catalog: 'f0p8d-florin-1',
  itemCatalog: 'f0p8d-1',
});

/** Content reconciliation only: economic numbers and drops unchanged. */
export const ROSTER_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...INTEGRATED_ECONOMY_CONFIG,
  catalog: 'f0p10a-1',
});

/** Frozen legacy pool variant, retained for existing snapshots. */
export const TFT_POOL_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...INTEGRATED_ECONOMY_CONFIG,
  poolVersion: 'tft-set18-pool-1',
  copiesByCost: [30, 25, 18, 10, 9],
});

/** P11A: 34 playable identities, fixed pool, unchanged prices of the four originals and odds. */
export const P11_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...TFT_POOL_ECONOMY_CONFIG,
  catalog: 'f0p11a-1',
  opponents: TFT_POOL_ECONOMY_CONFIG.opponents.map((t) => ({
    ...t,
    definitions: t.definitions.map(
      (id) =>
        (
          ({
            'test-k01': 'dolea',
            'test-v02': 'vargas',
            'test-r03': 'jaramillo',
            'test-m04': 'florin',
          }) as Record<string, string>
        )[id] ?? id,
    ),
  })),
});

/** New item semantics never rewrite P11A or older inventories. */
export const P11B_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...P11_ECONOMY_CONFIG,
  catalog: 'f0p11b-1',
  itemCatalog: 'f0p11b-18.5-1',
});

export const P11C_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...P11B_ECONOMY_CONFIG,
  catalog: 'f0p11c-1',
});
export const P11C_ECONOMY_POLICY = {
  version: 'f0p11c-1',
  combatActions: ['sell-owned-bench-not-in-combat-input', 'lock_shop'],
  fusionDuringCombat: 'none',
  statistics: 'authoritative-visible-hp-events-v1',
} as const;

/** P11G economic opt-in: identical roster, combat and item semantics; level cap unchanged. */
export const P11G_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...P11C_ECONOMY_CONFIG,
  catalog: 'f0p11g-1',
  levels: P11C_ECONOMY_CONFIG.levels.map((row) => ({
    ...row,
    odds: TFT185_SHOP_ODDS.find((r) => r.level === row.level)!.odds,
  })),
});

/** H keeps G economy/odds/drops; only item execution and combat-bench purchase policy opt in. */
export const P11H_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...P11G_ECONOMY_CONFIG,
  catalog: 'f0p11h-1',
  itemCatalog: 'f0p11h-18.5-1',
});

/** K changes only consumables. Historical H configuration and combat/item catalogs stay frozen. */
export const P11K_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...P11H_ECONOMY_CONFIG,
  removerPolicy: { version: 'f0p11k-remover-1', initialQuantity: 1, benchDuringCombat: true },
});

/** New matches only. Historical P11K configurations and fingerprints remain immutable. */
export const P12B_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...P11K_ECONOMY_CONFIG,
  removerPolicy: { version: 'f0p12b-remover-1', initialQuantity: 1, benchDuringCombat: true },
  pvpPolicy: { version: 'f0p12b-1', ghostDamageMultiplierMilli: 800 },
});

/** P12D consumes a reservation once; historical P12B keeps its original policy. */
export const P12D_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...P12B_ECONOMY_CONFIG,
  shopLockPolicy: 'consume-on-auto-refresh-1',
});
