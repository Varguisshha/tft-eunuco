# F0-P11G — Extensión de diseño e interacción

Fecha de revisión documental: 27 de octubre de 2026. Ámbito: implementación LOCAL. Esta es una extensión ordinaria de Festival Pop C × Neon Playground, no una nueva identidad visual ni una certificación de QA final.

## Overview

La arena Mar de Cristal, los marcos vectoriales C, los retratos originales, la clasificación y las sinergias conservan su jerarquía. P11G amplía el inventario lateral y la lectura del banquillo; añade avisos de fusión, un recibo de oro y consulta de probabilidades desde el nivel. Mantiene cinco ofertas y nueve plazas.

La autoridad de identidad sigue en `DESIGN.md` y `.impeccable/design.json`, leídos junto con `PRODUCT.md`. Este documento registra únicamente las adiciones observadas en `apps/web/src/match/hud/p11gHud.css`, `RoundFeedback.tsx`, `ShopOdds.tsx`, `rewardSeen.ts`, `Shop.tsx`, `Bench.tsx` e `items/ItemHud.tsx`. No modifica los documentos normativos ni sus tokens.

## Colors

No se introduce una paleta. Inventario, recibo y tabla reutilizan `--neon-surface-overlay`, texto claro, borde azul y sombra de panel. Oro sigue significando moneda y estrellas. Las estrellas visibles conservan el dorado de mejora. El número de estrellas y el nombre accesible distinguen los ascensos a 2★ y 3★ sin depender del color. El pie de una oferta con ascenso añade una línea interior dorada de 2px.

El indicador no cambia el borde de coste ni las funciones de magenta económico y oro monetario del sistema vigente.

## Typography

Se conserva FestivalPop para jerarquía de juego y DM Sans para datos. El recibo usa título FestivalPop de 22px y total de 54px con icono de oro de 40px. Su desglose usa etiquetas de 12px. La confirmación de fusión usa FestivalPop de 18px. La tabla usa DM Sans de 12px/1.4 y cifras tabulares; su título usa FestivalPop de 18px. «Ver probabilidades» es una indicación secundaria DM Sans de 10px junto al nivel.

## Layout

### Inventario

La caja lateral pasa de los 58px del estilo anterior de `itemHud.css` a **112px** con padding de 7px. La bandeja interna tiene dos columnas de **44px**, separación de **6px** y casillas de **44 × 44px**; antes había una columna con casillas de 42px. El encabezado y el removedor ocupan ambas columnas; el removedor queda centrado. La ubicación existente se conserva: a la derecha del rail de clasificación/sinergias, sin ocupar su columna.

Se mantiene `overflow-y: auto`, contención del sobrepaso y altura flexible; solo se oculta la representación de la scrollbar (`scrollbar-width: none` y pseudo-elemento WebKit). El detalle continúa fuera de la zona desplazable, a 8px del borde derecho, con ancho de 310px y altura máxima `min(58vh, 600px)`. Ese posicionamiento evita que el scroll de iconos recorte el propio panel; no demuestra por sí solo todos los casos de contenido largo.

### Banquillo

A partir de 1100px, la altura de referencia pasa de `104 * --u` a **`132 * --u`**. La caja visual del sprite pasa de **80 × 69** a **98 × 85** unidades: +22,5% de ancho y aproximadamente +23,2% de alto. La imagen se centra horizontalmente y usa `object-position: center bottom`; el borde inferior de su caja queda a `22 * --u` para reservar la franja de equipamiento y estrellas. Se documenta esta reserva explícita: la coordenada del pie respecto a la casilla anterior cambia; no se afirma que ambas cajas compartan la misma coordenada inferior.

Las estrellas quedan abajo a la derecha, con tamaño `max(10px, 14 * --u)`. El equipamiento aparece abajo a la izquierda, con iconos `max(10px, 13 * --u)`. Se conservan la escala acotada del HUD y las nueve posiciones. Estas dimensiones son del banquillo DOM: no alteran el multiplicador visual 1.4 de los assets reales dentro del combate ni justifican cambios de cámara, hexágonos o simulación.

### Medidas registradas

`artifacts/p11g/visual/metrics.json` registra las siguientes cajas CSS, redondeadas aquí a dos decimales. «Banquillo» es la caja de la sección; «sprite» es la caja del elemento de imagen, no una medida de los píxeles opacos del cuerpo.

