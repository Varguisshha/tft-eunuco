import { JEW_POLICY } from '@tft/game-data';
import { type MatchState, type CombatReplay, type RoundReward } from '@tft/shared';
import { compareIds } from '../combat/math';
/** P13S interest settlement isolated with its complete receipt/ledger contract. No extra RNG. */
export function jewReceipt(
  state: MatchState,
  replay: CombatReplay,
  bank: number,
  settlementId: string,
): NonNullable<RoundReward['jew']> {
  const peibol = replay.input.units
    .filter((u) => u.owner === 'south' && u.definitionId === 'peibol')
    .sort(
      (a, b) => (b.profile.starLevel ?? 1) - (a.profile.starLevel ?? 1) || compareIds(a.id, b.id),
    )[0];
  const stars = peibol?.profile.starLevel ?? null;
  return {
    version: JEW_POLICY.version,
    id: `p13s-jew-${state.round}`,
    settlementId,
    round: state.round,
    bank,
    unitId: peibol?.id ?? null,
    stars,
    requested: stars
      ? Math.min(
          Math.floor((bank * JEW_POLICY.ratesMilli[stars - 1]!) / 1000),
          JEW_POLICY.caps[stars - 1]!,
        )
      : 0,
    credited: 0,
  };
}
