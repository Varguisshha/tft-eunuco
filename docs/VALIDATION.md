# Validación F0-P4.1 — 23 de octubre de 2026

## Base y comprobaciones ejecutadas

Auditoría previa completa:172 tests en18 archivos, TypeScript estricto, lint y build correctos. Los cambios pendientes correspondían a F0-P4; `Sprites/` era aporte del usuario. F0-P5 no había comenzado. No se modificaron los172 tests existentes para acomodar DOLEA.

Resultado final: **200 tests en21 archivos**, `pnpm check` correcto (typecheck, lint sin warnings, suite completa y build). `pnpm format:check` y `git diff --check` correctos. La importación se repite en tests en un directorio temporal, conserva bytes de Attack al añadir Walk y comprueba hashes de originales. Node/sharp procesó16 fuentes;16 duplicados exactos se excluyeron sin eliminarlos. Advertencia de tamaño del chunk Phaser conservada (1367kB,357kB gzip); aplicación432kB,131kB gzip. No es una regresión nueva de carga de Phaser.

Pruebas nuevas: contrato con estados opcionales, prioridad de recursos/fallbacks/evoluciones/genérico, metadatos inválidos, cobertura, muestreo de8frames e impacto exacto, loop y muerte, clasificación/orden físico de fuentes, dimensiones/transparencia/hashes, importación reproducible y nuevo Walk, roster/pool/probabilidades, compras/fusión2/3★/posición/selección/venta, guardados históricos/nuevos/tamper, Arena1/2/3★/repetición/avance en pausa/muerte, interrupción por movimiento/habilidad/cancelación e inmutabilidad de eventos bajo muestreo visual.

## Navegador real

IAB con build de producción en4173. Sin errores ni warnings de consola en las pestañas de prueba revisadas.

- Guardado anterior en127.0.0.1: recuperado en ronda6, oro15, nivel4, HP96/72 y formación existente. Mantiene el catálogo histórico y sus ofertas. No se sobrescribió con una partida nueva.
- Nueva partida en origen separado localhost, semilla360: tienda inicial contiene DOLEA en ofertas2/4/5. Compra1★, arrastre real del banquillo al tablero; otras dos compras producen2★ con el mismo apoyo/posición y selección; cambio visible de chándal a tirantes, vida1080/ataque72.
- Zoom aumentado/restaurado; combate completo ganado en tick70: oro4→7, Florin100→96. Recarga de resolución mantiene oro7 y daño aplicado una sola vez. Siguiente ronda conserva formación; retirada al banquillo y venta de2★ devuelve6oro (7→13).
- Arena: cargas1/2/3★, apariencias1/2/2 y perfiles escalados (3★ vida1944/ataque129). Duelo3★ llega a450 con doble derrota. Pausa inicial en tick2. Escenario de muerte sintético: muertes en3, siguiente paso visual mantiene Death y muestra desvanecimiento, sin volver a Idle.
- Overtime DOLEA: pausa real en411,3,9s restantes, sprites/barras presentes. El reloj permanece detenido mientras se inspeccionan recursos; al reanudar termina en450 con doble derrota.
- Inspector: recorridos los8frames de1★ y los8de2★, imágenes capturadas. Walk3★ resuelve aAttack2★; Idle/Ability/Death también seleccionados. Las hojas derivadas completas se inspeccionaron visualmente: pies alineados, proporciones y brazos conservados, transparencia y nearest-neighbor.
- Apariencia3★ comprobada visualmente en Arena; la fusión económica hasta3★ se verifica mediante pruebas automatizadas de nueve compras, no se afirma haber conseguido nueve copias en una partida manual.
- Vargas y Florin aparecen como participantes, insignias V/F y nombres en el registro. Los cuatro personajes ficticios siguen en la reserva.

## Tamaños de escritorio con DOLEA desplegado

| Viewport  | Buffer y tamaño CSS del canvas | Desbordamiento de documento |
| --------- | ------------------------------ | --------------------------- |
| 1280×720  | 888×322                        | No                          |
| 1366×768  | 974×370                        | No                          |
| 1440×900  | 988×462                        | No                          |
| 1920×1080 | 1382×588                       | No                          |
| 2560×1440 | 2022×948                       | No                          |

En todos: nueve plazas de banquillo, tienda y controles visibles, tamaño de documento igual al viewport. DPR real1; no se afirma prueba nueva en monitorDPR2. También se observó el flujo adaptable de ventana estrecha (~794px), con scroll vertical permitido.

Evidencias locales ignoradas por Git: `artifacts/f0p41-1920x1080.png`, las otras cuatro resoluciones, `f0p41-viewports.json`, `f0p41-local-star1.png`, `f0p41-local-fusion.png`, `f0p41-dolea-star2.png`, `f0p41-dolea-star3.png`, `f0p41-death.png`, `f0p41-overtime.png`, `f0p41-inspector.png` y16capturas `f0p41-starN-frameN.png`.

