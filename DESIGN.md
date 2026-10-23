---
name: TFT EUNUCO — F0-P5.1
description: Partida local operativa, arena dominante jade y ámbar; Arena técnica independiente.
colors:
  hud-background: '#111e18'
  hud-text: '#e4ebda'
  hud-muted: '#b2c3b5'
  hud-line: '#405447'
  hud-jade: '#c4daa6'
  hud-gold: '#e8cd83'
  hud-focus: '#ecdfb1'
  hud-inspector: '#1b2c24f7'
  hud-player-south: '#23382bed'
  hud-player-north: '#382f21ed'
  hud-bench: '#1c3025'
  hud-bench-selected: '#344b30'
  cost-one: '#9fb780'
  cost-two: '#97b8c4'
  cost-three: '#d3b585'
  arena-background: '#101916'
  arena-surface: '#19271f'
  arena-line: '#314238'
  arena-jade: '#b8d4a3'
  arena-amber: '#d2ab73'
  arena-invalid: '#e09a7c'
typography:
  round:
    fontFamily: 'Space Grotesk, sans-serif'
    fontSize: '26px'
    fontWeight: 700
    lineHeight: 1
  clock:
    fontFamily: 'Space Grotesk, sans-serif'
    fontSize: '25px'
    fontWeight: 700
  offer-title:
    fontFamily: 'Space Grotesk, sans-serif'
    fontSize: '18px'
    fontWeight: 700
  body:
    fontFamily: 'DM Sans, sans-serif'
    fontSize: '12px'
    lineHeight: 1.5
  label:
    fontFamily: 'DM Sans, sans-serif'
    fontSize: '11px'
rounded:
  hud-control: '3px'
  shop-top: '4px 4px 0 0'
  inspector: '5px'
spacing:
  compact: '8px'
  control-inline: '12px'
  section: '16px'
  wide: '24px'
components:
  button-primary:
    backgroundColor: '{colors.hud-jade}'
    textColor: '#16241b'
    rounded: '{rounded.hud-control}'
    padding: '8px 12px'
  button-secondary:
    backgroundColor: 'transparent'
    rounded: '{rounded.hud-control}'
    padding: '8px 12px'
  player-banner:
    backgroundColor: '{colors.hud-player-south}'
    rounded: '{rounded.hud-control}'
    padding: '9px 8px'
  inspector:
    backgroundColor: '{colors.hud-inspector}'
    textColor: '{colors.hud-text}'
    rounded: '{rounded.inspector}'
    padding: '16px'
    width: '280px'
  bench-slot:
    backgroundColor: '{colors.hud-bench}'
    rounded: '3px 3px 0 0'
    padding: '2px'
  shop-offer:
    backgroundColor: '#22372a'
    rounded: '{rounded.shop-top}'
    padding: '6px 9px'
---

# Design System: TFT EUNUCO

## Overview

**Creative North Star: "La arena como centro de juego"**

Partida local es un modo operativo de videojuego: la arena ocupa el campo central y los controles necesarios para jugar se concentran en sus márgenes. La dirección confirmada mantiene oscuridad, jade y ámbar, una lectura compacta y pixel-art original. F0-P5.1 documenta la composición implementada, sin introducir arte nuevo ni convertir el HUD en una colección de paneles.

Arena de pruebas sigue siendo una superficie técnica independiente de preparación y diagnóstico. Conserva su tablero, reserva inferior, panel lateral y controles de simulación; no hereda la composición de Partida local. La actualización sustituye la antigua descripción de Partida local F0-P3, donde la economía estaba arriba.

**Key Characteristics:**

- Arena dominante, sin panel derecho permanente.
- Rail de participantes compacto y flotante a la izquierda.
- Nueve plazas de banquillo; cinco ofertas y economía en la franja inferior.
- Inspector contextual superpuesto; abrirlo o cerrarlo no redimensiona el canvas.
- Retratos existentes de DOLEA y sprites provisionales reutilizados, sin producción artística nueva.

Esta documentación registra exclusivamente F0-P5.1. Fuentes: `apps/web/src/match/gameHud.css`, `LocalGame.tsx`, `UnitInspector.tsx`, estilos base y `PixelUnit.tsx`. La captura `artifacts/f0p51/after-1440x900.png` muestra la composición sin selección: confirma el tablero despejado, el rail izquierdo y la franja inferior. El comportamiento de la ficha y los breakpoints se describe a partir del código; esa captura no acredita por sí sola interacción ni todos los tamaños.

## Colors

La oscuridad verde integra tablero y HUD. El jade identifica el lado propio y las acciones principales; el ámbar distingue al rival y el oro concentra la lectura económica. Los valores normativos están en el frontmatter.

