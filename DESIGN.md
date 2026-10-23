---
name: TFT EUNUCO — F0-P5.3
description: Arena dominante jade y ámbar; reclutamiento PC con retratos y marcos escalonados originales.
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
  cost-one: '#b2c39d'
  cost-two: '#a8d9e4'
  cost-three: '#ecc38c'
  cost-one-field: '#1a2922'
  cost-two-field: '#182b2e'
  cost-three-field: '#30271d'
  cost-one-plate: '#344636'
  cost-two-plate: '#2b4b52'
  cost-three-plate: '#59442b'
  cost-one-edge: '#75876b'
  cost-two-edge: '#618c96'
  cost-three-edge: '#a58961'
  cost-one-light: '#c2d1af'
  cost-two-light: '#c0e8ec'
  cost-three-light: '#f3d5a8'
  dock-edge: '#688575'
  dock-highlight: '#b8c9a9'
  frame-inset: '#354d40'
  action-jade: '#243c31'
  action-jade-hover: '#38553e'
  action-gold: '#393323'
  action-gold-hover: '#51472b'
  action-pressed: '#394b2b'
  action-disabled: '#1a2723'
  action-text: '#ecf0de'
  action-price: '#f3db94'
  offer-text: '#f0f1de'
  offer-price: '#f7df9b'
  offer-unaffordable: '#ffb49a'
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
    fontSize: '17px'
    fontWeight: 700
    lineHeight: 1
  offer-trait:
    fontFamily: 'DM Sans, sans-serif'
    fontSize: '11px'
    fontWeight: 500
    lineHeight: 1.2
  game-button:
    fontFamily: 'DM Sans, sans-serif'
    fontSize: '12px'
    fontWeight: 600
  economy-gold:
    fontFamily: 'Space Grotesk, sans-serif'
    fontSize: '29px'
    fontWeight: 700
    lineHeight: 1
  body:
    fontFamily: 'DM Sans, sans-serif'
    fontSize: '12px'
    lineHeight: 1.5
  label:
    fontFamily: 'DM Sans, sans-serif'
    fontSize: '11px'
rounded:
  hud-control: '3px'
  game-square: '0'
  inspector: '5px'
spacing:
  card-inset: '5px'
  offer-gap: '7px'
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
  game-button-jade:
    backgroundColor: '{colors.action-jade}'
    textColor: '{colors.action-text}'
    typography: '{typography.game-button}'
    rounded: '{rounded.game-square}'
    padding: '10px 12px'
  game-button-gold:
    backgroundColor: '{colors.action-gold}'
    textColor: '{colors.action-text}'
    typography: '{typography.game-button}'
    rounded: '{rounded.game-square}'
    padding: '10px 12px'
  game-button-pressed:
    backgroundColor: '{colors.action-pressed}'
  game-button-disabled:
    backgroundColor: '{colors.action-disabled}'
    textColor: '#9ea99e'
  player-banner:
    backgroundColor: '{colors.hud-player-south}'
    rounded: '{rounded.game-square}'
    padding: '9px 8px'
  inspector:
    backgroundColor: '{colors.hud-inspector}'
    textColor: '{colors.hud-text}'
    rounded: '{rounded.inspector}'
    padding: '16px'
    width: '280px'
  bench-slot:
    backgroundColor: '{colors.hud-bench}'
    rounded: '{rounded.game-square}'
    padding: '2px'
  shop-offer:
    backgroundColor: '{colors.cost-one-field}'
    textColor: '{colors.offer-text}'
    rounded: '{rounded.game-square}'
    padding: '{spacing.card-inset}'
  shop-offer-cost-two:
    backgroundColor: '{colors.cost-two-field}'
  shop-offer-cost-three:
    backgroundColor: '{colors.cost-three-field}'
  shop-offer-footer:
    backgroundColor: '{colors.cost-one-plate}'
    typography: '{typography.offer-title}'
    padding: '0 9px'
    height: '32px'
---

# Design System: TFT EUNUCO

## Overview

**Creative North Star: "La arena como centro de juego"**

Partida local es un modo operativo de videojuego: la arena ocupa el campo central y los controles necesarios para jugar se concentran en sus márgenes. La dirección confirmada mantiene oscuridad, jade y ámbar, una lectura compacta y pixel-art original. F0-P5.3 incorpora un dock de reclutamiento de videojuego PC: cinco retratos dominantes, rasgos apilados arriba y nombre con coste en una placa inferior. Los marcos escalonados y los glifos económicos son originales; se conservan los retratos existentes.

Arena de pruebas sigue siendo una superficie técnica independiente de preparación y diagnóstico. Conserva su tablero, reserva inferior, panel lateral y controles de simulación; no hereda la composición de Partida local. Esta actualización conserva la composición de Partida local y sustituye sus antiguos controles y tarjetas de tienda por el vocabulario del dock.

