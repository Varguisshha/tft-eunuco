> **F0-P7B.1-R (24/10/2026): flujo principal real verificado.** Supabase Free conectado; dos cuentas confirmadas por correo, perfiles/RLS, recuperación y partida Colyseus hasta ronda 2 comprobados. Quedan escenarios adicionales de borde detallados en [SUPABASE_REAL_VALIDATION.md](SUPABASE_REAL_VALIDATION.md). F0-P7B.2 no iniciada.

# Perfiles persistentes

`public.player_profiles`: user_id UUID PK/FK a auth.users, username único, display_name, avatar_id, created_at, updated_at. No duplica credenciales ni email. No hay estadísticas inventadas. Una tabla futura de resultados podrá referenciar user_id sin cambiar identidad.

Username: trim + minúsculas, ASCII `[a-z0-9_]{3,20}`. Se normaliza en TypeScript y en trigger PostgreSQL. El índice UNIQUE garantiza exclusión concurrente incluso ante clientes manipulados. Display name: 1–32 caracteres sin controles ni marcado; los componentes React escapan texto.

Avatares originales de catálogo: `jade` (escudo), `pulse` (emblema XP), `spark` (medallón), usando los SVG geométricos propios del HUD. Solo se almacena el identificador, sin fotos ni cargas de archivos. El catálogo se valida en contrato y CHECK SQL.

RLS habilitado. Lectura de todos los campos de perfil para miembros autenticados; ninguno de esos campos es privado. Anónimos no leen perfiles. UPDATE únicamente del propietario mediante auth.uid(), y permisos de columna solo para username/display_name/avatar_id. No se conceden INSERT/DELETE: creación por trigger en registro, eliminación por cascada de la cuenta. user_id y created_at no son modificables por el cliente; updated_at lo calcula el trigger. Perfil e invitación se crean/consumen en una misma transacción. No existe upsert del cliente que permita sustituir la propiedad.

Los snapshots de partida publican UUID/nombre visible y datos de formación ya públicos. El avatar queda en la pantalla de perfil; no se rediseña la clasificación del HUD en esta fase. El nombre de una partida queda fijado al entrar, aunque el perfil se edite después.