## Límites y estado final

Solo Attack dispone de recursos reales. Idle/Walk pueden mostrar golpes; Death es Attack con desvanecimiento. No hay animación3★ propia. Impacto3/6 y estadísticas son provisionales. Las fuentes contienen variación de pose/tamaño y alfa parcial; el pipeline limpia alfa<=8 y alinea apoyos, no reconstruye anatomía ni añade inbetweens. El modo de movimiento reducido congela los loops decorativos Idle/Walk de sprites reales; mantiene ataques informativos y desvanecimiento. No se ha probado una preferencia del SO real, solo su ruta de implementación.

Demostración final enlocalhost: semilla360, ronda1, oro4, DOLEA2★ desplegado y seleccionado, listo para combatir. Guardado anterior127.0.0.1 preservado. CambiosP4 yP4.1 locales sin commit nuevo; fuentes originales intactas, sin remoto ni push. F0-P5 no iniciado.

---

# Validación F0-P4 — HUD de partida

Ejecutada el **23 de octubre de 2026**. Los hitos anteriores quedan preservados más abajo.

## Auditoría y preservación

Leídos arquitectura, decisiones, roadmap, validación y especificaciones existentes; inspeccionados LocalGame, LocalSession, GameCanvas, BoardScene y CombatRenderer. `pnpm check` inicial confirmó **161 pruebas**, TypeScript, ESLint y build correctos. Formato y diff limpios. Los 38 archivos pendientes correspondían a F0-P3.1 y se preservaron en **1079713**, `feat: preserve verified F0-P3.1 overtime and round resolution`. Sin remoto ni push.

## Resultado automatizado

`pnpm check`: **172 pruebas en 18 archivos, todas correctas**, TypeScript strict, ESLint sin avisos y build de producción. Las 161 pruebas anteriores no se modifican; nueve nuevas cubren encuadre y conversión CSS/render/mundo para DPR 1/1,25/2, zoom y límites de densidad; dos prueban disponibilidad de compra con banquillo lleno/fusión y falta de oro, sin mutar el estado. `pnpm format:check` y `git diff --check` correctos.

No hay cambios en packages, configuración económica, probabilidades, XP, motor, overtime, contratos de guardado, manifests ni lockfile. Aplicación419,77kB /127,06kB gzip; CSS37,23 /8,67kB. Persiste el aviso conocido del chunk Phaser1367,08 /357,00kB; no se oculta.

## Matriz real de navegador

Build local en navegador integrado. Viewports emulados explícitamente, DPR real observado1. Medidas de DOM y revisión de las capturas, con nueve casillas, cinco ofertas y todos los botones principales dentro del viewport:

| Viewport  | Documento (ancho×alto) | Canvas CSS | Resultado                                      |
| --------- | ---------------------- | ---------- | ---------------------------------------------- |
| 1280×720  | 1280×720               | 888×322    | Sin scroll de documento; planificación visible |
| 1366×768  | 1366×768               | 974×370    | Sin scroll de documento; planificación visible |
| 1440×900  | 1440×900               | 988×462    | Sin scroll de documento; planificación visible |
| 1920×1080 | 1920×1080              | 1382×588   | Sin scroll de documento; planificación visible |
| 2560×1440 | 2560×1440              | 2022×948   | Sin scroll de documento; planificación visible |

La matriz incluye venta, XP, renovación, bloqueo e inicio de combate, además de tienda/banquillo. No se usa overflow:hidden en documento. También se midió resolución/doble derrota a1280×720: documento1280×720. Las capturas completas tienen la misma altura que el documento; no representan un montaje de zonas con scroll. El backend de captura de viewport recortaba algunas imágenes grandes; se repitieron con captura completa y se comprobaron sus dimensiones.

Evidencia local, ignorada por Git: `artifacts/f0p4-1280x720.png`, `f0p4-1366x768.png`, `f0p4-1440x900.png`, `f0p4-1920x1080.png`, `f0p4-2560x1440.png` y `f0p4-viewports.json` (todos bajo artifacts/). Estados: `f0p4-combat.png`, `f0p4-overtime.png`, `f0p4-double-loss.png`, `f0p4-resolution.png`.

## Interacciones ejecutadas