**Key Characteristics:**

- Arena dominante, sin panel derecho permanente.
- Rail de participantes compacto y flotante a la izquierda.
- Nueve plazas de banquillo; cinco ofertas con rasgos arriba, retrato protagonista y nombre/coste abajo.
- Economía a la izquierda; renovar y bloquear a la derecha; marcos e iconos de una misma familia escalonada.
- Inspector contextual superpuesto; abrirlo o cerrarlo no redimensiona el canvas.
- Retratos existentes de DOLEA y sprites provisionales reutilizados, sin producción artística nueva.

Fuentes de F0-P5.3: `apps/web/src/match/hud/GameIcon.tsx`, `GameFrame.tsx`, `GameButton.tsx`, `recruitment.css`, `Shop.tsx` y `LocalGame.tsx`, junto a `gameHud.css` y `PixelUnit.tsx`. El contrato de esta superficie está en `apps/web/.impeccable/surfaces/apps-web-src-match-shop-tsx.md`. TFT PC real se consultó como referencia funcional mediante Riot «TFT Interface Update» (2019) y la guía PC de Mobalytics (2026); no se copiaron sus recursos.

Evidencia visual final: `artifacts/f0p53/after-1920-final.png`, `after-1440-final.png`, `after-1280-final.png` y `after-mobile-final.png`; comparación con `before-1920-recaptured.png`. La inspección documental directa de la captura de 1440px confirma el dock y la separación legible entre los rasgos de R-03 y su sombrero. Las capturas no sustituyen las verificaciones funcionales de fase, compra y bloqueo.

## Colors

La oscuridad verde integra tablero y HUD. El jade identifica el lado propio y las acciones principales; el ámbar distingue al rival y el oro concentra la lectura económica. Los valores normativos están en el frontmatter.

### Primary

- **Jade del HUD** (`hud-jade`): acción de inicio, fase y selección de texto. Es el acento de Partida local, distinto del jade técnico de Arena.
- **Oro del HUD** (`hud-gold`): estrellas y recompensas. La lectura económica conserva sus tratamientos específicos del código.

### Secondary

- **Costes uno, dos y tres** (`cost-one`, `cost-two`, `cost-three`): metales de coste verde, azul y ámbar en esquinas, iconos y separación del pie. Cada familia tiene campo opaco, placa inferior, borde y luz propios (`cost-*-field`, `cost-*-plate`, `cost-*-edge`, `cost-*-light`). El coste también aparece como número.
- **Jade y ámbar técnicos** (`arena-jade`, `arena-amber`): identidad original de los lados de Arena, conservada sin sustituir sus estilos.
- **Rechazo cobre** (`arena-invalid`): destino inválido de Arena, acompañado de cruz y texto.

### Neutral

- **Fondo profundo, texto marfil, texto secundario y límite del HUD** (`hud-background`, `hud-text`, `hud-muted`, `hud-line`): lectura y separación sin multiplicar cajas.
- **Superficies de participantes y ficha** (`hud-player-south`, `hud-player-north`, `hud-inspector`): capas semitransparentes que flotan sobre el campo.
- **Banquillo y selección** (`hud-bench`, `hud-bench-selected`): plazas compactas con borde inferior y realce de selección.
- **Metal del dock** (`dock-edge`, `dock-highlight`, `frame-inset`): borde, brillo y carril interior de la geometría escalonada.
- **Acciones jade y oro** (`action-*`): superficies de XP/bloqueo y renovación, con variantes hover, activada y deshabilitada; el estado deshabilitado conserva opacidad completa.
- **Texto y precio de oferta** (`offer-text`, `offer-price`): lectura de nombre y moneda. El cobre claro `offer-unaffordable` acompaña «Falta oro».
- **Foco marfil** (`hud-focus`): contorno visible de botones y desplegables de resumen del HUD.
- **Fondo, superficie y límite técnicos** (`arena-background`, `arena-surface`, `arena-line`): paleta previa de Arena de pruebas.

**The Opaque Trait Rule.** Los rasgos y su aviso provisional llevan un respaldo opaco del campo de su coste; el retrato nunca reduce la lectura del texto.

## Typography

Space Grotesk presenta títulos, ronda, reloj, precios y nombres de ofertas; DM Sans sostiene controles y texto. Ambas se sirven localmente desde Fontsource. La monoespaciada queda para coordenadas y datos de diagnóstico. Los números del HUD usan cifras tabulares.

