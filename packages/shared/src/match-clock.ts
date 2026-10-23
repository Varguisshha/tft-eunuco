import { z } from 'zod';
import { MatchStateSchema, type MatchCommand, type MatchState } from './match';
import {
  CombatInputSchema,
  CombatResultSchema,
  CombatStateSchema,
  CombatEventV3Schema,
  type CombatReplay,
} from './combat';
export const CLOCK_RULES = 'f0p5-1' as const;
export const MATCH_SAVE_VERSION = 1 as const;
export const PREPARATION_MS = 30_000;
export const RESOLUTION_MS = 5_000;
export const VISUAL_TAIL_MS = 600;
export const MatchPhaseSchema = z.enum([
  'not_started',
  'preparation',
  'combat',
  'resolution',
  'finished',
]);
export type MatchPhase = z.infer<typeof MatchPhaseSchema>;
const ms = z.number().finite().nonnegative();
const id = z.string().min(1).max(160);
export const PhaseSnapshotSchema = z.strictObject({
  rulesVersion: z.literal(CLOCK_RULES),
  matchId: id,
  roundId: id,
  phaseId: id,
  phaseSequence: z.number().int().nonnegative(),
  transitionId: id,
  currentPhase: MatchPhaseSchema,
  phaseStart: ms,
  phaseDeadline: ms,
  phaseDuration: ms,
  remainingMs: ms,
  clockState: z.enum(['ready', 'running', 'paused', 'stopped']),
});
export type PhaseSnapshot = z.infer<typeof PhaseSnapshotSchema>;
export const ReplaySchema = z.strictObject({
  input: CombatInputSchema,
  result: CombatResultSchema,
  events: z.array(CombatEventV3Schema),
  snapshots: z.array(CombatStateSchema).min(1).max(451),
});
export const AutomaticSaveSchema = z.strictObject({
  saveVersion: z.literal(MATCH_SAVE_VERSION),
  rulesVersion: z.literal(CLOCK_RULES),
  match: MatchStateSchema,
  clock: PhaseSnapshotSchema,
  preparationMs: ms.positive().max(PREPARATION_MS),
  resolutionMs: ms.positive().max(RESOLUTION_MS),
  development: z.boolean(),
  recovered: z.boolean(),
  playbackMs: ms.max(45_600),
  settlements: z.array(id),
  replay: ReplaySchema.nullable(),
});
export type AutomaticSave = z.infer<typeof AutomaticSaveSchema>;
/** Client envelope binds intent to the phase it was issued in, in addition to economic revision. */
export interface TimedCommand {
  matchId: string;
  phaseId: string;
  expectedRevision: number;
  command: MatchCommand;
}
/** A remote implementation can expose the same view/intent boundary. No client time is authoritative. */
export interface MatchCoordinator {
  getMatch(): MatchState;
  getClock(): PhaseSnapshot;
  getReplay(): CombatReplay | null;
  getPlaybackMs(): number;
  start(): boolean;
  submit(command: TimedCommand): boolean;
  subscribe(listener: () => void): () => void;
}
