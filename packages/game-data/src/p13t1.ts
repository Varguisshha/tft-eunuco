import { EconomyConfigSchema, UnitDefinitionSchema } from '@tft/shared';
import { P13T_ECONOMY_CONFIG } from './p13t';
import { JEW_POLICY } from './jew';
import { P11_ROSTER } from './p11-roster';
export const P13T1_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...P13T_ECONOMY_CONFIG,
  jewPolicy: JEW_POLICY.version,
});
/** Metadata only: identical IDs, costs, affinities and art; historic roster remains frozen. */
export const P13T1_ROSTER = P11_ROSTER.map((original) => {
  if (original.id !== 'peibol') return original;
  const { provisional: _provisional, ...unit } = original;
  void _provisional;
  return UnitDefinitionSchema.parse({
    ...unit,
    role: 'ranger',
    activeAbilityId: 'headshot-p13t',
    passiveAbilityId: 'headshot-p13t',
  });
});
