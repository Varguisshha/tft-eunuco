# F0-P5.2 — Arena Mar de Cristal

Implementada el 23 de octubre de 2026. No se ha iniciado F0-P6.

## Ajuste posterior solicitado: cartel visible y casillas mayores

La configuración actual amplía la envolvente del tablero un 58,5 % sobre el asfalto, con controles `(721,306)`, `(1330,509)`, `(880,810)` y `(290,501)`. El cartel de Carrefour se incluye en los límites obligatorios de cámara. En formatos anchos queda espacio lateral del color del HUD; la imagen original no se deforma. Este ajuste sustituye los parámetros y la prioridad cover descritos en la entrega inicial de abajo.

Se verificaron los cinco tamaños de escritorio sin scroll, con cartel completo y los 336 vértices dentro del perímetro. Se mantienen 273 pruebas correctas y build/typecheck/lint. Capturas actuales: `artifacts/f0p52/framing-carrefour-{1280,1366,1440,1920,2560}.png` y `grid-expanded.png`. El aumento se refiere a superficie ocupada en la ilustración; el tamaño final en pantalla depende del encuadre abierto y de la altura disponible.

La entrega inicial queda documentada a continuación como historial.

## 1. Imagen utilizada

La nueva `Plaza urbana isométrica junto al metro.png` de la raíz, 1672×941, identificada por SHA-256 en [el informe de importación](ARENA_IMPORT_REPORT.json). Se conserva el original; la versión anterior de `Sprites/` no se utiliza. WebP sin pérdida, 2,67 MB frente a 3,60 MB, con buffers RGB idénticos. Ningún sprite o pipeline de personajes ha sido modificado.

## 2. Calibración y modelo

Homografía de cuatro controles: `(734,361)`, `(1232,520)`, `(877,753)`, `(395,533)`. Inversa geométrica para puntero, hover y drag; no proximidad a centros en pantalla. El residual afín de aproximadamente 61 px justifica la transformación proyectiva. Los 336 vértices de las 56 casillas permanecen dentro del perímetro de asfalto seguro. Parámetros completos, cámara y procedimiento en [MAR_DE_CRISTAL_CALIBRATION.md](MAR_DE_CRISTAL_CALIBRATION.md).

## 3. Arquitectura e interfaz

Nuevo contrato de arenas y módulos de geometría, cámara y calibración en `apps/web/src/arenas/`. BoardScene recibe la configuración; la Arena técnica conserva su proyección afín y terreno original. Fondo, polígonos, unidades y efectos comparten coordenadas proyectadas. La interpolación de movimiento ocurre en plano lógico antes de proyectar.

Cuadrícula oculta sin interacción y durante combate; preparación muestra destinos, ocupación y prohibiciones. Al terminar un drop aceptado se oculta. Calibración solo en partidas de desarrollo, con controles numéricos, posición/escala, coordenadas, persistencia separada, JSON y aislamiento de capas. Propuestas inválidas conservan la última proyección válida. Cerrar restaura la oficial.

HUD V2 conservado: Vargas/Florin, reloj, inspector flotante, banquillo 9, tienda 5 y economía. Solo se añadieron apoyos de contraste sobre el fondo detallado. El inspector mantiene el canvas de 1408×570 en `(16,86)` a 1440×900.

## 4. Capturas y viewports

Evidencia local en `artifacts/f0p52/` (ignorada por Git):

| Resolución | Captura               | Canvas    | Scroll del documento | Borde inferior tienda |
| ---------- | --------------------- | --------- | -------------------- | --------------------- |
| 1280×720   | `arena-1280x720.png`  | 1248×390  | No                   | 708                   |
| 1366×768   | `arena-1366x768.png`  | 1334×438  | No                   | 756                   |
| 1440×900   | `arena-1440x900.png`  | 1408×570  | No                   | 888                   |
| 1920×1080  | `arena-1920x1080.png` | 1872×696  | No                   | 1064                  |
| 2560×1440  | `arena-2560x1440.png` | 2512×1056 | No                   | 1424                  |

Medidas DOM reales en `viewports.json`. Capturas adicionales: `arena-empty.png` (solo fondo mediante herramientas de desarrollo, sin alterar unidades lógicas), `calibration-1440.png`, `inspector-dolea.png`, `combat-start.png`, `combat-running.png`, `overtime.png`, `resolution.png`, `round-4.png` y `technical-arena-star3.png`.

## 5. Coordenadas e interacciones

Pruebas de centros, 336 esquinas, cada arista compartida por ambos lados, inversa y puntos fuera del tablero. Diez casos combinan cinco tamaños con DPR 1/2, cada uno con zoom 0,85/1/1,15, cobertura, cabezas, celdas y recorrido cliente→buffer→cámara→axial. Las coordenadas/vecinos/distancias del core permanecen iguales.

Navegador real: recuperación de la partida de desarrollo anterior, selección de DOLEA en preparación y combate, cierre, calibración guardada/recuperada, desplazamiento, propuesta inválida rechazada y cierre seguro. Compra de DOLEA 1★ por 2 oro; drag banquillo→asfalto; movimiento tablero→tablero; retirada de DOLEA 2★ al banquillo con zoom 115 % y recolocación. Las operaciones usan los comandos originales y se bloquean al pausar/fuera de preparación. Las pruebas automáticas cubren intercambio, destinos ilegales y límites.

