import { z } from 'zod';
export const RECOVERY_VERSION = 'f0p7d1-1' as const;
export const ResumeRequestSchema = z
  .object({ recoveryVersion: z.literal(RECOVERY_VERSION) })
  .strict();
export const ResumeAcceptedSchema = z
  .object({
    version: z.literal(RECOVERY_VERSION),
    matchId: z.string(),
    participantId: z.string(),
    connectionId: z.string(),
    generation: z.number().int().positive(),
    nextSequence: z.number().int().nonnegative(),
    spectateSequence: z.number().int().min(-1),
    roundId: z.string(),
    phaseId: z.string(),
    duelId: z.string().nullable(),
    revision: z.number().int().nonnegative(),
  })
  .strict();
export type ResumeAccepted = z.infer<typeof ResumeAcceptedSchema>;
