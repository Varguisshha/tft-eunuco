# F0-P8C · Informe de ejecución de objetos

1. **Base y rama.** Cierre P8B verificado `469c4a6` (P8A `f3cb2f0`), rama `codex/f0-p8c-item-effects`. Baseline: 1004 tests, PostgreSQL diagnóstico incluido. Originales y archivos ajenos preservados; sin push ni despliegue.
2. **Arquitectura.** Ejecutor data-driven dentro del core; reutiliza daño, heal, maná, escudos, estados y proyectiles. No hay motor paralelo ni efectos calculados por Phaser.
3. **Decisiones.** [Tabla versionada](ITEM_EFFECT_EVENT_ORDER.md): máximo de vida, rotura de escudo, QSS, filas, pool/pesos, mínimo de maná, precedencia y causalidad. Las ambigüedades se atribuyen a EUNUCO.
4. **Operaciones.** 26 familias ejecutables; ver [contrato y operaciones](ITEM_EFFECT_EXECUTOR.md).
5. **Matriz.** [36 filas individuales](ITEM_EFFECT_TEST_MATRIX.md), con receta, trigger, operaciones y duración/acumulación.
6. **Completamente operativos.** 36 de 36, con estadísticas y efectos especiales.
7. **Competitivo.** 36 disponibles en `f0p8c-1` para nuevas partidas. Ninguna activación retroactiva P8B; no se entregan componentes automáticamente.
8. **Personajes.** Datos base sin cambios. DOLEA usa pipeline común de defensas/heal; VARGAS conserva Resaca/Blackhaus y atribución; JARAMILLO conserva Kilómetros y su cuerpo, con proyectiles de objeto separados visualmente del cigarro.
9. **Determinismo.** Replays duplicados por definición, semillas/rondas de elección, integridad de eventos/snapshots y equivalencia del muestreo 1×/2× a varios FPS.
10. **Estrés.** 7 contra 7, tres ranuras por unidad (guantes ocupan tres), 450 ticks y fuentes periódicas. Métricas de diagnóstico reproducibles con `P8C_METRICS=1`, en la tabla inferior.
11. **Persistencia.** PostgreSQL aislado puerto 55439, servidores de prueba 2582/2583, SIGKILL en combates 2/3/4. Equipamiento/trazas/resultados conservados; no duplicación de liquidaciones. Se compara contra una continuación sin interrupción. Compresión versionada con integridad, sin aumentar límite SQL.
12. **Históricos.** Hashes P7D.2, P6C, P8A y P8B preservados; restauración y rechazo de versiones cruzadas. Codec admite documentos sin compresión.
13. **Validación.** 1180/1180 tests en 78 archivos, ninguno omitido. Typecheck, ESLint, PostgreSQL real, build cliente/servidor, `pnpm check` y `pnpm verify:public` correctos. Se conservan los 1004 tests anteriores y se añaden 176.
14. **Límites.** Las reglas propias no se presentan como copia exacta de TFT. La métrica de heap incluye dos simulaciones, serialización y GC; no es RSS exclusiva por sala. El benchmark de reproducción mide el muestreo lógico, no GPU ni todos los dispositivos. Los replays completos siguen siendo voluminosos en memoria/red; la compresión añadida es del almacenamiento. Los límites del codec fallan de forma explícita si se exceden. El laboratorio P8B permanece histórico; los ensayos P8C usan configuración explícita. No se reinició ni migró el servidor normal.
15. **Estado para P8D.** La ejecución y persistencia están listas para recibir objetos desde una futura entrega autoritativa. Reparto cada tres rondas, elección común de cantidad dos/tres, sorteos independientes, orbes y encuentros NO implementados.

## Medición local de estrés

| Magnitud              | Resultado |
| --------------------- | --------: |
| replayBytes           |  63009795 |
| compressedReplayBytes |   3860647 |
| milliseconds          |       470 |
| heapDeltaBytes        | 166926160 |
| events                |     20507 |
| maxEventsPerTick      |       158 |
| derived               |      3206 |
| maxProjectiles        |         8 |
| maxAuras              |        34 |
| traceBytes            |   6774245 |
| maxSnapshotBytes      |    131718 |
| ticks                 |       450 |
| samples               |       240 |
| p95ms                 |     9.346 |
| p99ms                 |    10.498 |

Dos replays equivalentes caben bajo 128 MiB descomprimidos y 12 MiB en base64 comprimido; el envoltorio SQL conserva el límite previo de 16 MiB. El tiempo depende de la máquina y carga.
