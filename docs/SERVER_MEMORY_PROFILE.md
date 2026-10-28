# F0-P9A.1 — Memoria del servidor

Base exacta: `c878fcf59e387e97003dd078a347884e15776780`, cierre P9A. Rama aislada `codex/f0-p9a1-memory-stability`. Baseline fresco: 1337 pruebas, 91 archivos, cero omisiones, PostgreSQL de diagnóstico y TLS; `pnpm check` en 291,75 s de tests.

## Método y privacidad

Laboratorio explícito `scripts/diagnostics/p9a1`, desactivado en el runtime normal. Solo PostgreSQL desechable `tft_memory_test`, Node 2600, control autenticado 2601 y proxy HTTPS/WSS 9445 (redirect 9080). No Supabase real ni servicios normales 4173/2567. Mediciones secuenciales, nunca dos benchmarks a la vez.

RSS, heapUsed, heapTotal, external, arrayBuffers y CPU proceden únicamente de `process` **del servidor**. Navegador, proxy, PostgreSQL y harness son procesos separados. `PerformanceObserver` cuenta GC; el histograma de event loop usa resolución de 10 ms y ventanas de dos segundos. Las referencias a salas del laboratorio son débiles; se registran sockets, listeners, timers y tamaños de mapas. Los tamaños de snapshot/replay se calculan solo bajo petición y se separan de las muestras periódicas. Esa exportación añade trabajo temporal: no atribuir todo el intervalo a producción.

`--expose-gc` se usa exclusivamente aquí; las muestras marcadas GC ejecutan dos colecciones separadas por un turno. La partida normal no fuerza GC mientras juega. No inspector, heap dump ni ruta de diagnóstico pública. Los JSON completos permanecen en `artifacts/`, ignorado; los informes solo incluyen agregados numéricos. El código normal no importa instrumentación.

## Causas demostradas

1. **Checkpoints inútiles del final.** El callback seguía clonando, restaurando, validando, serializando y comprimiendo el snapshot cada segundo, aunque `pulse` no cambiara nada. Un final grande restaurado realizó diez commits adicionales en diez segundos sin sockets. Ahora realiza cero.
2. **Fuente de restauración retenida.** El permiso conservaba `saved` después de crear la autoridad. En la fixture grande retenía un documento serializable de 13.101.004 bytes. Ahora `saved` desaparece al hidratar. Esta medida por sí sola no demuestra una reducción equivalente del heap: las representaciones pueden compartir referencias y las colecciones varían.
3. **Asignaciones transitorias.** Zod export/restore, JSON y gzip generan objetos y buffers temporales; V8 no devuelve inmediatamente toda la memoria residente al sistema. RSS alto no demuestra objetos vivos perdidos. No se ha demostrado una fuga acumulativa a partir de RSS aislado.
4. **Retención intencional.** Un final contiene replay canónico, ledger y resultado para recuperar. Se mantiene hasta el deadline, no hasta la última desconexión. Se libera con la sala.

## Comparación idéntica: final grande restaurado

Mismo documento local P9A, replay JSON de 12.593.343 bytes, snapshot de autoridad de 13.100.048 bytes; seed, resultado y formato intactos. GC controlada en los puntos indicados. MiB = 1048576 bytes.

| Estado | Antes RSS / heapUsed MiB | Después RSS / heapUsed MiB | Commits antes / después |
|---|---:|---:|---:|
| J: final restaurado, GC | 440,2 / 67,6 | 317,8 / 67,2 | 2 / 0 |
| J: diez segundos después, GC | 733,7 / 66,5 | 353,5 / 67,4 | 12 / 0 |
| L: sala liberada, GC | 373,0 / 35,7 | 222,4 / 36,5 | 13 / 0 |

El heap vivo del final apenas cambia; disminuye principalmente la presión de asignación y el RSS. La CPU acumulada entre los dos puntos J pasa de 6,27 s a 0,47 s, incluyendo exportación detallada y GC del laboratorio. Una medición local no es garantía de capacidad remota.

## Decisiones conservadoras

No cambia el codec ni sus límites (12 MiB codificados / 128 MiB expandidos, SQL 16 MiB), fingerprints, replays históricos, recibos o journal. No se comparten objetos mutables entre autoridades ni se añade caché global. Los duelos de la ronda se sustituyen al avanzar; no hay un archivo ilimitado de todos los replays en RAM. Cada cliente tiene claves de entrega, no una copia canónica permanente.

Las partidas activas conservan checkpoint de un segundo, copy-on-write y confirmación posterior a PostgreSQL. Ahorrar esas copias requeriría otra investigación de equivalencia; queda fuera de esta corrección. El coste activo, restauración masiva sin paginación y compresión síncrona siguen siendo riesgos de capacidad.

La matriz completa de estados y las campañas se publican en [rendimiento](SERVER_PERFORMANCE_BASELINE.md). La política se define en [retención](MATCH_RETENTION_POLICY.md).