- Recuperado el guardado real de P3.1: ronda4,18oro, nivel3, XP4/6, vida96/88, K-01 de2★ en tablero. Misma clave de guardado y replay, sin migración ni recreación.
- Compradas K-01 y tres V-02; fusión automática V-02 a2★ en banquillo. XP por4oro lleva a nivel4, XP2/10. Renovación por2oro y venta de K-01 por1oro correctas. Falta de oro deshabilita compra de XP.
- Arrastres reales banquillo→tablero y tablero→banquillo; reordenación entre casillas y swap K-01/V-02 conservando ambos. Drop a mitad rival rechazado sin perder unidad. Colocación por selectores y por flechas/Intro; retirada mediante casilla vacía. Repetidos movimiento y compra tras extraer Bench/Shop.
- Bloqueo conserva ofertas y huecos de ronda4 a5; desbloqueo correcto en ronda6. Zoom115% permanece al seleccionar y100% restablece encuadre. Redimensionamiento entre los cinco tamaños conserva la partida.
- Combate en pausa: tick2 y44,8s, barras/efectos visibles y economía deshabilitada. Ronda4: victoria tick54, +6oro→9, vida96/80. Ronda5: victoria tick86, +7oro→16, vida96/72 y racha2. Recarga/continuación conserva resultado, oro y vida sin nuevo pago.
- Escenario local adicional bajo origen localhost, separado del guardado principal: K-01 de2★, victorias tick88 en rondas1/2; ronda3 alcanza overtime. Pausa comprobada en **tick352,9,8s**, indicador ámbar en cabecera; observación posterior conserva tick/contador. Reanudar a×2 termina en **doble derrota, tick450,18oro, vida96/88 y racha0**. La primera captura intentada a×2 llegó después del final; se repitió a×1 y esa repetición proporciona la evidencia de overtime.
- Arena independiente: duelo4×4, semilla42, ×2 → **victoria ámbar tick142**. Repetición y pausa tick5 verificadas. Escenario técnico «Tiempo agotado» cargado por selector → **doble derrota tick450** con indicador overtime. Los controles técnicos, semilla, preparación, reserva e inspectores siguen presentes.
- Registro de partida abierto, desplegado y cerrado con Escape; el foco vuelve al botón de apertura. Consolas de ambas pestañas consultadas: **cero errores y cero avisos**.
- Guardado principal al cierre: ronda6 en preparación,15oro, nivel4, XP6/10, vida96/72, racha2; K-01 de2★, V-02 de2★ y M-04 en tablero, K-01 de1★ en banquillo3. Tienda desbloqueada. No se automatizó el avance.

## Incidencias corregidas y límites

Se corrigieron la anchura intrínseca del canvas que ensanchaba su pista de grid, una llamada antigua que restablecía el zoom al sincronizar selección y los hijos de casilla que interceptaban el último movimiento de un drop horizontal. El inspector vuelve arriba al cerrar colocación o cambiar selección. Una fixture nueva de compra usaba IDs que colisionaban con nextEntity: corregida usando IDs de propiedad distintos, sin modificar el motor.

A720/768px de altura el inspector y los detalles de recompensa pueden necesitar scroll interno para información secundaria; venta, tienda, banquillo y decisiones económicas permanecen visibles. Bajo1100px de ancho se permite scroll del documento para conservar operaciones. No se validaron móviles táctiles, otros motores de navegador, auditoría WCAG completa ni DPR real distinto de1; DPR fraccionario y2 están cubiertos por tests de geometría, no por una afirmación de prueba visual en otro monitor. No se ejecutó una partida manual con nueve casillas ocupadas: el rechazo y excepción de compra se verifican en integración del adaptador UI con el core.

F0-P4 se entrega como cambios locales sobre `1079713`, sin push. Durante la revisión final apareció una carpeta `Sprites/` sin seguimiento que no pertenece a estos cambios; se dejó intacta y sin añadir a Git. **F0-P5 no iniciado**: reloj externo preparado como contrato visual, sin temporizadores automáticos.

---

# Validación F0-P3.1 — Overtime y doble derrota

Ejecutada el **23 de octubre de 2026** en macOS, Node 26.9.0, pnpm 11.25.0. Los registros de hitos anteriores se conservan más abajo.

## Auditoría y preservación

Se inspeccionó el repositorio y se leyeron COMBAT_SPEC, COMBAT_EVENTS, ECONOMY_SPEC, ROUND_FLOW, DECISIONS y VALIDATION antes de editar. El comportamiento anterior era winner null por timeout300 o eliminación mutua; economía reiniciaba racha y pagaba base/interés/XP, sin vida de jugador. `pnpm check` inicial confirmó **118 pruebas en12 archivos**, typecheck/lint/build correctos.

Los36 archivos pendientes correspondían al trabajo P3 conocido, sin cambios ajenos detectados ni coincidencias en el escaneo de patrones de credenciales. No es una garantía universal de ausencia de secretos. Hito preservado en **4302eec**, `feat: preserve verified F0-P3 local economy and progression`. Sin remoto ni push. P3.1 se entrega como cambios locales revisables sobre ese commit.

## Comprobación automatizada final

`pnpm check`: **161 pruebas en16 archivos, todas pasan**; TypeScript strict, ESLint sin avisos y build de producción correctos. `pnpm format:check` y `git diff --check` correctos. Sin dependencias nuevas ni modificación de manifests/lockfile; no era necesario reinstalar.

