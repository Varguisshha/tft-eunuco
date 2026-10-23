import type { MechanicsReadout } from './mechanicsReadout';
export function MechanicsStatus({ value }: { value: MechanicsReadout }) {
  if (!value) return null;
  return (
    <section className="mechanics-status" aria-label="Progreso de combate">
      <h4>Progreso de combate</h4>
      <dl>
        <div>
          <dt>Lanzamientos</dt>
          <dd>{value.casts}</dd>
        </div>
        <div>
          <dt>Eliminaciones atribuidas</dt>
          <dd>{value.kills}</dd>
        </div>
      </dl>
      {value.stacks.map((s) => (
        <div className="mechanic-stack" key={s.id}>
          <span>{s.name}</span>
          <strong>
            {s.count} / {s.max}
          </strong>
          <small>{s.duration}</small>
        </div>
      ))}
      {value.progress.map((p) => (
        <p key={p.id} title="Progreso interno de combate; no añade miembros a la sinergia.">
          {p.scope} · {p.casts} lanzamientos · {p.kills} eliminaciones
        </p>
      ))}
      {value.effects.length > 0 && (
        <details>
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
