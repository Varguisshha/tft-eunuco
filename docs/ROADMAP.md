# Roadmap

## F0-P1 — completado y preservado

Workspace, geometría axial, tablero7×8, preparación, arrastre/selección/teclado/zoom, contratos y sprites provisionales. 35 pruebas originales. Auditoría repetida antes de P2; commit base `279be4d`.

## F0-P2 — completado y preservado

Motor puro determinista, A\*, reservas, targeting, estadísticas/daños, maná, efectos y pasiva inicial, cuatro perfiles ficticios, protocolo v2, reproductor Phaser y controles. Arena interna conservada. Reglas en COMBAT_SPEC.md, protocolo en COMBAT_EVENTS.md y evidencia ejecutada en VALIDATION.md.

## F0-P3 — completado y validado

Economía, pool limitado, tienda5/bloqueo/renovación, banquillo9, movimiento/intercambio, venta, XP/niveles, estrellas, fases, rival determinista y Partida local independiente. Guardado local con replay y Arena preservada. Validación: 118 pruebas correctas (73 anteriores intactas), typecheck/lint/build y recorrido real de cuatro rondas con interés, guardado y Arena de referencia. Evidencia en VALIDATION.md. Hito P2 preservado en `42f70bd`; P3 preservado en `4302eec`.

## F0-P3.1 — completado y validado

Overtime determinista, protocolo3, doble derrota, vida y registro de daño mínimos, guardado versionado e indicadores compartidos. 161 pruebas correctas, typecheck/lint/build/formato y recorrido real de Arena/Partida local completados. Pausa301, victoria357, timeout450, eliminación mutua3 y doble derrota con oro/vida sin duplicación tras recargar. Detalles en VALIDATION.md. Preservado antes de P4 en `1079713`, sobre el hito P3 `4302eec`.

## F0-P4 — completado y validado

Partida local convertida en HUD de viewport: tablero adaptativo protagonista, dos participantes locales, inspector contextual, banquillo9 y tienda5, economía compacta y registros en diálogo. Arena técnica independiente preservada. Verificación visual real en 1280×720, 1366×768, 1440×900, 1920×1080 y 2560×1440, sin overflow del documento ni controles esenciales fuera del viewport. 172 pruebas, tipos/lint/build/formato correctos; interacciones, guardado previo, rondas, overtime en tick 352 y resultados comprobados. Evidencia y límites en VALIDATION.md; estructura en GAME_UI_SPEC.md. P4 fue preservado antes de P5: módulos identificables en `b71448c`; archivos compartidos junto con P4.1 en `ffa9265`.

## F0-P5 — completado y validado

Coordinador/reloj puro, fases automáticas30/45máximo/5s, autoridad de plazos, una simulación por combate, liquidación retenida, guardado de restante/traza/posición, migración no destructiva, eliminación local y depuración aislada. 227 pruebas (200 previas intactas), check y formato; recorrido real con DOLEA, recargas, doble derrota, eliminación, Arena y cinco tamaños. Ver VALIDATION, MATCH_CLOCK_SPEC y AUTOMATIC_ROUNDS.

## Siguiente paso recomendado, sin iniciar F0-P6

Acordar el alcance y contrato del siguiente hito de autoridad remota: identidad de comandos, publicación de snapshots, reconexión y persistencia de servidor. El puerto está preparado, pero no se ha instalado Colyseus ni implementado red. También queda pendiente producir las animaciones todavía cubiertas por fallbacks; P5 no altera esos assets.

## Dirección de producto futura

La Arena de pruebas se conserva junto a la Partida local provisional. Su futura evolución artística debe tener tablero protagonista; tienda de cinco personajes; banquillo de nueve; oro/intereses; nivel/XP; etapa/temporizador; clasificación; sinergias activas; panel contextual compacto. Evitar trasladar el aspecto administrativo del inspector al jugador.

Dirección artística: pixel-art retro moderno original, terreno con sombras, volumen e iluminación, animaciones consistentes y VFX modernos integrados. Referencias generales de autobattlers/RPG clásicos, sin copiar identidad ni assets de TFT. Futuro roster inspirado en amigos reales, con arte y nombres originales y producción mediante SPRITE_SPEC; en P3 solo personajes ficticios.

## Fases posteriores sin implementar

Servidor Node/Colyseus, identidad y emparejamientos de cuatro jugadores, recepción ordenada de lotes, buffering/reconexión, economía online, sinergias activas, roster definitivo, cuentas/persistencia Supabase, despliegue y observabilidad. Ninguna dependencia, cuenta o infraestructura nueva se ha instalado en P3. Sin compromisos de calendario.

## F0-P4.1 — completado y validado

Contrato universal por evolución/estado, recursos parciales, resolver central, pipeline reproducible, dos Attack reales de8frames,3★ con apariencia2★, retratos y muestreo por reloj de combate. Roster nuevo versionado con DOLEA, guardados previos preservados, inspector y duelos de Arena. 200 pruebas correctas, check/formato y verificación visual en cinco tamaños. Ver VALIDATION.md para pruebas y límites. P4.1 fue preservado en `ffa9265` antes de iniciar P5; la automatización se incorpora en el hito P5 descrito arriba.
