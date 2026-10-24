---
name: TFT EUNUCO — Festival Pop C × Neon Playground
description: Juego PC de arena continua, placas vectoriales azules y retratos originales con acciones lima.
colors:
  surface-primary: '#222653'
  surface-elevated: '#2e315c'
  surface-overlay: '#1c1f44'
  surface-canvas: '#0f1125'
  surface-paper: '#c3cefc'
  border-primary: '#5078f5'
  border-highlight: '#8ea7f9'
  border-frame: '#0f1125'
  text-primary: '#f4f3ff'
  text-secondary: '#d4d4e5'
  text-onPaper: '#0f1125'
  text-onAccent: '#0f1125'
  accent-primary: '#c7ef60'
  accent-secondary: '#f56dc3'
  button-default: '#4262c9'
  button-hover: '#4b64b7'
  button-pressed: '#3750a5'
  button-active: '#c7ef60'
  button-activeHover: '#cef078'
  button-activePressed: '#b1d459'
  button-disabled: '#4c4f75'
  button-disabledText: '#cacadd'
  button-disabledBorder: '#767898'
  card-paper: '#f4f3ff'
  card-motif: '#aabcfa'
  card-motifInk: '#0f1125'
  card-footer: '#222653'
  card-trait: '#1c1f44'
  card-text: '#f4f3ff'
  card-code: '#0f1125'
  game-playerLifeFill: '#267264'
  game-rivalLifeFill: '#986035'
  game-life: '#70e0a3'
  game-enemyLife: '#ffb56f'
  game-mana: '#66c9ed'
  game-shield: '#b4ddf0'
  game-gold: '#f6c454'
  game-cost1: '#a9b5c7'
  game-cost2: '#74e1cd'
  game-cost3: '#ffb755'
  game-danger: '#ff817a'
  game-damagePhysical: '#ffd166'
  game-damageMagic: '#b9a3ff'
  game-threshold: '#74e1cd'
  game-thresholdInk: '#152d2b'
  game-track: '#171e2b'
  tooltip-surface: '#1c1f44'
  tooltip-text: '#f4f3ff'
  result-surface: '#222653'
  result-title: '#c7ef60'
  counter-surface: '#1c1f44'
  counter-text: '#f4f3ff'
  material-highlight: '#b2c2fb'
  material-shadow: '#0f1125'
  phase-surface: '#c3cefc'
  phase-text: '#0f1125'
  phase-timer: '#334d9d'
  emblem-surface: '#4262c9'
  emblem-text: '#f4f3ff'
  emblem-activeSurface: '#f6c454'
  emblem-activeText: '#0f1125'
  state-locked: '#c7ef60'
  state-insufficient: '#ff817a'
  state-selected: '#c7ef60'
  phase-urgent: '#9b2825'
  ground-lower: '#201a3b'
  ground-side: '#1e1936'
typography:
  display:
    fontFamily: 'FestivalPop, sans-serif'
    fontSize: '29px'
    fontWeight: 700
    lineHeight: 1.1
  clock:
    fontFamily: 'FestivalPop, sans-serif'
    fontSize: '37px'
    fontWeight: 700
  economy-gold:
    fontFamily: 'FestivalPop, sans-serif'
    fontSize: '39px'
    fontWeight: 700
    lineHeight: 1
  offer-title:
    fontFamily: 'FestivalPop, sans-serif'
    fontSize: '21px'
    fontWeight: 700
  offer-price:
    fontFamily: 'FestivalPop, sans-serif'
    fontSize: '23px'
    fontWeight: 700
  button:
    fontFamily: 'FestivalPop, sans-serif'
    fontSize: '17px'
    fontWeight: 700
  body:
    fontFamily: 'DM Sans, sans-serif'
    fontSize: '12px'
    lineHeight: 1.5
  label:
    fontFamily: 'DM Sans, sans-serif'
    fontSize: '11px'
rounded:
  square: '0'
spacing:
  compact: '5px'
  offer-gap: '8px'
  dock-gap: '14px'
  control-inline: '21px'
