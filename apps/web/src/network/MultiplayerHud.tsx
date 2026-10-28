import type { RemoteCoordinator } from './RemoteCoordinator';
import { GameIcon } from '../match/hud/GameIcon';
import './multiplayerHud.css';
function Avatar({ id }: { id: string }) {
  return <GameIcon name={id === 'pulse' ? 'xp' : id === 'spark' ? 'gold' : 'shield'} />;
}
export function MultiplayerStandings({ remote }: { remote: RemoteCoordinator }) {
  return (
    <section className="multiplayer-standings" aria-label="Clasificación provisional">
      <div className="rail-heading">
        <h2>
          Clasificación <small>Provisional</small>
        </h2>
      </div>
      {remote.standings.map((p) => (
        <article
          key={p.id}
          className={`multiplayer-player ${p.own ? 'is-own' : ''} ${p.rival ? 'is-rival' : ''} ${'eliminated' in p && p.eliminated ? 'is-eliminated' : ''}`}
        >
          <span className="multiplayer-avatar" aria-hidden="true">
            <Avatar id={p.avatarId} />
          </span>
          <h3 title={p.name}>{p.name}</h3>
          <strong aria-label={`${p.hp} vida`}>{p.hp}</strong>
          <span className="multiplayer-player-meta">
            Nv. {p.level} · Puesto {p.position}
            {'eliminated' in p && p.eliminated ? ' · Fuera' : ''}
          </span>
          <span className={`multiplayer-connection ${p.connected ? '' : 'is-offline'}`}>
            {p.own ? 'Tú · ' : p.rival ? 'Rival · ' : ''}
            {p.connected ? 'En línea' : 'Sin conexión'}
          </span>
          <meter aria-label={`Vida de ${p.name}`} min={0} max={100} value={p.hp} />
        </article>
      ))}
    </section>
  );
}
export function MultiplayerDuel({ remote }: { remote: RemoteCoordinator }) {
  const d = remote.duel;
  const clock = remote.getClock();
  const ghost = d.pairing?.kind === 'ghost';
  if (remote.eliminated || remote.finalResults) return null;
  if (clock.currentPhase === 'finished')
    return (
      <div className="multiplayer-wait" role="status">
        <strong>Partida finalizada</strong>
        <span>Resultado provisional · sin clasificación final</span>
      </div>
    );
  if (!d.rival || clock.currentPhase !== 'combat') return null;
  if (d.awaiting)
    return (
      <div className="multiplayer-wait" role="status">
        <strong>
          {d.outcome}
          {ghost ? ' · Equipo fantasma' : ''}
        </strong>
        <span>Esperando al resto · la siguiente ronda empieza para todos</span>
      </div>
    );
  return d.intro ? (
    <div className="multiplayer-duel" role="status">
      <span className="duel-caption">
        Ronda {remote.getMatch().round} · {ghost ? 'Equipo fantasma' : 'Enfrentamiento'}
      </span>
      <div className="duel-versus">
        <span>
          <Avatar id={'avatarId' in d.own ? d.own.avatarId : 'jade'} />
          <b>{d.own.name}</b>
          <small>{d.own.hp} vida</small>
        </span>
        <strong>VS</strong>
        <span>
          <Avatar id={'avatarId' in d.rival ? d.rival.avatarId : 'jade'} />
          <b>{d.rival.name}</b>
          <small>{d.rival.hp} vida</small>
        </span>
      </div>
    </div>
  ) : (
    <div className="multiplayer-rival">
      {ghost ? 'Fantasma de ' : 'Rival · '}
      {d.rival.name}
    </div>
  );
}
