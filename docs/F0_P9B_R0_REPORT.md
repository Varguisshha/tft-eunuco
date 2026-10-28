# F0-P9B-R0 — preparación local de Railway Hobby

Fecha: 26 de octubre de 2026. Alcance: preparación y laboratorio local. No se ha hecho push, contratado Hobby, creado recursos Railway ni consultado/modificado Supabase remoto.

## 1. Base Git y rama

Cierre P9A.1 verificado: `4e17a218ca93906278f75c38328ca7e929adda64`. Rama aislada `codex/f0-p9b-r0-railway-preparation`, worktree `/Users/vargas/.codex/worktrees/p9b-r0-railway-preparation/TFT EUNUCO`. Originales y worktree P9A.1 preservados. Baseline ejecutado antes de editar: **1342/1342, 92 archivos**. La primera ejecución sin dist tuvo un 404 TLS; construir y repetir resolvió la precondición sin cambiar pruebas.

## 2. Arquitectura Railway

Un proceso Node sirve Vite compilado, Colyseus, HTTP interno y WebSockets. Edge Railway termina HTTPS/WSS. Supabase existente conserva Auth y persistencia RPC. Una réplica, sin Caddy, PostgreSQL adicional ni autoscaling. Piloto limitado a una partida de cuatro jugadores; el final retenido sigue ocupando el cupo.

## 3. Configuración declarativa

