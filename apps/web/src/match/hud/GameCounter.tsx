import type { CombatCounter } from '../../game/combatCounters';
import { ContentIcon } from './ContentIcon';
export function GameCounter({ counter: c }: { counter: CombatCounter }) {
  const goal = c.max ?? c.progressGoal;
  return (
    <div className="game-counter" data-source={c.source} data-state={c.state} title={c.tooltip}>
      <ContentIcon id={c.icon} />
      <span className="counter-name">{c.name}</span>
      <strong>
        {c.value}
        {c.max !== undefined && <small> / {c.max}</small>}
      </strong>
      {goal !== undefined && (
        <meter aria-label={c.name} min={0} max={goal} value={Math.min(c.value, goal)} />
      )}
      {c.thresholds.length > 1 && (
        <span className="counter-thresholds">
          {c.thresholds.map((n) => (
            <span
              key={n}
              data-reached={c.value >= n}
              title={c.milestones?.find((m) => m.value === n)?.label}
            >
              {n}
              {c.value >= n ? ' · Activo' : ' · Pendiente'}
            </span>
          ))}
        </span>
      )}
      <small className="counter-detail">{c.detail}</small>
      {c.milestones
        ?.filter((m) => c.value >= m.value)
        .map((m) => (
          <small className="counter-detail" key={m.value}>
            {m.label}
          </small>
        ))}
    </div>
  );
}
