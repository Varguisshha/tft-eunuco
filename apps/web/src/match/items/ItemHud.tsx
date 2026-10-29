import { ContextTooltip } from '../overlays/ContextTooltip';
import { itemPresentation } from '@tft/game-data';
import { isP11ItemCatalog } from '@tft/shared';
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { resolveItemCatalog } from '@tft/game-data';
import type { ItemDefinition, ItemInstance } from '@tft/shared';
import type { LocalSession } from '../LocalSession';
import { ItemIcon, itemLabel } from './ItemIcon';
import {
  itemInteraction,
  ITEM_MIME,
  recipeOptions,
  DeliveryTracker,
  previewItemCommand,
  equipmentCommand,
} from './itemInteraction';
import './itemHud.css';
export function useItems(session: LocalSession) {
  const c = itemInteraction(session);
  return { c, ui: useSyncExternalStore(c.subscribe, c.getSnapshot, c.getSnapshot) };
}
export function ItemDetails({
  definition: d,
  heading = true,
}: {
  definition: ItemDefinition;
  heading?: boolean;
}) {
  const info = itemPresentation(d);
  return (
    <>
      {heading && <h3>{info.name}</h3>}
      {!info.available && (
        <strong className="item-state-blocked">Bloqueado · el efecto no se ejecuta</strong>
      )}
      <p>{info.stats}</p>
      {info.passive.map((text, i) => (
        <p key={i}>{text}</p>
      ))}
      {!!info.restrictions.length && <p>{info.restrictions.join(' ')}</p>}
      {!!info.pending.length && <p>{info.pending.join(' ')}</p>}
    </>
  );
}

