# Variables Railway y Supabase

No hay secretos reales en estos ejemplos. Los valores se introducen en variables seguras del servicio; los de cliente quedan públicos en el bundle. El proyecto Supabase dedicado existente se conserva. No se añade DATABASE_URL remoto: persistencia sigue por HTTPS/RPC.

| Variable | Contrato |
|---|---|
| `NODE_ENV` / `TFT_ENV` | `production` / `private` |
| `HOST` | `0.0.0.0` exclusivamente con modo Railway explícito |
| `PORT` | Inyectado por Railway; dígitos, entero 1–65535. Obligatorio, sin fallback en Railway |
| `TFT_PROXY_MODE` | `railway`; modo anterior `loopback` sigue disponible para VPS/local |
| `TFT_PUBLIC_URL` | Origen HTTPS exacto, sin ruta/query/hash/credenciales |
| `TFT_ALLOWED_ORIGINS` | Obligatoria en Railway; exactamente el mismo origen, sin wildcard |
| `TFT_PROXY_ADDRESS` | Omitir en Railway; únicamente para proxy loopback del contrato anterior |
| `RAILWAY_PROJECT_ID`, `RAILWAY_SERVICE_ID`, `RAILWAY_ENVIRONMENT_ID`, `RAILWAY_DEPLOYMENT_ID` | Inyectadas por plataforma y exigidas en este modo. No son autenticación de peticiones |
| `RAILWAY_TCP_PROXY_DOMAIN` / `RAILWAY_TCP_PROXY_PORT` | Deben estar ausentes; su presencia impide arrancar |
| `TFT_STATIC_DIR` | `apps/web/dist`, desde raíz |
| `TFT_FINAL_RETENTION_MS` | `300000`; no modificar reloj competitivo |
| `RAILPACK_NODE_VERSION` | `26.9.0`, runtime probado localmente |
| `RAILPACK_NO_SPA` | `1`; frontend servido por el mismo Node |
| `NODE_OPTIONS` | `--max-old-space-size=1280`; presupuesto V8, no límite total RSS |
| `SUPABASE_URL` | URL HTTPS del proyecto dedicado existente |
| `SUPABASE_PUBLISHABLE_KEY` | Clave pública para Auth/perfil; no secret/service-role |
| `SUPABASE_SERVICE_ROLE_KEY` | Privada, solo backend/RPC; sellar en Railway, nunca `VITE_` |
| `VITE_APP_ENV` | `private` durante build |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Mismo proyecto y clave pública; se incrustan al construir |
| `VITE_GAME_SERVER_URL` | Omitir: navegador usa el mismo origen HTTPS/WSS |

No trasladar `.env.local`, tokens de fixture, certificados, URLs PG de prueba, `DEBUG`, `COLYSEUS_LATENCY` o `TFT_DIAGNOSTIC`. El arranque remoto rechaza las últimas tres. Para cambiar configuración VITE hay que reconstruir; cambiar solo variables runtime no reescribe el frontend.

## Proxy y healthchecks

Railway Edge termina TLS y añade `X-Forwarded-Proto=https` y `X-Forwarded-Host`. Se exige Host canónico y forwarded-host coincidente; protocolos múltiples/inseguros y cabeceras críticas duplicadas se rechazan. XFF, X-Real-IP y Forwarded no deciden identidad, origen ni límites. Los IDs de plataforma no prueban el remitente: la seguridad del enlace interno depende de que el puerto no tenga TCP proxy ni otros pares privados. No se inventa una CIDR estable del proxy.

Excepción acotada: `Host: healthcheck.railway.app`, método GET sin Origin y ruta exacta `/readyz` o `/healthz` puede consultar estado booleano por el enlace interno. No sirve archivos ni matchmaking ni WS. La documentación oficial identifica ese hostname para las sondas. Validar este contrato durante la futura prueba real antes de invitar usuarios. [Cabeceras y WSS](https://docs.railway.com/networking/public-networking/specs-and-limits), [healthchecks](https://docs.railway.com/deployments/healthchecks).

## Auth y migraciones

Auth conserva verificación getUser/claims, correo confirmado, sesión activa, perfil propietario y roster congelado. Registro privado, login, confirmación y recuperación usan el origen raíz del juego. Cuando exista dominio: Site URL `https://DOMINIO/` y redirect permitido exacto `https://DOMINIO/`; si se habilita otra ruta real, añadirla explícitamente, no wildcard. Mantener SMTP actual y probar límites/envíos con cuentas autorizadas. Renovación de JWT y reconexión siguen en el cliente existente.

Migraciones locales inventariadas: `202610240001_accounts`, `202610240002_redact_invitation_metadata`, `202610250001_authority_persistence`, `202610260001_authority_health`, `202610260002_authority_lease`. No se conoce su diferencia actual con remoto porque R0 no lo consulta ni modifica.

Procedimiento posterior: comparar historial remoto y definiciones/permisos con estos archivos; revisar backup/restauración y ventana de mantenimiento; revisar RLS y EXECUTE (anon/authenticated sin funciones de autoridad, service_role sin tablas privadas ni función interna de commit). Presentar diferencias exactas; aprobar solo pendientes; aplicar transaccionalmente. No reenviar todas las migraciones a ciegas. La nueva migración crea concesión privada y wrapper de commit, sin alterar snapshots, catálogo, perfiles ni inventarios.

`pnpm --filter @tft/server preflight` valida configuración sin red. `... preflight --check-storage` solo lee health, concesión disponible, snapshots y salud Auth; valida restauración/catálogo y capacidad. No adquiere autoridad, no migra, no limpia, no cambia usuarios. Su ejecución contra remoto también pertenece a P9B autorizado. La primera adquisición activa permanentemente el requisito de escritura con propietario; no rebajarlo durante rollback.


## F0-P9B-R1 — ejecución autorizada (26-10-2026)

Variables requeridas cargadas por entrada estándar de la CLI autenticada, sin secretos en Git/logs. Dominio y origen canónico https://tft-eunuco-private.up.railway.app. Proyecto Supabase qiombjvkaolllnjqzspz; ambas migraciones autorizadas aplicadas y verificadas. Una réplica ams, límite 2147483648 bytes / 2 vCPU. No modificar Site URL ni redirects hasta aprobación C.

[Informe y evidencias](RAILWAY_FIRST_DEPLOYMENT_REPORT.md).

## C — actualización autorizada y verificada (26-10-2026)

C ya está completada: Site URL `https://tft-eunuco-private.up.railway.app/` y redirect HTTPS exacto añadidos; `http://127.0.0.1:4173/` conservado como redirect. Comparación de 243 campos Auth: solo site_url y uri_allow_list cambiaron. SMTP, usuarios, contraseñas y SQL sin modificaciones. Railway permanece detenido (REMOVED), sin nuevo despliegue y sin integrar P10A. Las menciones anteriores a C pendiente describen el cierre previo de A/B. [Verificación C](evidence/p9b-r1/auth-c-verification.json).
