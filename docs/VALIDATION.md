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
