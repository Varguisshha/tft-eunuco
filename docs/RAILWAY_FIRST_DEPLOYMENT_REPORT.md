# F0-P9B-R1 — despliegue validado y piloto detenido

Fecha: 26-10-2026. A y B ejecutadas con autorización expresa. C ejecutada posteriormente con autorización expresa: solo Site URL y redirect; ver verificación al final. El servicio estuvo operativo y se retiró supervisadamente al terminar la validación, para no mantener consumo mientras se espera al usuario. La URL no sirve el juego actualmente.

## Resultado de A — Railway

| Recurso | Valor real |
|---|---|
| Workspace / plan | varguisshha's Projects / Hobby existente |
| Proyecto | TFT EUNUCO — `80f46bb2-efc2-449d-adfe-1c387acb7a96` |
| Entorno único | private — `8e819935-1601-4579-abb5-293d8beecef8` |
| Servicio único | tft-eunuco — `fafc4774-f71a-4726-ae2a-48fec33d7e2d` |
| Subdominio HTTPS | https://tft-eunuco-private.up.railway.app |
| Deployment / build | `c6f11898-a0dc-483a-b50f-4c4f8042eb57` |
| Estado observado | SUCCESS; después REMOVED por parada supervisada |
| Inicio de deployment | 2026-10-26T20:46:22.404Z |
| Imagen | `sha256:043139731a83d15ad10ceb844546537feea30127b8a90d49d7d9757bc59ffa69` |
| Recursos | 1 réplica, región ams, límite configurado 2147483648 bytes y 2 vCPU |

Se renombró el entorno inicial vacío a private. Sin servicios adicionales, volumen, PostgreSQL, TCP proxy, autodeploy, contratación ni cambios a otros proyectos o límites globales. IaC R0 aplicada mediante plan fijado: 0 recursos añadidos por IaC, 13 ajustes, 0 destruidos. No suspensión automática; la parada final es deliberada. Reinicio ON_FAILURE máximo 3, drenaje 35 s y old space 1280 MiB.

Release extraída de `9450d26c6ebb37efb115a3c4b8c6934bc5e74740`, catálogo `f0p8d-florin-1`. Se excluyeron del paquete de carga originales de arte, documentación y artefactos locales. Ningún .env local ni archivo no rastreado se subió. Variables Supabase y dominio configurados por entrada estándar de la CLI autenticada, sin valores en argumentos, salida o Git. Node 26.9.0, pnpm 11.25.0, instalación congelada, build web/servidor y verify:public correctos en Railway.

## Resultado de B — Supabase

Proyecto revalidado: **tft-eunuco-dev**, `qiombjvkaolllnjqzspz`, eu-west-1. Historial inicial: 202610240001, 202610240002, 202610250001. Dos partidas cerradas, cuatro membresías, cero escritores activos observados; sin cambios inesperados respecto al preflight.

Aplicadas exclusivamente y en una transacción:

- `202610260001_authority_health.sql`.
- `202610260002_authority_lease.sql`.

Historial posterior: las tres anteriores más estas dos. Se comprobó igualdad exacta del SQL registrado con los archivos autorizados. La transacción incluyó bloqueos NOWAIT de tablas afectadas e historial, límites temporales y guardas de igualdad de datos, funciones/permisos, versiones y RLS. Si hubieran cambiado, habría abortado antes del DDL. No reset, limpieza, usuarios, Auth, SMTP ni Storage.

Copia refrescada: `artifacts/p9b-r1/authorized/before.private.json`, ignorada por Git y solo local. SHA256 `2a3e4b08b8a3b85a173a605e733bd067951a042aa8aad12ef9dc0dd348e9a37e`. Restauración verificada en PostgreSQL local y migración ensayada transaccionalmente; snapshots/membresías preservados. El ensayo detectó diferencia de representación de zona horaria local, corregida fijando UTC en la transacción; no se relajó la comparación. Esta es una copia acotada de autoridad y catálogo, **no un backup completo de Auth/Storage**. Backup físico/PITR no disponible según el preflight; no se deshabilitó TLS para obtenerlo.

RLS activo en las tres tablas de autoridad. anon/authenticated/service_role sin lectura directa de ellas. RPC públicas de autoridad ejecutables solo por service_role; la implementación privada de commit tampoco es ejecutable directamente por service_role. Health y lease_health true. Durante el piloto: concesión activa y renovada, con ~59 s restantes en la lectura. Tras SIGTERM: sin propietario ni concesión activa, `enabled=true`. El bloqueo de escritores antiguos permanece: **no volver a un release anterior a R0 ni desactivar el fence**.

## Validación real

