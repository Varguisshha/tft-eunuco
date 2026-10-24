> **F0-P7B.1-R (24/10/2026): parcialmente validada.** CLI2.120.0 instalada, sin autenticación ni proyecto vinculado; el propietario solicita crear un proyecto en su organización. Suite local689/49 correcta. Activación, migración y E2E remotos pendientes de acceso. Estado y reanudación: [SUPABASE_REAL_VALIDATION.md](SUPABASE_REAL_VALIDATION.md).

# Cuentas — F0-P7B.1

Supabase Auth administra contraseñas, verificación, JWT y refresh tokens. El SDK `@supabase/supabase-js` administra la sesión persistente del navegador (PKCE, renovación automática y eventos); no hay almacén manual de credenciales. PostgreSQL contiene el perfil; Colyseus conserva autoridad sobre las partidas. `game-core` no depende de Supabase.

`AccountPortal` ofrece bienvenida, registro privado, login, verificación pendiente/reenvío, solicitud de recuperación, nueva contraseña, inicio, perfil y edición. `AccountService` concentra las operaciones del proveedor; `session.ts` escucha restauración, refresh, logout, recuperación y cambio de usuario. El envío del formulario tiene exclusión de solicitudes duplicadas. La recuperación da la misma respuesta para emails existentes o desconocidos. No hay condiciones legales ficticias que aceptar: si el operador introduce condiciones de uso, deberá añadir su texto/versionado y aceptación explícita antes de abrir el servicio.

La contraseña debe tener 12–128 caracteres; la política de mínimo 12 también debe configurarse en Supabase (la validación del navegador no es autoridad). La invitación se envía como metadata inicial de signup para que el trigger transaccional la valide; el trigger elimina el token de la metadata persistente. Nunca se guardan contraseñas propias.

## Identidad de partida

El cliente presenta el access token mediante `client.auth.token`, en la cabecera de la solicitud de matchmaking del SDK Colyseus. `MatchRoom.onAuth` verifica `getUser(token)`, cuenta no anónima y email confirmado, `getClaims(token)` y expiración, RPC `player_session_active`, y perfil de ese UUID. Los datos retornados son internos del servidor; el JWT jamás se incluye en snapshots. El servidor usa el UUID de Auth como propietario y el nombre visible de PostgreSQL, ignorando nombres/IDs enviados por el navegador.

El socket temporal y el UUID persistente son diferentes. La misma cuenta no puede ocupar ambas plazas de una partida. No se admite reconexión. La perspectiva depende del lado, no del nombre. El protocolo cambia a `f0p7b1-1`.

La renovación del SDK se envía al servidor en `authenticate`: se revalida y solo se acepta el mismo UUID. Se rechazan comandos/start con el token caducado y se verifica la sesión con el proveedor cada 15 segundos. Logout/cambio de usuario en la aplicación desmonta y cierra el socket; una revocación externa se detecta en el próximo control (hasta 15 s más la latencia del proveedor). Los tokens anteriores pueden seguir válidos hasta expirar según Supabase; la comprobación adicional de `auth.sessions` reduce esta ventana tras logout. Fallos del proveedor cierran la conexión; no hay fallback anónimo.

## Límites de seguridad

La SPA usa el almacenamiento de sesión del SDK. Un XSS en el origen podría leer tokens: no se usa HTML sin sanear, no se admiten avatares arbitrarios ni SVG subidos. Antes de desplegar: HTTPS/WSS, cabeceras CSP adecuadas, auditoría de dependencias, rate limits/SMTP/captcha según necesidades. Ningún despliegue se ha realizado. El servidor actual sigue ligado a loopback.

La clave pública del proyecto es pública por diseño; la clave service_role solo se usa en la CLI de invitaciones. El servidor de juego utiliza clave pública y Authorization del usuario para respetar RLS. Los mensajes de rechazo no devuelven errores internos del proveedor ni credenciales. No hay bypass de registro por variable de entorno: incluso las cuentas locales de prueba necesitan una invitación.

## Fuentes consultadas

- [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser): verificación remota de identidad.
- [Supabase gestión de usuarios](https://supabase.com/docs/guides/auth/managing-user-data): perfiles y triggers sobre Auth.
- [Recuperación](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail): enlace y actualización.
- [Before User Created](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook): alternativa estudiada; esta implementación usa un trigger en la misma transacción de creación para consumo y perfil atómicos, sin depender de habilitar un hook opcional.
- [Colyseus 0.18 room authentication](https://docs.colyseus.io/auth/room): static onAuth, client.auth.token y asociación de identidad.

Las pruebas del proveedor usan dobles controlados. No se ha verificado un proyecto Supabase real, SMTP ni dos cuentas reales.
