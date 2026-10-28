import { useEffect, useRef, useState } from 'react';
import type { MatchState, RoundReward } from '@tft/shared';
import { matchCatalog } from '@tft/game-data';
import { GameIcon } from './GameIcon';
import { RewardSeen } from './rewardSeen';
export function RoundFeedback({ state, scope }: { state: MatchState; scope: string }) {
  const [reward, setReward] = useState<RoundReward | null>(null);
  const [fusion, setFusion] = useState('');
  const tracking = useRef<{
    scope: string;
    revision: number;
    upgrades: string;
    seen: RewardSeen;
  } | null>(null);
  useEffect(() => {
    if (!['f0p11g-1', 'f0p11h-1'].includes(state.config.catalog ?? '')) return;
    let tracker = tracking.current;
    if (!tracker || tracker.scope !== scope) {
      let storage: Storage | undefined;
      try {
        storage = localStorage;
      } catch {
        /* Private browsing. */
      }
      tracker = tracking.current = {
        scope,
        revision: state.revision,
        upgrades: JSON.stringify(state.lastUpgrades),
        seen: new RewardSeen(storage),
      };
      // Mounting a restored/reconnected result never replays its notice.
      if (state.lastReward?.receipt)
        tracker.seen.consume(`${scope}/${state.lastReward.receipt.id}`);
      setReward(null);
      setFusion('');
      return;
    }
    if (
      state.lastReward?.receipt &&
      tracker.seen.consume(`${scope}/${state.lastReward.receipt.id}`)
    )
      setReward(state.lastReward);
    if (
      state.revision !== tracker.revision &&
      JSON.stringify(state.lastUpgrades) !== tracker.upgrades &&
      state.lastUpgrades.length
    ) {
      setFusion(
        state.lastUpgrades
          .map((upgrade) => {
            const unit = state.units.find((u) => u.id === upgrade.id);
            return `${matchCatalog(state.config).find((d) => d.id === unit?.definitionId)?.name ?? 'Unidad'} · ${upgrade.stars} estrellas`;
          })
          .join(' · '),
      );
    }
    tracker.revision = state.revision;
    tracker.upgrades = JSON.stringify(state.lastUpgrades);
  }, [state, scope]);
  useEffect(() => {
    if (reward) {
      const timer = setTimeout(() => setReward(null), 6500);
      return () => clearTimeout(timer);
    }
  }, [reward]);
  useEffect(() => {
    if (fusion) {
      const timer = setTimeout(() => setFusion(''), 2400);
      return () => clearTimeout(timer);
    }
  }, [fusion]);
  return (
    <>
      {['f0p11g-1', 'f0p11h-1'].includes(state.config.catalog ?? '') && reward?.receipt && (
        <section
          className="round-gold-notice"
          role="status"
          aria-live="polite"
          aria-label="Oro de ronda confirmado"
        >
          <h2>
            {reward.outcome === 'win'
              ? 'Victoria'
              : reward.outcome === 'loss'
                ? 'Derrota'
                : 'Empate'}{' '}
            · Ronda {reward.round}
          </h2>
          <strong className="round-gold-total">
            <GameIcon name="gold" />+{reward.credited}
          </strong>
          <dl>
            {(
              [
                ['Base', reward.receipt.base],
                ['Interés', reward.receipt.interest],
                ['Racha', reward.receipt.streak],
                ['Victoria', reward.receipt.victory],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>+{value}</dd>
              </div>
            ))}
          </dl>
          {reward.overflow > 0 && <p>Límite de oro alcanzado · {reward.overflow} sin acreditar</p>}
        </section>
      )}
      {['f0p11g-1', 'f0p11h-1'].includes(state.config.catalog ?? '') && fusion && (
        <div className="fusion-confirmation" role="status">
          {fusion}
        </div>
      )}
    </>
  );
}
