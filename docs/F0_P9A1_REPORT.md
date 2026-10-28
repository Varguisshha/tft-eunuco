# F0-P9A.1 — Informe de cierre

## 1. Base y rama

Base P9A exacta: `c878fcf59e387e97003dd078a347884e15776780`. Rama `codex/f0-p9a1-memory-stability`, worktree `/Users/vargas/.codex/worktrees/p9a1-memory-stability/TFT EUNUCO`. La rama/worktree P9A original se conserva. No push ni despliegue.

## 2. Diagnóstico inicial

Baseline fresco: 1337/1337 pruebas en 91 archivos, PostgreSQL local y HTTPS/WSS incluidos. RSS alto no se tomó como prueba de fuga. Se separaron heap vivo, asignaciones temporales, buffers, final retenido y coste del laboratorio. [Método](SERVER_MEMORY_PROFILE.md).

## 3. Memoria por estado

Matriz A–L, memoria completa, sockets, timers y listeners en [SERVER_PERFORMANCE_BASELINE](SERVER_PERFORMANCE_BASELINE.md). Final grande idéntico tras diez segundos: RSS **733,7→353,5 MiB**, heap **66,5→67,4 MiB**. La mejora principal es presión de asignación/RSS, no una reducción equivalente de objetos vivos.

## 4. Causas confirmadas

Finales inactivos seguían haciendo checkpoints completos cada segundo: exportación Zod, reconstrucción, validación, JSON, gzip y escritura. El permiso de recuperación retenía además `saved`. GC y memoria residente explican parte de las diferencias entre RSS y heap; no se demuestra una fuga global con una cifra aislada.

## 5. Optimizaciones

Se evita el checkpoint periódico del final disponible y la escritura redundante al restaurar. SIGTERM no reescribe un final confirmado sin cambios; espera operaciones pendientes y conserva fail-closed. Se elimina la fuente de hidratación del permiso, se desactiva la puerta de inicio cuando ya arrancó y se vacían mapas al disponer. El callback ligero conserva el reloj de autenticación/expiración y publica una transición final pendiente una sola vez. La expiración no intenta escribir sobre un registro ya vencido.

## 6. Retención

`TFT_FINAL_RETENTION_MS`: 300000 por defecto; 30000–3600000 en privado/producción, mínimo 1000 solo diagnóstico. El primer commit final fija el deadline sin exceder el límite activo. Reconexión, restauración y cambios de configuración no lo renuevan. Al vencer se libera la sala; **no se borra el resultado durable**. [Contrato](MATCH_RETENTION_POLICY.md).

## 7. Replays

Sin cambios de formato, resultados, trazas ni privacidad. Se conserva el replay canónico de la ronda para reconexión/espectadores dentro de la ventana. No se introduce una caché global ni carga perezosa. El documento grande de comparación tiene 12.593.343 bytes de replay en JSON; es el mismo antes/después.

## 8. Snapshots y persistencia

CAS, journal, recibos idempotentes, compresión, límites y confirmación posterior a PostgreSQL se conservan. Activas mantienen checkpoint de un segundo y copy-on-write. `permit.saved` deja de retener 13.101.004 bytes serializables en la fixture grande; eso no equivale necesariamente a ese ahorro de heap por compartir representaciones. Diez commits finales redundantes en diez segundos pasan a cero.

## 9. Event loop

Partida normal: máximos de p95 por ventana de dos segundos, preparación 15,64 ms, combate 12,33 ms, resolución 13,62 ms; pausa máxima **781,19 ms**. No son percentiles globales. Los p99 y máximos muestran bloqueos que un p95 bajo ocultaría. La serialización activa sigue siendo un riesgo de capacidad; no se afirma haberla optimizado.

## 10. WebSocket

Normal: **136.676.783 bytes de aplicación encolados**, de los cuales 126.361.982 corresponden a 58 `combat_trace`. Por participante: 35,46 / 33,78 / 34,43 / 33,00 MB. No incluye TLS/TCP, entrada ni lobby. Sin cambio de protocolo ni relajación de privacidad. No comparar como ahorro directo con los 338,3 MB de otra campaña P9A acelerada.

## 11. Partida normal

