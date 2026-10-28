## F0-P11K · LOCAL

Tooltips por origen, removedor competitivo de un uso inicial con política versionada, retirada de banquillo en combate y persistencia/idempotencia verificadas. Se conserva 32/36: cuatro bloqueos investigados con pendientes explícitos, sin ejecución aproximada. [Informe](F0_P11K_REPORT.md), [política](ITEM_REMOVER_COMPETITIVE.md), [bloqueos](ITEM_BLOCKED_COMPLETION.md). Sin push, Railway o cambios Supabase remoto; no se inicia otra fase.

## F0-P11J · iconos oficiales exclusivamente LOCAL

44 recursos integrados (8 + 36), sin modificar catálogo `f0p11h-18.5-1`, recetas o reglas. Fallback EUNUCO y sustitución global conservados. Assets oficiales excluidos del build público; sin push, despliegue o cambios remotos. [Informe y validación](F0_P11J_REPORT.md). No se inicia otra fase.

## Consolidación F0-P8F · 26-10-2026

P8F consolida la base P8E e incorpora campañas completas de 2/3/4 jugadores, reinicios adicionales y estrés integrado. El resultado final y las limitaciones se registran en el informe; no se inicia una nueva fase ni despliegue.

[Informe, evidencias, comandos y límites](F0_P8F_STABILIZATION_REPORT.md). Los apartados siguientes se conservan como historial.

---

# Estado vigente — F0-P7C.2 (25/10/2026)

F0-P7C.2 implementa salas jugables de 2–4, duelos privados simultáneos, presentación de rival, clasificación provisional y espera global. Validación: 760 pruebas y cuatro clientes de navegador con fixtures explícitos. F0-P7C.3 NO iniciada. Pendientes para una fase posterior: eliminación competitiva completa, espectadores y clasificación definitiva. No hay despliegue ni remoto configurado por esta fase.

[Informe, evidencias y limitaciones](MULTIPLAYER_4P_INTEGRATION.md). Las restricciones de capacidad dos que figuran debajo pertenecen al histórico y quedan sustituidas por este estado.

---

> **Estado F0-P7C.1 (25/10/2026):** motor de rondas para 2–4, lobby real limitado a dos. [Informe](F0_P7C1_REPORT.md). Los apartados de fases anteriores son históricos.

> **Estado actual F0-P7B.2 (24/10/2026):** salas privadas implementadas; partidas funcionales de dos. [Informe](F0_P7B2_REPORT.md). Los apartados anteriores de fases se conservan como histórico.

> **F0-P7B.1-R (24/10/2026): flujo principal real verificado.** Supabase Free conectado; dos cuentas confirmadas por correo, perfiles/RLS, recuperación y partida Colyseus hasta ronda 2 comprobados. Quedan escenarios adicionales de borde detallados en [SUPABASE_REAL_VALIDATION.md](SUPABASE_REAL_VALIDATION.md). F0-P7B.2 no iniciada.

# Actualización F0-P7B.1

F0-P7B.1 implementa cuentas, perfiles e invitaciones; falta validación con Supabase real configurado. F0-P7B.2 NO iniciada: UUID y perfil público quedan preparados para futuros códigos de sala, lista de participantes y estado listo.

Ver [AUTH_SYSTEM.md](AUTH_SYSTEM.md), [PLAYER_PROFILES.md](PLAYER_PROFILES.md), [SUPABASE_SETUP.md](SUPABASE_SETUP.md) y [PRIVATE_REGISTRATION.md](PRIVATE_REGISTRATION.md). El contenido anterior se conserva como histórico.

---

# Actualización F0-P7A

F0-P7A implementa la fundación autoritativa de dos jugadores. La ejecución/validación se documenta en F0_P7A_REPORT.md. F0-P7B NO se inicia. Cuentas, salas privadas definitivas, matchmaking público, persistencia, despliegue, espectadores y reconexión permanecen fuera de alcance.

Véase [arquitectura multijugador](MULTIPLAYER_ARCHITECTURE.md), [protocolo](SERVER_PROTOCOL.md) y [partida autoritativa](AUTHORITATIVE_MATCH.md). Las afirmaciones históricas «servidor no implementado» de las secciones inferiores quedan superadas por esta actualización.