- Railway healthcheck `/readyz` superado; deployment SUCCESS.
- HTTPS con validación de certificado: `/`, `/healthz` y `/readyz` 200; readiness devolvió `ready` (incluye las sondas de Supabase).
- WSS con Origin canónico: upgrade 101 y cierre 4002 para una sala inexistente, sin reservar sala ni crear usuarios. Prueba de transporte, no de gameplay autenticado.
- Origin ajeno: HTTP 403 y upgrade WS rechazado 401.
- `/.env` y `/artifacts`: 404. Bundles servidos revisados con detector de credenciales; verify:public remoto correcto.
- Fuente Bungee servida como font/ttf y hash idéntico al estable: `c4f5361ce120af3e6b9156d0bf379fa19cda2ea0cd18ac01fd99596c6bf66e3f`.
- Pantalla real de acceso privado visible en navegador. No login, cuentas ficticias ni partidas humanas remotas.
- Baseline previo: 1374/1374 pruebas, 98 archivos, tipos, lint, build, PG y TLS correctos. No cambios runtime posteriores que requieran repetirlo.

Muestra Railway sin partidas: pico ~75 MB, CPU máxima ~0,0168 vCPU; 19 solicitudes en la ventana, p95 35 ms, cero 5xx. **No representa carga multijugador ni demuestra capacidad máxima**. La media incluye minutos previos al arranque. El límite de memoria se acredita por configuración en bytes; no por la conversión de unidades del resumen de métricas.

## Consumo y parada

Última lectura del proyecto: **0,000209378 USD** incremental registrado. No alcanzó 3 USD ni 5 USD. Es una lectura con posible retraso de facturación, no una liquidación final ni consumo cero. No se modificaron límites del workspace ni se crearon supuestas alertas automáticas exactas.

Piloto técnico de pocos minutos, inferior a 24 h. Se retiró exclusivamente este deployment con parada controlada; REMOVED confirmado y `/readyz` devuelve 404 del edge al no existir deployment activo. Concesión liberada; dos partidas y cuatro membresías originales conservadas. Proyecto, servicio, variables y subdominio permanecen para una reanudación supervisada.

No se puede garantizar vigilancia continua durante 24 h desde un chat que puede cerrarse o quedar sin ejecución. Por ello no se deja cómputo encendido esperando C. Una reanudación requiere supervisión efectiva, aviso operativo a 3 USD y parada a 5 USD o al fin del piloto; estos umbrales no son cortes automáticos exactos.

## Incidencias y límites pendientes

Railway mostró aviso de latencia de snapshots y después recuperación de infraestructura; no impidió build, healthcheck ni parada. No se cambió la aplicación para eludirlo. La prueba local de fuente apuntó inicialmente a una carpeta incorrecta; se corrigió la ruta y se verificó el recurso real. Sin bloqueo técnico pendiente en A/B. C y una validación de juego con 2–4 personas siguen pendientes: no declarar completada esa campaña.

## Git y aislamiento

Rama `codex/f0-p9b-r1-first-deployment`. Cambios de esta ejecución: informe, ocho documentos de estado y evidencia saneada; sin cambios runtime, migraciones, dependencias o IaC, y sin push. Backups, logs y capturas permanecen ignorados. Los originales no rastreados se conservaron. **F0-P10A permanece intacta en su otro worktree y no se incorporó al release**.

[Evidencia agregada](evidence/p9b-r1/authorized-execution.json).

## Autorización C — ejecutada y verificada

El 26-10-2026 a las 21:18:38 UTC se completó únicamente C, tras autorización expresa del usuario. Se revalidó el proyecto `tft-eunuco-dev` (`qiombjvkaolllnjqzspz`) y se leyó su configuración Auth completa antes de escribir. Una segunda lectura inmediatamente anterior confirmó ausencia de cambios concurrentes.

Se envió un PATCH con **solo** `site_url` y `uri_allow_list` mediante la [API oficial de Supabase](https://supabase.com/docs/reference/api/v1-update-auth-service-config), usando la sesión existente sin imprimir ni guardar el token. Las copias completas se conservaron en archivos ignorados con permisos 0600; la evidencia versionada contiene solo URLs y resultados de comparación.

| Campo | Antes | Después verificado |
|---|---|---|
| Site URL | `http://127.0.0.1:4173/` | `https://tft-eunuco-private.up.railway.app/` |
| Redirects | `http://127.0.0.1:4173/` | `http://127.0.0.1:4173/`, `https://tft-eunuco-private.up.railway.app/` |

Lectura posterior independiente: URL exacta incluida la barra final, redirect HTTPS presente, único redirect local anterior conservado, sin wildcards ni dominios adicionales. Comparados los 243 campos devueltos por la API: únicamente cambiaron `site_url` y `uri_allow_list`; los otros 241 permanecieron iguales, incluidos los campos SMTP devueltos. No se hicieron llamadas para modificar usuarios, contraseñas, SQL, RLS, permisos, migraciones, Storage ni otros proyectos.

Railway sigue con deployment REMOVED; no se desplegó ni arrancó nada. No se integró F0-P10A. C no incluye ensayo de login, envío de correos o partida real, ni autorización para reactivar el servidor. Se detiene el trabajo tras esta validación.

[Evidencia C saneada](evidence/p9b-r1/auth-c-verification.json). Las secciones anteriores describen el cierre de A/B y sus comprobaciones históricas; las referencias a C pendiente en esa fase quedan resueltas por esta ejecución.