Se conservan las118 pruebas previas y se añaden43. Solo cambia un archivo de pruebas anteriores, `combat/engine.test.ts`, por el contrato nuevo:

- Validación y lotes pasan de protocolo2/reglas f0p2-1 a protocolo3/reglas f0p3.1-1. Versión rechazada ahora4 y límite inválido451, en vez de3/301.
- Resultados vacíos, timeout y eliminación mutua mantienen winner/reason/tick y añaden outcome double_loss.
- El límite máximo pasa de300 a450. Dos fixtures de efectos que ejecutaban su impacto en el antiguo tick terminal se amplían de2→3 y3→4: el nuevo terminal es exclusivo de comprobación. Se mantienen las mismas aserciones de área, escudos y HP en sus ticks originales; no se eliminan ni relajan pruebas.
- El resto de archivos de pruebas previas permanece sin modificaciones. Los schemas v2 archivados se compararon byte a byte con el hito P3: idénticos.

Nuevas pruebas cubren: inicio exacto299/300, emisión única y orden0, final449/450 sin efectos extra, extremos e interpolación monótona, configuración inválida, amplificación física/de habilidad, proyectil lanzado298 que impacta300, descarte de proyectiles debidos450, cadencia1,5 y máximos configurables, curación/escudos nuevos reducidos y capas existentes intactas, victoria en overtime, eliminación mutua, double_loss por límite, contratos v2/v3, bytes reproducibles, daño por tramo/estrellas, ambos participantes perdedores, HP mínimo0, rachas positivas/negativas reiniciadas, ingresos/XP/daño únicos, pool conservado y continuación a0HP.

Integración de una historia real: comprar y combinar K-01 a2★, disputar dos victorias, tercera ronda con el rival existente hasta timeout450; guardar en overtime, restaurar, liquidar, recargar resolución y avanzar. Replay reconstruye exactamente economía y vida. Playback prueba pausa/transición/contador, ×2, saltos de frame, repetición sin duplicación y limpieza al volver a preparación.

Build final: aplicación **415,61 kB /125,63 kB gzip**, CSS **24,58 /6,17 kB**. Aviso conocido de Phaser **1367,08 /357,00 kB** permanece visible; no es fallo del build ni se afirma haber optimizado esa descarga.

## Navegador real

Producción local `http://127.0.0.1:4173`, navegador integrado, viewport805×827. Interacción por controles reales, sin inyección de estado:

1. Duelo original4×4, semilla42, ×2: victoria ámbar en **tick142**, sin overtime.
2. Escenario técnico de resistencia: victoria jade durante overtime, **tick357** a×1. Repetir semilla a×2 conserva resultado/tick.
3. Escenario técnico de tiempo agotado a×1: pausa en **tick301**, contador **14,9s**, indicador Phaser y contador DOM visibles. Una observación posterior conserva tick/contador y la transición congelada. Reanudar a×2 termina en **double_loss, tick450**, contador0.
4. Escenario de eliminación mutua: **double_loss, tick3**, sin overtime.
5. Partida local nueva, semilla42: comprar K-01, colocar por controles, comprar segunda copia, renovar y comprar tercera. Fusión2★ en tablero; saldo5.
6. Ronda1: victoria tick88, +3oro→8, vida propia100/rival96. Ronda2: victoria tick88, +5oro→13, racha2, vida100/92.
7. Ronda3: overtime real, pausa en **tick391**, contador5,9s. Guardado mantiene banco13, racha2 y cuatro entradas de vida. Recargar/continuar reinicia únicamente reproducción desde0; saldos intactos.
8. Final de ronda3: **doble derrota por tiempo, tick450**. Base4 + interés1 sobre13 + victoria0 + racha0 = **+5oro→18**; +2XP, racha0. Daño a ambos: base2 + supervivientes2 =4; vida jade**96**, ámbar**88**. Seis entradas de vida y17 de oro.
9. Recargar resolución: **18oro, 96/88HP, racha0, tick450** y mismos registros, sin nuevo pago/daño. Avanzar a preparación de ronda4 conserva saldos y renueva tienda. CompraK-01 por1 lleva saldo17/banquillo1; venta devuelve saldo18/banquillo0, sin alterar vida. Partida queda preparada en ronda4.
10. Consola consultada después del recorrido: **cero errores y cero avisos**.

Capturas locales ignoradas por Git: `artifacts/f0p31-overtime.png`, `artifacts/f0p31-timeout.png`, `artifacts/f0p31-local-overtime.png`, `artifacts/f0p31-double-loss.png`. Las primeras capturas de Arena se tomaron antes de actualizar su texto de cabecera al hito P3.1; muestran las reglas nuevas verificadas. La captura final local corresponde al build con resultado y daño explícitos.

## Incidencias y limitaciones

