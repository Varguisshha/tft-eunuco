import type { BoardSession } from './session';
/** Shared presentation port: Arena and local match provide different rule adapters. */
export type BoardPort = Pick<
  BoardSession,
  | 'getSnapshot'
  | 'subscribe'
  | 'combatFrame'
  | 'editable'
  | 'advanceCombat'
  | 'hover'
  | 'select'
  | 'move'
  | 'activate'
  | 'cancel'
  | 'setCursor'
> & {
  dropOutside?: ((unitId: string, clientX: number, clientY: number) => boolean) | undefined;
  pointerActivate?: (hex: import('@tft/shared').HexCoord) => void;
  equipmentFor?: (unitId: string) => import('@tft/shared').ItemDefinition[];
  reportInteraction?: (message: string) => void;
  starsFor?: (unitId: string) => number;
};
