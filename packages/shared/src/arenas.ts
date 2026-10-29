import { z } from 'zod';
/** Presentation metadata only: never part of combat rules or catalog fingerprints. */
export const ARENA_SELECTION_VERSION = 'f0p12i-1' as const;
export const ArenaIdSchema = z.enum(['mar-de-cristal', 'cafeteria-upm-etsisi']);
export type ArenaId = z.infer<typeof ArenaIdSchema>;
export const DEFAULT_ARENA_ID: ArenaId = 'mar-de-cristal';