export function ItemHud({ session }: { session: LocalSession }) {
  return isP11ItemCatalog(session.getMatch().config.catalog) ? (
    <VerticalItemHud session={session} />
  ) : (
    <LegacyItemHud session={session} />
  );
}
function LegacyItemHud({ session }: { session: LocalSession }) {
  const { c, ui } = useItems(session);
  useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const state = session.getMatch(),
    inv = state.items;
  const [open, setOpen] = useState(false),
    [tab, setTab] = useState<'components' | 'completed' | 'pending'>('components');
  const [hover, setHover] = useState<string | null>(null),
    [recipe, setRecipe] = useState<string | null>(null),
    [target, setTarget] = useState('');
  const [notice, setNotice] = useState<{ ids: string[]; returning: boolean } | null>(null);
  const tracker = useRef(new DeliveryTracker()),
    first = useRef(true);
  const deliveryKey = inv?.distributions.map((d) => d.id).join('|') ?? '';
  useEffect(() => {
    if (!inv) return;
    const ids = tracker.current.observe(inv.distributions.map((d) => d.id));
    if (ids.length) setNotice({ ids, returning: first.current });
    first.current = false;
  }, [deliveryKey, inv]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        c.cancel();
        setRecipe(null);
        setHover(null);
        setOpen(false);
      }
    };
    document.addEventListener('keydown', f);
    return () => document.removeEventListener('keydown', f);
  }, [c]);
  if (!inv) return null;
  const catalog = resolveItemCatalog(inv.catalogVersion),
    bag = inv[tab];
  const definition = (id: string) => catalog.definitions.find((d) => d.id === id);
  const all = [
    ...inv.components,
    ...inv.completed,
    ...inv.pending,
    ...state.units.flatMap((u) => u.equipment ?? []),
  ];
  const selected = all.find((i) => i.id === ui.selected),
    detail = definition(
      (bag.some((i) => i.definitionId === hover) ? hover : null) ?? selected?.definitionId ?? '',
    );
  const capacity =
    tab === 'components' ? catalog.policy.componentCapacity : catalog.policy.completedCapacity;
  const selectedOwned = session.selected();
  const destination = state.units.find((u) => u.id === (target || selectedOwned?.id));
  const drag = (e: React.DragEvent, item: ItemInstance) => {
    c.select(item.id, true);
    e.dataTransfer.setData(ITEM_MIME, item.id);
    e.dataTransfer.effectAllowed = 'move';
  };
  return (
    <section
      className={`item-dock ${open ? 'is-open' : ''} ${ui.dragging ? 'is-dragging' : ''}`}
      aria-label="Inventario de objetos"
    >
      <button className="item-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        Objetos <b>{inv.components.length + inv.completed.length}</b>
        {inv.pending.length > 0 && <span> +{inv.pending.length} pendientes</span>}
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="item-tray">
          <div className="item-tabs" role="tablist" aria-label="Bandejas de objetos">
            {(['components', 'completed', 'pending'] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={t === tab}
                onClick={() => {
                  setTab(t);
                  setHover(null);
                }}
              >
                {t === 'components' ? 'Componentes' : t === 'completed' ? 'Objetos' : 'Pendientes'}{' '}
                <b>
                  {inv[t].length}
                  {t === 'pending'
                    ? ''
                    : `/${t === 'components' ? catalog.policy.componentCapacity : catalog.policy.completedCapacity}`}
                </b>
              </button>
            ))}
          </div>
          <div
            className="item-slots"
            role="group"
            aria-label={tab === 'pending' ? 'Recompensas pendientes' : 'Ranuras del inventario'}
          >
            {Array.from({ length: tab === 'pending' ? bag.length : capacity }, (_, i) => {
              const item = bag[i],
                d = item && definition(item.definitionId);
              return item ? (
                <button
                  key={item.id}
                  className={`item-slot ${ui.selected === item.id ? 'selected' : ''}`}
                  aria-pressed={ui.selected === item.id}
                  aria-label={`${d ? itemLabel(d) : 'Objeto desconocido'}, ranura ${i + 1}`}
                  aria-describedby={detail?.id === d?.id ? 'item-details' : undefined}
                  draggable={session.editable && !ui.pending && tab !== 'pending'}
                  onDragStart={(e) => drag(e, item)}
                  onDragEnd={() => c.endDrag()}
                  onFocus={() => setHover(item.definitionId)}
                  onMouseEnter={() => setHover(item.definitionId)}
                  onClick={() => {
                    c.select(item.id);
                  }}
                  onDragOver={(e) => {
                    if (item.kind === 'component' && tab === 'components') {
                      e.preventDefault();
                      e.currentTarget.dataset.drop = previewItemCommand(
                        state,
                        c.combinationCommand(ui.selected ?? '', item.id),
                      )
                        ? 'invalid'
                        : 'valid';
                    }
                  }}
                  onDragLeave={(e) => delete e.currentTarget.dataset.drop}
                  onDrop={(e) => {
                    e.preventDefault();
                    delete e.currentTarget.dataset.drop;
                    const id = e.dataTransfer.getData(ITEM_MIME);
                    if (id) c.combine(id, item.id);
                  }}
                >
                  <ItemIcon definition={d} />
                  <span className="item-slot-mark">{item.kind === 'component' ? 'C' : 'O'}</span>
                </button>
              ) : (
                <span className="item-slot empty" key={i} aria-label={`Ranura ${i + 1} vacía`}>
                  {i + 1}
                </span>
              );
            })}
            {tab === 'pending' && !bag.length && <p>No hay recompensas pendientes.</p>}
          </div>
          {selected && (
            <div className="item-actions">
              {inv.pending.some((i) => i.id === selected.id) ? (
                <button
                  disabled={ui.pending || !session.editable}
                  onClick={() => c.submit({ type: 'move_item', itemId: selected.id, toIndex: 0 })}
                >
                  Recuperar al inventario
                </button>
              ) : (
                <>
                  <label>
                    Destino
                    <select
                      aria-label="Personaje para equipar"
                      value={destination?.id ?? ''}
                      onChange={(e) => {
                        setTarget(e.target.value);
                        session.select(e.target.value);
                      }}
                    >
                      <option value="">Elige personaje…</option>
                      {state.units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.definitionId.toUpperCase()} {u.stars}★ ·{' '}
                          {u.location.kind === 'bench' ? 'banquillo' : 'tablero'}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    disabled={!destination || ui.pending || !session.editable}
                    onClick={() => destination && c.equip(destination.id)}
                  >
                    Equipar
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  c.cancel();
                  setRecipe(null);
                }}
              >
                Cancelar
              </button>
            </div>
          )}
          <p className={`item-status ${ui.outcome}`} role="status">
            {ui.status}
          </p>
          {detail && (
            <div id="item-details" className="item-details" role="tooltip">
              <ItemDetails definition={detail} />
              {detail.kind === 'component' && (
                <button onClick={() => setRecipe(detail.id)}>Ver ocho combinaciones</button>
              )}
            </div>
          )}
          {recipe && (
            <section className="item-recipes" aria-label="Combinaciones posibles">
              <header>
                <strong>Combinaciones</strong>
                <button aria-label="Cerrar recetas" onClick={() => setRecipe(null)}>
                  ×
                </button>
              </header>
              {recipeOptions(state, recipe).map(({ recipe: r, result, first: a, second: b }) => (
                <div className="item-recipe" key={r.id}>
                  <div className="recipe-symbols">
                    <ItemIcon definition={definition(r.components[0])} />
                    <span>+</span>
                    <ItemIcon definition={definition(r.components[1])} />
                    <span>→</span>
                    <ItemIcon definition={result} />
                  </div>
                  {result ? (
                    <details>
                      <summary>{itemLabel(result)}</summary>
                      <ItemDetails definition={result} />
                    </details>
                  ) : (
                    <span>Receta no disponible</span>
                  )}
                  <button
                    disabled={
                      !a ||
                      !b ||
                      ui.pending ||
                      !session.editable ||
                      result?.availability !== 'available'
                    }
                    onClick={() =>
                      a &&
                      b &&
                      c.submit({ type: 'combine_components', firstId: a.id, secondId: b.id })
                    }
                  >
                    {a && b ? 'Combinar' : 'Faltan componentes'}
                  </button>
                </div>
              ))}
            </section>
          )}
        </div>
      )}
      {notice && notice.ids.some((id) => inv.distributions.some((d) => d.id === id)) && (
        <div className="item-delivery" role="status">
          <button aria-label="Cerrar aviso de objetos" onClick={() => setNotice(null)}>
            ×
          </button>
          {notice.ids.slice(-1).map((id) => {
            const d = inv.distributions.find((x) => x.id === id);
            if (!d) return null;
            return (
              <div key={id}>
                <strong>
                  {notice.returning ? 'Recompensa ya recibida' : 'Componentes recibidos'} · Ronda{' '}
                  {d.round}
                </strong>
                <div>
                  {d.instanceIds.map((itemId) => {
                    const item =
                      all.find((i) => i.id === itemId) ??
                      inv.grants.flatMap((g) => g.instances).find((i) => i.id === itemId);
                    return (
                      <span key={itemId}>
                        <ItemIcon definition={definition(item?.definitionId ?? '')} />
                      </span>
                    );
                  })}
                </div>
                <small>
                  {d.quantity} componentes confirmados ·{' '}
                  {d.instanceIds.some((i) => inv.pending.some((p) => p.id === i))
                    ? 'Consulta Pendientes'
                    : 'Incorporados al inventario'}
                </small>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
export function EquipmentSlots({
  session,
  unitId,
  items,
  readOnly = false,
}: {
  session: LocalSession;
  unitId: string;
  items: { definitionId: string; id?: string }[];
  readOnly?: boolean;
}) {
  const { c, ui } = useItems(session);
  const catalog = resolveItemCatalog(session.getMatch().items?.catalogVersion ?? 'f0p8c-1');
  const slots = items.flatMap((item) => {
    const d = catalog.definitions.find((d) => d.id === item.definitionId);
    return Array.from({ length: d?.content?.slotCost ?? 1 }, () => item);
  });
  return (
    <section className="equipment-slots" aria-label="Objetos equipados">
      <h3>Objetos · {slots.length}/3</h3>
      <div>
        {Array.from({ length: 3 }, (_, i) => {
          const d = catalog.definitions.find((d) => d.id === slots[i]?.definitionId);
          return (
            <ContextTooltip
              key={i}
              disabled={!d}
              label={d ? itemLabel(d) : 'Ranura vacía'}
              content={d ? <ItemDetails definition={d} /> : null}
            >
              <button
                aria-label={`Ranura de equipo ${i + 1}: ${d ? itemLabel(d) : 'vacía'}${readOnly ? ' · rival' : ''}`}
                draggable={!readOnly && d?.kind === 'component' && !!slots[i]?.id}
                onDragStart={(e) => {
                  const id = slots[i]?.id;
                  if (id) {
                    c.select(id, true);
                    e.dataTransfer.setData(ITEM_MIME, id);
                  }
                }}
                onDragEnd={() => c.endDrag()}
                disabled={ui.pending}
                aria-disabled={readOnly}
                onClick={() => !readOnly && c.equip(unitId)}
                onDragOver={(e) => {
                  if (!readOnly && e.dataTransfer.types.includes(ITEM_MIME)) {
                    e.preventDefault();
                    e.currentTarget.dataset.drop = previewItemCommand(
                      session.getMatch(),
                      equipmentCommand(session.getMatch(), unitId, ui.selected ?? ''),
                    )
                      ? 'invalid'
                      : 'valid';
                  }
                }}
                onDragLeave={(e) => delete e.currentTarget.dataset.drop}
                onDrop={(e) => {
                  delete e.currentTarget.dataset.drop;
                  e.preventDefault();
                  if (!readOnly) c.equip(unitId, e.dataTransfer.getData(ITEM_MIME));
                }}
              >
                <ItemIcon definition={d} />
                <span>{d?.kind === 'component' ? 'C' : d ? 'O' : i + 1}</span>
              </button>
            </ContextTooltip>
          );
        })}
      </div>
    </section>
  );
}

/** Initial snapshots are acknowledged silently: reconnecting never replays a delivery toast. */
function RoundDelivery({ session }: { session: LocalSession }) {
  const inv = session.getMatch().items!;
  const tracker = useRef(new Set(inv.distributions.map((d) => d.id)));
  const [delivery, setDelivery] = useState<(typeof inv.distributions)[number] | null>(null);
  const key = inv.distributions.map((d) => d.id).join('|');
  useEffect(() => {
    const fresh = inv.distributions.filter((d) => !tracker.current.has(d.id));
    for (const d of inv.distributions) tracker.current.add(d.id);
    if (fresh.length) setDelivery(fresh.at(-1)!);
  }, [key, inv]);
  useEffect(() => {
    if (!delivery) return;
    const timer = setTimeout(() => setDelivery(null), 8000);
    return () => clearTimeout(timer);
  }, [delivery]);
  if (!delivery) return null;
  const available =
    inv.removers?.issued.filter((r) => !inv.removers!.consumed.some((c) => c.id === r.id)).length ??
    0;
  return (
    <aside className="item-delivery p12b-delivery" role="status" aria-label="Recompensa de ronda">
      <button aria-label="Cerrar recompensa" onClick={() => setDelivery(null)}>
        ×
      </button>
      <strong>Recompensa · Ronda {delivery.round}</strong>
      <div>{delivery.quantity} componentes recibidos</div>
      {delivery.removerIds && <div>+1 removedor de objetos · {available} disponibles</div>}
      {!!inv.pending.length && <small>Hay objetos en Pendientes</small>}
    </aside>
  );
}
function VerticalItemHud({ session }: { session: LocalSession }) {
  const { c, ui } = useItems(session);
  const scroll = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const rail = scroll.current;
    const selected = rail?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
    if (!rail || !selected) return;
    // Selection/result controls change the scrollport height. Keep the actual drag handle visible.
    const item = selected.getBoundingClientRect(),
      bounds = rail.getBoundingClientRect();
    if (item.bottom > bounds.bottom) rail.scrollTop += item.bottom - bounds.bottom;
    else if (item.top < bounds.top) rail.scrollTop -= bounds.top - item.top;
  }, [ui.selected, ui.status, ui.pending]);
  useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const state = session.getMatch(),
    inv = state.items!,
    catalog = resolveItemCatalog(inv.catalogVersion);
  const available = [...inv.components, ...inv.completed],
    all = [...available, ...inv.pending];
  const selected = all.find((i) => i.id === ui.selected),
    pending = selected && inv.pending.includes(selected);
  const remover =
    inv.removers?.issued.filter((r) => !inv.removers!.consumed.some((x) => x.id === r.id)) ?? [];
  const isRemover = remover.some((r) => r.id === ui.selected),
    target = session.selected();
  const definition = selected && catalog.definitions.find((d) => d.id === selected.definitionId);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') c.cancel();
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [c]);
  const recipes =
    definition?.kind === 'component' ? (
      <>
        <h3>Combinaciones · {itemLabel(definition)}</h3>
        {recipeOptions(state, definition.id).map(({ recipe: r, result, first, second }) => (
          <div className="context-recipe" key={r.id}>
            {result && (
              <details>
                <summary>
                  <ItemIcon definition={result} />
                  {itemLabel(result)}
                  {result.availability !== 'available' ? ' · Bloqueado' : ''}
                </summary>
                <ItemDetails definition={result} heading={false} />
              </details>
            )}
            <p>
              {r.components
                .map((id) => itemLabel(catalog.definitions.find((d) => d.id === id)!))
                .join(' + ')}
            </p>
            <button
              type="button"
              disabled={
                !first ||
                !second ||
                ui.pending ||
                !session.editable ||
                result?.availability !== 'available'
              }
              onClick={() => first && second && c.combine(first.id, second.id)}
            >
              Combinar
            </button>
            {result?.availability !== 'available' && (
              <p>No se consumen componentes: efecto pendiente.</p>
            )}
          </div>
        ))}
      </>
    ) : null;
  return (
    <section className="item-vertical" aria-label="Inventario de objetos">
      <RoundDelivery session={session} />
      <header>
        <strong>Objetos</strong>
        <b>{all.length}</b>
        {!!inv.pending.length && <span>{inv.pending.length} pendientes</span>}
      </header>
      <div
        ref={scroll}
        className="item-vertical-scroll"
        aria-label="Bandeja vertical de objetos"
        role="group"
        tabIndex={0}
        onKeyDown={(event) => {
          const buttons = [
              ...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
            ],
            index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          const delta = { ArrowDown: 2, ArrowUp: -2, ArrowRight: 1, ArrowLeft: -1 }[event.key];
          const next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? buttons.length - 1
                : delta !== undefined
                  ? Math.max(0, Math.min(buttons.length - 1, index + delta))
                  : null;
          if (next !== null && buttons[next]) {
            event.preventDefault();
            buttons[next].focus();
            buttons[next].scrollIntoView({ block: 'nearest' });
          }
        }}
      >
        {!all.length && <span className="item-vertical-empty">Sin objetos</span>}
        {all.map((item, index) => {
          const d = catalog.definitions.find((d) => d.id === item.definitionId)!,
            held = item.id === ui.selected,
            waiting = inv.pending.includes(item);
          return (
            <ContextTooltip
              key={item.id}
              label={itemLabel(d)}
              disabled={ui.dragging}
              content={<ItemDetails definition={d} />}
            >
              <button
                type="button"
                className={`item-slot ${held ? 'selected' : ''}`}
                data-item-instance={item.id}
                aria-label={`${itemLabel(d)}, ranura ${index + 1}${waiting ? ', pendiente de recuperar' : ''}`}
                aria-pressed={held}
                disabled={ui.pending}
                draggable={session.editable && !ui.pending && !waiting}
                onClick={() => {
                  if (
                    selected?.kind === 'component' &&
                    item.kind === 'component' &&
                    selected.id !== item.id &&
                    !pending &&
                    !waiting
                  )
                    c.combine(selected.id, item.id);
                  else c.select(item.id);
                }}
                onDragStart={(e) => {
                  c.select(item.id, true);
                  e.dataTransfer.setData(ITEM_MIME, item.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => c.endDrag()}
                onDragOver={(e) => {
                  if (item.kind === 'component' && !waiting) {
                    e.preventDefault();
                    e.currentTarget.dataset.drop = previewItemCommand(
                      state,
                      c.combinationCommand(ui.selected ?? '', item.id),
                    )
                      ? 'invalid'
                      : 'valid';
                  }
                }}
                onDragLeave={(e) => delete e.currentTarget.dataset.drop}
                onDrop={(e) => {
                  e.preventDefault();
                  delete e.currentTarget.dataset.drop;
                  const id = e.dataTransfer.getData(ITEM_MIME);
                  if (id) c.combine(id, item.id);
                }}
              >
                <ItemIcon definition={d} />
                {waiting && (
                  <span className="item-pending-mark" aria-hidden="true">
                    !
                  </span>
                )}
              </button>
            </ContextTooltip>
          );
        })}
        <ContextTooltip
          label="Removedor de objetos"
          content={
            <>
              <h3>Removedor de objetos</h3>
              <p>
                Devuelve todo el equipo de una unidad propia al inventario. Conserva los objetos
                completos. Se consume solo tras confirmación.
                {state.config.removerPolicy
                  ? ' En preparación: tablero y banquillo. En combate: solo banquillo; el combate en curso no cambia.'
                  : ' Disponible durante la preparación.'}
                {state.config.removerPolicy?.version === 'f0p12b-remover-1' &&
                  ' Recibes uno adicional junto a los componentes cada tres rondas. Se acumulan y no caducan.'}
              </p>
            </>
          }
        >
          <button
            type="button"
            className={`item-slot remover-slot ${isRemover ? 'selected' : ''}`}
            aria-label={`Removedor de objetos, cantidad ${remover.length}`}
            aria-pressed={isRemover}
            disabled={!remover.length || ui.pending}
            draggable={!!remover.length && !ui.pending}
            onDragStart={(e) => {
              const id = remover[0]?.id;
              if (!id) return;
              c.select(id, true);
              e.dataTransfer.setData(ITEM_MIME, id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={() => c.endDrag()}
            onClick={() => c.select(remover[0]!.id)}
          >
            <svg viewBox="0 0 40 40" aria-hidden="true">
              <path
                d="M7 7h10M7 7v10m0-10 10 10M33 7H23m10 0v10m0-10L23 17M7 33h10M7 33V23m0 10 10-10m16 10H23m10 0V23m0 10L23 23"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
            </svg>
            <b className="item-quantity">{remover.length}</b>
          </button>
        </ContextTooltip>
      </div>
      {(selected || isRemover) && (
        <div className="item-selection-tools">
          {pending ? (
            <button
              type="button"
              disabled={
                ui.pending ||
                !session.editable ||
                !!previewItemCommand(state, { type: 'move_item', itemId: selected!.id, toIndex: 0 })
              }
              onClick={() => c.submit({ type: 'move_item', itemId: selected!.id, toIndex: 0 })}
            >
              Recuperar
            </button>
          ) : (
            <button
              type="button"
              disabled={
                !target ||
                ui.pending ||
                !session.canEconomicAction(
                  equipmentCommand(state, target?.id ?? '', ui.selected ?? ''),
                ) ||
                !!previewItemCommand(
                  state,
                  equipmentCommand(state, target?.id ?? '', ui.selected ?? ''),
                )
              }
              aria-label={
                target
                  ? `${isRemover ? 'Retirar de' : 'Equipar a'} ${target.definitionId.toUpperCase()}`
                  : 'Selecciona un personaje'
              }
              onClick={() => target && c.equip(target.id)}
            >
              {isRemover ? 'Retirar equipo' : 'Equipar'}
            </button>
          )}
          {recipes && (
            <ContextTooltip label="Combinaciones posibles" interactive content={recipes}>
              <button type="button">Combinaciones</button>
            </ContextTooltip>
          )}
        </div>
      )}
      {ui.outcome !== 'idle' && (
        <p className={`item-status ${ui.outcome}`} role="status">
          {ui.status}
        </p>
      )}
    </section>
  );
}
