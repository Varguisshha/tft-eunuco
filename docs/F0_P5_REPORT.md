# Entrega F0-P5

1. **Arquitectura:** `MatchClock` y `LocalMatchCoordinator` puros en game-core, `TimeSource` inyectable; host de navegador separado, adaptador LocalSession y puerto MatchCoordinator preparado para snapshots/intenciones remotos.
2. **Estados:** not_started, preparation, combat, resolution y finished; ready/running/paused/stopped y bandera de recuperación. Crear no inicia ni abre la tienda.
3. **Transiciones:** deadline cierra preparación y captura formación; una simulación; reproducción hasta combat_end+cola; liquidación única; deadline de resolución inicia la siguiente ronda. CeroHP finaliza tras pagar. Tablero vacío pierde sin bloquear el ciclo.
4. **Duraciones:**30s preparación, hasta45s lógicos de combate (Overtime30–45),600ms de cola visual y5s resolución. El HUD de combate sigue la reproducción. Pestaña suspendida no amplía el plazo de compra.
5. **Recuperación:** clave/version P5 independiente, estado económico completo, reloj/IDs y traza comprimida con posición. Tiempo congelado durante cierre; recuperación sin simular ni cobrar. Migración explícita P3.1/P4/P4.1 preservando clave/catálogo anteriores. P3 pre-Overtime identificado y conservado aparte.
6. **Depuración:** sesión/clave separadas, pausa, avance, fases8/2s, checkpoint de repetición, recarga simulada y consulta de deadlines/liquidaciones. No accesible en partida normal ni a través del puerto de intención remota.
7. **Tests:**227 pruebas (200 anteriores intactas y27 nuevas). Tipos/lint/build/formato y pnpm check. Fuentes de tiempo falsas, cobertura de deadlines, todas las fases, recarga, idempotencia, eliminación, semillas, pool, Overtime, DOLEA y Arena.
8. **Visual:** recorrido real hasta ronda4 automáticamente; recargas en combate/resolución y simulada en preparación; eliminación en13 mediante avance técnico; cinco tamaños desktop sin scroll; panel final completo a1280×720. Artefactos y límites precisos en VALIDATION.md.
9. **DOLEA:** compra/fusión2★/colocación/combate/recuperación reales;1★ y3★ en Arena y Overtime302. Mismos ocho frames de ataque1/2★ y fallbacks anteriores. Pipeline y originales sin cambios.
10. **Incidencias/límites:** se corrigió compresión de la recompensa en la columna lateral. Continúa el aviso de chunkPhaser grande. Autoridad local sin autenticación, red ni multiventana; cierre abrupto puede perder hasta500ms de checkpoint, y suspensión ralentiza reproducción visual. Sin clasificación definitiva del rival.
11. **Git:** P4 identificable `b71448c`; P4.1+archivos compartidos `ffa9265`. P5 se preserva en un commit local propio tras validar. Sprites originales/duplicados fuera del índice; derivados incluidos desdeP4.1. Sin remoto ni push.
12. **Siguiente paso recomendado:** acordar el contrato y alcance de autoridad remota/reconexión del siguiente hito. No se ha iniciado F0-P6 ni instalado Colyseus.

Especificaciones: [MATCH_CLOCK_SPEC](MATCH_CLOCK_SPEC.md), [AUTOMATIC_ROUNDS](AUTOMATIC_ROUNDS.md), [ROUND_FLOW](ROUND_FLOW.md). Evidencia detallada: [VALIDATION](VALIDATION.md).
