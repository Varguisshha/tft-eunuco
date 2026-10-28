import { useEffect, useRef } from 'react';
import type { RemoteCoordinator } from './RemoteCoordinator';
import { GameIcon } from '../match/hud/GameIcon';
import { GameButton } from '../match/hud/GameButton';
import { GameFrame } from '../match/hud/GameFrame';
import './competitiveHud.css';
const avatar = (id: string) =>
  id === 'pulse' ? ('xp' as const) : id === 'spark' ? ('gold' as const) : ('shield' as const);
export function CompetitiveHud({
  remote,
  onExit,
}: {
  remote: RemoteCoordinator;
  onExit: () => void;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  const final = remote.finalResults;
  const player = remote.player;
  const show = !!final || (remote.eliminated && !remote.spectating);
  useEffect(() => {
    if (show) title.current?.focus();
  }, [show]);
  const exit = () => {
    onExit();
    return true;
  };
  if (final) {
    const shared = final.sharedFirst;
    const winner = final.winnerIds.includes(player.id);
    return (
      <section className="competition-results" aria-labelledby="competition-title">
        <div className="competition-result-shell">
          <div className="competition-medal" aria-hidden="true">
            <GameIcon name={shared ? 'shield' : 'gold'} />
          </div>
          <h1 id="competition-title" ref={title} tabIndex={-1}>
            {shared && winner
              ? 'PRIMER PUESTO COMPARTIDO'
              : winner
                ? 'VICTORIA — TFT EUNUCO'
                : 'PARTIDA FINALIZADA'}
          </h1>
          <div className="competition-winners">
            {final.standings
              .filter((p) => final.winnerIds.includes(p.id))
              .map((p) => (
                <span key={p.id}>
                  <GameIcon name={avatar(p.avatarId)} />
                  <b>{p.name}</b>
                </span>
              ))}
          </div>
          <p>
            Rondas disputadas: {final.round} · Tu posición:{' '}
            {final.standings.find((p) => p.id === player.id)?.finalPosition}
          </p>
          <table className="competition-table">
            <caption>Clasificación definitiva</caption>
            <thead>
              <tr>
                <th>Puesto</th>
                <th>Jugador</th>
                <th>Vida final</th>
                <th>Eliminación</th>
              </tr>
            </thead>
            <tbody>
              {final.standings.map((p) => (
                <tr key={p.id} className={p.id === player.id ? 'is-own' : ''}>
                  <td>
                    <strong>{p.finalPosition}</strong>
                  </td>
                  <th scope="row">
                    <GameIcon name={avatar(p.avatarId)} />
                    {p.name}
                    {p.id === player.id && <small> Tú</small>}
                  </th>
                  <td>{p.hp}</td>
                  <td>{p.eliminatedRound ? `Ronda ${p.eliminatedRound}` : 'Superviviente'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <GameButton label="Volver al menú" icon="play" disabled={false} onAction={exit} />
        </div>
      </section>
    );
  }
  if (!remote.eliminated) return null;
  if (!remote.spectating)
    return (
      <section className="competition-elimination" aria-labelledby="elimination-title">
        <GameFrame width={600} height={310} />
        <div className="competition-medal" aria-hidden="true">
          <GameIcon name="shield" />
        </div>
        <h2 id="elimination-title" ref={title} tabIndex={-1}>
          HAS SIDO ELIMINADO
        </h2>
        <p>
          Puesto {'finalPosition' in player ? player.finalPosition : '—'} · Ronda{' '}
          {'eliminatedRound' in player ? player.eliminatedRound : '—'}
        </p>
        <p>Tu participación ha terminado. Puedes seguir los duelos del resto.</p>
        <div className="competition-actions">
          <GameButton
            label="Espectar"
            icon="play"
            disabled={!remote.connected}
            onAction={() => remote.spectate(null)}
          />
          <GameButton label="Salir" icon="close" disabled={false} onAction={exit} />
        </div>
      </section>
    );
  const names = (id: string) => remote.standings.find((p) => p.id === id)?.name ?? 'Jugador';
  return (
    <section className="spectator-controls" aria-label="Modo espectador">
      <h2>Espectador · Puesto {'finalPosition' in player ? player.finalPosition : '—'}</h2>
      <p>
        {remote.selectedDuelId
          ? 'Observando en directo · información pública'
          : 'Elige un duelo al comenzar el combate.'}
      </p>
      <div className="competition-actions">
        {remote.spectatorDuels.map((d) => (
          <GameButton
            key={d.combatId}
            label={`${names(d.southPlayerId)} vs ${names(d.northPlayerId)}${d.kind === 'ghost' ? ' · Clon' : ''}`}
            icon="play"
            disabled={remote.getClock().currentPhase !== 'combat'}
            active={remote.selectedDuelId === d.combatId}
            onAction={() => remote.spectate(d.combatId)}
          />
        ))}
        <GameButton label="Salir" icon="close" disabled={false} onAction={exit} />
      </div>
    </section>
  );
}
