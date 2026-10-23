## Estado vigente — F0-P6B.1 implementado

AD/AP independientes del tipo de daño, coeficientes por estrellas, críticos deterministas con permiso por efecto, fuentes de modificadores y composición de velocidad compatibles con Overtime. Nuevas partidas con valores neutrales, guardados históricos preservados. Inspector ampliado y diagnósticos técnicos. [Contrato](ADVANCED_STATS.md), [informe y validación](F0_P6B1_REPORT.md).

**F0-P6B.2 no iniciado.** Recomendado para una fase futura autorizada: acordar el diseño completo del siguiente personaje, su contenido por estrellas y los límites de acumulación antes de registrarlo. El nombre de la sinergia futura es El Depredador. No se han incorporado VARGAS, sus habilidades ni UPM.

## F0-P6A.1 implementado

Pasivas y escudos visibles desde eventos/snapshots reales, estado compartido de inspector, diagnósticos aislados de sinergias y salto a momentos de la traza. Motor y balance originales conservados. 332 pruebas correctas; capturas y alcance de validación en [informe P6A.1](F0_P6A1_REPORT.md).

**F0-P6B no iniciado.** Los apartados inferiores registran hitos anteriores.

## F0-P6A implementado

Contrato universal activo/pasivo/mixto, sinergias por composición, triggers deterministas, Volumen Sucio, Hortaleza/Llama de Pádel, iconos originales, lateral y ficha conectados. Catálogos antiguos preservados; diagnósticos separados; documentación de ampliación disponible. Ver [informe](F0_P6A_REPORT.md) y [validación](VALIDATION.md).

**F0-P6B no iniciado.** Pendientes: balance definitivo, siguientes personajes autorizados, animación propia de Press de banca y futuras extensiones de efectos. Red, objetos y aumentos siguen fuera de alcance. Los registros inferiores son históricos; sus menciones de F0-P6 no iniciado corresponden al cierre de cada hito.

## F0-P5.3 — tienda y controles implementados

Dock de cinco cartas con sinergias arriba, retratos y precio inferior, marcos originales por coste y controles Game HUD reutilizables. Referencia TFT PC y validación visual de escritorio, sinergias aún provisionales. Véase [informe](F0_P53_REPORT.md). F0-P6 no iniciado.

## F0-P5.2 — completado

Mar de Cristal integrado desde la imagen exacta: contrato reutilizable, calibración proyectiva y herramienta de desarrollo, cuadrícula temporal, pies/profundidad/cámara, preservación de HUD V2 y Arena técnica. 273 tests; cinco tamaños de escritorio, arrastres, recuperación y Overtime comprobados. Véase [informe](F0_P52_REPORT.md).

Pendiente para futuros hitos: formaciones pobladas y validación de rendimiento en más dispositivos, animaciones restantes y contrato de red acordado. No se ha iniciado F0-P6.

## Estado vigente — F0-P5.1 completado

Game HUD V2 implementado: arena dominante, clasificación compacta, banquillo integrado, tienda con retratos, economía junto a compras e inspector flotante de ambos equipos. Validación246tests, cinco viewportsdesktop y recorrido real. F0-P5 conservado. Detalle: [informe](F0_P51_REPORT.md).

**F0-P6 no iniciado.** Pendientes para etapas futuras: contenido y arte definitivo, animaciones restantes, más participantes y validación táctil/multinavegador.

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

## F0-P6B.2

Motor genérico de stacks, eliminaciones atribuidas, progreso de sinergias, mejora/repetición y saltos con ataque inmediato implementado bajo nuevas reglas explícitas. Incluye diagnósticos técnicos y feedback contextual. Evidencias y estado de comprobaciones en [F0_P6B2_REPORT.md](F0_P6B2_REPORT.md).

**Punto de parada:** F0-P6B.3 no iniciada. VARGAS y sus contenidos futuros siguen fuera del catálogo.
