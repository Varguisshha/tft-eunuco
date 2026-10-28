import { ContextTooltip } from './overlays/ContextTooltip';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getTraitDefinition } from '@tft/game-data';
import { ContentIcon } from './hud/ContentIcon';
import './affinities.css';

/** Width determines visible affinities; the source list is never truncated. */
export function AffinityBand({ ids, catalog }: { ids: readonly string[]; catalog: string }) {
  const band = useRef<HTMLDivElement>(null);
  const [capacity, setCapacity] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const overflow = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const uid = useId();
  useLayoutEffect(() => {
    const element = band.current;
    if (!element) return;
    const measure = () => setCapacity(Math.max(1, Math.floor((element.clientWidth + 4) / 28)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const visible = ids.length <= capacity ? ids : ids.slice(0, Math.max(0, capacity - 1));
  const remaining = ids.slice(visible.length);
  useEffect(() => {
    if (!expanded) return;
    popup.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const dismiss = (event: PointerEvent) => {
      if (
        !popup.current?.contains(event.target as Node) &&
        !overflow.current?.contains(event.target as Node)
      ) {
        setExpanded(false);
      }
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [expanded]);
  const icon = (id: string) => {
    const trait = getTraitDefinition(id, catalog);
    const unique = trait?.planning?.kind === 'unique';
    return (
      <ContextTooltip
        key={id}
        label={trait?.name ?? id}
        content={
          <>
            <h3>{trait?.name ?? id}</h3>
            <p>
              {unique ? 'Atributo único' : 'Sinergia colectiva'} ·{' '}
              {trait?.planning?.effectState === 'pending_effects'
                ? 'Efectos pendientes'
                : trait?.planning?.effectState === 'mixed'
                  ? 'Efectos parciales; niveles pendientes'
                  : 'Efectos definidos'}
            </p>
            <p>{trait?.description}</p>
          </>
        }
      >
        <button
          type="button"
          className={`affinity-icon ${unique ? 'is-unique' : ''}`}
          aria-label={`${trait?.name ?? id} · ${unique ? 'Atributo único' : 'Colectiva'}${trait?.planning?.effectState === 'pending_effects' ? ' · Efectos pendientes' : ''}`}
        >
          <ContentIcon id={trait?.icon ?? id} />
        </button>
      </ContextTooltip>
    );
  };
  const rect = overflow.current?.getBoundingClientRect();
  return (
    <div className="affinity-band" ref={band} aria-label="Afinidades del personaje">
      {visible.map(icon)}
      {remaining.length > 0 && (
        <button
          type="button"
          className="affinity-overflow"
          ref={overflow}
          aria-label={`Ver ${remaining.length} afinidades restantes`}
          aria-expanded={expanded}
          aria-controls={`${uid}-overflow`}
          onClick={() => {
            setExpanded((v) => !v);
          }}
        >
          +{remaining.length}
        </button>
      )}
      {expanded &&
        createPortal(
          <div
            id={`${uid}-overflow`}
            ref={popup}
            className="affinity-popup"
            role="dialog"
            aria-label="Afinidades restantes"
            style={{
              left: Math.max(8, Math.min(innerWidth - 312, rect?.left ?? 8)),
              bottom: Math.max(8, innerHeight - (rect?.top ?? innerHeight) + 8),
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                setExpanded(false);
                overflow.current?.focus();
              }
            }}
          >
            <button
              type="button"
              className="affinity-close"
              onClick={() => {
                setExpanded(false);
                overflow.current?.focus();
              }}
            >
              Cerrar afinidades
            </button>
            {remaining.map((id) => (
              <div className="affinity-popup-row" key={id}>
                {icon(id)}
                <span>
                  {getTraitDefinition(id, catalog)?.name ?? id}
                  <small>
                    {getTraitDefinition(id, catalog)?.planning?.kind === 'unique'
                      ? 'Única'
                      : 'Colectiva'}{' '}
                    ·{' '}
                    {getTraitDefinition(id, catalog)?.planning?.effectState === 'pending_effects'
                      ? 'Efectos pendientes'
                      : getTraitDefinition(id, catalog)?.planning?.effectState === 'mixed'
                        ? 'Efectos parciales; niveles pendientes'
                        : 'Efectos definidos'}
                  </small>
                </span>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