Las primeras ejecuciones detectaron expectativas antiguas de versión/resultado y fixtures cuyo impacto coincidía con el límite; ajustes justificados arriba. Typecheck señaló filtros de eventos sin narrowing suficiente en pruebas nuevas y un import directo de Zod desde core; corregidos utilizando los contratos compartidos y filtros tipados, sin añadir dependencias. Durante la comprobación de UI, una espera de selector caducó antes de los30segundos y un intento de pausa llegó después del resultado; se repitió con el escenario de45segundos a×1 y se verificó la pausa301. No se declara que esos intentos fallidos validasen el comportamiento.

Guardados P3 preservados bajo su clave antigua; no se migran ni reproducen con reglas nuevas. V2 se puede validar como formato histórico, no ejecutar en el motor v3. La vida del rival está conectada, su economía/racha siguen sin existir porque continúa siendo una formación de pruebas. CeroHP permite seguir: no hay eliminación global, clasificación ni fin automático. Historial crece sin compactación; no hay sincronización entre pestañas ni autoridad online. El combate se calcula localmente para reproducción y para liquidación, como en P3.

No se ejecutaron matriz multinavegador, dispositivos táctiles reales, auditoría WCAG completa ni E2E persistente. Verificación visual manual y pruebas unitarias/integración descritas arriba. No se afirma balance definitivo ni medición fotograma a fotograma de la transición. **F0-P3.1 validado; F0-P4 no iniciado.**

---

# Registro histórico de validación F0-P3

Ejecutada el **22 de octubre de 2026**, macOS, Node 26.9.0, pnpm 11.25.0. Los registros P2 y P1 inferiores se conservan como evidencia histórica.

## Auditoría y Git

Antes de editar se leyeron los siete documentos solicitados, se revisaron los 33 archivos locales del hito P2 y se ejecutó `pnpm check`: **73 pruebas en 10 archivos**, typecheck, lint y build correctos. No se detectaron trabajos ajenos, archivos innecesarios ni coincidencias en el escaneo de patrones de credenciales. Esto no constituye una garantía universal de ausencia de secretos.

P2 preservado en el commit autorizado **42f70bd**, `feat: preserve verified F0-P2 deterministic combat milestone`, sobre el hito P1 `279be4d`. P3 queda como cambios locales revisables. Rama main, sin remoto ni push. No se añadieron dependencias ni se modificaron manifests/lockfile; no procedía reinstalar.

## Verificación automatizada

Último `pnpm check` completo: **118 pruebas en 12 archivos, todas pasan**; TypeScript strict, ESLint sin avisos y build de producción correctos. Se conservan intactos los archivos de las 73 pruebas anteriores. Nuevas: 38 de reglas de partida y 7 de integración/persistencia visual. Formato y diff comprobados al cierre.

Cobertura: ingresos y límites, interés calculado antes de recompensas, rachas de ambos signos y empate, compras/rechazos atómicos, bloqueo/renovación, agotamiento y redistribución de pool, equivalencia de copias, fusiones de dos/tres estrellas y prioridad de tablero, banquillo lleno con/sin combinación inmediata, ventas de todas las estrellas, movimiento/intercambio, sobre-despliegue recuperable, XP/umbrales/máximo, fases, payloads repetidos, streams RNG separados y replay. Escenario de **500 acciones** comprueba conservación del pool tras cada transición y reproducción del estado; integración de cuatro rondas usa el combate P2 real.

Persistencia: replay del historial al cargar, rechazo de estado manipulado, combate recuperado desde el inicio visual, resolución recuperada en su tick final sin repetir ingresos, fallo de almacenamiento, pausa y velocidad sin modificar la formación.

Build: aplicación **402,55 kB / 122,42 kB gzip**, CSS **23,86 / 6,02 kB**. Persiste el aviso conocido de Phaser **1367,08 / 357,00 kB**; no se silencia ni se afirma optimización de descarga.

## Recorrido manual en navegador real

Build de producción en `http://127.0.0.1:4173`, navegador integrado, viewport observado 805×827. Acciones mediante controles DOM y arrastres reales, sin inyectar estado de partida:

1. Nueva partida con semilla 42: 10 oro, nivel 2, cinco ofertas y nueve plazas vacías.
2. Compra de K-01, arrastre banquillo→tablero y tablero→banquillo, recolocación mediante controles.
3. Segunda compra, renovación por 2, bloqueo y desbloqueo. Tercera copia de K-01 combina automáticamente a 2★ y conserva su posición de tablero; estadísticas 936 HP / 63 ATK.
4. Compra de 4 XP por 4 oro: nivel 3, 2/6 XP. Compra y venta de otra K-01; devolución correcta de 1 oro.
5. Ronda 1: victoria jade, tick 88; banco 1, recompensa 3, saldo 4. Tienda bloqueada conserva ofertas y huecos al pasar de ronda.
6. Ronda 2 a ×2: victoria jade, tick 88; base 3 + victoria 1 + racha 1 = 5, saldo 9; XP pasiva sube a nivel 4.
7. Ronda 3: empate por límite de 300 ticks; base 4, interés 0 sobre banco 9, racha restablecida, saldo 13.
8. Ronda 4: compra y despliegue de R-03; banco 11. Victoria jade en tick 217: base 5 + interés 1 + victoria 1 + racha 0 = 7, saldo **18**.
9. Recarga y continuación: ronda 4 en resolución, **18 oro**, 25 entradas de registro y tick **217** restaurados. Sin segundo pago. Avance a ronda 5: nueva tienda, mismo saldo y formación conservada.
10. Arena original: cargar duelo 4×4, iniciar semilla 42, velocidad ×2; **victoria ámbar / derrota jade, tick 142**, igual al resultado P2.