---

# Estado vigente — F0-P6B.5-B implementado

Festival Pop C × Neon Playground integrado en el juego real: tokens, componentes SVG, tipografía, cinco ofertas, nueve plazas, economía, clasificación, sinergias, ficha contextual y herramientas DEV. Mecánicas y recursos originales conservados. Suite: 619 pruebas en 42 archivos, con tipos/lint/build y verificación de exclusión DEV pública.

La fidelidad se compara con las tres composiciones aprobadas, con cinco resoluciones reales y revisión independiente. Se registran las adaptaciones obligatorias de cámara, casillas, estrellas y datos de combate. [Informe de implementación](NEON_PLAYGROUND_IMPLEMENTATION.md).

**F0-P7A no iniciado.** Preparación: componentes y tokens reutilizables, criterios para nuevos personajes/arenas y validación reproducible. Cualquier fase futura requiere encargo separado; no se implementan multijugador, personajes nuevos, objetos ni aumentos.

Las secciones siguientes registran cierres anteriores y no describen el estado actual.

---

## F0-P6B.4 — actualización vigente

Implementada F0-P6B.4: sistema visual común, tienda PC, contadores reales y escala ampliada con fixtures densos. Se detiene aquí; no se inicia otra fase. Persisten pendientes artísticos de clips/apariencias ya declarados en P6B.3. Próximo paso recomendado: jugar partidas con este HUD y priorizar recursos artísticos pendientes sin cambiar balance por esta fase.

Sistema y criterios completos: [GAME_VISUAL_SYSTEM.md](GAME_VISUAL_SYSTEM.md). Las secciones posteriores se conservan como historial; esta actualización prevalece en presentación.

---

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

## Integración F0-P6B.3

Implementada exclusivamente F0-P6B.3: VARGAS, sus habilidades/sinergias, importación nativa2★ y Modo Desarrollador aislado. Los diagnósticos UPM usan miembros ficticios fuera de tienda. No se inicia otra fase. Pendientes artísticos explícitos: apariencias1★/3★ y clips idle/walk/ability/death. Balance provisional; siguiente paso recomendado: revisar partidas de prueba y recibir recursos nativos faltantes antes de cambiar contenido. [Informe](F0_P6B3_REPORT.md).

## F0-P7B.2 — Salas privadas

Implementadas salas privadas, códigos, presencia, anfitrión, Listo e inicio automático de dos cuentas. Lobbies hasta cuatro disponibles; partidas de3/4, matchmaking, persistencia/reconexión y despliegue siguen pendientes. Validación real Vargas–Florin alcanzó ronda8. Punto de parada: **no iniciar F0-P7C**.

Contratos, operación y ciclo: [PRIVATE_LOBBIES.md](PRIVATE_LOBBIES.md). Seguridad y evidencias: [LOBBY_SECURITY.md](LOBBY_SECURITY.md). Transición: [LOBBY_TO_MATCH.md](LOBBY_TO_MATCH.md).

## F0-P7C.1 — Motor de rondas 2–4

F0-P7C.1 implementa motor2–4 y diagnósticos SDK. F0-P7C.2 pendiente: entrada real3/4 y presentación por duelo. F0-P7C.3 pendiente: eliminación competitiva, continuación con sobrevivientes y puestos finales. Sin despliegue ni inicio de la fase siguiente.

Detalles: [emparejamientos](MATCHMAKING_2_TO_4.md), [fantasmas](GHOST_COMBAT.md), [duelos paralelos](PARALLEL_COMBATS.md).

## F0-P7C.3 — ciclo competitivo

P7C.2 queda preservada en 0f2dfaf. P7C.3 implementa eliminación, continuación entre supervivientes, espectador autorizado y final competitivo. Las notas históricas anteriores que los marcaban pendientes quedan superadas por esta sección. No se inicia P7D, reconexión completa, persistencia tras reinicio ni despliegue.

## F0-P7D.1 — Recuperación autenticada (25/10/2026)

F0-P7D.1 implementado: recuperación autenticada mientras vive el proceso, sustitución de socket, lobby, fases, espectador, final y reintentos limitados. F0-P7D.2 no iniciado: persistencia tras reinicio, almacenamiento durable y restauración quedan pendientes.

