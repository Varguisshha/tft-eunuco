import {
  runCombat,
  moveUnit,
  offsetToAxial,
  placeUnit,
  unitAt,
  sameHex,
  isInBounds,
  type PlacementError,
} from '@tft/game-core';
import { UNIT_DEFINITIONS, createCombatInput } from '@tft/game-data';
import { CombatSeedSchema, type CombatInput, type CombatResult } from '@tft/shared';
import { CombatPlayback } from './combatPlayback';
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
  combat: {
    mode: 'preparation' | 'playing' | 'paused' | 'finished';
    seed: number;
    tick: number;
    speed: 1 | 2;
    result: CombatResult | null;
  };
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
    combat: { mode: 'preparation', seed: 42, tick: 0, speed: 1, result: null },
  };
  private listeners = new Set<() => void>();
  private nextId = 1;
  private playback: CombatPlayback | null = null;
  private lastInput: CombatInput | null = null;
  combatFrame = () => this.playback?.frame() ?? null;
  get editable(): boolean {
    return this.snapshot.combat.mode === 'preparation';
  }
  setSeed(seed: number): void {
    const parsed = CombatSeedSchema.safeParse(seed);
    if (!this.editable || !parsed.success) return;
    this.patch({ combat: { ...this.snapshot.combat, seed: parsed.data } });
  }
  loadDuel(): void {
    this.returnToPreparation();
    const board = demoBoard();
    const opponents = board.units.map((u, i) => ({
      ...u,
      id: `opponent-${i}`,
      owner: 'north' as const,
      position: offsetToAxial(i % 2 === 0 ? 2 : 4, i < 2 ? 2 : 0),
    }));
    this.patch({
      board: { units: [...board.units, ...opponents] },
      selectedId: 'demo-0',
      paletteId: null,
      message: 'Duelo 4 × 4 preparado. Pulsa Iniciar combate.',
      invalid: false,
    });
  }
  startCombat(repeat = false): void {
    try {
      const setup =
        repeat && this.lastInput
          ? this.lastInput
          : createCombatInput(this.snapshot.board, this.snapshot.combat.seed);
      const replay = runCombat(setup);
      this.lastInput = replay.input;
      this.playback = new CombatPlayback(replay);
      this.playback.setSpeed(this.snapshot.combat.speed);
      this.patch({
        paletteId: null,
        hover: null,
        combat: {
          ...this.snapshot.combat,
          seed: setup.seed,
          mode: 'playing',
          tick: 0,
          result: null,
        },
        message: 'Combate en curso. La formación queda protegida hasta volver a preparación.',
        invalid: false,
      });
    } catch (cause) {
      this.patch({
        invalid: true,
        message: cause instanceof Error ? cause.message : 'No se pudo iniciar el combate.',
      });
    }
  }
  pauseCombat(): void {
    const mode = this.snapshot.combat.mode;
    if (mode !== 'playing' && mode !== 'paused') return;
    const paused = mode === 'playing';
    this.playback?.setPaused(paused);
    this.patch({
      combat: { ...this.snapshot.combat, mode: paused ? 'paused' : 'playing' },
      message: paused ? 'Reproducción pausada.' : 'Reproducción reanudada.',
    });
  }
  setCombatSpeed(speed: 1 | 2): void {
    this.playback?.setSpeed(speed);
    this.patch({ combat: { ...this.snapshot.combat, speed } });
  }
  advanceCombat(deltaMs: number): void {
    if (!this.playback || this.snapshot.combat.mode !== 'playing') return;
    this.playback.advance(deltaMs);
    const frame = this.playback.frame();
    if (this.playback.finished) {
      const result = this.playback.replay.result;
      this.patch({
        combat: { ...this.snapshot.combat, tick: frame.tick, mode: 'finished', result },
        message:
          result.winner === 'south'
            ? 'Victoria jade · Derrota ámbar.'
            : result.winner === 'north'
              ? 'Victoria ámbar · Derrota jade.'
              : `Empate · ${result.reason === 'timeout' ? 'límite de 300 ticks' : 'sin supervivientes'}.`,
      });
    } else if (frame.tick !== this.snapshot.combat.tick)
      this.patch({ combat: { ...this.snapshot.combat, tick: frame.tick } });
  }
  returnToPreparation(): void {
    this.playback = null;
    this.patch({
      combat: { ...this.snapshot.combat, mode: 'preparation', tick: 0, result: null },
      message: 'Formación inicial recuperada. Puedes volver a editarla.',
      invalid: false,
    });
  }
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
      message: `${this.editable ? 'Editando' : 'Inspeccionando'} la formación ${side === 'south' ? 'jade' : 'ámbar'}.`,
      invalid: false,
    });
  }
  choose(definitionId: string): void {
    if (!this.editable) return;
    this.patch({
      paletteId: definitionId,
      selectedId: null,
      message: 'Elige una casilla libre de tu mitad para desplegar.',
      invalid: false,
    });
  }
  select(unitId: string): void {
    const unit = (this.combatFrame()?.state.units ?? this.snapshot.board.units).find(
      (u) => u.id === unitId,
    );
    if (unit)
      this.patch({
        selectedId: unitId,
        paletteId: null,
        cursor: unit.position,
        message: this.editable
          ? 'Arrastra la unidad o elige una casilla libre para moverla.'
          : 'Inspeccionando la unidad durante el combate.',
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
    this.playback = null;
    this.patch({
      board: demoBoard(),
      combat: { ...this.snapshot.combat, mode: 'preparation', tick: 0, result: null },
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
    if (!this.editable) return false;
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
    if (!this.editable) return;
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
