import { GameCounter } from '../match/hud/GameCounter';
import type { MechanicsReadout } from './mechanicsReadout';
export function MechanicsStatus({ value }: { value: MechanicsReadout }) {
  if (!value) return null;
  return (
    <section className="mechanics-status" aria-label="Progreso de combate">
      <h4>Progreso de combate</h4>
      {value.counters.map((c) => (
        <GameCounter key={c.id} counter={c} />
      ))}
      {value.effects.length > 0 && (
        <details open>
          <summary>Bonificaciones y duraciones ({value.effects.length})</summary>
          <ul>
            {value.effects.map((e) => (
              <li key={e.id}>
                <span>{e.name}</span>
                <small>{e.duration}</small>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
