import { z } from 'zod';
import { UnitDefinitionSchema } from './board-contracts';
import { CombatStatsSchema } from './combat';
const common = {
  id: z.string().min(1),
  name: z.string().min(1),
  sourceName: z.string().min(1),
  headerCell: z.string().min(1),
  synergies: z
    .array(z.string().min(1))
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, 'Duplicate affiliation'),
};
/** Drafts cannot be mistaken for units accepted by the competitive engine. */
export const CharacterDraftSchema = z.strictObject({
  ...common,
  status: z.literal('draft'),
  cost: z.null(),
  role: z.null(),
  range: z.null(),
  stats: z.null(),
  activeAbilityId: z.null(),
  passiveAbilityId: z.null(),
  spriteId: z.null(),
  splashArt: z.null(),
});
export const PlayableCharacterRecordSchema = z.strictObject({
  ...common,
  status: z.literal('playable'),
  cost: UnitDefinitionSchema.shape.cost,
  role: UnitDefinitionSchema.shape.role,
  range: z.number().int().positive(),
  stats: CombatStatsSchema,
  activeAbilityId: z.string().nullable(),
  passiveAbilityId: z.string().nullable(),
  spriteId: z.string(),
});
export const CharacterRecordSchema = z.discriminatedUnion('status', [
  CharacterDraftSchema,
  PlayableCharacterRecordSchema,
]);
export type CharacterDraft = z.infer<typeof CharacterDraftSchema>;
export type CharacterRecord = z.infer<typeof CharacterRecordSchema>;