La jerarquía es operativa: ronda (26px), reloj (25px), fase (17px), nombre/precio de tienda (17px), texto de ficha y controles (12px), rasgos (11px), aviso provisional (9px). La cifra de oro es de 29px y el título de ficha de 25px. Los botones del dock usan peso 600 y precios de 16px. No hay titulares promocionales dentro de la partida.

Desde 1700px, el nombre/precio de tienda sube a 19px, los rasgos a 12px, su aviso a 10px y los botones a 13px. Hasta 1099px, nombre/precio pasa a 14px y rasgos a 10px; móvil conserva esa escala en ofertas con ancho mínimo, en lugar de comprimir cinco cartas en el viewport.

## Layout

### Partida local — desktop desde 1100px

La navegación ocupa 38px. El HUD llena el alto restante (`calc(100dvh - 38px)`) y no tiene límite máximo de ancho. Su cuadrícula de una columna distribuye cabecera (48px), campo flexible y reclutamiento (192px), con padding de 16px a los lados y 12px abajo.

El canvas ocupa todo el campo. Al 100% la cámara contain muestra los cuatro bordes de la imagen original sin deformarla; acercar es una decisión explícita del jugador. Títulos, pie y zoom flotan sobre él; no consumen filas de su tamaño final. El rail izquierdo mide 156px, se sitúa a 16px del borde superior y permite desplazamiento interno si falta alto. Muestra participantes y vida, recompensa contextual y acceso al registro. No reserva una columna para la ficha.

El banquillo flota dentro del borde inferior del campo, sin fila exterior: nueve columnas con separación de 5px, alto 64px, ancho máximo 1000px y fondo jade translúcido. En escritorios de hasta 800px de alto se compacta a 56px y máximo 720px. Deja 8px al borde inferior y reserva la izquierda para clasificación. La cámara recibe su rectángulo real para mantener las casillas por encima incluso con zoom. La zona inferior distribuye economía (190px) y tienda flexible, separadas por 14px. La tienda contiene cinco ofertas en paralelo, con separación de 7px; sus controles ocupan 164px a la derecha y quedan a 12px de las ofertas. Oro, interés, nivel, XP y racha viven en esta franja inferior.

La ficha se superpone a la derecha del campo: ancho de 280px, top de 36px, right de 8px y bottom de `calc(var(--bench-height) + 24px)`, con scroll interno. Su apertura y cierre no participan en el cálculo del canvas. No hay backdrop de la ficha.

Desde 1700px, las filas pasan a 52px / campo flexible / 212px, con banquillo flotante de 76px; el padding es 24px lateral y 16px inferior. La economía mide 220px, los controles de tienda 190px y la ficha 310px; la separación entre ofertas y controles es de 16px. El pie de las cartas crece de 32px a 36px.

### Flujo por debajo de 1100px

Hasta 1099px el HUD usa alto automático, mínimo del viewport restante y filas auto / 520px / 234px. La cabecera envuelve sus controles. La economía mide 150px; los controles de tienda pasan a una fila superior de 44px. Se ocultan nombres del banquillo, cabecera de tienda y nota de bloqueo; permanecen las nueve plazas, las cinco ofertas, sus rasgos, nombres, precios y estados.

Hasta 650px el campo mide 482px y el banquillo flotante conserva 64px; la franja inferior entra en flujo vertical. El rail se vuelve horizontal, el tablero comienza 75px más abajo, y la ficha conserva su superposición con ancho `min(280px, 100%)`, top de 80px y bottom que reserva la altura del banquillo más 24px. Los slots del banquillo tienen un mínimo de 44px con desplazamiento horizontal propio. Economía usa dos columnas y la tienda 256px de alto. Las cinco ofertas conservan un ancho mínimo de 115px en una fila con desplazamiento horizontal propio. Esta adaptación permite flujo y scroll de página; conserva la prioridad PC y no implica que las cinco cartas deban verse simultáneamente en un móvil.

### Arena de pruebas — superficie independiente

Conserva tablero dominante, reserva inferior y panel lateral; en pantallas estrechas el panel pasa debajo. Agrupa controles de simulación encima del tablero. Sigue siendo una herramienta de diagnóstico y duelo controlado, no la dirección compositiva de Partida local.

## Elevation & Depth

El campo conserva la arena Mar de Cristal existente y su geometría; F0-P5.3 no modifica el terreno. La profundidad del dock procede del doble carril, las esquinas escalonadas y el contraste entre campo de retrato y placa inferior. El HUD se diferencia mediante tonos, transparencias y líneas finas; evita marcos gruesos alrededor del campo.

