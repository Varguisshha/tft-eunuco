/** Separate local tooling contract. Never included in MatchAction/TimedCommand. */
import { z } from 'zod';
import { UnitLocationSchema, StarsSchema } from './match';
const amount = z.number().int().safe().min(0).max(10000);
export const DevelopmentCommandSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('gold'),
    mode: z.enum(['add', 'set', 'max', 'initial']),
    amount: amount.optional(),
  }),
  z.strictObject({ type: z.literal('level'), value: z.number().int().min(2).max(7) }),
  z.strictObject({ type: z.literal('xp'), mode: z.enum(['add', 'set']), amount }),
  z.strictObject({
    type: z.literal('health'),
    side: z.enum(['south', 'north']),
    value: z.number().int().min(1).max(100),
  }),
  z.strictObject({
    type: z.literal('spawn'),
    definitionId: z.string().min(1).max(80),
    stars: StarsSchema,
    to: UnitLocationSchema.optional(),
  }),
  z.strictObject({ type: z.literal('remove'), unitId: z.string().min(1).max(80) }),
  z.strictObject({
    type: z.literal('formation'),
    preset: z.enum(['vargas', 'dolea', 'mixed', 'empty']),
  }),
  z.strictObject({ type: z.literal('pause'), paused: z.boolean() }),
  z.strictObject({ type: z.literal('advance') }),
  z.strictObject({
    type: z.literal('durations'),
    preparation: z.number().int().min(100).max(30000),
    resolution: z.number().int().min(100).max(5000),
  }),
  z.strictObject({ type: z.literal('repeat') }),
  z.strictObject({ type: z.literal('reset') }),
]);
export type DevelopmentCommand = z.infer<typeof DevelopmentCommandSchema>;
export const DevelopmentRequestSchema = z.strictObject({
  id: z.string().min(1).max(80),
  origin: z.enum(['panel', 'diagnostic', 'test']),
  expectedRevision: amount,
  command: DevelopmentCommandSchema,
});
export type DevelopmentRequest = z.infer<typeof DevelopmentRequestSchema>;
export const DevelopmentAuditSchema = z.strictObject({
  id: z.string().min(1).max(80),
  origin: z.enum(['panel', 'diagnostic', 'test']),
  fingerprint: z.string().max(4000),
  ok: z.boolean(),
  message: z.string().max(300),
  revision: amount,
});
export type DevelopmentAudit = z.infer<typeof DevelopmentAuditSchema>;

/** Local capability for item diagnostics; excluded from the normal network protocol. */
export const DevelopmentItemCommandSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('grant_items'),
    grantId: z.string().min(1).max(80),
    definitionIds: z.array(z.string().min(1).max(80)).min(1).max(32),
  }),
  z.strictObject({ type: z.literal('clear_items') }),
  z.strictObject({ type: z.literal('diagnostic_item_catalog') }),
  z.strictObject({ type: z.literal('standard_item_catalog') }),
]);
export type DevelopmentItemCommand = z.infer<typeof DevelopmentItemCommandSchema>;