| Viewport    | Inventario ancho × alto | Banquillo ancho × alto | Sprite ancho × alto |
| ----------- | ----------------------: | ---------------------: | ------------------: |
| 1280 × 720  |               112 × 301 |               776 × 88 |       65,33 × 56,66 |
| 1440 × 900  |            112 × 420,75 |               873 × 99 |       73,50 × 63,75 |
| 1920 × 1080 |            112 × 542,95 |        954,47 × 108,23 |       80,36 × 69,69 |
| 2560 × 1440 |            112 × 877,34 |        954,47 × 108,23 |       80,36 × 69,69 |
| 3840 × 2160 |           112 × 1597,34 |        954,47 × 108,23 |       80,36 × 69,69 |

En esos cinco registros `scrollWidth` y `scrollHeight` coinciden con el viewport; hay cinco cartas, nueve plazas y cero botones anidados. La escala se estabiliza en los tamaños grandes: el espacio adicional pertenece principalmente a la arena. A 720p el inventario termina en y=433 y el banquillo comienza en y=442; a 1080p termina en y=737,34 y el banquillo comienza en y=744,52. Las capturas de esos estados muestran separación entre ambas superficies.

## Elevation & Depth

El recibo de oro conserva fondo azul oscuro, borde azul de 2px y `--neon-shadow-panel`. Se centra horizontalmente, comienza al 25% de la altura del contenedor y limita su ancho a `min(470px, 60vw)`, con padding de 26px 34px. Usa z-index 24 y `pointer-events: none`: informa sin capturar clics ni arrastres.

La confirmación de fusión se sitúa sobre banquillo y dock, con z-index 25, padding de 12px 24px, borde dorado de 2px y `pointer-events: none`. El popover de probabilidades usa z-index 30, ancho `min(400px, 70vw)`, altura máxima 60vh y scroll interno; se ancla 12px por encima de la placa económica.

El pulso de estrellas dura 1,6s, con máximo de brillo 1,22 y escala 1,07. La entrada del recibo dura 240ms, desde opacidad 0,4 y desplazamiento vertical de −8px. `prefers-reduced-motion: reduce` elimina ambas animaciones; las cifras, etiquetas y estrellas permanecen. La confirmación de fusión no añade una animación propia.

## Shapes

Se conservan los marcos recortados C de ofertas y controles, las diagonales, los medallones y las plazas biseladas. Las superficies informativas nuevas son paneles rectangulares de borde azul o dorado, compatibles con los detalles secundarios existentes. No se crean radios, fuentes ni iconos de una familia nueva.

## Components

### Inventario y pendientes

La bandeja agrupa copias por definición y separa las pendientes de las disponibles. Cada botón expone nombre, cantidad, estado pendiente cuando corresponde y `aria-pressed` para selección. Conserva clic, arrastre, combinación, removedor, recuperación de pendientes y detalle de recetas; los estados pendientes de una operación deshabilitan las acciones correspondientes.

El contenedor tiene nombre accesible, `role="group"`, `tabIndex=0` y foco visible de 2px hacia dentro. Flechas horizontales avanzan una posición; las verticales, dos; Home/End van al primer/último botón habilitado. El foco llama a `scrollIntoView({ block: 'nearest' })`. No se bloquean rueda ni trackpad. La evidencia registra scroll por rueda hasta 74px con área visible de 479px y contenido de 553px; End conserva foco y llega a 74px. La evidencia disponible no separa una prueba física de trackpad.

### Oferta con fusión

Solo P11G consulta los previews de compra: en sesión remota usa `purchaseUpgrades`; localmente usa `purchasePreviews(state)`. La señal requiere oferta, ausencia de error y aceptación de `canEconomicAction`. No cuenta copias mediante un contador visual independiente. El detalle de equivalencias, reservas y restricciones pertenece a la autoridad de compra, no al CSS.

La oferta añade dos o tres estrellas arriba a la derecha, retira los pips decorativos de esa esquina y anuncia «Esta compra permite ascender a N estrellas». La carta conserva retrato, afiliaciones y nombre/precio inferiores. Tras una revisión nueva con `lastUpgrades` distinto, el aviso central incluye nombre y estrellas; dura 2400ms. La captura `fusion-confirmed.png` muestra una cascada de DOLEA a 2 y 3 estrellas.

