import { useEffect, useRef, useState } from 'react';
import { matchCatalog } from '@tft/game-data';
import type { CombatUnitStatistics } from '@tft/shared';
import type { LocalSession } from './LocalSession';
import { GameButton } from './hud/GameButton';
import { GameIcon } from './hud/GameIcon';
import './combatStatistics.css';
const metrics = {
  dealt: [
    'Daño causado',
    'Vida perdida por los objetivos. Escudos y daño excedente se muestran por separado.',
  ],
  received: ['Daño recibido', 'Vida perdida por esta unidad.'],
  healing: ['Curación efectiva', 'Vida restaurada por esta unidad.'],
  shieldAbsorbed: ['Escudo absorbido', 'Daño absorbido por los escudos de esta unidad.'],
  shieldDamage: ['Daño a escudos', 'Daño causado a escudos, separado del daño a vida.'],
  mitigated: ['Daño mitigado', 'Reducción por defensas, después de amplificar el ataque.'],
  overheal: ['Curación excedente', 'Curación que no cabía en la vida máxima del objetivo.'],
  healingPrevented: ['Curación impedida', 'Curación reducida por heridas.'],
} satisfies Partial<Record<keyof CombatUnitStatistics, readonly [string, string]>>;
type Metric = keyof typeof metrics;
export function CombatStatisticsPanel({ session }: { session: LocalSession }) {
  const [open, setOpen] = useState(false),
    [metric, setMetric] = useState<Metric>('dealt');
  const root = useRef<HTMLElement>(null);
  const close = () => {
    setOpen(false);
    root.current?.querySelector<HTMLButtonElement>(':scope > button')?.focus();
  };
  useEffect(() => {
    if (!open) return;
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) {
        e.preventDefault();
        setOpen(false);
        root.current?.querySelector<HTMLButtonElement>(':scope > button')?.focus();
      }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open]);
  const selected = session.getSnapshot().selectedId;
  useEffect(() => {
    if (selected) setOpen(false);
  }, [selected]);
  if (!['f0p11c-1', 'f0p11g-1', 'f0p11h-1'].includes(session.getMatch().config.catalog ?? ''))
    return null;
  const stats = session.combatStatistics(),
    catalog = matchCatalog(session.getMatch().config);
  const rows = [...(stats?.units ?? [])].sort(
    (a, b) => b[metric] - a[metric] || (a.unitId < b.unitId ? -1 : 1),
  );
  const max = Math.max(1, ...rows.map((r) => r[metric]));
  const unavailable =
    stats &&
    ((metric === 'mitigated' && !stats.coverage.mitigation) ||
      (['overheal', 'healingPrevented'].includes(metric) && !stats.coverage.overheal));
  return (
    <aside
      ref={root}
      hidden={!!selected}
      className={`combat-statistics ${open ? 'is-open' : ''}`}
      aria-label="Estadísticas de combate"
    >
      <GameButton
        label="Estadísticas de combate"
        displayLabel="Combate"
        icon="stats"
        disabled={false}
        active={open}
        onAction={() => {
          session.cancel();
          setOpen(!open);
          return true;
        }}
      />
      {open && (
        <section className="combat-statistics-panel">
          <header>
            <div>
              <strong>Estadísticas</strong>
              <span>
                {stats
                  ? `Ronda ${stats.round} · ${stats.complete ? 'Finalizado' : 'En curso'}`
                  : 'Sin combate todavía'}
              </span>
            </div>
            <button type="button" aria-label="Cerrar estadísticas" onClick={close}>
              <GameIcon name="close" />
            </button>
          </header>
          <label>
            Métrica
            <select value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>
              {Object.entries(metrics).map(([key, [label]]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <p className="combat-statistics-help">{metrics[metric][1]}</p>
          {unavailable ? (
            <p>Este combate histórico no registra esta métrica.</p>
          ) : (
            <ol>
              {rows.map((r) => (
                <li key={r.unitId} className={`side-${r.owner}`}>
                  <div>
                    <span>
                      {catalog.find((d) => d.id === r.definitionId)?.name ?? r.definitionId}{' '}
                      <small>
                        {Array.from({ length: r.stars }, (_, i) => (
                          <GameIcon key={i} name="star" />
                        ))}
                      </small>
                    </span>
                    <b>{r[metric].toLocaleString('es-ES')}</b>
                  </div>
                  <div className="combat-statistics-track">
                    <i style={{ transform: `scaleX(${r[metric] / max})` }} />
                  </div>
                  <small>{session.names[r.owner]}</small>
                </li>
              ))}
            </ol>
          )}
          {stats && (
            <footer>
              Hasta {(stats.observedTick / 10).toFixed(1)} s · {rows.length} unidades
              {stats.unattributedDamage > 0 ? ` · ${stats.unattributedDamage} daño sin autor` : ''}
            </footer>
          )}
        </section>
      )}
    </aside>
  );
}