components:
  game-button-blue:
    backgroundColor: '{colors.button-default}'
    textColor: '{colors.text-primary}'
    typography: '{typography.button}'
    rounded: '{rounded.square}'
    padding: '0 21px'
    height: '67px'
  game-button-lime:
    backgroundColor: '{colors.button-active}'
    textColor: '{colors.text-onAccent}'
    typography: '{typography.button}'
    height: '65px'
  game-button-disabled:
    backgroundColor: '{colors.button-disabled}'
    textColor: '{colors.button-disabledText}'
  settings-control:
    backgroundColor: '{colors.button-default}'
    textColor: '{colors.text-primary}'
    width: '65px'
    height: '61px'
  shop-offer:
    backgroundColor: '{colors.card-paper}'
    textColor: '{colors.card-code}'
    rounded: '{rounded.square}'
    height: '231px'
  trait:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.text-primary}'
  bench-slot:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.text-secondary}'
    rounded: '{rounded.square}'
  inspector:
    backgroundColor: '{colors.surface-primary}'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.square}'
    width: '360px'
    height: '654px'
---

# Design System: TFT EUNUCO

## Overview

**Creative North Star: "Festival Pop C × Neon Playground"**

Partida local es una escena de videojuego PC colorida y táctil: placas vectoriales angulares, marcos azules, letras de bloque y retratos originales rodean la arena continua Mar de Cristal. El azul noche organiza la densidad; lima, magenta y oro tienen cometidos distintos. La dirección aprobada sustituye el HUD de carbón, jade y latón de P6B.4; la recomendación Royal Pop del informe anterior no tiene autoridad.

El mundo se construye con los SVG originales del prototipo C, Bungee local y DM Sans; los acabados proceden de capas, diagonales, juntas, luces y sombras contenidas. El juego real conserva cámara, hexágonos, animación y estados autoritativos. Arena de pruebas mantiene su propósito y composición independientes.

**Key Characteristics:**

- Arena continua protagonista y contexto superpuesto.
- Marcos azules biselados, diagonales de retrato y medallones de diamante.
- Cinco ofertas con rasgos sobre la placa inferior, nombre a la izquierda y coste a la derecha.
- Lima para acciones; magenta como detalle económico; oro para moneda y estrellas.
- FestivalPop para jerarquía de juego y DM Sans para datos y explicación.
- Progreso, estadísticas y estados procedentes de la autoridad del juego.

Fuentes normativas implementadas: `apps/web/src/match/hud/neonTokens.css`, `neonHud.css`, `GameFrame.tsx`, `GameButton.tsx`, `GameIcon.tsx`, `ContentIcon.tsx`, `Shop.tsx`, `UnitInspector.tsx` y `LocalGame.tsx`. `neonHud.css` es la cascada final de esta superficie. Los 64 colores semánticos aprobados se conservan literalmente en el frontmatter, con las tres adiciones implementadas de urgencia y lavado de fondo. El foco es un alias de `accent-primary`; sombras y movimiento están en el sidecar.

La referencia aprobada es `design-exploration/f0-p6b5a2/neon-playground/{screen-1920,inspector-1920,components-1920}.png` y `tokens.json`. `artifacts/p6b5b/CONTRACT.md` registra la migración y sus adaptaciones. La composición de esta primera superficie vive en su brief; no obliga a copiar el HUD sobre otras pantallas.

## Colors

Los valores del frontmatter son normativos. Usar las familias semánticas aprobadas y sus ajustes de contraste, sin mezclar paletas exploratorias.

### Primary

- **Azul noche y azul eléctrico:** superficies de juego, marcos y controles secundarios. El borde luminoso mantiene legibles las siluetas sobre la arena.
- **Lima de acción:** renovar, bloqueo, inicio y selección/foco. Sus variantes hover/pressed conservan la jerarquía de acción.

### Secondary

- **Magenta Festival:** detalle del marco económico y remate de la placa de fase; no se extiende indiscriminadamente al HUD.
- **Lavanda de papel:** fase, clasificación y diagonales claras de tarjetas, con tinta oscura.

### Tertiary

- **Oro de juego:** moneda, precios, estrellas y medallones activos; costes uno/dos/tres usan sus propios bordes gris, turquesa y ámbar.
- **Semánticas de combate:** vida verde, vida rival naranja, maná cian, escudo azul claro, daño físico dorado y mágico lavanda. Cada señal conserva su etiqueta o cifra.
- **Peligro y urgencia:** peligro coral para avisos sobre fondo oscuro; rojo oscuro específico para temporizador urgente sobre la placa clara.

### Neutral