Esta sección sustituye las limitaciones históricas de «sin reconexión». Especificación: [RECONNECTION_SPEC.md](RECONNECTION_SPEC.md). Flujo, contratos y límites: [SESSION_RECOVERY.md](SESSION_RECOVERY.md).

## F0-P7D.2 — persistencia autoritativa (2026-10-25)

F0-P7D.2 implementa persistencia y recuperación de proceso con PostgreSQL, más verificación real aislada. F0-P7D.3 permanece sin iniciar. Escalado, historial permanente, migración de snapshots y respaldo de PostgreSQL no forman parte de esta entrega.

Detalle vigente: [arquitectura](PERSISTENCE_ARCHITECTURE.md), [recuperación](MATCH_RECOVERY.md) y [operación](PERSISTENCE_OPERATIONS.md). Esta sección sustituye las limitaciones históricas de persistencia anteriores para el servidor normal.

## F0-P6C · JARAMILLO

F0-P6C incorpora JARAMILLO y los contratos de proyectiles compuestos y Kilómetros persistentes. Quedan como recursos artísticos futuros: confirmación de apariencia nativa, evoluciones 2★/3★ y animación exclusiva Ability. No se inicia otra fase. Evidencias y límites: F0_P6C_REPORT.md.

## F0-P8A · Componentes y objetos (26/10/2026)

F0-P8A prepara los contratos universales de componentes, recetas, inventario y equipo; autoridad, fusión/venta y persistencia incluidos. P8B queda pendiente: contenido original definitivo, valores, efectos ejecutables, reparto y presentación autorizados en una fase posterior. Las recetas competitivas permanecen sin resultado y la entrega automática desactivada. [Informe de fase](F0_P8A_REPORT.md).

## F0-P8B · Catálogo completo (26/10/2026)

Completado: ocho componentes con cifras, 36 recetas únicas, estadísticas y operaciones de diseño, capacidades, descripciones, accesibilidad e iconKeys, versiones de partida y compatibilidad histórica. Competitivo completo apagado; laboratorio habilita solo vida pura. Reparto continúa apagado.

Siguiente paso exacto: **F0-P8C**, resolver decisiones pendientes y construir/probar ejecución genérica de efectos con fuentes y límites de recursión antes de habilitar objetos íntegros. P8D mantiene el reparto futuro. Esta fase no inicia ninguna de ellas. [Informe](F0_P8B_REPORT.md).


## Actualización F0-P8C · 26-10-2026

F0-P8C implementa ejecución real de los 36 objetos, nuevo catálogo para partidas nuevas y persistencia comprimida. F0-P8D NO iniciado: reparto cada tres rondas, cantidad común dos/tres y tipos independientes por jugador siguen pendientes. No hay entrega automática de componentes.

Detalle: [ejecutor](ITEM_EFFECT_EXECUTOR.md), [decisiones](ITEM_EFFECT_EVENT_ORDER.md) y [matriz de pruebas](ITEM_EFFECT_TEST_MATRIX.md).


## F0-P8D · 26-10-2026

F0-P8D: reparto autoritativo cada tres rondas integrado. F0-P8E queda pendiente: interfaz completa de objetos. Sin orbes ni encuentros.

Contrato, recuperación y límites: [ITEM_DROP_DESIGN](ITEM_DROP_DESIGN.md).

## FLORIN y splash arts — 26/10/2026

Integración FLORIN + splash arts implementada en rama aislada `codex/florin-splash`. Originales de Idle/Walk/Ability/Death de Florin siguen pendientes; se entregan fallbacks declarados. Balance provisional, no se inicia reparto de componentes ni otra fase. Integración con P8D requiere revisar/combinar ramas explícitamente.


## Consolidación P8D + FLORIN — 2026-10-26

P8D y FLORIN consolidados en rama dedicada. P8E sigue pendiente y no se ha iniciado.

Versiones, fingerprints, conflictos, pruebas, capturas y límites: [INTEGRATION_P8D_FLORIN.md](INTEGRATION_P8D_FLORIN.md).


## F0-P8E · 26-10-2026

