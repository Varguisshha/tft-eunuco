# F0-P11A · Revisión visual

Fecha: 27 de octubre de 2026. Alcance: extensión ordinaria del HUD existente para el catálogo P11A, sus afinidades y sus personajes provisionales.

## Conclusión

**SHIP para el alcance visual P11A revisado.** El finish reviewer comunicó este resultado tras el segundo lote de correcciones. La lectura de los componentes, las diez capturas y los registros indicados abajo es coherente con ese cierre. Este documento registra evidencia existente; no constituye una nueva ejecución de navegador ni una aprobación del arte o balance definitivos.

La extensión conserva Mar de Cristal + Festival Pop C × Neon Playground: arena dominante, marcos azules angulares, superficies azul noche, acciones lima, economía magenta y moneda dorada. Los cuatro personajes con splash art real —DOLEA, VARGAS, JARAMILLO y FLORIN— conservan su protagonismo en las ofertas. Los otros treinta pertenecen a un roster provisional identificable, con nombre y marca explícita de provisionalidad; no se presentan como arte final.

## Autoridad y fuentes

Se consultaron `PRODUCT.md`, `DESIGN.md` y la referencia `document.md` de Impeccable. Es una documentación de la ampliación implementada dentro de la dirección aprobada; no abre una elección de identidad visual. `DESIGN.md` y `.impeccable/design.json` se preservan, sin regeneración de tokens ni reparación automática de drift.

Fuentes revisadas:

- `apps/web/src/match/affinities.css` y `AffinityBand.tsx`: iconos, desbordamiento, pistas, foco y panel de afinidades.
- `apps/web/src/match/Shop.tsx`: cinco ofertas, compra independiente de los controles de afinidad, disponibilidad y marcas provisionales.
- `apps/web/src/match/UnitInspector.tsx`: ficha superpuesta, aviso provisional y contenido desplazable.
- `apps/web/src/match/hud/neonHud.css`: cascada final, escala acotada y estados de oferta.

## Coherencia de la ampliación

El segundo lote sustituyó el teal y los radios introducidos en afinidades por los tokens Neon existentes, geometría cuadrada y DM Sans para datos. `affinities.css` referencia las superficies, bordes, sombras y foco semánticos del HUD. Los iconos colectivos usan marco claro sobre oscuro; los atributos únicos se distinguen por oro, ligera inclinación y texto «Única» o «Atributo único». El significado no depende sólo del color.

Las afinidades visibles se ajustan al ancho disponible; el control `+N` expone las restantes sin truncar la lista de origen. La captura de ocho afinidades muestra el panel sobre el HUD con nombres, clase y estado de efectos pendientes. El inspector presenta los detalles dentro de su scroll, conserva el cierre separado y no convierte la ficha en una columna que reduzca la arena.

Las tarjetas modernas son artículos con un botón de compra y botones de afinidad hermanos. Esto permite consultar afinidades sin anidar botones ni confundir esa consulta con reclutamiento. La intención «Reclutar» sólo aparece con `data-state='available'`, tanto al pasar el puntero como al enfocar la compra. «Falta oro» y «Tienda cerrada» mantienen su aviso, desaturación y compra deshabilitada.

Los treinta provisionales quedan diferenciados de los cuatro retratos reales por la presentación temporal y su identificación nominal. La ficha de Peibol declara «Parámetros temporales · Solo ataques básicos. Activa y pasiva pendientes de diseño». Se conserva esa honestidad también en la galería DEV. La captura del inspector muestra la compra aceptada, Peibol en reserva y el recibo «Reclutado».

## Evidencia de escritorio

Todas las capturas se encuentran en [`artifacts/p11/a`](../artifacts/p11/a/). Las dimensiones y medidas siguientes proceden de [`browser-metrics.json`](../artifacts/p11/a/browser-metrics.json).

