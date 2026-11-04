import { TraitDefinitionSchema } from '@tft/shared';
import { P11_TRAITS } from './p11-traits';
/** Exact Jew subset of P13S f80e614; no prediction, roulette, UPM or combat policy imported. */
export const JEW_POLICY = {
  version: 'f0p13s-jew-1',
  ratesMilli: [100, 150, 200],
  caps: [2, 4, 8],
  eligibleBank: 'before-all-round-income',
  deployment: 'highest-star-peibol-in-own-combat-input',
  settlement: 'after-normal-income-once-per-real-player-round',
} as const;
export const P13T1_TRAITS = P11_TRAITS.map((original) => {
  if (original.id !== 'jew') return original;
  const t = structuredClone(original);
  t.description =
    'Hay quien ahorra para el futuro. Peibol prefiere que el futuro le pague intereses.';
  t.planning!.effectState = 'implemented';
  t.thresholds = [
    {
      count: 1,
      description:
        'Peibol desplegado: 10/15/20 % del oro previo a las recompensas de cierre, máximo +2/+4/+8 oro por ronda según 1★/2★/3★. Adicional al interés normal. Solo cuenta la evolución más alta desplegada y se paga una vez por jugador real y ronda.',
      effectState: 'implemented',
      availability: 'available',
      bonuses: [],
      effects: [],
    },
  ];
  return TraitDefinitionSchema.parse(t);
});
