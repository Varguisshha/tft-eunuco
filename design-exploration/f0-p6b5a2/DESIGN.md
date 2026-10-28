---
name: Festival Pop — F0-P6B.5-A2 (exploración sin paleta aprobada)
description: Geometría C confirmada; colores Royal Pop del frontmatter solo como ejemplo local no aprobado.
colors:
  example-royal-surface-primary: '#373078'
  example-royal-surface-elevated: '#413A7D'
  example-royal-surface-overlay: '#2D2762'
  example-royal-surface-canvas: '#191636'
  example-royal-surface-paper: '#D2C2DF'
  example-royal-border-primary: '#8465E8'
  example-royal-border-highlight: '#AF98E3'
  example-royal-border-frame: '#191636'
  example-royal-text-primary: '#F4EADB'
  example-royal-text-secondary: '#D8CECC'
  example-royal-text-onPaper: '#191636'
  example-royal-text-onAccent: '#191636'
  example-royal-accent-primary: '#46B9EC'
  example-royal-accent-secondary: '#F6C454'
  example-royal-button-default: '#6A51BA'
  example-royal-button-hover: '#6B55A8'
  example-royal-button-pressed: '#58449D'
  example-royal-button-active: '#46B9EC'
  example-royal-button-activeHover: '#60C0E9'
  example-royal-button-activePressed: '#41A5D6'
  example-royal-button-disabled: '#5D558C'
  example-royal-button-disabledText: '#CEC5C7'
  example-royal-button-disabledBorder: '#837AA0'
  example-royal-card-paper: '#F4EADB'
  example-royal-card-motif: '#C2AEE1'
  example-royal-card-motifInk: '#191636'
  example-royal-card-footer: '#373078'
  example-royal-card-trait: '#2D2762'
  example-royal-card-text: '#F4EADB'
  example-royal-card-code: '#191636'
  example-royal-game-playerLifeFill: '#267264'
  example-royal-game-rivalLifeFill: '#986035'
  example-royal-game-life: '#70E0A3'
  example-royal-game-enemyLife: '#FFB56F'
  example-royal-game-mana: '#66C9ED'
  example-royal-game-shield: '#B4DDF0'
  example-royal-game-gold: '#F6C454'
  example-royal-game-cost1: '#A9B5C7'
  example-royal-game-cost2: '#74E1CD'
  example-royal-game-cost3: '#FFB755'
  example-royal-game-danger: '#FF817A'
  example-royal-game-damagePhysical: '#FFD166'
  example-royal-game-damageMagic: '#B9A3FF'
  example-royal-game-threshold: '#74E1CD'
  example-royal-game-thresholdInk: '#152D2B'
  example-royal-game-track: '#171E2B'
  example-royal-tooltip-surface: '#2D2762'
  example-royal-tooltip-text: '#F4EADB'
  example-royal-result-surface: '#373078'
  example-royal-result-title: '#46B9EC'
  example-royal-counter-surface: '#2D2762'
  example-royal-counter-text: '#F4EADB'
  example-royal-material-highlight: '#C7B5E0'
  example-royal-material-shadow: '#191636'
  example-royal-phase-surface: '#D2C2DF'
  example-royal-phase-text: '#191636'
  example-royal-phase-timer: '#523F90'
  example-royal-emblem-surface: '#6A51BA'
  example-royal-emblem-text: '#F4EADB'
  example-royal-emblem-activeSurface: '#F6C454'
  example-royal-emblem-activeText: '#191636'
  example-royal-state-locked: '#46B9EC'
  example-royal-state-insufficient: '#FF817A'
  example-royal-state-selected: '#46B9EC'
