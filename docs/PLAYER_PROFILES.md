> **F0-P7B.1-R (24/10/2026): parcialmente validada.** CLI2.120.0 instalada, sin autenticación ni proyecto vinculado; el propietario solicita crear un proyecto en su organización. Suite local689/49 correcta. Activación, migración y E2E remotos pendientes de acceso. Estado y reanudación: [SUPABASE_REAL_VALIDATION.md](SUPABASE_REAL_VALIDATION.md).

# Perfiles persistentes

`public.player_profiles`: user_id UUID PK/FK a auth.users, username único, display_name, avatar_id, created_at, updated_at. No duplica credenciales ni email. No hay estadísticas inventadas. Una tabla futura de resultados podrá referenciar user_id sin cambiar identidad.

Username: trim + minúsculas, ASCII `[a-z0-9_]{3,20}`. Se normaliza en TypeScript y en trigger PostgreSQL. El índice UNIQUE garantiza exclusión concurrente incluso ante clientes manipulados. Display name: 1–32 caracteres sin controles ni marcado; los componentes React escapan texto.

Avatares originales de catálogo: `jade` (escudo), `pulse` (emblema XP), `spark` (medallón), usando los SVG geométricos propios del HUD. Solo se almacena el identificador, sin fotos ni cargas de archivos. El catálogo se valida en contrato y CHECK SQL.

RLS habilitado. Lectura de todos los campos de perfil para miembros autenticados; ninguno de esos campos es privado. Anónimos no leen perfiles. UPDATE únicamente del propietario mediante auth.uid(), y permisos de columna solo para username/display_name/avatar_id. No se conceden INSERT/DELETE: creación por trigger en registro, eliminación por cascada de la cuenta. user_id y created_at no son modificables por el cliente; updated_at lo calcula el trigger. Perfil e invitación se crean/consumen en una misma transacción. No existe upsert del cliente que permita sustituir la propiedad.

Los snapshots de partida publican UUID/nombre visible y datos de formación ya públicos. El avatar queda en la pantalla de perfil; no se rediseña la clasificación del HUD en esta fase. El nombre de una partida queda fijado al entrar, aunque el perfil se edite después.
