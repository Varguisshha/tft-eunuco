# F0-P6B.5-A — Tres identidades visuales

## Diagnóstico de partida

El HUD de P6B.4 organiza las funciones y tiene componentes comunes, pero su identidad depende demasiado de placas oscuras homogéneas, líneas metálicas finas y pequeñas etiquetas. La misma geometría se repite en acciones, contexto y economía; cuesta distinguir sus materiales. Las siluetas de personaje y la arena tienen más personalidad que el resto de la interfaz. El contraste de esos recursos frente a los prototipos de K-01/R-03 también queda a la vista.

Se revisaron el repositorio, GAME_VISUAL_SYSTEM.md, GAME_UI_SPEC.md, la arena original y los retratos reales. `current-1920.png` es la captura real de la partida DEV pausada al iniciar esta fase. Esa vista presenta una anomalía de cámara al redimensionar el canvas en pausa; no se ha corregido ni utilizado como argumento artístico. `baseline-p6b4-1920.png` conserva la captura válida de cierre de P6B.4 para una comparación justa de identidad.

## Alcance y contenido común

La aplicación principal no se ha rediseñado. Todo vive bajo `design-exploration/f0-p6b5a/`, servido de forma independiente en el puerto4185. No se importa el juego, no se ejecutan transacciones ni se lee/escribe su almacenamiento. Sin dependencias nuevas en package.json.

Las tres composiciones muestran la misma formación de ocho figuras, participantes Vargas100/Florin88, ronda03, preparación18.4s, oro52, nivel4, XP4/10, cuatro desplegados, nueve posiciones de banquillo con tres ocupadas y cinco ofertas VARGAS3/DOLEA2/K-011/R-032/DOLEA2. Los contadores son datos de muestra consistentes con una traza de VARGAS: Resaca0/5, bonus20%/3s, Depredador5 y umbrales2/4/6. No representan una partida conectada ni una simulación nueva.

Los retratos DOLEA/VARGAS y la imagen Mar de Cristal se copiaron byte a byte. K-01/R-03 se exportaron de la lista exacta de rectángulos existente. Se conserva la proporción de la imagen y de los retratos; no hay nuevos personajes, repintado, arena generada ni cambio de perspectiva. Las posiciones son una composición estática sobre la misma imagen, sin cambiar coordenadas del juego ni implementar un tablero alternativo.

## Referencias analizadas