typography:
  display:
    fontFamily: 'Pop, Bungee, sans-serif'
    fontSize: '51px'
    fontWeight: 700
  scene-logo:
    fontFamily: 'Pop, Bungee, sans-serif'
    fontSize: '30px'
    fontWeight: 700
    lineHeight: 1
    letterSpacing: '-.01em'
  timer:
    fontFamily: 'Pop, Bungee, sans-serif'
    fontSize: '37px'
    fontWeight: 700
  offer-name:
    fontFamily: 'Pop, Bungee, sans-serif'
    fontSize: '21px'
    fontWeight: 700
    lineHeight: 1
  action-label:
    fontFamily: 'Pop, Bungee, sans-serif'
    fontSize: '17px'
    fontWeight: 700
  economy-label:
    fontFamily: 'DM, DM Sans, sans-serif'
    fontSize: '21px'
    fontWeight: 700
    letterSpacing: '-.02em'
  body:
    fontFamily: 'DM, DM Sans, sans-serif'
    fontSize: '16px'
  trait-label:
    fontFamily: 'DM, DM Sans, sans-serif'
    fontSize: '13px'
    fontWeight: 700
    lineHeight: 1
rounded:
  square: '0'
  participant: '0 18px 18px 0'
  swatch: '2px'
spacing:
  compact: '4px'
  bench-gap: '6px'
  face-gap: '7px'
  offer-gap: '8px'
  panel-gap: '14px'
  scene-inset: '23px'
  inspector-inset: '27px'
components:
  example-royal-action:
    backgroundColor: '{colors.example-royal-button-default}'
    textColor: '{colors.example-royal-text-primary}'
    typography: '{typography.action-label}'
    rounded: '{rounded.square}'
    padding: '0 21px'
    height: '67px'
  example-royal-action-active:
    backgroundColor: '{colors.example-royal-button-active}'
    textColor: '{colors.example-royal-text-onAccent}'
    typography: '{typography.action-label}'
    rounded: '{rounded.square}'
    padding: '0 21px'
    height: '67px'
  example-royal-action-disabled:
    backgroundColor: '{colors.example-royal-button-disabled}'
    textColor: '{colors.example-royal-button-disabledText}'
    typography: '{typography.action-label}'
    rounded: '{rounded.square}'
    padding: '0 21px'
    height: '67px'
  example-royal-participant:
    backgroundColor: '{colors.example-royal-surface-paper}'
    textColor: '{colors.example-royal-text-onPaper}'
    rounded: '{rounded.participant}'
    padding: '12px 13px 14px'
    height: '91px'
---
# Design System: Festival Pop — exploración cromática local

## Overview

**Creative North Star: "Medallones de torneo · cerámica tintada · encastres pixelados"**

Festival Pop C es la base elegida por el usuario y su grupo: medallones de torneo, cerámica tintada y encastres pixelados. Esta documentación describe únicamente la exploración local F0-P6B.5-A2 terminada en código. Las seis interpretaciones cromáticas siguen pendientes de selección humana; ninguna constituye el sistema aprobado del juego.

La composición, las siluetas, los recursos y la tipografía de C se conservan para comparar color en igualdad de condiciones. El documento global del producto describe el HUD P6B.4 y sigue siendo independiente. La recomendación editorial de Royal Pop en el informe no concede aprobación ni comienza F0-P6B.5-B.

**Key Characteristics:**

- Base Festival Pop C confirmada; seis paletas sin aprobar.
- Un renderer compartido, tres vistas por familia y 18 composiciones PC.
- Medallones, placas recortadas y marcos SVG paramétricos heredados de C.
- Arte original, semánticas y datos de muestra constantes.
- Galería operativa; economía y combate ilustrativos.

Fuentes observadas: [contrato](comparison/CONTRACT.md), [CSS base de C](shared/base.css), [capa cromática](shared/palette.css), [renderer](shared/app.js), [galería](shared/gallery.js), [CSS de galería](shared/gallery.css) e [informe](comparison/REPORT.md). PRODUCT.md y DESIGN.md globales se consultan solo como contexto del producto. Este archivo y su sidecar son locales a esta carpeta.

## Colors

**Alcance del frontmatter:** sus claves `example-royal-*` reproducen los 64 valores de Royal Pop únicamente como ejemplo legible por herramientas. Son normativas para ese ejemplo de la exploración, nunca un valor predeterminado aprobado para el producto. No sustituyen los seis archivos normativos de familia. Cada familia contiene 64 tokens; hay 384 asignaciones en total. Las cinco semillas y los ajustes tonales reales figuran en cada JSON y PALETTE.md.

