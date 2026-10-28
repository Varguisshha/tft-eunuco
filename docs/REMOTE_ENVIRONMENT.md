# Entornos F0-P9A

| Entorno | Entrada y URL | Auth / persistencia | Restricciones |
| --- | --- | --- | --- |
| Desarrollo | Vite local; servidor `main.ts`, HTTP loopback | Supabase configurado explícitamente; persistencia durable | DEV solo en Vite o build `local-test`; no publicar |
| Diagnóstico | Entrada `diagnostics/p9a.ts`, HTTPS localhost:9443, WSS mismo origen | JWT firmado local; PostgreSQL desechable `tft_remote_test`, puerto local 55439 | Puertos 2596/2597/55441 y proxy solo loopback; control exige secreto efímero |
| Privado remoto | `NODE_ENV=production`, `TFT_ENV=private`; dominio HTTPS pendiente | Supabase dedicado existente, clave privada solo backend | Sin fixtures, DEV, DEBUG ni latencia artificial; allowlist exacta |
| Producción futura | `TFT_ENV=production`, mismo contrato estricto | Almacén elegido y autorizado explícitamente | No declarada preparada para carga abierta ni HA |

Los servicios habituales 4173/2567 permanecen intactos. `tft_remote_test` es distinta de la base usada por la suite histórica P8F; las pruebas TLS pueden ejecutarse sin truncar las tablas de aquella.

## Variables

Ejemplos: `infra/remote/.env.example` (servidor) y `infra/remote/client.env.example` (cliente). Los dominios `example.invalid`/`YOUR_PROJECT` son marcadores, no destinos configurados.

| Variable | Consumidor / regla |
| --- | --- |
| `TFT_ENV` | development, diagnostic, private, production; por defecto development |
| `NODE_ENV` | Obligatoria production en privado/producción |
| `HOST` | 127.0.0.1 por defecto; solo loopback |
| `PORT` | 2567 por defecto; entero 1–65535 |
| `TFT_PUBLIC_URL` | Origen esperado; HTTPS obligatorio fuera de local; sin credenciales/ruta/query |
| `TFT_ALLOWED_ORIGINS` | Orígenes exactos separados por coma; por defecto origen público; nunca wildcard |
| `TFT_PROXY_ADDRESS` | Dirección loopback exacta del proxy; obligatoria para HTTPS; no confía en XFF |
| `TFT_STATIC_DIR` | Directorio del build público; por defecto apps/web/dist desde raíz |
| `SUPABASE_URL` | HTTPS remoto; nunca incluir credenciales en URL |
| `SUPABASE_PUBLISHABLE_KEY` | Clave pública para comprobar Auth y perfiles |
| `SUPABASE_SERVICE_ROLE_KEY` | Privada; solo RPC durable del backend, nunca VITE_ |
| `VITE_APP_ENV` | private/production activa restricciones de build remoto |
| `VITE_SUPABASE_URL` | URL pública Auth del mismo proyecto |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave pública; rechaza secret/service-role en build |
| `VITE_GAME_SERVER_URL` | Omitir en B para mismo origen; si se define remotamente, HTTPS |

El adaptador productivo habla con PostgreSQL a través de RPC Supabase por HTTPS. No precisa contraseña de PostgreSQL ni cadena directa adicional. `PERSISTENCE_TEST_URL` y `P9A_TEST_DATABASE_URL` pertenecen exclusivamente a pruebas locales. `P9A_SIGNING_KEY`, `P9A_STATIC_DIR`, `P9A_BROWSER_SEED` nunca van al entorno productivo. No trasladar `.env.local` ni originales de arte a un paquete de despliegue.

## Autenticación que se conserva

El servidor verifica getUser, confirmación de correo, ausencia de usuario anónimo, claims/expiración, revocación de sesión mediante RPC y perfil propietario. Reconexión requiere nueva autenticación; el identificador recibido del cliente no decide la identidad. Los refrescos de sesión siguen en Supabase JS y RemoteCoordinator. La vida máxima de partida y retención final no cambian.

Para habilitar remoto, con autorización posterior: fijar Site URL, allowlist exacta de redirecciones de confirmación/recuperación al nuevo origen; revisar SMTP de pruebas y límites; comprobar invitaciones/perfiles/RLS existentes y migraciones pendientes. No ampliar a comodines. No modificar usuarios ni reutilizar cuentas reales en pruebas destructivas. Esta fase no ejecuta esos cambios remotos.


## F0-P9B-R0 — Railway Hobby

El modo explícito TFT_PROXY_MODE=railway exige HOST=0.0.0.0, PORT inyectado, IDs de plataforma y origen HTTPS único obligatorio. Las variables Supabase/VITE existentes se conservan. La tabla anterior describe el modo loopback; para Railway prevalece RAILWAY_ENVIRONMENT.

[Despliegue](RAILWAY_DEPLOYMENT.md) · [Variables](RAILWAY_ENVIRONMENT.md) · [Operación](RAILWAY_OPERATIONS.md) · [Preflight](RAILWAY_PREFLIGHT.md).