- **Fondo, superposición y texto:** azul casi negro, azul elevado, blanco lavanda y texto secundario claro sostienen la densidad.
- **Lavado inferior:** plum sutil del prototipo, con laterales translúcidos; se aplica al fondo HUD sin teñir ni recalibrar la arena.

**The Semantic Accent Rule.** Lima indica acción/selección; magenta acentúa la economía; oro indica moneda/estrellas. No intercambiar estas funciones ni extenderlas a todas las superficies.

**The Trait Contrast Rule.** Los rasgos llevan respaldo oscuro y permanecen inmediatamente sobre la placa inferior; el retrato nunca reduce su lectura.

## Typography

FestivalPop es el alias local del archivo Bungee aprobado (`/assets/fonts/bungee.ttf`, SIL OFL). DM Sans se sirve desde la dependencia local ya existente. El nombre del alias no implica otra fuente. Las cifras del HUD son tabulares.

A escala de referencia 1920: ronda (29px), temporizador (37px), oro (39px), nombres de oferta (21px), precios (23px), nombre del inspector (25px), acciones (17px) y contadores (26px) usan FestivalPop. DM Sans sostiene datos y explicaciones (10–15px; cuerpo de habilidad 12px/1.5). Comprar XP usa DM Sans en su control económico. La monoespaciada queda para diagnóstico.

El HUD escala con la unidad proporcional definida en Layout; tamaños mínimos de 9–14px protegen datos y controles según el rol. En escritorios de altura hasta 800px se compactan títulos y contenido secundario; desde 2200px se amplían datos internos del inspector. No convertir las explicaciones extensas en titulares de bloque.

## Layout

La superficie PC ocupa `100dvh`, a ancho completo, con capas absolutas y sin scroll del documento en los cinco objetivos 1280 × 720, 1366 × 768, 1440 × 900, 1920 × 1080 y 2560 × 1440. La unidad de composición es `clamp(0.58px, 0.0520833333vw, 1.5px)`; porcentajes verticales conservan las relaciones del prototipo. Las medidas detalladas de fase, dock, banquillo e inspector se documentan en el brief de la superficie.

El canvas conserva cámara/proyección y 56 casillas legales. Su reserva sobre el banquillo mantiene el borde jugable visible; la posición de la ilustración difiere justificadamente del montaje estático. Abrir el inspector no crea columna ni reduce el canvas. Rasgos, tooltip, inspector y registro admiten desplazamiento interno; el cierre de ficha queda fuera de su contenido desplazable.

En alturas desktop hasta 800px se compactan títulos y retrato del inspector, se oculta el rol secundario de oferta y se conserva la economía. Por debajo de 1100px existe adaptación en flujo de 850px con escala 0.65px; hasta 650px usa 1120px, clasificación en dos columnas, reclutamiento apilado, ofertas con scroll horizontal e inspector fijo. Esos tamaños pequeños permiten scroll de documento y no sustituyen el objetivo PC aprobado.

## Elevation & Depth

La profundidad procede de capas SVG nítidas: marco oscuro, trim azul, relleno, carril de luz y juntas. Las sombras de marco y panel registradas en el sidecar son contenidas. El campo conserva la imagen y perspectiva originales; el lavado inferior pertenece al fondo periférico del HUD.

Los controles responden con 110ms: hover asciende 2px y pressed baja 3px. El recibo aceptado dura 260ms; compra y ficha conservan sus breves confirmaciones, con salida de ficha de 120ms. El retrato no se agranda al hover. Movimiento reducido elimina transiciones/animaciones del HUD y mantiene las señales textuales. La animación de combate continúa leyendo eventos y snapshots reales.

## Shapes

GameFrame reutiliza la geometría C con esquinas recortadas, juntas escalonadas y varios contornos rellenos. Los viewBox conservan proporciones por función: oferta (258 × 231), control (230 × 70), economía (246 × 231), inspector (360 × 654) y control compacto (65 × 61). El último tiene trazado proporcionado para su caja; no estirar el control largo hasta un cuadrado. Las diagonales y medallones de diamante son parte de esta familia, con radio cero.

GameIcon y los glifos de contenido usan rejilla de 32 unidades, trazo de 2.8, extremos redondos y uniones biseladas. Los glifos del prototipo aprobado conservan asociaciones estables de contenido; `CONTENT_ICONS` retiene las rutas originales y fallback neutral para IDs no resueltos o fallos de carga. Iconos decorativos acompañan etiquetas legibles; las acciones sin texto reciben nombre accesible.

