import { z } from 'zod';
export const LOBBY_VERSION = 'f0p7b2-1' as const;
export const LobbyCapacitySchema = z.union([z.literal(2), z.literal(3), z.literal(4)]);
export const normalizeRoomCode = (code: string) => code.trim().toUpperCase().replace(/[\s-]/g, '');
export const RoomCodeSchema = z
  .string()
  .max(32)
  .transform(normalizeRoomCode)
  .pipe(z.string().regex(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/));
const base = { version: z.literal(LOBBY_VERSION), requestId: z.string().uuid() };
export const LobbyActionSchema = z.discriminatedUnion('type', [
  z.object({ ...base, type: z.literal('create_lobby'), capacity: LobbyCapacitySchema }).strict(),
  z.object({ ...base, type: z.literal('join_lobby'), roomCode: RoomCodeSchema }).strict(),
  z.object({ ...base, type: z.literal('set_capacity'), capacity: LobbyCapacitySchema }).strict(),
  z.object({ ...base, type: z.literal('set_ready'), readyState: z.boolean() }).strict(),
  ...(['leave_lobby', 'close_lobby', 'start_match', 'sync'] as const).map((type) =>
    z.object({ ...base, type: z.literal(type) }).strict(),
  ),
]);
export const LobbySnapshotSchema = z
  .object({
    version: z.literal(LOBBY_VERSION),
    roomId: z.string().uuid(),
    roomCode: RoomCodeSchema,
    hostUserId: z.string().uuid(),
    capacity: LobbyCapacitySchema,
    participants: z
      .array(
        z
          .object({
            userId: z.string().uuid(),
            name: z.string().min(1).max(32),
            avatarId: z.enum(['jade', 'pulse', 'spark']),
            connected: z.boolean(),
            readyState: z.boolean(),
          })
          .strict(),
      )
      .max(4),
    status: z.enum(['waiting', 'starting', 'in_match', 'closed']),
    createdAt: z.number(),
    expiresAt: z.number(),
    matchId: z.string().nullable(),
    revision: z.number().int().nonnegative(),
  })
  .strict();
export const LobbyEventSchema = z
  .object({
    version: z.literal(LOBBY_VERSION),
    requestId: z.string().uuid().nullable(),
    error: z.string().nullable(),
    lobby: LobbySnapshotSchema.nullable(),
  })
  .strict();
export type LobbyAction = z.infer<typeof LobbyActionSchema>;
export type LobbySnapshot = z.infer<typeof LobbySnapshotSchema>;
export type LobbyEvent = z.infer<typeof LobbyEventSchema>;
export function lobbyStartReason(lobby: LobbySnapshot): string | null {
  if (lobby.status !== 'waiting') return 'La sala está iniciando o ya está en partida.';
  if (!LobbyCapacitySchema.safeParse(lobby.capacity).success) return 'Capacidad no válida.';
  if (lobby.participants.length !== lobby.capacity)
    return 'Faltan participantes. Comparte el código de sala.';
  if (lobby.participants.some((p) => !p.connected))
    return 'Esperando a que todos vuelvan a conectarse.';
  if (lobby.participants.some((p) => !p.readyState)) return 'Todos deben marcarse como listos.';
  return null;
}