| Familia pendiente | Carácter del encargo | Fuente normativa local |
|---|---|---|
| Royal Pop | Fantasía moderna; violeta, cielo y oro | [64 tokens y mediciones](royal-pop/tokens.json) |
| Neon Playground | Arcade energético; azul, lima y magenta | [64 tokens y mediciones](neon-playground/tokens.json) |
| Tropical Party | Fresco y festivo; petróleo, turquesa, menta y coral | [64 tokens y mediciones](tropical-party/tokens.json) |
| Coastal Mint | Tranquilo y natural; petróleo, salvia y menta apagada | [64 tokens y mediciones](coastal-mint/tokens.json) |
| Soft Royal | Fantasía relajada; pizarra, lavanda, malva y champán | [64 tokens y mediciones](soft-royal/tokens.json) |
| Warm Sand | Cálido y discreto; grafito, terracota y arena | [64 tokens y mediciones](warm-sand/tokens.json) |

### Primary

`surface.primary` sostiene economía, inspector y placas; `border.primary` y `border.highlight` articulan marcos. `accent.primary` distingue acciones y foco. Los botones claros activos usan `text.onAccent`; los normales oscuros usan `text.primary`.

### Secondary

`accent.secondary` aporta la segunda voz de cada familia. `game.gold` mantiene la economía en la gama dorada; en Neon el magenta secundario no sustituye el oro. `button.default`, `hover` y `pressed` emplean rampas ajustadas para lectura, no necesariamente la semilla cruda del marco.

### Neutral

`surface.canvas`, `surface.elevated`, `surface.overlay` y `surface.paper` separan capas. `text.primary`, `text.secondary`, `text.onPaper` y `text.onAccent` identifican sus tintas reales. Tropical emplea texto cálido casi blanco derivado del coral; no usa coral puro como texto general.

**The Color Comparison Rule.** Cambiar únicamente los tokens cromáticos de la familia; conservar composición, tipografía, geometría, contenido y recursos de C.

**The Semantic Continuity Rule.** Conservar vida jade, rival ámbar, maná azul, escudo frío, peligro coral, daño físico amarillo, daño mágico lavanda y umbrales menta; costes uno plata, dos menta y tres oro, acompañados por números y pips.

Las 216 parejas con umbral pasan sus comprobaciones; otras seis corresponden a deshabilitados exentos. Se aplican 4.5:1 a texto normal y 3:1 a información gráfica esencial según las tablas de [contraste](comparison/CONTRAST.md). Esto no equivale a una auditoría WCAG completa. La leyenda sobre la arena conserva su sombra original y no tiene una afirmación de contraste global sobre imagen. Tampoco se han realizado pruebas de daltonismo o fatiga jugando.

## Typography

**Display Font:** Bungee, declarada localmente como `Pop`, con fallback sans-serif.
**Body Font:** DM Sans, declarada como `DM`, con fallback sans-serif; archivos locales de pesos 400 y 700.

La voz de Bungee es de torneo y medallón; DM Sans mantiene nombres de participantes, datos y explicaciones compactas. Barlow y Pixel permanecen en el CSS base histórico para A/B, pero las rutas de esta exploración fuerzan C y no los adoptan.

### Hierarchy

- **Display:** título de la lámina de detalles (frontmatter `display`); la galería utiliza Bungee a 27px y sus hojas a 24px, fuera del HUD.
- **Headline / cifras:** logo (frontmatter `scene-logo`), reloj (`timer`), ronda (29px), oro (39px) y contadores (26px).
- **Title:** nombres de ofertas (`offer-name`), inspector (25px) y nombres de participantes en DM Sans (20px, peso 700).
- **Body:** DM Sans (`body`); explicaciones del inspector (11px, interlineado 1.4), estados de sinergia (12px) y fichas auxiliares de galería (13px).
- **Label:** acciones (`action-label`), rasgos (`trait-label`) y Comprar XP (`economy-label`). La cascada final mantiene Comprar XP y su precio en DM Sans; no hereda el display estrecho de la regla inicial.

