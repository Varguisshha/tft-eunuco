# Operación y recuperación

## Release reproducible

Desde checkout del commit aprobado: `pnpm install --frozen-lockfile`, configurar exclusivamente variables públicas del cliente, `pnpm build`, `pnpm verify:public`. Para arrancar desde raíz: `node apps/server/dist/main.js`, con variables servidor fuera del repositorio. `infra/remote/tft.service` es una plantilla systemd para Linux: requiere usuario tft, rutas, Node y permisos preparados; no se ha instalado en esta máquina macOS. No se requiere Docker/Kubernetes. Docker está disponible como CLI local pero sin daemon; no se afirma haber construido una imagen.

Caddy sirve como proxy hacia loopback. La plantilla usa un nombre reservado hasta autorización. No habilita access log y elimina `request` y `resp_headers` del log global, incluyendo consultas del upgrade. La plantilla se ha validado con el binario oficial de Caddy; antes de activar un dominio habrá que comprobar su TLS real. No registrar JWT del upgrade.

## Salud y logs

`GET /healthz`: proceso vivo, 503 al drenar. `GET /readyz`: depende de Auth y persistencia en main; restauración completa requerida antes de escuchar. Consulta cacheada hasta 5 s, verificación periódica 30 s; un error de escritura marca indisponible inmediatamente. Las sondas no devuelven snapshots ni errores internos. Las peticiones deben usar Host público y pasar por el proxy configurado.

Logs JSON a stdout/journal. Conservar poco tiempo y rotar; no publicar logs completos. Medidas cada 30 s: memoria RSS/heap, CPU acumulada y p95 del event loop. No confundir CPU acumulada con porcentaje: calcular delta/tiempo. Checkpoints incluyen duración, no payload. Auth fallida, conexión, cierre de sala y restauración permiten correlación temporal sin identificar personas. No hay endpoint público de métricas detalladas.

## Matriz de fallos

| Suceso | Comportamiento / operación |
| --- | --- |
| Jugador pierde conexión | Reconexión autenticada; recibos evitan duplicación; no se acepta identidad arbitraria |
| Todos pierden conexión | La autoridad continúa según reglas existentes; pueden reentrar dentro de límites de retención |
| PostgreSQL inaccesible | Escritura no se publica, match queda pausado; reintento del mismo commit conserva idempotencia; readiness falla |
| Caída prolongada | Reintentos durables existentes son finitos; no prometer recuperación ilimitada. Restablecer DB y reiniciar para recuperar último commit confirmado |
| SIGTERM | Readiness deja de aceptar, checkpoint y cierre controlado; deadline 30 s del proceso/35 s del servicio |
| SIGKILL | Supervisor reinicia; restauración validada antes de aceptar; reloj congelado durante caída |
| Catálogo histórico | Fingerprint/decodificación/contratos existentes; si incompatibles o corruptos, arranque cerrado, nunca migración silenciosa |
| Nueva versión | Una sola autoridad; parada breve y recuperación, no rolling deploy paralelo |

CAS, transacción, journal, recibos y compresión P7D.2 permanecen intactos. El checksum detecta corrupción, no es cifrado. La protección en tránsito se realiza mediante TLS; permisos privados/RLS y protección del proveedor guardan los datos. Retención y limpieza existentes no cambian; ejecutar mantenimiento solo tras revisión y autorización, nunca como preflight.

## Actualizar sin destruir partidas

1. Preparar release nueva en carpeta independiente y conservar anterior, lockfile y catálogo.
2. Preferir esperar a que terminen las partidas; si se requiere reiniciar, anunciar pausa y no iniciar sesiones nuevas.
3. Revisar backup y compatibilidad de snapshots con el nuevo código antes de cambiar el servicio.
4. Detener instancia anterior mediante SIGTERM; confirmar que terminó. No levantar otra sobre la misma autoridad antes.
5. Cambiar referencia `current` a release aprobada y arrancar. Verificar readiness y reentrada con recibos coherentes.
6. Si falla, detener nueva instancia. Solo volver a la anterior si puede leer los snapshots escritos; no borrar/reinicializar tablas ni rebajar revisiones.
7. Si cambió el formato de forma incompatible, mantener servicio detenido y resolver compatibilidad/backup explícitamente. No sobrescribir progresos confirmados con un backup antiguo sin autorización.

## Laboratorio

Ver `scripts/remote/README.md`. Solo loopback: 9443/9080 proxy, 2596 Node, 2597 control autenticado y 55441 interruptor TCP hacia PostgreSQL desechable. El corte de red no detiene el servidor PostgreSQL compartido ni afecta a Supabase. No ejecutar dos instancias del laboratorio a la vez. La suite TLS y los recorridos de navegador usan la misma base p9a y se ejecutan secuencialmente.


## F0-P9A.1 — Memoria y retención

Configurar `TFT_FINAL_RETENTION_MS` solo si se necesita otra ventana final (predeterminada 300000 ms; remoto 30000–3600000). Un final confirmado permanece consultable hasta su deadline persistido, incluso tras desconexión; reiniciar no lo amplía. Vencimiento libera memoria, no borra filas. RSS alto aislado no demuestra fuga: revisar heap, GC, salas y fases. El laboratorio P9A.1 usa 2600/2601/9445 y comparte únicamente redirect 9080 con P9A: ejecutarlos por separado.

[Perfil de memoria](SERVER_MEMORY_PROFILE.md) · [Política de retención](MATCH_RETENTION_POLICY.md) · [Mediciones y validación](SERVER_PERFORMANCE_BASELINE.md).


## F0-P9B-R0 — Railway Hobby

Piloto Railway: una partida incluyendo final retenido, ocho gateways, cuatro jugadores, objetivo 2 GiB/2 vCPU sujeto al plan. Adquisición antes de escuchar; crash espera vencimiento de concesión (60 s), arranque hasta 80 s y healthcheck 120 s. Actualizaciones mediante parada previa, no despliegue solapado. Criterios y costes en RAILWAY_OPERATIONS.

[Despliegue](RAILWAY_DEPLOYMENT.md) · [Variables](RAILWAY_ENVIRONMENT.md) · [Operación](RAILWAY_OPERATIONS.md) · [Preflight](RAILWAY_PREFLIGHT.md).


## F0-P9B-R1 — ejecución autorizada (26-10-2026)

Piloto Railway validado por HTTPS, readiness y transporte WSS; sin gameplay autenticado remoto. Parada supervisada confirmada, sin autoridad activa; fence permanece enabled=true. No usar escritores anteriores a R0. Dos partidas y cuatro membresías originales conservadas. C pendiente; ninguna modificación Auth/SMTP/usuarios.

[Informe y evidencias](RAILWAY_FIRST_DEPLOYMENT_REPORT.md).

## C — actualización autorizada y verificada (26-10-2026)

C ya está completada: Site URL `https://tft-eunuco-private.up.railway.app/` y redirect HTTPS exacto añadidos; `http://127.0.0.1:4173/` conservado como redirect. Comparación de 243 campos Auth: solo site_url y uri_allow_list cambiaron. SMTP, usuarios, contraseñas y SQL sin modificaciones. Railway permanece detenido (REMOVED), sin nuevo despliegue y sin integrar P10A. Las menciones anteriores a C pendiente describen el cierre previo de A/B. [Verificación C](evidence/p9b-r1/auth-c-verification.json).
