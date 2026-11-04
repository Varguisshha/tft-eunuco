import { EconomyConfigSchema } from '@tft/shared';
import { P13S_ECONOMY_CONFIG } from './p13s';
/** Combined release: one full synergy journal, P13T characters, no duplicate Jew subset. */
export const P13_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...P13S_ECONOMY_CONFIG,
  characterPolicy: 'f0p13t-1',
});
