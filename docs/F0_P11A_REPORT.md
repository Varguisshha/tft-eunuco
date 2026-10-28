# F0-P11A · roster jugable y sinergias del Excel

Estado: implementación LOCAL; no publicada. Rama `codex/f0-p11-local-corrections`, base `b5d93c4`.

## Contenido versionado

Nuevo catálogo/reglas `f0p11a-1`. Integra las 34 identidades y afiliaciones de P10A, incluida la equivalencia Erik→JARAMILLO y la distinción Alfredo/AlfredoPocho. No hay unidades ficticias ni Llama de Pádel en partidas nuevas. MUS conserva exclusivamente 2/4. Las sinergias sin diseño no conceden bonificaciones; se indica «Efectos pendientes». Se conservan los atributos únicos y los efectos existentes por escalón.

Las cuatro unidades integradas mantienen mecánicas y arte. Las otras 30 tienen parámetros individuales explícitos en `packages/game-data/src/p11-provisional.json`, costes 1–3, ataques básicos, activa/pasiva nulas y fallback propio de color e inicial. El HUD avisa «Provisional» / «Parámetros temporales». Estos valores habilitan juego técnico; no representan equilibrio competitivo final ni habilidades diseñadas. Pueden sustituirse individualmente mediante otro catálogo.

Se mantiene el pool 30/25/18/10/9. El roster actual solo utiliza costes 1–3 y conserva sus probabilidades; no se inventan unidades de coste 4/5. El rival local del catálogo nuevo usa identidades reales. Compra, reserva, venta y fusión 1/3/9 copias se verifican para cada provisional.

## Compatibilidad

Los catálogos históricos conservan datos y fingerprints, incluido P10A `9e0b5ff3ed81c653c8cc05ae2cfa72b50b9f8d7fc5d53850d37f07daeb5510f0` con cuatro jugables y treinta borradores. Las partidas y replays anteriores no se reinterpretan. Nuevas partidas/fixtures P11 seleccionan el nuevo contenido, conservando APIs históricas y persistencia registrada por versión.

Se importó una copia acotada de P10A sin escribir en su worktree. Al final, HEAD y hash de archivos de origen coinciden con la toma inicial: `4e17a218ca93906278f75c38328ca7e929adda64` / `4d9fccdff2e415862546b9c6778d5062e9c69bf5c7463288914595ce84958f8f`. Excel SHA256 `101728c60d45312cd98776087ba17f3636e798ab2e0265ed0f65b26ece6791eb` sin modificar.

## Interfaz y defectos corregidos

Cinco cartas multiafinidad, overflow accesible y lista completa en inspector. Corrección de consulta de afinidades P11 que podía bloquear el inspector provisional; prueba de regresión SSR más compra real en navegador. Las nuevas afinidades usan tokens Neon, DM Sans y geometría cuadrada. Hover/foco de compra solo muestra «Reclutar» si está disponible; sin oro o combate conserva el mensaje correcto.

Se preservan Mar de Cristal, cuatro splash arts, banco, inspector y controles. Revisión visual independiente: SHIP después de corregir dos hallazgos P2; ver `F0_P11A_VISUAL_REVIEW.md`.

## Validación

- Suite específica de roster P11: 64 pruebas. Identidades, matriz, ausencia de habilidades inventadas, estadísticas, combate determinista, fusiones y conservación de pool; 2–4 jugadores con compra/movimiento/bloqueo/restauración y eliminación.
- Regresión de inspector más UI/historial: 8 pruebas. Sin asumir que el entorno SSR reproduce Phaser; canvas sustituido solo en prueba SSR, capturas con Phaser real.
- Quality gates completos: `pnpm check` aprobado: 107 archivos, 1.492 pruebas correctas y 1 opt-in omitida; typecheck, lint y builds correctos. Registro `artifacts/p11/audit/check-a-final.log`. `verify:public` y `verify:railway` locales correctos. Aviso preexistente de tamaño de bundles Vite; no error de build.
- PostgreSQL/TLS: bases de diagnóstico locales, pruebas de recuperación con SIGKILL y fencing; sin leer copias de datos remotos.
- Capturas `artifacts/p11/a/hud-{1280,1440,1920,2560,3840}.png`: documento igual al viewport, cinco cartas, sin botones anidados y cero errores.
- `eight-affinities.png`, `gallery.png`, `provisional-inspector.png`, `without-gold.png`, `shop-closed.png`; métricas `browser-metrics.json`, `interactions.json`, `states.json`. Enter/Escape devuelve foco al overflow; hover sin oro/cerrado tiene intención oculta y compra deshabilitada.

La corrección prioritaria de recuperación de comandos está separada en `283bde6` e informe P11E; no se atribuye sin evidencia el incidente real a ese defecto. P11B–F continúan pendientes de sus respectivas entregas. No se ha hecho push, despliegue ni operación remota.