La ficha contextual usa la sombra estructural `0 12px 28px #050e0b66` para separarse del tablero. Entra en 140ms con `cubic-bezier(0.16, 1, 0.3, 1)`, opacidad y desplazamiento horizontal de 8px; sale en 120ms con `ease-out`. Los botones transicionan color, fondo y borde en 120ms y se desplazan 1px al pulsar. Las acciones del dock transicionan fondo y texto en 120ms; el retrato asciende 2px al hover con transición de 140ms. Una acción aceptada dibuja un recibo de borde que se desvanece en 260ms. La confirmación «Reclutado» entra en 180ms desde 3px de desplazamiento vertical. La preferencia de movimiento reducido anula las transiciones y animaciones; oculta el destello de recibo, pero mantiene el texto confirmado. No se introducen animaciones ambientales; los efectos de combate representan snapshots y eventos autoritativos.

## Shapes

El dock tiene esquinas rectas (radio 0) con una silueta escalonada dibujada en SVG: un marco exterior de 200 × 160 unidades, carril interior, segmentos de luz y refuerzos de esquina en las cartas. `preserveAspectRatio="none"` adapta la geometría a la superficie; `vector-effect="non-scaling-stroke"` conserva el grosor de sus líneas (1–2px). No sustituirlo por un rectángulo redondeado con borde convencional. Los glifos originales comparten una rejilla de 24 unidades, trazo de 1.8 y uniones en inglete.

Participantes y banquillo pasan a esquinas rectas. La ficha mantiene 5px y los controles auxiliares existentes 3px: la familia escalonada corresponde a reclutamiento y economía, no a una sustitución indiscriminada de toda la interfaz. La arena central carece de borde y radio en Partida local.

El pixel-art conserva bordes nítidos. Los sprites provisionales parten de una rejilla de 32 × 40px. DOLEA reutiliza su retrato real existente mediante `PixelUnit`, con contención y sin suavizado ni distorsión. Dentro de la carta, el retrato se ancla abajo y a la derecha, usa el 80% del ancho del campo y un alto de `calc(100% - 18px)`. Los rasgos flotan por encima con respaldo opaco; nombre y coste quedan en su propia placa. F0-P5.3 no genera retratos ni raster nuevos.

## Components

- **Cabecera de ronda y reloj:** ronda, estado, tiempo y acción pertinente. Durante el ciclo automático presenta el estado de las rondas; el acceso de depuración depende del modo de desarrollo.
- **Rail de participantes:** tarjetas de Vargas y Florin ordenadas por vida, con nombre, estado y medidor; borde recto y sigilo enmarcado integran la clasificación con el dock. La recompensa aparece en contexto y el registro detallado se abre por demanda.
- **Banquillo:** nueve plazas compactas; unidades de 34 × 43px en desktop, estrellas y número de plaza. Hover y destino de arrastre aclaran el fondo; la selección añade realce inferior. Las plazas vacías siguen siendo visibles.
- **Oferta de reclutamiento:** cinco botones iguales. Hasta dos rasgos existentes se apilan arriba con icono y aviso «Sinergias provisionales»; no se inventa un segundo rasgo cuando el personaje solo tiene uno. El retrato domina el campo; nombre y precio con moneda comparten el pie. El nombre largo admite elipsis. Hover/foco muestra «Reclutar», aclara el marco y conserva el foco visible; pulsar desplaza 1px.
- **Disponibilidad de oferta:** `available`, `unaffordable`, `unavailable`, `closed` y `empty` proceden del estado real. «Falta oro» colorea precio y explicación en cobre claro; retrato atenuado al 65% en falta de oro o indisponibilidad y al 72% durante cierre. La carta completa conserva opacidad 1. Una compra aceptada deja una casilla con check, «Reclutado» y el nombre; es confirmación local, no una nueva oferta. Renovar correctamente borra los recibos locales.
- **Acciones de videojuego:** `GameButton` usa marco SVG, icono, etiqueta y coste opcional. XP y bloqueo llevan tono jade; renovar, tono oro. Hover, presión y foco permanecen distinguibles. El toggle de bloqueo expresa `aria-pressed`; bloqueado conserva ofertas para la siguiente ronda y permite comprar. Renovación y XP se deshabilitan por fase/oro; XP también al nivel máximo; bloqueo por fase. El botón deshabilitado mantiene texto y precio legibles, sin desvanecer toda la superficie.
- **Extensión de señales:** `onCue` admite `hover`, `press` y `success` en `GameButton`. Es opcional, no está conectado a audio. `success` y el recibo visual solo se emiten si `onAction` devuelve éxito.
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
- No reemplazar el retrato real de DOLEA por un retrato inventado ni copiar personajes o recursos de TFT.
- No volver a cubrir los rasgos con el retrato ni mover nombre y coste fuera de la placa inferior.
- No interpretar el bloqueo como prohibición de compra ni añadir audio a la extensión de señales por defecto.
- No extrapolar esta actualización F0-P5.3 a un rediseño de Arena de pruebas.
