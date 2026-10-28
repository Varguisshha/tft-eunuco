# P11H — extensión de diseño de objetos

## Overview

P11H refina la interfaz existente **Festival Pop C × Neon Playground**. Conserva la arena Mar de Cristal como protagonista, los marcos azules, las acciones lima, el oro semántico y la pareja FestivalPop/DM Sans. No establece otra identidad ni modifica la autoridad de `DESIGN.md` y `.impeccable/design.json`, que se han preservado.

El refinamiento sustituye la representación ordinaria de objetos por 44 ilustraciones originales vinculadas mediante manifiesto y unifica su descripción contextual. Los nombres e identificadores de catálogo no acreditan identidad gráfica con otro juego. Este documento registra el resultado visual y su evidencia; no certifica mecánicas, balance, persistencia, red ni despliegue.

## Colors

La bolsa y las descripciones reutilizan los tokens semánticos del HUD: superficie de superposición, texto claro, borde azul y foco lima. Los títulos de descripción usan oro. El arte incorpora acentos propios de cada objeto sobre tinta índigo, sin convertirlos en nuevos tokens globales de interfaz. La selección y los estados de destino conservan señales adicionales al color.

## Typography

Los títulos contextuales usan FestivalPop (18px); el cuerpo usa DM Sans (12px/1.5). Las explicaciones distinguen nombre, estadísticas y efecto en bloques separados. La bolsa conserva contadores legibles y cifras agrupadas; las ilustraciones no necesitan letras incrustadas para identificarse. El nombre accesible pertenece al control; la imagen es decorativa dentro de ese control.

## Layout

La bolsa permanente mide (112px) y dispone dos columnas de casillas de (44px), con separación de (6px). El desplazamiento queda dentro de la bolsa. La regla final está en `apps/web/src/match/hud/p11gHud.css`; las dimensiones anteriores presentes en `itemHud.css` no son la cascada final.

La descripción se monta en una capa fija del viewport. Su ancho preferido es (336px), con margen mínimo de (8px), separación del ancla de (10px) y desplazamiento interno si el contenido excede la altura disponible. `placement.ts` evalúa posiciones laterales y los límites de bolsa e inspector, minimiza intersecciones y acota la caja al viewport. Es una estrategia de colocación, no una garantía universal para cualquier contenido o tamaño futuro.

Las cinco capturas de Ruman Trinity y `final-metrics.json` confirman la corrección concreta de colisión con la bolsa:

| Viewport | Documento | Bolsa | Descripciones simultáneas |
| --- | --- | --- | --- |
| 1280 × 720 | 1280 × 720 | 112px | 1 |
| 1440 × 900 | 1440 × 900 | 112px | 1 |
| 1920 × 1080 | 1920 × 1080 | 112px | 1 |
| 2560 × 1440 | 2560 × 1440 | 112px | 1 |
| 3840 × 2160 | 3840 × 2160 | 112px | 1 |

No aparece desplazamiento del documento en esas medidas. El tooltip queda a la derecha de la bolsa y dentro del viewport en los cinco casos; no requiere ensanchar la bolsa ni reducir el campo. Las ventanas pequeñas conservan la densidad propia del HUD existente. `initial-metrics.json` es evidencia previa a la corrección y no valida este resultado.

## Elevation & Depth

Las superficies contextuales reutilizan la sombra de panel y un borde azul de (2px), sobre fondo opaco que protege la lectura frente a la arena. La entrada dura (100ms), con un desplazamiento de (3px); movimiento reducido elimina esa animación. No se escala la ilustración al abrir su descripción ni se reorganiza la arena.

## Shapes

Las 44 ilustraciones son assets cuadrados de (64 × 64px), con contornos oscuros, agrupaciones de píxeles nítidas, siluetas de equipamiento y luces contenidas. Las hojas `icons-32.png`, `icons-40.png`, `icons-48.png` e `icons-64.png` muestran las 44 entradas en orden de manifiesto. En las cuatro escalas las siluetas y familias de objetos permanecen diferenciables; los detalles finos se simplifican a (32px), sin convertir la representación ordinaria en un glifo abstracto. La legibilidad de familia no equivale a deducir un nombre o efecto exacto sin descripción.

`ItemIcon.tsx` resuelve la imagen por `sourceRecordId` mediante `itemIconAssets.json`. Un fallo de imagen conserva un fallback geométrico neutral. Ese fallback es recuperación, no el arte principal aprobado. El manifiesto `artifacts/p11h/icon-manifest.json` conserva rutas, dimensiones y hashes; su etiqueta histórica `original-generated-review-pending` no se ha reescrito en esta pasada documental.