El pixel-art conserva contención, pies y píxeles nítidos. No sustituir originales de DOLEA o VARGAS.

**The Stable Foot Rule.** Los personajes con asset real usan multiplicador visual 1.4 sobre perspectiva; los dos manifiestos actuales normalizan el cuerpo a 64px. Los provisionales no crecen, las estrellas no añaden escala y los límites originales de interacción se conservan mediante `originalHitBounds`. Un nuevo asset exige comprobar su normalización antes de heredar el factor.

## Components

- **GameButton:** marco C, icono, etiqueta y coste opcional. Azul para XP/secundarias y lima para renovar/bloquear/iniciar cuando el estado real lo permite. Hover, pressed, active, disabled y focus conservan el marco y texto legible con opacidad completa. Foco de 3px y separación de 4px. `aria-pressed` expresa bloqueo, que conserva ofertas y permite comprar. Recibo/success solo tras acción aceptada; no hay audio conectado.
- **Ajustes y navegación:** placa compacta 65 × 61 con contorno continuo, summary con nombre y menú de enlaces/acciones nombrados. Las opciones se muestran en un panel elevado; mantienen teclado y foco visibles.
- **Oferta:** cinco retratos dominantes sobre diagonal lavanda/blanca, borde por coste, medallón, rasgos inferiores, nombre/precio. Estados `available`, `unaffordable`, `unavailable`, `closed` y `empty`; falta de oro usa texto, compra aceptada confirma nombre/«Reclutado», renovar limpia recibos. Compra real de una estrella aunque la imagen exploratoria mostrara otra apariencia.
- **Banquillo:** nueve plazas biseladas, número accesible, estrellas semánticas y plus claro en vacías. Selección, destino de arrastre y hover usan superficie azul y borde lima; no añaden casillas ni cambian hit bounds.
- **Sinergias:** icono, nombre, miembros/umbral y estado textual. Inactivas sobre azul elevado; activas sobre papel claro con medallón dorado. Hover/foco/click comparten tooltip de contribuyentes, descripción y umbrales; Escape lo cierra. No confundir créditos o eliminaciones con miembros.
- **Inspector:** superposición 360 × 654 a escala de referencia, con retrato/nombre/estrellas, rol/coste, fila de valores con iconos y barras de vida/maná apiladas de ancho completo. Estadísticas efectivas AD/AP/críticos, defensa, alcance, habilidad Activa/Pasiva/Mixta, afinidades, contadores y acciones siguen valores reales. DOLEA muestra Volumen Sucio; VARGAS, Copita Perhaps y Blackhaus RPP. Admite scroll interno, cierre persistente, Escape y retorno de foco cuando corresponde.
- **GameCounter v1:** icono, nombre, valor, objetivo cuando existe, umbrales y explicación. Solo mostrar denominador con `max`; un próximo umbral no es máximo. Acumulando/listo/activo, consumo, bonos y duraciones siguen el snapshot. No fabricar progreso para reproducir la ilustración.
- **Campos y superficies secundarias:** selects con texto claro, superficie elevada y borde azul; tooltips, resultados y registro usan tokens propios. Consola DEV conserva gating y almacenamiento separados, fuera del build público.

## Do's and Don'ts

### Do:

- Do mantener la arena continua y dominante, con el contexto superpuesto.
- Do reutilizar los 64 colores aprobados, los SVG C y la pareja FestivalPop/DM Sans.
- Do conservar originales de DOLEA/VARGAS, pies, perspectiva y límites de interacción.
- Do acompañar color con nombres, cifras y estados reales.
- Do mantener cierre persistente, foco visible, Escape y movimiento reducido.
- Do preservar asociaciones de iconos de contenido y fallback neutral.

### Don't:

- Don't mezclar Royal Pop u otras paletas exploratorias en Neon Playground.
- Don't redimensionar el canvas ni recalibrar cámara o hexágonos para copiar el montaje estático.
- Don't mover rasgos encima del retrato ni separar nombre/coste de la placa inferior.
- Don't copiar personajes/recursos de TFT ni reemplazar originales por arte inventado.
- Don't inventar contadores, progreso o estados para igualar una captura de referencia.
- Don't aplicar crecimiento por estrellas o a sprites provisionales ni añadir audio por defecto.
