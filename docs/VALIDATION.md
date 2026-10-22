# Validación F0-P2

Ejecutada el **22 de octubre de 2026**, macOS, Node 26.9.0, pnpm 11.25.0. Este bloque describe el estado actual; el registro P1 inferior se conserva como evidencia histórica.

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