- **TFT PC**: [captura y análisis de Dignitas](https://dignitas.gg/articles/understanding-how-tempo-changes-the-game). Se inspeccionó visualmente una captura de escritorio: cinco ofertas continuas, rasgos inferiores, nombre/precio separados, economía contigua y banquillo inmediato. Estos principios de organización permanecen; no se copiaron recursos.
- **Wargroove2**: [portfolio de Midio, director artístico](https://www.midio.art/wargroove2). Se inspeccionaron las dos propuestas de UI publicadas allí: profundidad por capas, relación entre marcos/figuras, color de selección y tipografía separada entre título/detalle. Son estudios del equipo artístico de un juego comercial, no se afirma que ambas fueran interfaces finales publicadas.
- **21st**: búsqueda de HUD/cartas y lectura de [8bit Game Progress](https://21st.dev/@theorcdev/components/8bit-game-progress). Solo se recoge la separación de lectura entre vida/maná/XP; no se instaló el componente ni su contenedor de dashboard. La generación alojada estaba deshabilitada; las propuestas se compusieron localmente con recursos originales y geometría vectorial propia.

## A — Festival Táctico

Una competición social tratada como un festival de barrio. Cintas de fase, entradas de reclutamiento con troquel curvo y perforación, insignias circulares y marfil cálido. El tejido y el esmalte describen la intención de material; estas láminas la representan con capas vectoriales, no con pintura o textura final. Barlow Condensed aporta energía de marcador deportivo y permite palabras largas. Naranja/coral señalan acción; turquesa, progreso; violeta, soporte.

La firma es el **ticket de personaje**: el cuerpo tiene mordidas laterales y una trama radial discreta detrás del arte. La tarjeta no depende de un rectángulo con un borde coloreado. Los botones repiten el troquel con una cara de esmalte y el inspector convierte esa entrada en una ficha vertical.

Fortalezas: lectura directa, personalidad alegre, buen puente con la plaza soleada. Debilidades: mucha superficie clara en tienda y lateral; exige moderar adornos en una integración definitiva para no competir con habilidades. Algunos detalles festivos son gráficos vectoriales, no texturas pintadas.

## B — Pixel Pop Arena

Cartuchos con dirección de esmalte azul, cantos escalonados, luces de borde y contactos de coste; acabado vectorial, pendiente de textura final si se elige. El retrato ocupa una ventana fría; la placa del nombre se hunde en un zócalo violeta. Silkscreen se reserva a display; DM Sans mantiene la lectura de detalle. Iconos redibujados sobre una retícula angular.

La firma es el **cartucho encajado**: ocho píxeles de esquina y un canto interior distinguen contenedor, ventana y fascia. Botón pulsado comprime su posición; activo cambia a menta; disabled pierde saturación y retiene texto.

Fortalezas: integración natural con sprites, alta reconocimiento del coste3 dorado y sistema fácil de extender. Debilidades: display más ancho y rígido; la estética retro puede dominar la identidad social. La tipografía de acciones económicas debe mantenerse en sans en controles estrechos.

## C — Festival Pop

Una identidad de torneo con medallones de coste y juntas asimétricas. Dirección de superficie cerámica dividida diagonalmente, canto claro, base oscura y remates como encastres; material interpretado en vector, sin textura cerámica pintada. Bungee tiene voz de rótulo; se combina con DM Sans. El contraste entre crema/amatista ordena el tiempo, el retrato y la acción.

La firma es la **placa con medallón y encastre**: no mezcla simplemente los colores de A/B. Sustituye el ticket por una unidad gráfica de premio/insignia, usa alternancia clara/oscura y una moneda romboidal con remate. El marco exterior describe categorías de coste; el nombre y la moneda conservan el mismo lugar.

Fortalezas: una familia coherente para tarjetas, controles e inspector, carácter de videojuego fuerte. Debilidades: contornos de alto contraste y remates que pueden sumar ruido; Bungee necesita espacio. Los marcadores de participante requieren más cuidado al reducir tamaño.

## Comparativa razonada

Valoraciones artísticas orientativas de esta entrega, no resultados de un estudio con jugadores ni certificaciones de calidad comercial.1 es insuficiente y10 es un referente excepcional. La viabilidad contempla que las propuestas son recursos y composición, no sistemas ya integrados.

| Criterio | A | B | C |
|---|---:|---:|---:|
| Calidad artística | 8.5 | 8 | 8.5 |
| Originalidad | 8.5 | 7.5 | 8.5 |
| Sensación de videojuego PC | 8.5 | 8.5 | 8.5 |
| Diversión y personalidad | 9 | 8 | 8.5 |
| Legibilidad | 9 | 8 | 8 |
| Integración con Mar de Cristal | 9 | 8 | 8.5 |
| Compatibilidad con sprites | 8.5 | 9 | 8.5 |
| Calidad de tarjetas | 8.5 | 8 | 8.5 |
| Calidad de botones | 8.5 | 8 | 8.5 |
| Escalabilidad a personajes futuros | 8 | 9 | 8.5 |
| Viabilidad de implementación | 9 | 8.5 | 8 |

**Recomendación: A — Festival Táctico**, por la combinación de lectura, calidez y relación con Mar de Cristal. C es una alternativa fuerte si se busca una marca más contundente y un lenguaje de torneo; B conviene si la prioridad es el carácter retro. La híbrida no recibe una ventaja automática: en esta entrega A funciona mejor en lectura y B ofrece la ampliación más simple de ventanas/marcos.

La decisión final permanece abierta. No se ha aplicado ni canonizado ninguna identidad en DESIGN.md de producción.

## Entregables y ubicación

Raíz: `/Users/vargas/Proyectos/TFT EUNUCO/design-exploration/f0-p6b5a/`.

| Carpeta | Entregables |
|---|---|
| festival-tactico | screen-1920.png, inspector-1920.png, components-1920.png, screen-1280.png, index.html, DIRECTION.md, assets |
| pixel-pop-arena | los mismos entregables para B |
| festival-pop | los mismos entregables para C |
| comparison | informe, contrato, captura actual/baseline y mediciones |
| shared | fuentes SIL OFL, imagen y retratos exactos, iconos/maquetación de los previews |

`index.html` en la raíz es la galería. Sus pestañas cambian simultáneamente las tres vistas; cada imagen abre a resolución nativa. Los previews permiten abrir/cerrar el inspector, sin compras ni persistencia. Las PNG se pueden abrir directamente sin servidor. README.md incluye cómo servir la carpeta.

## Validación y límites

Nueve composiciones principales1920×1080: cinco tarjetas por vista, nueve posiciones de banquillo en pantallas completas/inspectores, imágenes cargadas y etiquetas correctas. Se realizó una primera inspección, una corrección conjunta y confirmación; mediciones en comparison/measurements-1920.json. Banquillo termina en800px y tienda comienza en805px. Botones sin desbordamiento medido. Cinco estados visibles en las láminas.

Comprobación adicional de las tres direcciones a1280×720, incluida la recomendada A; nombres, precios y sinergias conservados, letra de rasgo18px antes de escala2/3 (12px efectivos). No hay scroll de página. Son composiciones ajustadas al lienzo, no una implementación responsive del juego; otros tamaños y pruebas de usabilidad quedan fuera de esta fase. No se prueban combates, reglas, FPS ni guardados mediante estos mockups.

Las fuentes nuevas son Barlow Condensed, Silkscreen y Bungee de Google Fonts con SIL OFL incluida; DM Sans procede del paquete ya existente y conserva licencia. Las transiciones del preview son breves110–120ms y respetan reduced-motion. Son sugerencias de respuesta, no una producción completa de animaciones/audio. Los prototipos provisionales siguen siendo visualmente menos detallados que DOLEA/VARGAS.

La suite614 de P6B.4 se conserva como resultado histórico; no se presenta como una ejecución nueva de esta fase. Se comprueban sintaxis del preview, cargas de recursos, consola y aislamiento por diff. No se modifican archivos de producción ni se añaden dependencias al juego. No se realiza push ni se empieza F0-P6B.5-B.

## Cierre de revisión y estado Git

La revisión independiente final emitió **ship** para entregar esta exploración, tras inspeccionar las nueve láminas recapturadas con fuentes cargadas y las tres capturas720p. Los dos ajustes materiales quedaron resueltos: XP B/C legible y marcador de C con nombre/vida/subtítulo separados. No equivale a aprobación de una dirección ni a una validación del juego implementado.

Consola del preview consultada sin errores. Sintaxis JavaScript comprobada. Dimensiones de PNG registradas en image-dimensions.json. Las copias de arena y retratos verifican SHA256 contra sus originales; hashes y licencias en shared/assets/provenance.json. Las advertencias del detector respecto a paletas/fuentes de producción son esperables al explorar identidades nuevas; no se sustituyó el diseño del producto para silenciarlas.

Base28169cc; rama local `codex/f0-p6b5a-visual-exploration`. Solo se guarda la carpeta de exploración. Archivos apps/packages/docs/DESIGN.md/PRODUCT.md/dependencias intactos; recursos ajenos sin incorporar. Sin push. El commit de cierre se comunica junto al informe.