## Components

**Bolsa de objetos.** Marco azul, fondo oscuro, cantidades agrupadas y dos columnas permanentes. Hover, selección y foco siguen la familia visual existente; los controles permanecen inmóviles al revelar contexto.

**ContextTooltip compartido.** `apps/web/src/match/overlays/ContextTooltip.tsx` mantiene un único propietario entre instancias. Hover y foco muestran descripción efímera; el puntero puede cruzar al contenido gracias al cierre diferido de (120ms). Escape, pulsación exterior e inicio de arrastre cierran la superficie. En dispositivos sin hover, la pulsación permite fijarla y repetirla la cierra. Las descripciones no incorporan X; el cierre persistente del inspector de unidad sigue siendo un control distinto. `aria-describedby` enlaza siempre el control con su descripción: cuando está inactiva, el contenido existe en un nodo `hidden`; al activarse se presenta en el portal. Así se mantiene la asociación descriptiva también en el render inicial sin añadir una segunda descripción visible. Las variantes interactivas conservan su papel de región.

**Objetos en inspector.** Reutilizan las mismas imágenes y la misma descripción contextual. `interactions.json` registra nombres y estadísticas para DOLEA, VARGAS, JARAMILLO, FLORIN y PEIBOL, además de cierre con Escape, arrastre y recuperación de imagen. Las capturas `equipped-*.png` y `combat-buy-bench.png` documentan el contexto de equipamiento y compra en combate; no prueban por sí solas el cálculo mecánico de sus efectos. `touch.json` y `touch-pinned-720.png` añaden evidencia de Chrome con entrada táctil a (1280 × 720): la pulsación fija el contexto y Escape lo cierra. `recipe-720.png` muestra el popover explícito de combinaciones con desplazamiento interno; `blocked-sterak.png` muestra el aviso textual de efecto bloqueado. El registro confirma movimiento reducido sin animación, cero descripciones visibles tras el cierre, documento de (1280 × 720) y cero errores JavaScript en esa sesión. Esta evidencia acredita la presentación del bloqueo, no la ejecución mecánica del efecto.

**Preservación visual.** Las capturas mantienen arena continua, personajes, cinco posiciones de tienda, nueve posiciones de banquillo y el inspector superpuesto. No se ha encargado una composición nueva. Splash y roster no forman parte del cambio visual documentado ni se recertifican con estas capturas.

## Do's and Don'ts

- Do conservar las 44 ilustraciones y su asociación estable por manifiesto.
- Do mantener bolsa de (112px), dos columnas y una sola descripción contextual activa.
- Do verificar colisión, foco y lectura con la bolsa y el inspector presentes cuando cambie el contenido.
- Do mantener nombre y explicación accesibles además de la silueta y el color.
- Don't sustituir el arte ordinario por el fallback geométrico.
- Don't atribuir a estas ilustraciones identidad visual oficial de TFT.
- Don't ampliar esta validación visual a mecánicas, red o despliegue.

### Evidencia y disposición

**Disposición visual: ship**, limitada al refinamiento de ilustraciones, bolsa y descripciones recogido en el paquete P11H. Evidencia inspeccionada: las cuatro hojas de iconos; las cinco capturas `ruman-{1280,1440,1920,2560,3840}.png`; `component.png`; `completed.png`; `equipped-peibol.png`; `combat-buy-bench.png`; `final-metrics.json`; `interactions.json`; `touch.json`; `touch-pinned-720.png`; `recipe-720.png`; `blocked-sterak.png`; los manifiestos y las fuentes de objetos, overlays y cascada P11G. Las evidencias de interacción se leen como registros existentes, sin ejecutar navegador ni verificar red en esta pasada.

### Desfase documental preexistente, sin reparación

`DESIGN.md` y el sidecar todavía describen un máximo de banquillo de aproximadamente (85.3px); la cascada P11G existente establece `--bench-height: calc(132 * var(--u))`, es decir (108.24px) con la unidad máxima vigente de (0.82px). Su inventario de componentes tampoco recoge la bolsa permanente de (112px) ni este tooltip compartido. Son diferencias anteriores a esta escritura; se consignan aquí sin cambiar los documentos normativos ni restaurar geometrías históricas. Los tamaños nominales del inspector que el propio sistema identifica como referencia no se tratan como defectos del render actual.