### Primary

- **Jade del HUD** (`hud-jade`): acción de inicio, fase y selección de texto. Es el acento de Partida local, distinto del jade técnico de Arena.
- **Oro del HUD** (`hud-gold`): estrellas y recompensas. La lectura económica conserva sus tratamientos específicos del código.

### Secondary

- **Costes uno, dos y tres** (`cost-one`, `cost-two`, `cost-three`): línea inferior de las ofertas, en verde, azul grisáceo y ámbar. El coste también aparece como número.
- **Jade y ámbar técnicos** (`arena-jade`, `arena-amber`): identidad original de los lados de Arena, conservada sin sustituir sus estilos.
- **Rechazo cobre** (`arena-invalid`): destino inválido de Arena, acompañado de cruz y texto.

### Neutral

- **Fondo profundo, texto marfil, texto secundario y límite del HUD** (`hud-background`, `hud-text`, `hud-muted`, `hud-line`): lectura y separación sin multiplicar cajas.
- **Superficies de participantes y ficha** (`hud-player-south`, `hud-player-north`, `hud-inspector`): capas semitransparentes que flotan sobre el campo.
- **Banquillo y selección** (`hud-bench`, `hud-bench-selected`): plazas compactas con borde inferior y realce de selección.
- **Foco marfil** (`hud-focus`): contorno visible de botones y desplegables de resumen del HUD.
- **Fondo, superficie y límite técnicos** (`arena-background`, `arena-surface`, `arena-line`): paleta previa de Arena de pruebas.

## Typography

Space Grotesk presenta títulos, ronda, reloj, precios y nombres de ofertas; DM Sans sostiene controles y texto. Ambas se sirven localmente desde Fontsource. La monoespaciada queda para coordenadas y datos de diagnóstico. Los números del HUD usan cifras tabulares.

La jerarquía es operativa: ronda (26px), reloj (25px), fase (17px), nombres de tienda (18px), texto de ficha y controles (12px), metadatos (11px). La cifra de oro llega a 27px. La ficha usa un título de 25px. No hay titulares promocionales dentro de la partida. A partir de 1700px, los nombres de tienda suben a 20px; hasta 1099px bajan a 15px y hasta 650px a 13px.

## Layout

### Partida local — desktop desde 1100px

La navegación ocupa 38px. El HUD llena el alto restante (`calc(100dvh - 38px)`) y no tiene límite máximo de ancho. Su cuadrícula de una columna distribuye cabecera (48px), campo flexible, banquillo (68px) y reclutamiento (164px), con padding de 16px a los lados y 12px abajo.

El canvas ocupa todo el campo. Títulos, pie y zoom flotan sobre él; no consumen filas de su tamaño final. El rail izquierdo mide 156px, se sitúa a 16px del borde superior y permite desplazamiento interno si falta alto. Muestra participantes y vida, recompensa contextual y acceso al registro. No reserva una columna para la ficha.

El banquillo conserva nueve columnas y separación de 5px, con margen interior lateral `max(10px, 13%)`. La zona inferior distribuye economía (190px) y tienda flexible, separadas por 16px. La tienda contiene cinco ofertas en paralelo, con separación de 8px; sus controles ocupan 150px a la derecha. Oro, interés, nivel, XP y racha viven en esta franja inferior.

La ficha se superpone a la derecha del campo: ancho de 280px, top de 36px, right de 8px y bottom de 32px, con scroll interno. Su apertura y cierre no participan en el cálculo del canvas. No hay backdrop de la ficha.

Desde 1700px, las filas pasan a 52px / campo flexible / 86px / 192px; el padding es 24px lateral y 16px inferior. La economía mide 220px, los controles de tienda 180px y la ficha 310px. Los retratos de tienda crecen a 80 × 100px.

### Flujo por debajo de 1100px

Hasta 1099px el HUD usa alto automático, mínimo del viewport restante y filas auto / 440px / 80px / 200px. La cabecera envuelve sus controles. La economía mide 150px; los controles de tienda pasan a una fila superior de 34px. Se ocultan nombres del banquillo, probabilidades de tienda y metadatos secundarios de las ofertas; permanecen las nueve plazas, las cinco ofertas, sus nombres, precios y estados.

Hasta 650px el campo mide 410px y el banquillo 72px; la franja inferior entra en flujo vertical. El rail se vuelve horizontal, el tablero comienza 75px más abajo, y la ficha conserva su superposición con ancho `min(280px, 100%)`, top de 80px y bottom de 28px. Economía usa dos columnas y la tienda 190px de alto. Esta adaptación permite flujo y scroll de página; no afirma una experiencia móvil distinta ni validación en todos los tamaños.

