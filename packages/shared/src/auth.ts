import { z } from 'zod';
export const AvatarSchema = z.enum(['jade', 'pulse', 'spark']);
export const UsernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, 'Usa de 3 a 20 letras sin acentos, números o guion bajo.');
export const PasswordSchema = z
  .string()
  .min(12, 'Usa al menos 12 caracteres.')
  .max(128, 'Máximo 128 caracteres.');
export const ProfileEditSchema = z.strictObject({
  username: UsernameSchema,
  display_name: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .regex(/^[^\p{Cc}\p{Cf}<>]+$/u, 'Nombre no válido.'),
  avatar_id: AvatarSchema,
});
export const PlayerProfileSchema = ProfileEditSchema.extend({
  user_id: z.uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;
export const RegistrationSchema = z
  .strictObject({
    email: z.email('Introduce un email válido.').max(254),
    password: PasswordSchema,
    confirmation: z.string(),
    username: UsernameSchema,
    invitation: z.string().regex(/^[a-f0-9]{64}$/, 'Introduce una invitación válida.'),
  })
  .refine((v) => v.password === v.confirmation, {
    path: ['confirmation'],
    message: 'Las contraseñas no coinciden.',
  });
export interface PlayerIdentity {
  userId: string;
  name: string;
  avatarId: z.infer<typeof AvatarSchema>;
}
/** Prepared open registration: provider-verified CAPTCHA, no bearer invitation. */
export const OpenRegistrationSchema = z
  .strictObject({
    email: z.email('Introduce un email válido.').max(254),
    password: PasswordSchema,
    confirmation: z.string(),
    username: UsernameSchema,
    captchaToken: z.string().min(1, 'Completa la verificación de seguridad.').max(4096),
    website: z.string().max(0, 'No se pudo validar el formulario.').optional(),
  })
  .refine((v) => v.password === v.confirmation, {
    path: ['confirmation'],
    message: 'Las contraseñas no coinciden.',
  });
