# F0-P11B · revisión visual del inventario

Fecha: 27-10-2026. Extensión ordinaria del mundo **Festival Pop C × Neon Playground**, con la arena Mar de Cristal como superficie dominante. Este informe documenta la implementación y la evidencia entregada; no redefine la identidad. Se preservan `DESIGN.md` y `.impeccable/design.json`, sin reparar ni normalizar drift en esta pasada.

## Resultado y alcance

El FinishReviewer comunicó **SHIP** después del último lote de correcciones: las recetas muestran sus dos ingredientes y el motivo «Falta: …» o «Pendiente de verificación · no se consume»; la cabecera con cierre permanece visible y funcional al desplazar el panel hasta su extremo inferior. El veredicto se refiere a esta superficie y a los recorridos comprobados. No equivale a certificar el catálogo completo ni toda la accesibilidad del juego.

Fuentes leídas: `PRODUCT.md`, `DESIGN.md`, la referencia Document de Impeccable y `docs/F0_P11B_ITEM_VERIFICATION.md`. Implementación revisada: `apps/web/src/match/items/ItemHud.tsx`, `itemHud.css`, `itemInteraction.ts` e `ItemIcon.tsx`.

## Coherencia con el mundo aprobado

La nueva bandeja ocupa una columna estrecha junto al lateral izquierdo. Conserva el azul noche, los marcos azules, el texto lavanda y las cantidades doradas; la selección y los destinos válidos usan lima. FestivalPop da jerarquía al título del detalle y DM Sans sostiene recetas, explicaciones y cifras. Los glifos geométricos originales distinguen componentes y componen visualmente los objetos; su condición provisional se declara en el detalle. No se introducen imágenes de TFT.

Las cinco splashcards inferiores, el banquillo de nueve plazas y la arena continua conservan su protagonismo. El detalle aparece superpuesto junto al inventario; no fuerza una columna nueva ni redimensiona el campo. La bandeja permanente agrupa existencias por tipo y muestra cantidades. El catálogo P11B no presenta las tres pestañas del inventario anterior; el código conserva esa vista para catálogos históricos.

El rail mide (58px) y utiliza ranuras de (42 × 42px). El espacio entre clasificación/sinergias y objetos es de aproximadamente (12px) en las cinco medidas. La lista se desplaza internamente y contiene el encadenamiento de scroll. El detalle limita su altura y también admite desplazamiento interno. Su cabecera sticky mantiene el título y el cierre de (26 × 26px) accesibles durante ese recorrido.

## Evidencia de composición

Capturas inspeccionadas en `artifacts/p11/b/`:

| Captura | Ventana | Tarjetas | Pestañas | Separación rail/objetos | Documento |
| --- | --- | --- | --- | --- | --- |
| `hud-1280.png` | 1280 × 720 | 5 | 0 | 12px | Sin scroll global |
| `hud-1440.png` | 1440 × 900 | 5 | 0 | 12px | Sin scroll global |
| `hud-1920.png` | 1920 × 1080 | 5 | 0 | 12,016px | Sin scroll global |
| `hud-2560.png` | 2560 × 1440 | 5 | 0 | 12,016px | Sin scroll global |
| `hud-3840.png` | 3840 × 2160 | 5 | 0 | 12,016px | Sin scroll global |

`browser-metrics.json` registra dimensiones de documento iguales a las de cada ventana, cinco tarjetas y cero botones anidados en cada tamaño; su lista de errores está vacía. La diferencia fraccional de separación procede de las medidas de cajas del navegador. El contenido de la bandeja ronda (991px), frente a alturas disponibles de (260, 382, 506, 840 y 990px): el inventario denso se resuelve dentro de su propia superficie. En monitores grandes la arena absorbe el espacio adicional y el HUD conserva una escala contenida.

## Evidencia de interacción

| Recorrido | Evidencia y lectura |
| --- | --- |
| Dos componentes sobre una unidad, con combinación automática | `equipped-craft.png` muestra el estado posterior; `browser-metrics.json` registra `equippedCraft: true`. La confirmación visual depende del inventario autoritativo. |
| Combinar componentes en la bolsa por arrastre a 1920 | `bag-craft.png` muestra la confirmación posterior; `browser-metrics.json` registra `bagCraft: true`. |
| Combinar mediante clic Vara → Lágrima a 1280 | Recorrido de navegador comunicado como probado por el ejecutor. No posee un booleano dedicado en los JSON entregados; no se infiere solo de una captura. |
| Retirar todo el equipo con un removedor | `removed.png` muestra objetos devueltos y removedor a cero; `browser-metrics.json` registra `removerConsumedOnce: true`. El controlador confirma el consumo por su registro e identidad de unidad. |
| Recetas desplazadas a 1280 | `recipes-scrolled-1280.png` muestra ambos ingredientes, «Falta: Vara innecesariamente grande» y cierre visible. `recipe-metrics.json` registra ocho fórmulas de ingredientes, motivo visible y cero errores. |
| Recetas en el extremo inferior a 1280 | `recipes-bottom-1280.png` conserva título/cierre y muestra la advertencia del Sable-pistola hextech pendiente. `recipe-metrics.json` registra `closeVisible: true` y `closed: true`; el ejecutor confirmó además el cierre desde el extremo inferior. |

Las acciones pasan por previsualización de reglas, envío y lectura del estado confirmado. El controlador bloquea un segundo envío mientras hay uno pendiente; la animación no decide consumo ni fabricación. El panel anuncia estado mediante texto y `role="status"`, ofrece nombres accesibles con cantidades, foco visible, Escape y controles desactivados cuando faltan ingredientes o verificación. El código de recetas exige dos instancias distintas incluso para ingredientes iguales. Estos hechos de código complementan las capturas, sin sustituir pruebas completas de teclado o lector de pantalla.

## Avisos y límites pendientes

`design-detect.json` contiene cinco avisos tipográficos de severidad advisory en `itemHud.css`: tamaños literales (10px, 8px, 10px, 14px y 20px) fuera de la rampa que reconoce el detector. Se dejan registrados sin corregir el código ni modificar el sistema de diseño para silenciarlos. El texto descriptivo de DESIGN ya contempla datos compactos, pero eso no elimina automáticamente el aviso del detector ni acredita por sí solo legibilidad universal.

El usuario autorizó expresamente mantener **18.5, actualización del 27-10-2026**, con seis objetos pendientes desactivados. Según `F0_P11B_ITEM_VERIFICATION.md`, hay ocho componentes y treinta objetos completos con ejecución de la especificación reconstruida; seis resultados permanecen bloqueados. No se afirma fidelidad total de los treinta y seis objetos. Un rechazo de fabricación pendiente prueba conservación y bloqueo, no el efecto desconocido. Las condiciones, fuentes y límites del motor se documentan en ese informe.

Esta pasada inspeccionó archivos, capturas y registros existentes; no volvió a ejecutar el navegador ni la batería de pruebas de juego. Una captura demuestra composición y estado visible, pero no demuestra por sí sola arrastre real, consumo único, cierre operativo o efectos de combate. Esos resultados se atribuyen a los registros y a los recorridos comunicados por sus ejecutores. Las capturas corresponden a una prueba DEV aislada; no acreditan servicios remotos ni una partida de producción. La cobertura de tamaños se limita a los cinco escritorios indicados; no certifica móvil, todos los niveles de zoom, contraste medido, movimiento reducido o tecnologías asistivas.

Solo se escribe este informe. No se realizan operaciones de red, Railway, Supabase, secretos, despliegue ni cambios en otros archivos.