Interfaz P8E implementada en rama aislada: inventario, 44 iconos provisionales, recetas, clic/arrastre, equipo de tres ranuras y avisos de reparto. Las notas anteriores de P8E pendiente son históricas. El cierre depende del veredicto final y la validación registrados por el responsable en VALIDATION; esta entrada no adelanta un resultado de pruebas. No se inicia otra fase. Queda como mejora futura sustituir los iconos provisionales por arte personal definitivo, conservando las claves del [manifiesto](ITEM_ICON_MANIFEST.md).

## F0-P9A — infraestructura remota privada

Preparación local: servidor único HTTPS/WSS, configuración separada, proxy, health/readiness, observabilidad sin datos privados, laboratorio TLS y procedimientos de actualización/rollback. Sin publicación ni cambios reales en Supabase. Validación exacta en [informe P9A](F0_P9A_REPORT.md).

Siguiente F0-P9B: autorizar proveedor/dominio/presupuesto, aplicar configuración remota revisada y ejecutar una prueba supervisada desde dos ordenadores/redes distintas. La conectividad loopback de P9A no sustituye esa prueba.


## F0-P9A.1 — Memoria y retención

F0-P9A.1 completado localmente: 1342 pruebas, partida normal de cuatro jugadores (15 min 21 s), ocho consecutivas y retención verificada. P9B y el despliegue remoto permanecen fuera de alcance y requieren autorización posterior. Persisten picos activos de memoria y event loop documentados.

[Perfil de memoria](SERVER_MEMORY_PROFILE.md) · [Política de retención](MATCH_RETENTION_POLICY.md) · [Mediciones y validación](SERVER_PERFORMANCE_BASELINE.md).


## F0-P9B-R0 — Railway Hobby

F0-P9B-R0 prepara Railway Hobby localmente. P9B (contratación, publicación, migraciones/URLs remotas y ensayo entre ordenadores) continúa separado y requiere autorización. No se habilita escalado horizontal ni se declara carga abierta soportada.

[Despliegue](RAILWAY_DEPLOYMENT.md) · [Variables](RAILWAY_ENVIRONMENT.md) · [Operación](RAILWAY_OPERATIONS.md) · [Preflight](RAILWAY_PREFLIGHT.md).


## F0-P9B-R1 — ejecución autorizada (26-10-2026)

F0-P9B-R1: infraestructura real desplegada y validada (HTTPS, readiness, WSS), dos migraciones aplicadas. Piloto técnico detenido supervisadamente para no dejar consumo sin control. C y campaña humana de 2–4 jugadores pendientes. F0-P10A sigue intacta y aislada en otro worktree; no incluida.

[Informe y evidencias](RAILWAY_FIRST_DEPLOYMENT_REPORT.md).

## C — actualización autorizada y verificada (26-10-2026)

C ya está completada: Site URL `https://tft-eunuco-private.up.railway.app/` y redirect HTTPS exacto añadidos; `http://127.0.0.1:4173/` conservado como redirect. Comparación de 243 campos Auth: solo site_url y uri_allow_list cambiaron. SMTP, usuarios, contraseñas y SQL sin modificaciones. Railway permanece detenido (REMOVED), sin nuevo despliegue y sin integrar P10A. Las menciones anteriores a C pendiente describen el cierre previo de A/B. [Verificación C](evidence/p9b-r1/auth-c-verification.json).

## Dominio y pool versionado — 26-10-2026

Dominio asignado: `tfteunuco.up.railway.app`; Railway permanece retirado. Auth y variables canónicas verificados, sin despliegue. Véase [operación de dominio](RAILWAY_DOMAIN_CHANGE.md).

Nuevas partidas de esta rama: economía `tft-set18-pool-1`, copias por identidad 30/25/18/10/9. Las partidas históricas conservan su configuración y fingerprint. La release online continúa con su economía anterior; publicar este cambio requiere autorización específica. [Referencia](CHAMPION_POOL_REFERENCE.md) y [contabilidad, persistencia e integración futura de P10A](CHAMPION_POOL_MIGRATION.md).

## F0-P10A · reconciliación del roster

P10A reconcilia exclusivamente roster/afiliaciones y presentación. Quedan pendientes el diseño de treinta personajes, efectos de once colectivas nuevas, Jew/Todo al rojo y escalones superiores. No se inicia ninguna fase posterior, despliegue ni push.