**The Two Voices Rule.** Usar Bungee para la identidad y las cifras destacadas, DM Sans para lectura y etiquetas económicas compactas, tal como resuelve la cascada de C.

Los tamaños pequeños originales son restricciones de la comparación, no mínimos recomendados para futuras pantallas. No se canonizan como norma de accesibilidad.

## Layout

Las láminas son lienzos fijos de 1920 × 1080. El ajuste de viewport escala uniformemente el lienzo mediante `min(ancho/1920, alto/1080)` y lo centra: no reorganiza el HUD. La arena se sitúa en x280/y66 y mide 1460 × 821.88px. El banquillo se ancla en x354/y696, mide 1164px de ancho y contiene nueve plazas de 80px de alto con separación de 6px. La tienda mide 231px de alto, tiene insets laterales de 23px y base a 44px; columnas de 246px, centro flexible y 225px, separadas por 14px. El centro contiene cinco ofertas separadas por 8px.

El inspector superpuesto está en x1530/y141, mide 360 × 654px y conserva su inset de 27px. No altera la arena. La lámina de detalles amplía los componentes sobre otro lienzo de 1920 × 1080, con padding de 45px 58px y cinco columnas. Sus cinco códigos hexadecimales cambian de ancho intrínseco por la tipografía proporcional; contenedores y componentes conservan sus medidas.

Por debajo de 1400px el CSS base heredado aumenta determinadas etiquetas antes del escalado del lienzo; no constituye un rediseño móvil de partida. La galería sí se reorganiza: seis vistas en tres columnas, dos bajo 1200px y una bajo 700px; el comparador doble pasa a una columna bajo 700px. Zoom 100% muestra 1920 × 1080 con desplazamiento; Ajustar cambia el tamaño de presentación, sin reemplazar las capturas.

## Elevation & Depth

El volumen se expresa por capas SVG, cantos recortados, luces interiores y sombras heredadas. No es una promesa de material nuevo por familia. El marco base usa `drop-shadow(0 5px 3px #11132a45)`; el inspector usa `drop-shadow(0 12px 12px #17132866)` y los detalles `drop-shadow(0 6px 6px #11132850)`. Estas sombras difusas forman parte del prototipo C; no se infiere una regla de sombras de desplazamiento duro.

La capa cromática desactiva el brillo por filtro de acciones y cartas: aplica tokens de superficie por estado. Conserva el desplazamiento de la acción al hover (−2px) y al pulsar (+3px), con transición de 110ms ease-out. Movimiento reducido elimina transiciones; la galería elimina además su desplazamiento suave. La viñeta de C no se recolorea y la iluminación original de Mar de Cristal permanece intacta.

## Shapes

Placas cerámicas con cortes asimétricos, medallones y encastres pixelados definen C. Los marcos son SVG paramétricos copiados de C, con `preserveAspectRatio="none"`; no son ilustraciones nuevas ni siluetas alternativas por paleta. Los participantes combinan esquinas redondeadas parciales con máscara recortada; el radio del frontmatter no sustituye esa máscara. Rasgos, fase, banquillo y placas inferiores mantienen sus polígonos originales.

Los iconos son SVG originales en rejilla 32 × 32, con trazo C de 2.8 y unión bevel. Los costes añaden pips de rombo; las ofertas conservan su medallón. Los retratos y sprites usan `image-rendering: pixelated`. No se añade ninguna decoración exclusiva a una familia.

## Components

### Buttons

Marcos de C, etiqueta e icono SVG; el botón base conserva alto y padding del frontmatter. Las variantes de ubicación mantienen sus medidas reales: cabecera (61px), Comprar XP (57px), controles de tienda (65px), venta (56px) y lámina de estados (77px). Renovar, Bloquear y la acción principal usan `button.active` según el selector existente; el botón normal usa `button.default`. Hover, pressed, active y disabled tienen tokens explícitos. Foco visible de 3px con separación de 4px y color `accent.primary`. El atributo `disabled` impide activación, pero los controles económicos habilitados siguen siendo muestras sin operaciones de juego.