### Arena de pruebas — superficie independiente

Conserva tablero dominante, reserva inferior y panel lateral; en pantallas estrechas el panel pasa debajo. Agrupa controles de simulación encima del tablero. Sigue siendo una herramienta de diagnóstico y duelo controlado, no la dirección compositiva de Partida local.

## Elevation & Depth

La profundidad del terreno procede de las losetas elevadas y sus trazos hexagonales. El borde del pedestal es geometría del tablero, no un acento de tarjeta. El HUD se diferencia mediante tonos, transparencias y líneas finas; evita marcos gruesos alrededor del campo.

La ficha contextual usa la sombra estructural `0 12px 28px #050e0b66` para separarse del tablero. Entra en 140ms con `cubic-bezier(0.16, 1, 0.3, 1)`, opacidad y desplazamiento horizontal de 8px; sale en 120ms con `ease-out`. Los botones transicionan color, fondo y borde en 120ms y se desplazan 1px al pulsar. La preferencia de movimiento reducido anula esas transiciones y la animación de ficha. No se introducen animaciones ambientales; los efectos de combate representan snapshots y eventos autoritativos.

## Shapes

El lenguaje del HUD es compacto y casi recto: controles y participantes con esquinas de 3px; ficha de 5px; ofertas con esquinas superiores de 4px y borde inferior de 3px según coste. Las plazas del banquillo tienen esquinas superiores de 3px y borde inferior de 2px. La arena central carece de borde y radio en Partida local.

El pixel-art conserva bordes nítidos. Los sprites provisionales de Arena parten de una rejilla de 32 × 40px. DOLEA reutiliza su retrato real existente mediante `PixelUnit`, sin suavizado ni distorsión, con `object-fit: contain` e `image-rendering: pixelated`. No se crea arte nuevo en esta fase.

## Components

- **Cabecera de ronda y reloj:** ronda, estado, tiempo y acción pertinente. Durante el ciclo automático presenta el estado de las rondas; el acceso de depuración depende del modo de desarrollo.
- **Rail de participantes:** tarjetas de Vargas y Florin ordenadas por vida, con nombre, estado y medidor. La recompensa aparece en contexto y el registro detallado se abre por demanda.
- **Banquillo:** nueve plazas compactas; unidades de 34 × 43px en desktop, estrellas y número de plaza. Hover y destino de arrastre aclaran el fondo; la selección añade realce inferior. Las plazas vacías siguen siendo visibles.
- **Tienda:** cinco ofertas, retrato existente de 64 × 80px en desktop, nombre, precio, metadatos y estado. Cada coste tiene tono inferior propio. Renovar y bloquear quedan junto a las ofertas, con estados deshabilitados legibles.
- **Economía:** oro e interés, nivel y progreso de XP, compra de XP y racha. Conserva cifras tabulares y cercanía a las decisiones de compra.
- **Ficha de unidad:** existe cuando hay selección; contiene retrato, nombre, lado, coste, estrellas, vida/maná, estadísticas, activa, pasiva y afinidades informativas. Para unidades propias incorpora venta y colocación sin arrastrar. El cierre usa botón o Escape; si el foco estaba dentro vuelve al tablero. La salida retiene brevemente el contenido, lo vuelve inerte y lo oculta a tecnologías de asistencia. Escape no cierra la ficha si hay un diálogo abierto.
- **Registro:** diálogo de vida y economía bajo demanda. Su backdrop pertenece al registro, no a la ficha de unidad.
- **Estados de interacción:** botones compactos de al menos 34px de alto; foco de 2px y separación de 3px en el HUD. El tablero conserva selección marfil, punto de destino disponible y cruz más texto para destino inválido. Vida, maná, escudo, stun y daño muestran estados funcionales de combate.

## Do's and Don'ts

### Do:

- Mantener separadas Partida local y Arena de pruebas.
- Mantener el tablero como campo principal; anclar el contexto a los márgenes.
- Usar los retratos existentes de DOLEA con contención y píxeles nítidos; conservar el fallback provisional para unidades sin asset.
- Conservar nombres, precios, contadores y estados textuales junto a sus señales de color.
- Respetar el foco visible, Escape, el cierre explícito y la preferencia de movimiento reducido.

### Don't:

- No crear una columna derecha permanente en Partida local ni redimensionar el canvas al abrir la ficha.
- No devolver la economía a la cabecera ni alterar las nueve plazas y cinco ofertas de esta composición.
- No generar arte nuevo, reemplazar DOLEA por un retrato inventado ni copiar personajes o recursos de TFT.
- No extrapolar esta actualización F0-P5.1 a un rediseño de Arena de pruebas.
