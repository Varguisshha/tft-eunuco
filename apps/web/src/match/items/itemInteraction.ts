import { applyItemCommand, ItemRuleError, canUseCombatEconomy } from '@tft/game-core';
import { resolveItemCatalog } from '@tft/game-data';
import type { ItemCommand, MatchState } from '@tft/shared';
import type { LocalSession } from '../LocalSession';
import { MATCH_ERRORS } from '../LocalSession';
export const ITEM_MIME = 'application/x-tft-item';
export function equipmentCommand(state: MatchState, unitId: string, itemId: string): ItemCommand {
  return state.items?.removers?.issued.some((r) => r.id === itemId)
    ? { type: 'remove_unit_items', unitId, removerId: itemId }
    : { type: 'equip_item', unitId, itemId };
}
export function previewItemCommand(state: MatchState, command: ItemCommand): string | null {
  if (state.phase !== 'preparation' && !canUseCombatEconomy(state, command))
    return state.phase === 'combat'
      ? 'En combate solo puedes equipar o retirar objetos de unidades propias del banquillo ajenas al combate activo; este guardado debe admitir la operación.'
      : 'Espera a la preparación para realizar esta operación.';
  try {
    applyItemCommand(structuredClone(state), command);
    return null;
  } catch (e) {
    return e instanceof ItemRuleError ? MATCH_ERRORS[e.code] : 'Operación no disponible.';
  }
}
export function recipeOptions(state: MatchState, definitionId: string) {
  if (!state.items) return [];
  const c = resolveItemCatalog(state.items.catalogVersion);
  return c.recipes
    .filter((r) => r.components.includes(definitionId))
    .map((r) => {
      const first = state.items!.components.find((i) => i.definitionId === r.components[0]);
      const second = state.items!.components.find(
        (i) => i.id !== first?.id && i.definitionId === r.components[1],
      );
      return { recipe: r, result: c.definitions.find((d) => d.id === r.resultId), first, second };
    });
}
export type ItemUIState = {
  selected: string | null;
  dragging: boolean;
  status: string;
  pending: boolean;
  outcome: 'idle' | 'pending' | 'success' | 'error';
  recipeTarget: string | null;
};
export class ItemInteraction {
  private state: ItemUIState = {
    selected: null,
    dragging: false,
    status: 'Pasa el cursor para consultar; selecciona para equipar.',
    pending: false,
    outcome: 'idle',
    recipeTarget: null,
  };
  private listeners = new Set<() => void>();
  private command: ItemCommand | null = null;
  private dispatching = false;
  private unsubscribe: (() => void) | undefined;
  constructor(readonly session: LocalSession) {}
  getSnapshot = () => this.state;
  subscribe = (f: () => void) => {
    this.listeners.add(f);
    if (!this.unsubscribe) this.unsubscribe = this.session.subscribe(() => this.sync());
    return () => {
      this.listeners.delete(f);
      if (!this.listeners.size) {
        this.unsubscribe?.();
        this.unsubscribe = undefined;
      }
    };
  };
  private update(p: Partial<ItemUIState>) {
    this.state = { ...this.state, ...p };
    this.listeners.forEach((f) => f());
  }
  select(id: string, dragging = false) {
    if (!this.state.pending)
      this.update({
        selected: id,
        recipeTarget: null,
        dragging,
        outcome: 'idle',
        status: dragging
          ? 'Arrastra a un personaje o a otro componente.'
          : 'Elige destino y confirma el equipamiento.',
      });
  }
  cancel() {
    this.update({
      selected: null,
      dragging: false,
      recipeTarget: null,
      ...(!this.state.pending
        ? {
            outcome: 'idle' as const,
            status: 'Pasa el cursor para consultar; selecciona para equipar.',
          }
        : {}),
    });
  }
  previewCombination(target: string | null) {
    if (target !== this.state.recipeTarget) this.update({ recipeTarget: target });
  }
  endDrag() {
    this.update({ dragging: false, recipeTarget: null });
  }
  hint(message: string) {
    if (!this.state.pending && this.state.status !== message) this.update({ status: message });
  }
  error(message: string) {
    this.update({ outcome: 'error', status: message, dragging: false });
  }
  private sync() {
    if (!this.state.pending || this.dispatching) return;
    const remote = this.session.remote;
    if (remote && !remote.connected) {
      this.update({
        status: 'Conexión perdida. Esperando sincronización; no se ha duplicado el objeto.',
      });
      return;
    }
    if (remote?.requestPending) return;
    // The authoritative snapshot, never an animation, determines whether the action took effect.
    const command = this.command,
      s = this.session.getMatch();
    let done = false;
    if (command?.type === 'remove_unit_items')
      done = !!s.items?.removers?.consumed.some(
        (r) => r.id === command.removerId && r.unitId === command.unitId,
      );
    if (command?.type === 'equip_item')
      done = !!s.units
        .find((u) => u.id === command.unitId)
        ?.equipment?.some(
          (i) =>
            i.id === command.itemId ||
            (i.origin.kind === 'recipe' && i.origin.consumed.includes(command.itemId)),
        );
    if (command?.type === 'combine_components')
      done = !!s.items?.crafts.some(
        (i) =>
          i.origin.kind === 'recipe' &&
          i.origin.consumed.includes(command.firstId) &&
          i.origin.consumed.includes(command.secondId),
      );
    if (command?.type === 'move_item')
      done = !![...(s.items?.components ?? []), ...(s.items?.completed ?? [])].some(
        (i) => i.id === command.itemId,
      );
    this.update({
      pending: false,
      dragging: false,
      recipeTarget: null,
      selected: done ? null : this.state.selected,
      outcome: done ? 'success' : 'error',
      status: done
        ? 'Confirmado · inventario actualizado.'
        : (remote?.notice ?? 'No se confirmó. Revisa el inventario y vuelve a intentarlo.'),
    });
  }
  submit(command: ItemCommand) {
    if (this.state.pending) return false;
    if (!this.session.canEconomicAction(command)) {
      this.error(this.session.economicBlockReason(command) ?? 'Espera a recuperar la conexión.');
      return false;
    }
    const error = previewItemCommand(this.session.getMatch(), command);
    if (error) {
      this.error(error);
      return false;
    }
    this.command = command;
    this.update({
      pending: true,
      outcome: 'pending',
      dragging: false,
      status: 'Esperando confirmación…',
    });
    this.dispatching = true;
    const sent = this.session.dispatch(command);
    this.dispatching = false;
    if (!sent) {
      this.update({
        pending: false,
        outcome: 'error',
        status: 'Acción no enviada. Espera la sincronización y vuelve a intentarlo.',
      });
      return false;
    }
    this.sync();
    return true;
  }
  combinationCommand(firstId: string, secondId: string): ItemCommand {
    const equipped = this.session
      .getMatch()
      .units.find((u) => u.equipment?.some((i) => i.id === firstId && i.kind === 'component'));
    return equipped
      ? { type: 'equip_item', unitId: equipped.id, itemId: secondId }
      : { type: 'combine_components', firstId, secondId };
  }
  combine(firstId: string, secondId: string) {
    return this.submit(this.combinationCommand(firstId, secondId));
  }
  equip(unitId: string, itemId = this.state.selected) {
    return itemId ? this.submit(equipmentCommand(this.session.getMatch(), unitId, itemId)) : false;
  }
}
const controllers = new WeakMap<LocalSession, ItemInteraction>();
export function itemInteraction(session: LocalSession) {
  let c = controllers.get(session);
  if (!c) {
    c = new ItemInteraction(session);
    controllers.set(session, c);
  }
  return c;
}
/** Delivery notifications are presentation-only, scoped to the private match owner. */
export class DeliveryTracker {
  private seen = new Set<string>();
  observe(ids: string[]) {
    const fresh = ids.filter((id) => !this.seen.has(id));
    ids.forEach((id) => this.seen.add(id));
    return fresh;
  }
}

export function combinationPreview(state: MatchState, firstId: string, secondId: string) {
  if (!state.items || firstId === secondId) return null;
  const all = [...state.items.components, ...state.units.flatMap((u) => u.equipment ?? [])];
  const first = all.find((i) => i.id === firstId && i.kind === 'component');
  const second = all.find((i) => i.id === secondId && i.kind === 'component');
  if (!first || !second) return null;
  const catalog = resolveItemCatalog(state.items.catalogVersion);
  const recipe = catalog.recipes.find(
    (r) =>
      [...r.components].sort().join('|') ===
      [first.definitionId, second.definitionId].sort().join('|'),
  );
  if (!recipe) return null;
  return {
    first: catalog.definitions.find((d) => d.id === first.definitionId)!,
    second: catalog.definitions.find((d) => d.id === second.definitionId)!,
    result: catalog.definitions.find((d) => d.id === recipe.resultId)!,
  };
}