Consulta de consola tras el recorrido: cero errores y cero avisos. Evidencia local ignorada por Git: `artifacts/f0p3-round4.png`, `artifacts/f0p3-arena.png`, `artifacts/f0p3-local.png`, `artifacts/f0p3-shop.png`.

## Incidencias corregidas y límites

- Una fixture inicial de banquillo lleno contenía triples ya combinables: se corrigió para representar un banquillo realmente bloqueado; no se modificaron pruebas anteriores.
- La recarga en resolución restauraba correctamente el saldo, pero mostraba tick 0 y texto de preparación. Corregido restaurando el frame final; prueba de regresión y comprobación en navegador con tick 217.
- Herramienta 21st no disponible en este entorno: revisión manual del diseño existente; no se declara revisión automática 21st.

Prototipo local, no autoridad segura ni sincronización entre pestañas. Historial y ledger crecen sin compactación; restaurar reproduce el historial completo. La reproducción y la resolución lógica ejecutan el combate por separado para no confiar en un resultado aportado por UI. Rival configurado externo al pool del jugador, sin economía propia; el pool está preparado para ampliación, no compartido todavía entre cuatro clientes. Rondas abiertas, sin salud global ni fin de partida: `finished` reservado. Arte provisional y cuatro personajes ficticios. Requiere WebGL.

No se ejecutó matriz multinavegador, dispositivo táctil real, auditoría WCAG completa ni suite E2E persistente. A 805×827 hay scroll vertical para tienda/banquillo; no se afirma que toda la pantalla quepa en ese viewport. Sin multijugador, servicios, cuentas, objetos, aumentos, carrusel, sinergias activas ni nuevas infraestructuras. **F0-P3 validado; F0-P4 no iniciado.**

---

# Registro histórico de validación F0-P2

Ejecutada el **22 de octubre de 2026**, macOS, Node 26.9.0, pnpm 11.25.0. Este bloque describe el hito P2; los resultados actuales de P3 figuran al principio del documento.

## Auditoría previa y Git

Se inspeccionaron arquitectura, código y documentación antes de editar. Se encontraron los 48 archivos sin seguimiento anunciados; eran fuentes, configuración, lockfile y documentación esperados. Escaneo de patrones de credenciales sin coincidencias, sin `.env` versionados ni archivos innecesarios detectados. Dependencias, builds y capturas excluidos por .gitignore. La revisión no equivale a una garantía universal de ausencia de secretos.

`pnpm check` inicial: 35 pruebas en 7 archivos, typecheck/lint/build correctos. Sin discrepancias con la base comunicada ni cambios ajenos detectados. Commit inicial autorizado **279be4d** (`feat: preserve verified F0-P1 technical foundation and arena`). Rama main, sin remoto ni push. F0-P2 queda como cambios locales revisables sobre ese commit.

## Verificación automatizada final

`pnpm check` ejecuta typecheck strict, ESLint con cero avisos, Vitest completo y build Vite. Resultado final registrado tras ejecutar la comprobación: **73 pruebas en 10 archivos, todas pasan** (35 originales conservadas + 38 nuevas). `pnpm format:check` comprueba formato. No se añadieron dependencias ni se cambió el lockfile.

Cobertura nueva: repetición byte a byte e inmutabilidad; orden de entrada; PRNG y semillas; versiones/serialización/batches; A\* con obstáculos e imposibles; selección alcanzable/desempates; reservas sin colisiones; ataques cuerpo a cuerpo y proyectiles; velocidad 1,5 sin deriva; muerte mutua; retargeting; resistencias positivas/negativas/extremas y daño verdadero; maná/autocast; heal/shield/stun/modificadores/pasiva; capas de escudo; movimiento interrumpido; proyectil que sobrevive a su fuente; vacío/timeout/fin terminal; reloj visual, saltos de frame, pausa, ×2, protección de formación y replay.

El escenario completo de cuatro perfiles valida todos sus eventos y snapshots mediante CombatBatchSchema. Las 35 pruebas P1 no se debilitaron. Los contratos P1 se movieron a board-contracts.ts y continúan reexportados.

