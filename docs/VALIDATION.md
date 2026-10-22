# Validación F0-P1

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

F0-P2 no se ha iniciado; su propuesta figura en ROADMAP.md.
