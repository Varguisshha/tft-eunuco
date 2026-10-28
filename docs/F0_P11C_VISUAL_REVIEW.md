# P11C — Revisión visual independiente

Dirección: extensión del HUD Festival Pop × Neon Playground, sin sustituir arena, splash arts ni sistema de componentes.

Primera revisión: **FIX**. Cuatro correcciones solicitadas: lectura de una fila completa en 720p, convivencia con inspector, cierre Escape/foco y sombra/animación del sistema.

Segunda revisión: las cuatro correcciones originales fueron evaluadas **resolved**. Disposición limitada **FIX** por dos regresiones: el panel invade la parte inferior del botón en 720p y la captura de mitigación se tomó durante la transición de barras. No equivale a aprobación completa del panel.

Tras las dos rondas, el usuario autorizó expresamente una ronda adicional acotada a esas dos regresiones. En esa revisión, el revisor emitió **SHIP limitado a esos dos puntos**: botón completo y separado del panel en los cinco tamaños, primera fila completa en 720p y mitigación capturada con barras asentadas. Las cuatro correcciones originales conservan su evaluación **resolved** de la segunda revisión. Esta secuencia cierra los hallazgos identificados; no constituye una nueva auditoría completa del panel ni del HUD.

Evidencia actualizada en las mismas rutas: `artifacts/p11/c/hud-{1280,1440,1920,2560,3840}.png`, `mitigated.png`, `bench-combat.png`, `browser-metrics.json`, `interaction-metrics.json`, `design-detect.json`. Cinco ofertas, cero scroll global y cero errores del navegador en las cinco resoluciones. Límite de ancho/alto en monitores grandes. El fixture muestra mitad real de combate.

## Documentación del sistema y estado

P11C es una extensión del sistema incumbente descrito en `PRODUCT.md`, `DESIGN.md` y `.impeccable/design.json`: conserva superficies azul noche, marcos azules, texto lavanda, acción lima y oro semántico. `CombatStatisticsPanel.tsx` reutiliza `GameButton` y `GameIcon`; `UnitInspector.tsx` y `Shop.tsx` mantienen `GameFrame` y los controles existentes, con disponibilidad derivada de la sesión. El panel usa tokens `--neon-*`, la fuente display existente, cifras tabulares, sombra de marco y barras animadas mediante `transform` solo cuando se permite movimiento. No introduce una identidad visual nueva ni justifica regenerar los archivos normativos.

Se comprobaron las fuentes anteriores, `combatStatistics.css`, el informe funcional, las métricas guardadas y directamente las capturas actualizadas `hud-1280.png` y `mitigated.png`. Las métricas cubren cinco escritorios de 1280 × 720 a 3840 × 2160; además de cinco ofertas y ausencia de scroll global y errores, registran separación botón/panel de 10px, 12,5px y aproximadamente 17,4px según tamaño. En 720p la primera fila completa queda dentro de la lista desplazable. El control aplica altura y altura mínima de 40px, relleno horizontal de 12px, icono de 20px y etiqueta de 14px; en alturas de hasta 800px se sitúa en `205 * var(--u)`. Son ajustes locales, no nuevos tokens globales.

La captura de mitigación actual muestra 88 con barra máxima, 29 con aproximadamente un tercio y los valores cero sin relleno. `interaction-metrics.json` confirma escalas asentadas de 1, 0,329545 y 0, y verifica cierre con Escape y retorno del foco. `design-detect.json` conserva un aviso anterior de `transition: width` que ya no corresponde al CSS actual; sus avisos tipográficos no autorizan ampliar la escala normativa para legitimar el panel.

Estado documental: cuatro correcciones originales **resolved** y las dos regresiones **resueltas con SHIP limitado** en la ronda adicional autorizada; no queda pendiente esa autorización. No se canonizan los defectos anteriores, las dimensiones locales o los estados transitorios como reglas del sistema. El drift preexistente fuera de P11C queda fuera de esta extensión y no se repara ni se presenta como validado. Se conservan `DESIGN.md` y su sidecar sin cambios.