Build correcto. Persiste el aviso conocido del chunk Phaser: **1367,08 kB minificados /357,00 kB gzip**. No se silencia. No se afirma optimización de descarga, carga masiva ni benchmarks del servidor.

## Navegador real

Producción local en http://127.0.0.1:4173 mediante navegador integrado, vistas de 1280×720 y 805×827. Validación manual real con controles y capturas:

- Cargar duelo 4×4 y comenzar con semilla 42: aparición de barras y desplazamiento de unidades desde formación hacia objetivos.
- Ataques, números de daño, escudos, curación y representación de habilidades observados durante la reproducción; estado de stun visible en inspector.
- Pausa en tick 43: una observación posterior conserva tick 43; reanudar a ×2 hace avanzar la reproducción. Zoom 115% sigue funcionando durante la pausa.
- Duelo terminado: **victoria ámbar / derrota jade, tick 142, semilla 42**. Repetición con la misma semilla conserva resultado/tick, también tras pausa y cambio de velocidad.
- Eliminados desaparecen y su inspector muestra HP 0/estado Eliminada; supervivientes permanecen y se anuncia resultado.
- Las comprobaciones visuales son muestreos manuales, no una medición fotograma a fotograma de todos los impactos; el retraso exacto de proyectiles está además cubierto por prueba lógica (liberación3, impacto5).
- Selección de R-03 durante la pausa actualiza el inspector. Volver a preparación recupera los ocho sprites y habilita edición; movimiento posterior por controles de columna/fila a `(0,6)` confirmado. La Arena queda abierta con el duelo estándar preparado.
- Consulta de consola de esta vista: cero errores y cero avisos.
- Evidencia local ignorada por Git: `artifacts/f0p2-combat.png`, `artifacts/f0p2-result.png`.

No se ejecutó matriz multinavegador, dispositivo táctil real, latencia online ni suite E2E persistente. No se afirma validación artística definitiva. El scroll vertical sigue siendo necesario a 720 px para el inspector completo.

## Incidencias y límites

La primera prueba de cadencia detectó pérdida del resto por limitar carga a 10000; se corrigió conservando el exceso, con secuencia de referencia 1, 8, 15, 21, 28. Typecheck detectó uso de findLast fuera del target ES2022 y filtros sin narrowing suficiente; corregidos. Una prueba de expiración de buff se aisló del recasteo financiado por maná para comprobar la expiración sin alterar reglas.

Traza local precomputada, hasta 301 snapshots en memoria; ninguna red ni autoridad externa. Animaciones provisionales por transformaciones de sprites de un frame; integración de una hoja definitiva con pausa/velocidad pendiente. Congestiones sin solución terminan por timeout, no existe pathfinding cooperativo general. Obstáculos probados por API/test sin editor gráfico de obstáculos. Sin economía, tienda, sinergias activas, cuentas, Colyseus o Supabase. F0-P3 no iniciado.

---

# Registro histórico de validación F0-P1

Ejecutada el **22 de octubre de 2026**, entorno macOS, Node 26.9.0, pnpm 11.25.0.

## Comandos y resultado final

| Comprobación                     | Resultado real                                                |
| -------------------------------- | ------------------------------------------------------------- |
| `pnpm install`                   | Correcta; dependencias y lockfile creados                     |
| `pnpm install --frozen-lockfile` | Correcta; lockfile actualizado y reproducible en este entorno |
| `pnpm typecheck`                 | Correcta, sin errores                                         |
| `pnpm lint`                      | Correcta, cero errores/avisos de ESLint                       |
| `pnpm test`                      | **35 tests, 7 archivos, todos pasan**                         |
| `pnpm build`                     | Correcta; genera `apps/web/dist`                              |
| `pnpm dev`                       | Vite disponible en 127.0.0.1:5173                             |
| `pnpm preview`                   | Build disponible en 127.0.0.1:4173                            |

La ejecución final de `pnpm check` completó typecheck, lint, tests y build en ese orden. El aviso de tamaño del chunk de Phaser **permanece visible**, no se ha silenciado: 1.367,08 kB minificados, 357,00 kB gzip. Chunk de aplicación: 336,54 kB / 103,11 kB gzip; CSS: 13,57 kB / 3,68 kB gzip. Es una limitación de peso inicial a optimizar cuando exista una necesidad real de carga por rutas, no un fallo de compilación.

## Cobertura

- Esquinas y centros con fixtures independientes, offsets odd-r, q negativos y ambos lados de un borde entre hexágonos.
- Round-trip en 56 celdas e interiores; proyección afín con vectores base conocidos y cambios de escala/origen.
- Límites, mitad, enteros, distancia, simetría, desigualdad triangular y vecindad recíproca.
- Ocupación, IDs duplicados, definiciones desconocidas, colocaciones válidas/invalidas en ambos lados.
- Movimiento atómico, liberación de origen, misma casilla, ocupación, propietario y estado original conservado.
- JSON, versión, seeds uint32, eventos, sinergias y validación de preparación frente a combate.
- Frames y marcador de impacto, apoyo y espejo de sprites.
- Store local: selección, colocación, movimiento, rechazo, equipo, reset y suscripciones.
- Las cuatro definiciones reales del catálogo se validan contra el schema.

