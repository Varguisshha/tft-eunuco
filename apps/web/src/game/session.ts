import {
  moveUnit,
  offsetToAxial,
  placeUnit,
  unitAt,
  sameHex,
  isInBounds,
  type PlacementError,
} from '@tft/game-core';
import { UNIT_DEFINITIONS } from '@tft/game-data';
import type { BoardState, HexCoord, Side, UnitInstance } from '@tft/shared';
export const ERROR_MESSAGES: Record<PlacementError, string> = {
  'out-of-bounds': 'Fuera del tablero. Elige una casilla de tu mitad.',
  'wrong-half': 'Esa mitad pertenece al otro equipo.',
  occupied: 'Casilla ocupada. Elige otra casilla libre.',
  'unknown-definition': 'No se reconoce esta unidad.',
  'duplicate-id': 'Esta unidad ya está desplegada.',
  'missing-unit': 'La unidad ya no está en el tablero.',
  'wrong-owner': 'Cambia de equipo para mover esta unidad.',
};
export interface SessionSnapshot {
  board: BoardState;
  side: Side;
  selectedId: string | null;
  paletteId: string | null;
  hover: HexCoord | null;
  cursor: HexCoord;
  message: string;
  invalid: boolean;
  revision: number;
}
export function demoBoard(): BoardState {
  return {
    units: UNIT_DEFINITIONS.map((def, i) => ({
      id: `demo-${i}`,
      definitionId: def.id,
      owner: 'south',
      position: offsetToAxial(i % 2 === 0 ? 2 : 4, i < 2 ? 4 : 6),
    })),
  };
}
export class BoardSession {
  private snapshot: SessionSnapshot = {
    board: demoBoard(),
    side: 'south',
    selectedId: 'demo-0',
    paletteId: null,
    hover: null,
    cursor: offsetToAxial(2, 4),
    message: 'Selecciona una unidad y arrástrala a una casilla libre.',
    invalid: false,
    revision: 0,
  };
  private listeners = new Set<() => void>();
  private nextId = 1;
  getSnapshot = (): SessionSnapshot => this.snapshot;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private patch(patch: Partial<SessionSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch, revision: this.snapshot.revision + 1 };
    this.listeners.forEach((listener) => listener());
  }
  hover(hex: HexCoord | null): void {
    if (hex && this.snapshot.hover && sameHex(hex, this.snapshot.hover)) return;
    if (!hex && !this.snapshot.hover) return;
    this.patch({ hover: hex });
  }
  setCursor(hex: HexCoord): void {
    if (isInBounds(hex)) this.patch({ cursor: hex, hover: hex });
  }
  setSide(side: Side): void {
    this.patch({
      side,
      selectedId: null,
      paletteId: null,
      cursor: offsetToAxial(0, side === 'south' ? 4 : 0),
      message: side === 'south' ? 'Editando la formación jade.' : 'Editando la formación ámbar.',
      invalid: false,
    });
  }
  choose(definitionId: string): void {
    this.patch({
      paletteId: definitionId,
      selectedId: null,
      message: 'Elige una casilla libre de tu mitad para desplegar.',
      invalid: false,
    });
  }
  select(unitId: string): void {
    const unit = this.snapshot.board.units.find((u) => u.id === unitId);
    if (unit)
      this.patch({
        selectedId: unitId,
        paletteId: null,
        cursor: unit.position,
        message: 'Arrastra la unidad o elige una casilla libre para moverla.',
        invalid: false,
      });
  }
  cancel(): void {
    this.patch({
      selectedId: null,
      paletteId: null,
      message: 'Selección cancelada.',
      invalid: false,
    });
  }
  reset(): void {
    this.patch({
      board: demoBoard(),
      side: 'south',
      selectedId: 'demo-0',
      paletteId: null,
      hover: null,
      cursor: offsetToAxial(2, 4),
      message: 'Formación de prueba restaurada.',
      invalid: false,
    });
  }
  move(unitId: string, hex: HexCoord): boolean {
    const result = moveUnit(this.snapshot.board, unitId, hex, this.snapshot.side);
    if (!result.ok) {
      this.patch({ message: ERROR_MESSAGES[result.reason], invalid: true });
      return false;
    }
    this.patch({
      board: result.board,
      selectedId: unitId,
      paletteId: null,
      cursor: hex,
      message: 'Unidad movida. Formación actualizada.',
      invalid: false,
    });
    return true;
  }
  activate(hex: HexCoord): void {
    const { board, side, paletteId, selectedId } = this.snapshot;
    if (paletteId) {
      const unit: UnitInstance = {
        id: `local-${this.nextId}`,
        definitionId: paletteId,
        owner: side,
        position: hex,
      };
      const result = placeUnit(board, unit);
      if (!result.ok) {
        this.patch({ message: ERROR_MESSAGES[result.reason], invalid: true });
        return;
      }
      this.nextId++;
      this.patch({
        board: result.board,
        selectedId: unit.id,
        paletteId: null,
        cursor: hex,
        message: 'Unidad desplegada en la arena.',
        invalid: false,
      });
      return;
    }
    const occupied = unitAt(board, hex);
    if (occupied) {
      this.select(occupied.id);
      return;
    }
    if (selectedId) {
      this.move(selectedId, hex);
      return;
    }
    if (isInBounds(hex))
      this.patch({
        cursor: hex,
        message: 'Casilla seleccionada. Elige una unidad en la reserva.',
        invalid: false,
      });
  }
}
