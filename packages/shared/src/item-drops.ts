import { z } from 'zod';
const id = z.string().min(1).max(80);
export const DropJournalSchema = z.strictObject({
  seed: z.number().int().min(0).max(0xffffffff),
  rounds: z
    .array(
      z.strictObject({
        id,
        matchId: z.string().min(1).max(160),
        round: z.number().int().positive(),
        version: z.enum(['f0p8d-1', 'f0p12b-1']),
        quantity: z.union([z.literal(2), z.literal(3)]),
        status: z.literal('confirmed'),
        players: z
          .array(
            z.strictObject({
              playerId: z.uuid(),
              grantId: id,
              seed: z.number().int().min(0).max(0xffffffff),
              definitionIds: z.array(id).min(2).max(3),
              instanceIds: z.array(id).min(2).max(3),
              removerIds: z.array(id).length(1).optional(),
            }),
          )
          .min(1)
          .max(4),
      }),
    )
    .max(1000),
});
export type DropJournal = z.infer<typeof DropJournalSchema>;
/** Local lab records only the human inventory actually delivered; never claims AI grants. */
export const LocalDropJournalSchema = z.strictObject({
  version: z.literal('f0p11g-local-1'),
  seed: z.number().int().min(0).max(0xffffffff),
  rounds: z
    .array(
      DropJournalSchema.shape.rounds.element.shape.players.element.extend({
        round: z.number().int().positive(),
        quantity: z.union([z.literal(2), z.literal(3)]),
      }),
    )
    .max(1000),
});
export type LocalDropJournal = z.infer<typeof LocalDropJournalSchema>;
