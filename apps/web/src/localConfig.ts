import {
  P12F_ECONOMY_CONFIG,
  P13T_ECONOMY_CONFIG,
  P13T1_ECONOMY_CONFIG,
  P13U_ECONOMY_CONFIG,
} from '@tft/game-data';
export type LocalRuleset = 'p12f' | 'p13t' | 'p13t1' | 'p13u';
/** One preset feeds fresh offline and DEV matches; restoring a save never recatalogs it. */
export const localEconomyConfig = (rules: LocalRuleset) =>
  rules === 'p13u'
    ? P13U_ECONOMY_CONFIG
    : rules === 'p13t1'
      ? P13T1_ECONOMY_CONFIG
      : rules === 'p13t'
        ? P13T_ECONOMY_CONFIG
        : P12F_ECONOMY_CONFIG;
export const configuredLocalRuleset = (): LocalRuleset =>
  typeof __LOCAL_RULESET__ === 'undefined' ? 'p13u' : __LOCAL_RULESET__;