Cuatro clientes SDK reales, HTTPS/WSS y servidor autoritativo: **15 min 21,1 s**, sin advance; el control lo rechaza en modo normal. 235 solicitudes, compras/despliegues, 8 combinaciones y 6 equipamientos aceptados, cuatro repartos, Overtime, eliminaciones, clasificación y reconexión con inventario idéntico. CPU del proceso 302,91 s / 923,90 s observados (32,79 % de un núcleo). Pico muestreado RSS 865,8 MiB. El guion vende unidades desde ronda siete mediante comandos públicos; no es carga humana equilibrada. El smoke del cliente UI compilado se valida por separado, sin atribuirlo a esta campaña SDK.

## 12. Partidas consecutivas

Cinco de dos y tres de cuatro, mismo proceso, sin reset entre partidas. Retención diagnóstica de ocho segundos, liberación natural. Después de cada partida: cero salas/sockets/timers/listeners de sala. Heap tras liberar las últimas tres: 39,70 / 39,72 / 39,73 MiB; tras barrido 39,67 MiB y RSS 217,0 MiB. Se comprueban perspectiva/identidad y tiendas de semilla fija. No se demuestra ausencia de fuga para ejecuciones ilimitadas; sí ausencia de acumulación de recursos de sala en esta campaña.

## 13. Reinicio y recuperación

Comparación acelerada incluye SIGKILL de final y restauración. La suite PostgreSQL existente cubre SIGKILL en combate, Overtime y resolución/liquidación, estado activo, final retenido, idempotencia de repartos y continuidad contra control sin interrupción. Las pruebas nuevas verifican reconexión dentro de ventana, expiración con cliente conectado, rechazo posterior y que un resultado vencido no reaparece al restaurar.

## 14. Compatibilidad

No cambian fingerprints históricos, esquema SQL, versiones de protocolo ni catálogo. Sin cambios de personajes, objetos, economía, RNG, arena, HUD o duración de fases. Una regresión intermedia en publicación final sin persistencia fue detectada y corregida; las tres campañas de estabilización originales vuelven a pasar sin modificar sus pruebas ni timeouts.

## 15. Tests y quality gates

**PASS: 1342/1342 pruebas en 92 archivos, sin omisiones**, 272,58 s. Las 1337 originales se conservan y se añaden cinco. `pnpm check` completo: TypeScript, ESLint, tests con PostgreSQL aislado/TLS, build cliente y servidor. `pnpm verify:public` y `git diff --check` correctos. No se relajan timeouts ni límites. El build conserva el aviso existente de chunks grandes, sin elevar su límite.

Smoke separado del cliente compilado: clasificación de cuatro jugadores, reconexión autenticada con nuevo ID de socket y resultado idéntico, cero errores de JavaScript. Se reimporta exclusivamente la fixture local final con una ventana nueva para poder probar el cliente; no se renueva una partida real vencida. Captura y agregados en `docs/evidence/p9a1/`.

## 16. Riesgos restantes

Picos activos de ~866 MiB y pausas de ~0,78 s; copy-on-write/JSON/gzip síncronos, replays grandes, coste de restaurar muchas salas y carga inicial sin paginación. Hardware de diagnóstico potente: no extrapolar capacidad a una VM pequeña. Diferencia de heap tras calentamiento (~7,8 MiB) no atribuida por completo; meseta observada, no prueba de ausencia absoluta de fugas. Sin prueba de múltiples partidas concurrentes remotas ni fallos reales de proveedor. El smoke visual revela además una limitación preexistente del servidor estático: no admite extensión `.ttf`, por lo que FestivalPop usa fallback; queda documentada sin modificar el HUD ni ampliar esta fase. El aislamiento y las garantías durables tienen prioridad sobre ahorro especulativo.

## 17. Git y privacidad

Solo cambios locales de servidor, tests, laboratorio, ejemplo de configuración y documentación. Originales de arte y TFPeru no forman parte del cambio. Métricas numéricas depuradas pueden versionarse; snapshots completos, logs, JWT, perfil Chrome y certificados quedan bajo `artifacts/` ignorado. Sin inspector ni endpoint de memoria en producción, sin Supabase real y sin reiniciar servicios normales.

## 18. Preparación para P9B

Queda definida y comprobada la política de retención, y existe una medición normal además de las aceleradas. Esto permite dimensionar y planificar el ensayo privado con sus riesgos visibles; **no autoriza ni inicia P9B, hosting, push o despliegue**. Antes de elegir capacidad remota deben considerarse los picos activos y los pasos de [REMOTE_PREFLIGHT](REMOTE_PREFLIGHT.md).
