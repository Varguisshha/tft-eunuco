import reference from './reference/tft-18.5-shop.json';
export const TFT185_SHOP_REFERENCE = reference;
export const TFT185_SHOP_ODDS = reference.levels;
export const P11G_ECONOMY_POLICY = {
  version: 'f0p11g-1',
  costDraw: 'nominal-five-costs-unbiased-u32',
  unitDraw: 'uniform-available-copies-unbiased-u32',
  unavailableCost: 'empty-slot-no-reroll-no-renormalization',
  nominalReference: reference.version,
  localDrops: 'same-server-planner-only-new-local-catalog',
  fusion: 'core-transaction-preview',
  rewardReceipt: 'credited-breakdown-v1',
} as const;
