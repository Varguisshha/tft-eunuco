import { useEffect } from 'react';
import type { LocalSession } from '../LocalSession';
import { resolveElementDrop } from '../../game/dropGeometry';
import { equipmentCommand, previewItemCommand, itemInteraction } from './itemInteraction';
/** Native HTML drag remains the mouse path. Touch/pen share the same geometry and commands. */
export function PointerInteractions({ session }: { session: LocalSession }) {
  useEffect(() => {
    const c = itemInteraction(session);
    let drag: {
      id: string;
      kind: 'item' | 'unit';
      pointer: number;
      x: number;
      y: number;
      active: boolean;
    } | null = null;
    let suppressUntil = 0;
    const emit = (x: number, y: number, phase: 'move' | 'drop' | 'end') => {
      if (drag)
        document.dispatchEvent(
          new CustomEvent('tft-pointer-drag', {
            detail: { x, y, phase, id: drag.id, kind: drag.kind },
          }),
        );
    };
    const clearTargets = () =>
      document.querySelectorAll<HTMLElement>('[data-pointer-target]').forEach((el) => {
        delete el.dataset.pointerTarget;
        delete el.dataset.itemTarget;
      });
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || !e.isPrimary || !(e.target instanceof Element)) return;
      const el = e.target.closest<HTMLElement>(
        '[data-item-instance], [data-remover-instance], [data-bench-unit]',
      );
      if (!el || el.matches(':disabled')) return;
      const id = el.dataset.itemInstance ?? el.dataset.removerInstance ?? el.dataset.benchUnit!;
      const kind = el.dataset.benchUnit ? 'unit' : 'item';
      if (kind === 'unit' && !session.editable) return;
      if (
        kind === 'item' &&
        (c.getSnapshot().pending || session.getMatch().items?.pending.some((i) => i.id === id))
      )
        return;
      drag = { id, kind, pointer: e.pointerId, x: e.clientX, y: e.clientY, active: false };
    };
    const target = (e: PointerEvent, drop: boolean) => {
      if (!drag) return;
      clearTargets();
      const state = session.getMatch();
      const tray = document.querySelector('.item-vertical-scroll')?.getBoundingClientRect();
      const inTray =
        tray &&
        e.clientX >= tray.left &&
        e.clientX <= tray.right &&
        e.clientY >= tray.top &&
        e.clientY <= tray.bottom;
      const components = inTray
        ? [...document.querySelectorAll<HTMLElement>('[data-component-instance]')].filter(
            (el) => el.dataset.componentInstance !== drag!.id,
          )
        : [];
      const selector =
        drag.kind === 'item' && inTray ? 'data-component-instance' : 'data-bench-slot';
      const elements =
        selector === 'data-component-instance'
          ? components
          : [...document.querySelectorAll<HTMLElement>('[data-bench-slot]')];
      const hit = resolveElementDrop(e.clientX, e.clientY, elements, selector);
      const el =
        hit.id !== null ? elements.find((el) => el.getAttribute(selector) === hit.id) : undefined;
      if (hit.ambiguous) {
        c.previewCombination(null);
        if (drop) {
          c.error('Destino ambiguo. Apunta al centro y vuelve a soltar.');
          session.reportInteraction('Destino ambiguo; conservas el origen.');
        }
        return;
      }
      if (el) {
        if (drag.kind === 'unit') {
          if (drop) session.bench(Number(hit.id), drag.id);
          else {
            el.dataset.pointerTarget = 'true';
            el.dataset.itemTarget = 'valid';
          }
          return;
        }
        const unit = state.units.find((u) => u.id === el.dataset.equipmentUnit);
        c.previewCombination(
          selector === 'data-component-instance'
            ? hit.id
            : (unit?.equipment?.find((i) => i.kind === 'component')?.id ?? null),
        );
        if (drop) {
          if (selector === 'data-component-instance') c.combine(drag.id, hit.id!);
          else c.equip(unit?.id ?? '', drag.id);
        } else {
          el.dataset.pointerTarget = 'true';
          const command = unit && equipmentCommand(state, unit.id, drag.id);
          const reason = command
            ? (session.economicBlockReason(command) ?? previewItemCommand(state, command))
            : 'Elige una unidad propia.';
          if (selector !== 'data-component-instance') c.hint(reason ?? 'Suelta para equipar.');
          el.dataset.itemTarget =
            selector === 'data-component-instance' || !reason ? 'valid' : 'invalid';
        }
      } else {
        c.previewCombination(null);
        emit(e.clientX, e.clientY, drop ? 'drop' : 'move');
      }
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.pointer) return;
      if (!drag.active && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
      if (!drag.active) {
        drag.active = true;
        if (drag.kind === 'item') c.select(drag.id, true);
        else session.select(drag.id);
      }
      e.preventDefault();
      target(e, false);
    };
    const up = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.pointer) return;
      if (drag.active) {
        e.preventDefault();
        suppressUntil = performance.now() + 350;
        target(e, true);
        emit(e.clientX, e.clientY, 'end');
        c.endDrag();
      }
      clearTargets();
      drag = null;
    };
    const cancel = () => {
      if (drag) {
        emit(0, 0, 'end');
        c.endDrag();
      }
      clearTargets();
      drag = null;
    };
    const click = (e: MouseEvent) => {
      if (performance.now() < suppressUntil) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('pointerdown', down);
    document.addEventListener('pointermove', move, { passive: false });
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', cancel);
    document.addEventListener('click', click, true);
    window.addEventListener('blur', cancel);
    return () => {
      cancel();
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', cancel);
      document.removeEventListener('click', click, true);
      window.removeEventListener('blur', cancel);
    };
  }, [session]);
  return null;
}
