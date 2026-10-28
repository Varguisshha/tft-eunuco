import { TraitDefinitionSchema } from '@tft/shared';
import { ROSTER_TRAITS } from './roster-traits';
/** Same Excel matrix/effect migrations; new availability reflects 34 playable identities. */
export const P11_TRAITS = ROSTER_TRAITS.map((trait) =>
  TraitDefinitionSchema.parse({
    ...trait,
    thresholds: trait.thresholds.map((t) => {
      if (t.reservation?.includes('borrador')) {
        const { reservation: _reservation, ...available } = t;
        void _reservation;
        return { ...available, availability: 'available' };
      }
      return t;
    }),
  }),
);
