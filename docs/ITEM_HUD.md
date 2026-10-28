> **P11K:** tooltips próximos al origen: inventario a la derecha de su barra e inspector a la izquierda, separados 10 px. Removedor competitivo inicial, arrastre/clic, confirmación y resultados visibles; scroll interno conserva entero el icono seleccionado. [Colocación](TOOLTIP_POSITIONING_RULES.md), [removedor](ITEM_REMOVER_COMPETITIVE.md). Barra 112 px, iconos LOCAL/público y estética conservados.

> **P11J:** mismo `ItemIcon`, tema TFT exclusivamente LOCAL y selector global EUNUCO en el laboratorio. Fallback automático a los 44 originales; barra de 112 px, dos columnas, selección y tooltips conservados. Los pips de ocupación del canvas siguen siendo indicadores genéricos, no ilustraciones de objetos. [Informe](F0_P11J_REPORT.md).

> **Contrato vigente P11H:** contenido/economía `f0p11h-1`, combate `f0p11h-1`, objetos `f0p11h-18.5-1`. 32 completos disponibles y cuatro bloqueados. [Auditoría y límites](ITEM_FIDELITY_AUDIT.md), [arte individual](ITEM_ICON_ASSET_MANIFEST.md), [entrega y tooltips/compras](F0_P11H_REPORT.md). El cuerpo siguiente es histórico y conserva las reglas de su versión; no describe por sí solo el catálogo vigente.

## Consolidación F0-P8F · 26-10-2026

Revalidado con navegador real a 1280×720, 1440×900, 1920×1080, 2560×1440 y 3840×2160: cinco cartas y ausencia de scroll global. Compra, XP, arrastre, receta, equipamiento, cuarto objeto, venta, fusión y recuperación mantienen sus contratos. No se rediseña el HUD.

[Informe, evidencias, comandos y límites](F0_P8F_STABILIZATION_REPORT.md). Los apartados siguientes se conservan como historial.

---

# HUD de objetos · F0-P8E

## Alcance y autoridad

Extensión de Festival Pop × Neon Playground sobre `8a6850b2bfa5064e44b9eba765bcf991c24b4d1e`, en `codex/f0-p8e-item-hud`. El catálogo de partida es `f0p8d-florin-1`; su catálogo de objetos continúa siendo `f0p8d-1`. No cambian recetas, estadísticas, reparto, economía ni simulación.

La superficie usa modo Operate: consultar, combinar y equipar durante preparación. `ItemHud.tsx` lee `LocalSession.getMatch().items`; no mantiene otra copia del inventario. `ItemInteraction` comparte selección y estado de petición entre bandeja, banquillo, canvas e inspector mediante una instancia por sesión.

## Composición

El botón Objetos queda encima del banquillo, fuera de las cinco ofertas. El total cuenta componentes y completos sueltos; los pendientes se indican aparte. La bandeja plegable muestra pestañas Componentes, Objetos y Pendientes. Las dos primeras conservan las capacidades del catálogo (16 + 16), con ocho columnas y huecos numerados; pendientes no inventa una tercera capacidad. Recuperar envía `move_item` y respeta espacio real.

El panel mide 380 px (350 px hasta 1450 px), con altura base de 360 px y límites compactos por altura. Los detalles y recetas desplazan internamente. La consulta lateral de recetas muestra ocho parejas, ingredientes, resultado, descripción y disponibilidad; abrirla no fabrica nada. En ventanas menores se conserva la bandeja plegable, sin reducir toda la arena para alojarla.

El inspector muestra tres ranuras, expandiendo cada objeto según `content.slotCost`. El objeto de coste tres ocupa visualmente las tres; no son tres instancias. El equipo rival es de solo lectura y procede de la formación pública. `LocalSession.equipmentFor` entrega a `BoardScene` categorías por ranura; `visualAdapter` dibuja cuadrados huecos para componente y rellenos para completo. Los sprites y animaciones de DOLEA, VARGAS, JARAMILLO y FLORIN mantienen sus recursos y límites de interacción.

## Datos, iconos y avisos

`resolveItemCatalog` usa la versión del inventario; `itemDescription` produce cifras y efectos desde la definición. Las etiquetas visibles se forman con nombres técnicos españoles, sin nombres oficiales. Los 44 iconos son SVG geométricos originales provisionales: ocho glifos y 36 composiciones de parejas. Véase [manifiesto](ITEM_ICON_MANIFEST.md).

Los avisos leen `distributions` del propietario, se deduplican por ID y muestran ronda, cantidad y ubicación pendiente si corresponde. La primera observación de registros existentes dice «Recompensa ya recibida». Solo se presenta el último reparto nuevo del lote; el aviso dura ocho segundos y puede cerrarse. No concede nada. Véase [contrato de interacción](ITEM_INTERACTION_CONTRACT.md).

## Accesibilidad y movimiento

Los controles tienen etiquetas, foco interior visible, selección `aria-pressed`, pestaña `aria-selected` y mensajes `role=status`. Hover y foco abren información; marcas C/O, ranuras numeradas, textos y bordes discontinuos acompañan el color. La alternativa al arrastre es seleccionar objeto, elegir personaje y pulsar Equipar. Cancelar o Escape borra selección; Escape también cierra bandeja, detalle y recetas. No se anuncia una devolución de foco programática que el código no implemente.

La pulsación desplaza 1 px; selección usa contorno; confirmación dura 220 ms y entrada de reparto 180 ms. `prefers-reduced-motion` desactiva animaciones y transiciones de la bandeja. La confirmación depende del estado aceptado, nunca del final de una animación.

## Evidencia y límites

`artifacts/p8e/browser.json` registra cinco ofertas y ausencia de scroll global a 1440×900, 1920×1080, 2560×1440, 3840×2160 y 1280×720. `interactions.json` registra tres ranuras, rechazo del cuarto objeto, venta, arrastre al banquillo, Escape y fusión. Capturas: `inventory-*.png`, `empty.png`, `crafted.png`, `auto-combined.png`, `three-equipped.png`, `fourth-rejected.png`, `sold-returned.png`, `fusion-returned.png`, `round3.png`, `round6.png` y `keyboard-*.png`. Son evidencias concretas, no un veredicto final de cierre ni sustituto de la validación multijugador.

Las fixtures `createItemHudReference` viven en `development/neonReference.ts`: empty, components, full, all, two, three y fusion. Reutilizan concesión y comandos existentes dentro del límite DEV. Los avisos de ronda de esas fixtures representan un estado ya recibido; no acreditan por sí solos una concesión real del servidor.

## Comparación con el sistema vigente

Se han consultado PRODUCT.md, DESIGN.md y `.impeccable/design.json`; se preservan sin modificación. La bandeja reutiliza superficies, bordes azules, lima semántica, DM Sans y geometría angular. Mar de Cristal y splash arts conservan su papel. No se promueven decisiones de esta superficie a tokens globales.

Deriva documental observada: PRODUCT.md mantiene una descripción de fase anterior y servidor futuro; el sidecar no enumera los nuevos componentes, tamaños ni tiempos de P8E. Los colores por categoría de glifo y sus bordes viven en `ItemIcon.tsx`, fuera del mapa de tokens global. Se registra esta extensión local sin regenerar ni reparar los archivos del sistema como efecto lateral.