| Captura | Ventana | Documento | Ofertas | Botones anidados |
| --- | --- | --- | --- | --- |
| [`hud-1280.png`](../artifacts/p11/a/hud-1280.png) | 1280 × 720 | 1280 × 720 | 5 | 0 |
| [`hud-1440.png`](../artifacts/p11/a/hud-1440.png) | 1440 × 900 | 1440 × 900 | 5 | 0 |
| [`hud-1920.png`](../artifacts/p11/a/hud-1920.png) | 1920 × 1080 | 1920 × 1080 | 5 | 0 |
| [`hud-2560.png`](../artifacts/p11/a/hud-2560.png) | 2560 × 1440 | 2560 × 1440 | 5 | 0 |
| [`hud-3840.png`](../artifacts/p11/a/hud-3840.png) | 3840 × 2160 | 3840 × 2160 | 5 | 0 |

No hay desplazamiento de documento en esos cinco tamaños. Las ofertas permanecen dentro de la ventana. Su ancho aumenta de aproximadamente 179 px a 220 px y se mantiene en torno a 220 × 192 px desde 1920 hasta 3840; el espacio adicional beneficia a la arena. A 1280 × 720 el lateral es más compacto y no muestra simultáneamente todas las sinergias; no se interpreta como una lista completa visible sin desplazamiento interno.

## Estados e interacción

| Evidencia | Resultado documentado |
| --- | --- |
| [`eight-affinities.png`](../artifacts/p11/a/eight-affinities.png) | Desbordamiento `+N` abierto, afinidades restantes legibles y distinción colectiva/única. |
| [`provisional-inspector.png`](../artifacts/p11/a/provisional-inspector.png) | Ficha superpuesta de Peibol con aviso temporal y afinidades; recibo de compra y unidad en banquillo. |
| [`gallery.png`](../artifacts/p11/a/gallery.png) | Galería DEV con recuento de 34 personajes, 30 provisionales y cero errores de asignación mostrados. |
| [`without-gold.png`](../artifacts/p11/a/without-gold.png) | Oro cero, aviso «Falta oro», precios de insuficiencia y compra deshabilitada. |
| [`shop-closed.png`](../artifacts/p11/a/shop-closed.png) | Fase combate, aviso «Tienda cerrada» y acciones de tienda deshabilitadas. |

[`states.json`](../artifacts/p11/a/states.json) registra `unaffordable` y `closed`, ambos con compra deshabilitada e intención de reclutamiento a opacidad `0`, además de `keyboardFocusRestored: true` y ningún error. El finish reviewer comprobó Enter, Escape y recuperación del foco tras el segundo lote. El código de `AffinityBand` permite activar el desbordamiento con botón nativo, enfoca su cierre al abrir y devuelve el foco al activador al cerrar con Escape o el botón de cierre; también permite descartar con clic exterior.

[`interactions.json`](../artifacts/p11/a/interactions.json) registra cinco tarjetas, 34 entradas de galería, el contenido textual de la ficha de Peibol con sus ocho afinidades y ningún error. `browser-metrics.json` también registra una lista de errores vacía. Son resultados de los escenarios capturados, no una prueba exhaustiva de accesibilidad o de todas las combinaciones del juego.

## Detector y límites

[`design-detect.json`](../artifacts/p11/a/design-detect.json) es la captura **anterior a los lotes de corrección**: 271 observaciones, de las cuales 268 son advisory y tres warning. No es un resultado final limpio. Contiene, entre otras, referencias al teal anterior de afinidades, ya sustituido en la fuente revisada.

Los tres warnings señalan CSS previo: borde inferior en `gameHud.css`, banda de recibo en `neonHud.css` y banda inferior del banquillo en `neonHud.css`. Se conservan como hallazgos del detector de aquella ejecución; este informe no los eleva a defectos nuevos ni afirma que se hayan eliminado. No se ejecutó reparación automática ni se modificó el contrato visual para silenciar el informe.

La imagen de galería sólo muestra su parte superior. El recuento de 34 procede del DOM registrado en `interactions.json`; esa captura no demuestra una inspección visual individual de las treinta representaciones provisionales. Su diferenciación provisional queda documentada por la implementación y la identificación del roster, sin certificar treinta artes definitivas. Tampoco se certifican aquí dispositivos móviles, zoom de navegador, contraste medido, lectores de pantalla, balance, multijugador o servicios externos.

El cierre se limita al HUD y a los estados P11A observados. No hubo operaciones de red, secretos, Railway ni Supabase en esta documentación.
