# F0-P10A · tarjetas con múltiples afinidades

Se conserva Festival Pop × Neon Playground, las cinco imágenes existentes y nombre/coste en las esquinas inferiores. No se regeneran imágenes ni se cambia su encuadre. El cambio se limita al catálogo f0p10a-1; las tarjetas históricas conservan su presentación y definiciones.

`AffinityBand` mide su ancho mediante ResizeObserver y calcula el número de iconos que cabe. No existe máximo estructural de ocho. Reserva un espacio para +N cuando sea necesario. Cada icono tiene nombre accesible y tooltip por hover, foco o clic. Las únicas tienen contorno dorado y las colectivas, turquesa. Los glifos nuevos son SVG originales de presentación y se identifican como provisionales donde corresponde.

+N abre una lista accesible en un portal con las afinidades restantes y su tipo/estado; Escape o cerrar devuelve el foco al disparador. Los iconos y +N son hermanos del botón de compra, dentro de un article: no hay botones anidados ni compras al consultar información. Toda la lista también figura en la descripción accesible de la oferta. Los estados de falta de oro, tienda cerrada y compra siguen usando la autoridad existente.

El inspector ofrece todos los nombres en details desplegables: tipo, miembros, progreso actual, siguiente umbral, mecánica, estado de recompensa y motivo de reserva por escalón. Tiene scroll propio. El rail muestra progreso sin llamar activas a las afiliaciones sin efecto; conserva contadores de efectos reales. La galería DEV lista los 34, sus afinidades y campos pendientes, sin acciones que introduzcan borradores al combate. Su módulo desaparece del build público.

## Evidencia reproducible

`PLAYWRIGHT_MODULE=/ruta/a/playwright node scripts/roster/verify_ui.mjs` con Vite local en 127.0.0.1:5197 (o `P10A_WEB_URL`). `artifacts/p10a/browser-metrics.json` registra cinco resoluciones, cinco splash arts cargados, límites de iconos, ausencia de scroll global y de botones anidados. La prueba también verifica tooltip con teclado, +N con única, foco al cerrar, que consultar iconos no compra, las siete afinidades del inspector y los 34 registros DEV. Se fuerza una banda de 130 px para probar las ocho de Peibol.

Las capturas son una referencia DEV explícita con reloj fijo y definiciones reales; no se presentan como una partida competitiva. `shop-1280/1440/1920/2560/3840.png`, `overflow-unique.png`, `tooltip-florin.png`, `inspector-all-affinities.png`, `inspector-jaramillo.png`, `pending-trait-progress.png`, `roster-drafts.png`, `eight-affinity-overflow.png`. No hay modificación del balance mediante el fixture: usa transacciones de oro y formación y reservas validadas del pool real.
