# Colocación contextual · F0-P11K

## Defecto reproducido

`ContextTooltip` recogía los obstáculos en orden DOM: inspector antes de barra de objetos. `placeSurface` penalizaba únicamente el área de superposición y conservaba el primer empate. Con el inspector abierto, una posición junto a su borde podía ganar a otra igualmente libre junto al inventario. No era un problema de z-index.

Caso real anterior, JARAMILLO abierto: distancia horizontal icono de Espadón → tooltip de 366,34 / 487,50 / 948,33 / 1588,33 / 2868,33 px a 1280 / 1440 / 1920 / 2560 / 3840 px. Capturas `artifacts/p11k/before-{width}.jpg` y `before-metrics.json`.

## Política por origen

- **Inventario:** detectar el ancestro `.item-vertical`, usar su borde derecho más 10 px como primera posición. La altura sigue al icono, ajustada al viewport. Solo se evalúan alternativas si esa posición no cabe o colisiona. Una ranura de la segunda columna no puede reducir el margen hasta el borde de la barra.
- **Inspector:** detectar `.local-inspector`, preferir su borde izquierdo menos 10 px y el ancho de la descripción; se conserva como referencia vertical la ranura consultada. No se coloca sobre las estadísticas del panel.
- **Otros contextos y sinergias:** comenzar junto al elemento consultado, evitar los obstáculos y resolver empates por distancia geométrica al origen. La barra de objetos sigue siendo un obstáculo para Ruman Trinity. El orden DOM de los obstáculos deja de decidir una posición lejana.
- **Todos:** margen de viewport 8 px, ancho máximo 336 px, scroll interno cuando el texto supera la altura disponible. El portal y z-index 120 permanecen iguales. La fuente se declara en `data-origin` para diagnóstico.

Las 30 mediciones de navegador verifican seis situaciones en cinco resoluciones: inspector cerrado, JARAMILLO, FLORIN, completo largo con inventario desplazado, objeto equipado y Ruman Trinity. Inventario → barra: 10 px en todas; equipado → inspector: 10 px; ninguna descripción queda fuera del viewport y Ruman Trinity no se superpone con la barra. Una sola descripción activa. Escape comprobado: cero superficies activas después de pulsarlo. Evidencia en `geometry-verification.json`, `after-metrics.json`, `additional-metrics.json` y capturas `after-*`.

## Interacción conservada

Se mantienen hover, foco, consulta por clic/táctil, detalles interactivos fijados, cierre por Escape/exterior, cierre al arrastrar, temporización de salida, portal accesible y movimiento reducido. No se añaden ventanas con X ni se aumenta el z-index. Las rutas del inventario, equipo y sinergias usan el mismo `ContextTooltip`.

## Visibilidad del elemento seleccionado

Se reprodujo un fallo adicional: mostrar los controles de selección reducía el scrollport y recortaba el último icono (removedor), dejando su centro fuera del área de arrastre. Un efecto de layout ajusta únicamente el scroll interno, sin desplazar la página, cuando cambian selección, estado o espera. Se conserva el sistema de iconos validado en P11J a 32/40/48/64. En P11K se comprobó que el removedor seleccionado permanece completamente visible en las cinco resoluciones. No se cambia el ancho de 112 px ni las dos columnas. La retirada por arrastre en combate se repitió con éxito tras corregirlo.