Los huecos sin oferta deben distinguir «Coste N sin catálogo», «Coste N agotado» y «Reclutado». El código actual de `Shop.tsx` toma el estado comprado desde `shopRolls` cuando existe; solo un hueco realmente comprado usa check y nombre de compra. Esto corrige un recibo local anterior que podía sobrevivir a un hueco sin catálogo. La captura `round-9.png` examinada todavía contiene ese estado antiguo; su recaptura está pendiente.

### Recibo de oro

`RoundFeedback` actúa en catálogo `f0p11g-1` y solo muestra recompensas con `receipt`. Presenta resultado y ronda, `credited` como cantidad principal, desglose Base/Interés/Racha/Victoria desde el recibo y exceso no acreditado cuando existe. No deriva el premio de una diferencia entre saldos. Usa `role="status"` y anuncio educado; se retira a los **6500ms**.

Al montar una restauración o reconexión se consume la identidad del último recibo sin repetirlo. `RewardSeen` conserva hasta 256 identidades en `tft-round-receipts-v1`, compuestas por scope e ID del recibo, con respaldo en memoria si el almacenamiento falla. Esta descripción procede del código; las capturas por sí solas no prueban persistencia ni idempotencia.

### Probabilidades

El nivel es un botón con nombre accesible, `aria-expanded` y relación con la tabla. Al pulsarlo abre/cierra la consulta; «Cerrar» devuelve el foco al botón. Escape también cierra y devuelve foco cuando el evento procede del panel. No es un diálogo modal ni captura el foco.

La tabla consume `TFT185_SHOP_ODDS`, muestra niveles 1–10 y resalta el nivel actual con fondo azul y cifras doradas. Explica que costes 4/5 carecen de personajes en el catálogo actual, indica el máximo real de esta partida y distingue los niveles restantes como referencia. Declara que son probabilidades nominales antes del stock y que un coste sin catálogo o agotado deja el hueco vacío sin nuevo sorteo ni redistribución. Esta revisión documenta su presentación; no verifica externamente la procedencia del parche 18.5.

## Do's and Don'ts

- Do conservar el mundo Neon Playground, la arena dominante, las cinco ofertas y las nueve plazas.
- Do acompañar cada señal con nombre, cantidad o estado procedente de la autoridad.
- Do preservar scroll interno, foco y movimiento reducido aunque la scrollbar esté oculta.
- No confundir una categoría nominal sin stock con una compra posible o una compra completada.
- No extender la escala del banquillo a cámara, casillas o cuerpos de combate.

## Evidencia y límites de esta revisión

Se leyeron los archivos de código citados, `PRODUCT.md`, `DESIGN.md`, el sidecar y el encargo P11G. Se inspeccionaron visualmente `hud-1280.png`, `hud-3840.png`, `inventory-scroll.png`, `odds.png`, `fusion-two.png`, `fusion-confirmed.png`, `round-3.png` y `round-9.png`, además de las medidas de los cinco viewports. Estos archivos están en `artifacts/p11g/visual/`.

Los registros de rondas confirman inventario total 2/4/6 en la captura final de rondas 3/6/9 (dos componentes en cada entrega) y recibos: ronda 3 victoria +11 (4/5/1/1); ronda 6 victoria +14 (5/5/3/1); ronda 9 derrota +11 (5/5/1/0). Estos ejemplos no prueban por sí solos la aleatoriedad del reparto, todas las ramas de empate, saturación, reconexión, latencia o restricciones de compra.

Hay deriva documental previa que se registra sin reparar: `PRODUCT.md` todavía describe una fase actual P6B.5-B y costes 1–3; el código y encargo actuales son posteriores. `DESIGN.md` llama a `neonHud.css` la cascada final, pero las adiciones P11G viven en `p11gHud.css`. Su sidecar conserva ejemplos y narrativa del HUD anterior y no contiene las interacciones nuevas. La regla Stable Foot normativa se refiere a combate y no describe este cambio específico de banquillo.

La revisión se limita a documentación, lectura de código y evidencias existentes. No se ejecutó runtime, no se realizaron acciones remotas y no se otorga aprobación final. El constructor principal recapturó el hueco sin catálogo y documentó las comprobaciones funcionales finales en `artifacts/p11g/functional.json`; el cierre de calidad pertenece al informe F0-P11G.