### Cards / Containers

Cinco ofertas, cada una con marco compartido, fondo `card.paper`, motivo diagonal `card.motif`, retrato original y placa `card.footer`. Nombre a la izquierda, número e icono dorados a la derecha; coste también en borde y pips. Rasgos sobre la placa con `card.trait` y `card.text`. La partida utiliza ofertas de 231px y la lámina de detalles las amplía a 300px sin introducir una familia distinta de marcos. Los participantes conservan nombre, vida, etiqueta y barra jade/ámbar con pistas redundantes.

### Chips

Los rasgos y emblemas conservan su recorte de C. Activo e inactivo se distinguen mediante placa, medallón, fracción y etiqueta explícita; los umbrales del inspector usan `game.threshold` para los alcanzados y superficie oscura para los pendientes. No se deduce actividad únicamente por el color.

### Inspector and counters

La ficha de VARGAS conserva retrato, estadísticas, habilidad, rasgos, Resaca 0/5 y Depredador 5 con hitos 2/4/6. Son datos ilustrativos fijos, no eventos ni progreso calculados por esta herramienta. Seleccionar una oferta o unidad navega al inspector; el aspa cierra esa vista. No se atribuyen Escape, gestión de foco del juego ni simulación a este prototipo.

### Supplementary gallery specimens

Tooltip, resultado, contador y etiquetas de selección, bloqueo, oro insuficiente y deshabilitado se muestran en la galería con tokens de la familia seleccionada. Sus marcos siguen la misma fórmula C. Son muestras estáticas separadas de las 18 láminas; Victoria no ejecuta reglas de resultado. El sidecar ofrece ocho ejemplos reducidos de componentes, rotulados como Royal Pop no aprobado, para inspección documental; no son una nueva UI del juego.

### Gallery navigation

Las tres vistas comparten selección en ambas columnas. Selección de familia, comparación, vuelta al conjunto, zoom real y ajuste funcionan en la herramienta. Su envoltorio neutral y foco dorado pertenecen a la galería, no a una séptima paleta candidata.

## Do's and Don'ts

### Do:

- **Do** mantener las seis familias y sus fuentes de tokens disponibles hasta la selección humana.
- **Do** conservar arena, sprites, cifras, cinco ofertas y nueve plazas de C para comparar color.
- **Do** acompañar categorías y estados con texto, cifras, iconos y pips.
- **Do** tratar tooltip, resultado, contador y estados adicionales como muestras de galería separadas de las 18 composiciones.
- **Do** mantener explícitos el foco, los estados deshabilitados y el movimiento reducido.

### Don't:

- **Don't** interpretar el ejemplo Royal Pop del frontmatter, la selección inicial del comparador o la recomendación del informe como aprobación.
- **Don't** trasladar esta exploración al HUD real, modificar el sistema global ni iniciar F0-P6B.5-B antes de la elección humana.
- **Don't** cambiar recorte, zoom, proyección, imagen o viñeta de Mar de Cristal por paleta.
- **Don't** convertir datos estáticos, contadores o controles de economía de muestra en afirmaciones sobre una partida real.
- **Don't** declarar conformidad WCAG completa, comodidad prolongada o identidad de píxeles entre capturas a partir de esta evidencia.

La evidencia técnica existente confirma recursos fuente byte a byte por SHA-256 y geometría estable frente a C. Las capturas proceden de JPEG del navegador convertidos a PNG sin redimensionar; esto no produce identidad bit a bit entre sus píxeles. Véanse [verificación técnica](comparison/technical-verification.json), [recursos](comparison/asset-verification.json) y [notas de captura](comparison/capture-notes.md). Los 18 PNG corresponden a seis familias por tres vistas de 1920 × 1080; los montajes y suplementos son evidencia adicional. El pie histórico F0-P6B.5-A se conserva para igualdad de contenido, no como identificador de esta nueva fase.