[`.railway/railway.ts`](../.railway/railway.ts), SDK fijado `railway@3.16.0`, evaluado localmente con `pnpm verify:railway`. Configuración actual IaC, no railway.json/toml heredado. Root `/`, Railpack, healthcheck `/readyz` con 120 s, reinicio ON_FAILURE hasta tres veces, una réplica, sin suspensión ni TCP proxy. Ningún plan/apply remoto ejecutado. Ver [referencia oficial](https://docs.railway.com/infrastructure-as-code/reference).

## 4. Build y start

Node 26.9.0 y pnpm 11.25.0. Build explícito: `pnpm install --frozen-lockfile --prod=false && pnpm build && pnpm verify:public`. Start directo: `node apps/server/dist/main.js`, conservando señales. Se construyeron frontend/servidor desde exportación del índice Git, sin `.env`, artifacts ni originales no rastreados, con NODE_ENV=production y variables públicas de Auth sintéticas. No se necesita importar sprites en despliegue. El bundle web mantiene aviso de tamaño elevado; no se ha ocultado ni alterado su umbral.

## 5. Host y puerto

Modo Railway explícito exige `HOST=0.0.0.0` y `PORT` decimal 1–65535 proporcionado por plataforma; rechaza ausencia/formato ambiguo. El laboratorio eligió un puerto libre del SO y mantuvo intactos los servicios habituales 4173/2567.

## 6. Proxy

Validación de Host canónico, Origin exacto, X-Forwarded-Host y esquema HTTPS. Duplicados críticos rechazados. No usa XFF como identidad o límite. La confianza del salto interno exige edge como única entrada, sin TCP proxy ni pares privados; IDs Railway no autentican peticiones. Excepción mínima para hostname de healthcheck oficial, solo GET de las dos sondas. Se debe validar contra el edge real antes de invitar usuarios.

## 7. HTTPS/WSS

Laboratorio `https://game.p9b.test:9447`, certificado CA local válido, conexiones WSS reales de cuatro clientes. Node confía solo en CA explícita; Chrome usa perfil desechable con CA restringida a localhost/game.p9b.test. La primera prueba de navegador rechazó el certificado por restricción solo a localhost; se corrigió esa configuración del perfil y se repitió dentro del plazo del final, sin desactivar TLS ni renovar el deadline.

## 8. Supabase

Variables reales del repositorio separadas entre cliente y servidor. No nueva base Railway ni proyecto Supabase. Inventario de cinco migraciones, backup, revisión de RLS/grants, comparación remota y redirects futuros en [entorno](RAILWAY_ENVIRONMENT.md). La nueva migración `202610260002_authority_lease.sql` solo se aplicó a dos bases locales aisladas. No migración automática al arrancar. Auth del ensayo es fixture externo; no demuestra registro/SMTP/refresh reales del proveedor.

## 9. Healthchecks y autoridad

Restauración completa antes de abrir listener; prueba explícita bloquea restore y demuestra que `/readyz` no acepta conexiones hasta terminar. Dependencia no disponible devuelve 503. Concesión SQL por proceso, 60 s; heartbeat 10 s y deadline monotónico local 40 s. Commit bloquea fila y comprueba propietario/plazo; rechazo de segundo propietario, propietario caducado y escritor antiguo comprobado en PostgreSQL. Segundo main de producción no llegó a readiness mientras existía autoridad. Espera de adquisición hasta 80 s, sin servir tráfico. SIGTERM guarda/cierra; pérdida de concesión falla cerrado.

## 10. Retención

`TFT_FINAL_RETENTION_MS=300000`, reglas/tick intactos. Recuperación final tras SIGKILL conserva exactamente expires_at; recarga del navegador recupera clasificación. El resultado durable permanece después del plazo. Pruebas anteriores cubren expiración, liberación y ausencia de checkpoints finales redundantes. No ampliación de retención para conseguir resultados de laboratorio. La pasada final detectó una carrera previa: el temporizador de sala podía disparar antes del deadline de pared y persistir una desconexión final adicional (4 escrituras frente a 3). Se añadió comprobación del deadline en el callback y prueba del disparo anticipado; la prueba histórica de red se mantuvo intacta y ambas pasan.

## 11. Recursos

[Auditoría reproducible](evidence/p9b-r0/assets.json): 41 archivos públicos, 4.097.781 bytes, 13 referencias de texturas y splash de DOLEA, VARGAS, JARAMILLO y FLORIN. Identidad de bytes public/dist. Sin cambios de arte, fuentes o catálogo. Dos GiB RAM y dos vCPU son techo objetivo sujeto a aprobación del plan, no garantía ni cuota gratuita. V8 old space 1280 MiB; una partida y ocho gateways máximo.

## 12. Corrección TTF

`.ttf` devuelve `font/ttf`; woff/woff2 conservados, licencia `.txt` legible. Fuente Bungee existente con OFL, registrada como FestivalPop, sin sustitución artística. Browser FontFace informa loaded, dos respuestas TTF 200 y cero errores JS/HTTP. [Captura 1920×1080](evidence/p9b-r0/compiled-final.png) revisada: clasificación de cuatro jugadores y tipografía correctas. [Evidencia](evidence/p9b-r0/browser.json).

## 13. Seguridad

JWT verificado, inventarios privados, comandos propietarios, límites y DEV online conservados por regresión. Servidor de producción sin rutas de fixture. `verify:public` ahora distingue el literal `sb_secret_` usado como predicado del SDK de una clave secreta real: rechaza valores secretos no vacíos, JWT service_role y URLs PostgreSQL. Nuevas pruebas cubren ambos casos. Certificados, sesiones, logs brutos y snapshots permanecen ignorados; evidencia publicada solo agregada y captura sin credenciales.

## 14. Ensayos

[Partida](evidence/p9b-r0/game-summary.json): cuatro jugadores, 16 rondas, 938.844 ms (~15 min 39 s), reloj normal. 99 compras, 19 movimientos, 9 combinaciones, 6 equipamientos y 30 ventas aceptados. Repartos automáticos por jugador: 5/4/5/5. Ronda cuatro: reconexión, SIGTERM, recuperación activa e inventarios iguales. Final: SIGKILL, recuperación tras concesión, mismo deadline. Navegador compilado recupera final y tras recarga mantiene clasificación. [Laboratorio](evidence/p9b-r0/lab.json).

Negativas: configuración ausente/incorrecta, Host/Origin/protocolo, JWT inválido, clientes sin permiso, dependencia caída, segunda autoridad, assets inexistentes y MIME verificados mediante pruebas y laboratorio. No benchmark de RAM en esta campaña: compartía máquina con suite; no sustituye las medidas P9A.1 ni acredita rendimiento Railway.

## 15. Pruebas y quality gates

**Resultado final: 1374/1374 pruebas, 98 archivos, 337,05 s; `pnpm check` terminó con código 0.** TypeScript, ESLint y builds cliente/servidor correctos. Baseline histórico 1342/1342; se añaden 32 pruebas en seis archivos sin eliminar las anteriores ni debilitar umbrales. PostgreSQL aislado y HTTPS/WSS habilitados explícitamente. Build limpio con Auth pública sintética, auditoría assets, `verify:public`, `verify:railway`, formato de archivos nuevos/corregidos y `git diff --check` correctos. Una pasada intermedia detectó la carrera de retención descrita arriba; la suite completa posterior incluye su corrección. [Resumen de puertas de calidad](evidence/p9b-r0/quality.json).

## 16. Coste estimado

Hobby mínimo 5 USD/mes acreditado a consumo. Ejemplo hipotético 0,4 GB RAM media + 0,1 vCPU media + 2 GB salida: ~6,10 USD/mes antes de impuestos y otros recursos; no 5+6,10. RAM sostenida 2 GB supondría ~20 USD/mes solo en RAM. Dos GiB no son gratis ni consumo previsto. Tarifas y capacidades deben revalidarse en la cuenta real. [Precios oficiales](https://docs.railway.com/pricing); detalle y alertas en [operación](RAILWAY_OPERATIONS.md).

## 17. Riesgos y límites

P9A.1 conserva pico observado ~865,8 MiB y pausa máxima 781,19 ms en otra CPU; hay riesgo de serialización y presión de memoria. El bundle frontend sigue grande. Proxy/recursos/precios Railway y Auth/SMTP reales pendientes de ensayo autorizado. No despliegue sin interrupción: detener autoridad anterior antes de la siguiente. Healthcheck Railway no es monitor continuo. Tras activar concesión, **P9A.1 no es rollback válido**, porque sus commits carecen de propietario; usar release compatible o corrección hacia delante. No desactivar protección ni borrar partidas.

## 18. Estado Git

Cambios exclusivamente locales en rama aislada. Se conserva arte original no rastreado para ejecutar los importadores históricos; no se incorpora al release. Evidencia saneada versionada en `docs/evidence/p9b-r0`. No push. El commit de cierre se identifica mediante el historial de esta rama y el mensaje de cierre; el informe no incluye su propio hash circular.

## 19. Checklist de despliegue

[RAILWAY_PREFLIGHT](RAILWAY_PREFLIGHT.md) separa comprobaciones locales y permisos futuros; [RAILWAY_DEPLOYMENT](RAILWAY_DEPLOYMENT.md) detalla proyecto/Hobby/servicio, variables, dominio, backup/migraciones aprobadas, build, health, Auth, WSS, dos ordenadores, cuatro personas, métricas y parada. Rollback conserva commits, valida fingerprints/formato/inventarios y exige una única autoridad compatible. No autodeploy ni datos borrados como atajo.

## 20. Preparación para autorización P9B

R0 entrega implementación, configuración y ensayo local. El siguiente paso requiere autorización distinta para contratar/publicar y aplicar las diferencias exactas de Supabase. Antes: confirmar presupuesto, revisar migraciones/backup y dominio; después: prueba real supervisada. Este informe no concede esa autorización ni afirma que Railway ya esté desplegado.