## Verificación real en navegador

Herramienta: navegador integrado de Codex, UI y capturas reales; no solo inspección de código.

- Render WebGL del tablero y cuatro sprites, a anchuras CSS observadas de **805 y 1280 px**.
- A 1280 × 720, un canvas, sin desbordamiento horizontal (`scrollWidth=1269 <= innerWidth=1280`). La página puede requerir scroll vertical para reserva y controles inferiores.
- Arrastre de K-01 a `(3,7)`, panel y estado actualizados.
- Intento de arrastre a casilla ocupada: rechazado, posición conservada.
- Intento de mover una unidad jade mientras se edita ámbar: rechazado.
- Colocación de R-03 en mitad rival: rechazada con mensaje específico.
- Colocación válida en `(-3,7)`: contador de 4 a 5.
- Flecha derecha + Intro mueve esa unidad a `(-2,7)`.
- Zoom 115 % y navegación por teclado, comprobados en vista limpia.
- Producción en :4173: render y movimiento con teclado a `(1,4)`; consulta de consola devuelve **cero errores y cero avisos** en esa vista.
- Captura local de evidencia: `artifacts/arena-f0-p1.png` (ignorada por Git).

No se ejecutó una matriz de navegadores ni prueba táctil en un teléfono real. Los breakpoints móviles están implementados; no se afirma validación visual a 360 px. No hay suite E2E persistente: estas comprobaciones de UI se realizaron durante la sesión.

## Incidencias encontradas y resueltas

1. Primer typecheck: Graphics de Phaser 4 exige Vector2[]; se convirtió Point a Vector2 exclusivamente en la escena.
2. Primer lint: un literal numérico excedía precisión representable; fixture ajustado, conservando valor de referencia independiente.
3. Primer ESLint 9: aviso de versión sin soporte; actualizado a ESLint 10 compatible con typescript-eslint.
4. HMR: una escena destruida conservaba su suscripción y accedía a cámara retirada. Se añadió limpieza idempotente al desmontar React, SHUTDOWN y DESTROY. Se desactivó audio porque la fase no lo utiliza y se habían observado rechazos de AudioContext cerrado durante recargas. La vista limpia posterior no registra esos errores. No se afirma prueba exhaustiva de todas las secuencias HMR posibles.
5. Al formatear vite.config.ts se reinició Vite; la pestaña de comprobación cayó temporalmente en conexión rechazada. Servidor confirmado con HTTP 200 y comprobación continuada en una pestaña limpia.

El detector visual señaló dos advertencias: frecuencia de la tipografía y borde del pedestal. Se revisaron y documentaron en DESIGN.md; no son fallos funcionales.

## Limitaciones y fuera de alcance

Sin simulación de combate ni PRNG implementado; seed y ticks son contratos. Sin pathfinding, economía, cuentas, servicios, red, Supabase ni despliegue. Estado en memoria. Animaciones placeholder de un frame. El adaptador de hojas reales no se ha probado con arte definitivo. WebGL requerido. `owner` identifica un lado del tablero, no una identidad autenticada. Accesibilidad básica mediante controles DOM y teclado; no se afirma auditoría WCAG completa.

## Git y archivos

La carpeta inicial estaba vacía y no era un repositorio. Se inicializó Git en `main`; **sin commits, sin staging y sin remoto**. Todos los archivos del proyecto son nuevos/no seguidos; ninguno sustituye código previo del usuario. `node_modules`, `dist`, `.impeccable` y capturas locales están ignorados.

Inventario de entregables:

- Raíz: package.json, pnpm-workspace.yaml, pnpm-lock.yaml, tsconfig.json, vitest.config.ts, eslint.config.js, .gitignore, .prettierrc.json, .prettierignore, README.md, PRODUCT.md, DESIGN.md.
- apps/web: manifest, index.html, vite.config.ts; App.tsx, main.tsx, styles.css; game/BoardScene.ts, GameCanvas.tsx, session.ts, projection.ts, pixelArt.ts, visualAdapter.ts y sus tests.
- apps/server/README.md.
- packages/shared: manifest, index.ts y contracts.test.ts.
- packages/game-data: manifest, index.ts y index.test.ts.
- packages/game-core: manifest, index.ts, hex.ts, board.ts y sus tests.
- packages/sprite-contract: manifest, index.ts y index.test.ts.
- docs: ARCHITECTURE.md, GAME_DESIGN_V0.1.md, SPRITE_SPEC.md, ROADMAP.md, DECISIONS.md, VALIDATION.md.

En el momento de este registro histórico F0-P2 aún no estaba iniciado. El estado actual está descrito al comienzo del documento.