## 6. DOLEA

En Mar de Cristal se observaron 1★ y 2★ simultáneamente, pies/sombras apoyados, movimiento, combate, daño/curación/escudos y Overtime. Inspector 2★: 1080 HP, 72 ataque, retrato real y venta bloqueada durante combate.

Tests del adaptador real con frontera gráfica simulada recorren los ocho frames de ataque para 1★/2★/3★; verifican pie fijo, misma escala X/Y, flip, profundidad y fallbacks Idle/Walk/Death. La suite previa de compra, venta, fusión y apariencias se conserva; la prueba nueva de autoridad vuelve a fusionar DOLEA 2★. En navegador, Arena técnica 3★ mostró 1944 HP/129 ataque con apariencia 2★, combate y pausa. No se hizo una nueva comparación visual exhaustiva de cada PNG original.

## 7. Rondas y recuperación

La preparación de ronda 3 pasó automáticamente a combate con dos DOLEA. Recarga real pausada a 44,9 s conservó 4 oro, vida 100/92, formación y tienda bloqueada. Se reanudó y capturó Overtime con 10,8 s restantes. Terminó con victoria: +6 oro, saldo 10, vida 100/87, racha 3 y +2 XP. Resolución avanzó automáticamente a preparación de ronda 4; se verificó después la retirada/recolocación con zoom.

La partida normal utiliza otra clave y no se reemplazó para estas pruebas. Al final se recuperó brevemente su ronda 6 para confirmar la ausencia de controles de calibración y depuración (`normal-no-calibration.png`); se volvió después a la prueba de desarrollo pausada. Motor, economía, pool, XP, estrellas, reloj monotónico, deadlines, autoridad y formato de guardado permanecen intactos.

## 8. Rendimiento

Una textura de 1672×941: aproximadamente **6,00 MiB RGBA8**, sin contar buffers del renderer ni overhead del driver. Transferencia 2.672.720 bytes. Sin shaders ni postprocesado nuevos; nearest-neighbor y límite de DPR 2 existentes. La homografía se resuelve al iniciar/cambiar calibración; cámara solo al redimensionar/zoom/ajuste.

Microbenchmark CPU con los módulos reales y Node v26.9.0: 100.000 pares proyección+inversa en 9,25 ms (0,092 µs/par); 1.000 cálculos de cámara en 37,28 ms. Evidencia `performance.json`. Son mediciones locales orientativas, no FPS de navegador ni perfil GPU. Se observó combate con cuatro personajes; no se afirma una prueba de carga de 56 unidades ni tiempos de descarga en redes móviles.

## 9. Tests y comprobaciones

Auditoría inicial: **246 tests en 24 archivos**, typecheck, lint y build correctos. F0-P5.1 preservado antes de editar. Nuevos: 23 tests de geometría/cámara/autoridad y 4 del adaptador visual. Total: **273 tests en 26 archivos**. Ninguna prueba previa modificada. Incluyen guardados, rondas, DOLEA, Arena técnica y los contratos de HUD existentes.

Validación final completa: `pnpm check`, `pnpm format:check` y `git diff --check` correctos.

Consola del navegador consultada después del recorrido: sin errores ni avisos registrados. El build conserva el aviso preexistente sobre tamaño del chunk Phaser.

## 10. Incidencias y límites

- La primera calibración recortaba cabezas en 1280×720; las pruebas lo detectaron y se ajustó antes de aceptar la configuración.
- Un selector DOM de `summary` y uno de clase de tienda fallaron durante la instrumentación; se corrigieron usando el elemento real. No se presentan esos intentos como validaciones.
- Al intentar pausar tras la captura de Overtime, el combate ya había ganado y estaba en resolución. La evidencia de Overtime es la captura durante reproducción, no la pausa posterior.
- Cover recorta detalles periféricos y puede ocultar el cartel superior de Carrefour en estas proporciones. El centro comercial, Metro, autobús y el suelo se conservan en el original; no se recompone la imagen para forzarlos dentro del campo.
- El zoom se limita por cobertura/seguridad y puede alcanzar su límite antes del porcentaje solicitado. El inspector puede solapar temporalmente la derecha, pero nunca cambia el encuadre.
- Sin nueva matriz multinavegador, dispositivos táctiles, perfil GPU o prueba de carga máxima. La profundidad es una aproximación visual suave; solo hay orientaciones izquierda/derecha de personajes.

## 11. Git

F0-P5.1 preservado en **`7fc1ec6`** después de validar y revisar los cambios. Se excluyeron `Sprites/` y la nueva imagen original. F0-P5.2 queda local y revisable, sin commit adicional. No se configuró remoto ni se hizo push. No se añadieron dependencias ni se alteró el lockfile. Durante el trabajo apareció además `Plaza soleada de la cafetería UPM.png` como archivo ajeno sin seguimiento: no se abrió, modificó ni incluyó en la integración.

## 12. Siguiente paso recomendado

Revisar artísticamente la escala de personajes con formaciones más pobladas y producir los estados de animación que aún usan fallback. Después, definir explícitamente el alcance del próximo hito de red/autoridad remota. **No se inició F0-P6**, multijugador, sinergias, nuevos personajes ni selección pública de arenas.
