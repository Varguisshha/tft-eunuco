import { resolveElementDrop } from '../game/dropGeometry';
import {
  equipmentCommand,
  itemInteraction,
  ITEM_MIME,
  previewItemCommand,
} from './items/itemInteraction';
import { useEffect, useState } from 'react';
import { resolveItemCatalog } from '@tft/game-data';
import { ItemIcon, itemLabel } from './items/ItemIcon';
import { getUnitDefinition } from '@tft/game-data';
import { GameIcon } from './hud/GameIcon';
import { PixelUnit } from '../game/PixelUnit';
import type { LocalSession } from './LocalSession';
export function Bench({
  session,
  view,
}: {
  session: LocalSession;
  view: ReturnType<LocalSession['getSnapshot']>;
}) {
  const [dropSlot, setDropSlot] = useState<number | null>(null);
  const state = session.getMatch(),
    preparing = session.editable;
  useEffect(() => {
    session.dropOutside = (id, x, y) => {
      const slots = [...document.querySelectorAll<HTMLElement>('[data-bench-slot]')];
      const hit = resolveElementDrop(x, y, slots, 'data-bench-slot');
      const tray = slots[0]?.closest('.bench-section')?.getBoundingClientRect();
      if (!tray || x < tray.left || x > tray.right || y < tray.top || y > tray.bottom) return false;
      if (hit.id !== null) session.bench(Number(hit.id), id);
      else
        session.reportInteraction(
          'Destino ambiguo. Conservas la unidad; apunta al centro de una plaza.',
        );
      // A rejected bench drop must not fall through to the ground behind the tray.
      return true;
    };
    return () => {
      session.dropOutside = undefined;
    };
  }, [session]);
  const drag = (event: React.DragEvent, id: string) => {
    event.dataTransfer.setData('application/x-tft-unit', id);
    event.dataTransfer.effectAllowed = 'move';
    session.select(id);
  };
  const drop = (event: React.DragEvent<HTMLElement>, slot: number) => {
    event.preventDefault();
    delete event.currentTarget.dataset.itemTarget;
    setDropSlot(null);
    itemInteraction(session).previewCombination(null);
    const hit = resolveElementDrop(
      event.clientX,
      event.clientY,
      [...document.querySelectorAll<HTMLElement>('[data-bench-slot]')],
      'data-bench-slot',
    );
    if (hit.id === null) {
      itemInteraction(session).error('Destino ambiguo. Apunta al centro de una plaza.');
      return;
    }
    slot = Number(hit.id);
    const item = event.dataTransfer.getData(ITEM_MIME);
    if (item) {
      const unit = state.units.find((u) => u.location.kind === 'bench' && u.location.slot === slot);
      itemInteraction(session).equip(unit?.id ?? '', item);
      return;
    }
    const id = event.dataTransfer.getData('application/x-tft-unit');
    if (id && preparing) session.bench(slot, id);
  };
  return (
    <section
      className="bench-section"
      aria-label="Banquillo"
      onDragOver={(e) => {
        if ((e.target as Element).closest('[data-bench-slot]')) return;
        if (
          e.dataTransfer.types.includes(ITEM_MIME) ||
          (preparing && e.dataTransfer.types.includes('application/x-tft-unit'))
        ) {
          e.preventDefault();
          const hit = resolveElementDrop(
            e.clientX,
            e.clientY,
            [...document.querySelectorAll<HTMLElement>('[data-bench-slot]')],
            'data-bench-slot',
          );
          itemInteraction(session).hint(
            hit.id === null
              ? 'Destino ambiguo. Apunta al centro de una plaza.'
              : 'Suelta sobre el centro de una unidad propia.',
          );
        }
      }}
      onDrop={(e) => {
        if (!(e.target as Element).closest('[data-bench-slot]')) drop(e, 0);
      }}
    >
      <div className="section-line">
        <h2>Banquillo</h2>
        <span>
          {state.units.filter((u) => u.location.kind === 'bench').length} / {state.config.benchSize}{' '}
          plazas
        </span>
      </div>
      <div className="bench-slots">
        {Array.from({ length: state.config.benchSize }, (_, slot) => {
          const u = state.units.find(
              (u) => u.location.kind === 'bench' && u.location.slot === slot,
            ),
            d = getUnitDefinition(u?.definitionId ?? '');
          return (
            <button
              key={slot}
              data-bench-slot={slot}
              data-bench-unit={u?.id}
              data-equipment-unit={u?.id}
              className={`bench-slot ${u?.id === view.selectedId ? 'selected' : ''} ${dropSlot === slot ? 'drop-target' : ''}`}
              disabled={!preparing && !u}
              aria-label={`Banquillo ${slot + 1}${d && u ? `: ${d.name}, ${u.stars} estrellas` : ': vacío'}`}
              draggable={!!u && preparing}
              onDragStart={(e) => u && drag(e, u.id)}
              onDragEnd={() => setDropSlot(null)}
              onDragLeave={(e) => {
                delete e.currentTarget.dataset.itemTarget;
                setDropSlot(null);
                itemInteraction(session).previewCombination(null);
              }}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes(ITEM_MIME)) {
                  e.preventDefault();
                  const id = itemInteraction(session).getSnapshot().selected;
                  const controller = itemInteraction(session);
                  controller.previewCombination(
                    u?.equipment?.find((i) => i.kind === 'component')?.id ?? null,
                  );
                  if (u && id) {
                    const command = equipmentCommand(state, u.id, id);
                    controller.hint(
                      session.economicBlockReason(command) ??
                        previewItemCommand(state, command) ??
                        `Suelta para equipar a ${d?.name ?? u.definitionId}.`,
                    );
                  }
                  const hit = resolveElementDrop(
                    e.clientX,
                    e.clientY,
                    [...document.querySelectorAll<HTMLElement>('[data-bench-slot]')],
                    'data-bench-slot',
                  );
                  e.currentTarget.dataset.itemTarget =
                    hit.id === String(slot) &&
                    u &&
                    id &&
                    session.canEconomicAction(equipmentCommand(state, u.id, id)) &&
                    !previewItemCommand(state, equipmentCommand(state, u.id, id))
                      ? 'valid'
                      : 'invalid';
                  return;
                }
                if (preparing) {
                  e.preventDefault();
                  setDropSlot(slot);
                }
              }}
              onDrop={(e) => drop(e, slot)}
              onClick={() => (u ? session.select(u.id) : session.bench(slot))}
            >
              <span className="slot-number">{slot + 1}</span>
              {d && u ? (
                <>
                  <PixelUnit role={d.role} spriteId={d.spriteId} stars={u.stars} />
                  <span className="bench-name">{d.name}</span>
                  <span className="bench-equipment" aria-label="Equipamiento">
                    {u.equipment?.map((item) => {
                      const definition = resolveItemCatalog(
                        state.items!.catalogVersion,
                      ).definitions.find((d) => d.id === item.definitionId);
                      return (
                        <span
                          key={item.id}
                          title={definition ? itemLabel(definition) : item.definitionId}
                        >
                          <ItemIcon definition={definition} />
                        </span>
                      );
                    })}
                  </span>
                  <span className="stars">
                    {Array.from({ length: u.stars }, (_, i) => (
                      <GameIcon key={i} name="star" />
                    ))}
                  </span>
                </>
              ) : (
                <span className="empty-slot">
                  <GameIcon name="plus" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
