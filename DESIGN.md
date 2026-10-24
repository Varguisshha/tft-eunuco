---
name: TFT EUNUCO — P6B.4
description: Arena PC de carbón, jade profundo y latón envejecido; retratos originales y progreso real.
colors:
  game-ink: '#101a18'
  game-metal: '#263a32'
  game-edge: '#728878'
  trait-backing: '#101a18ee'
  counter-value: '#eedaa3'
  counter-progress: '#a6c58d'
  hud-background: '#111e18'
  hud-text: '#edf0dc'
  hud-muted: '#bac9ba'
  hud-line: '#405447'
  hud-jade: '#c4daa6'
  hud-gold: '#e8cd83'
  hud-focus: '#fff2c4'
  hud-inspector: '#111e1af5'
  hud-player-south: '#13231df2'
  hud-player-north: '#29271df2'
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
    fontWeight: 600
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
  game-button-jade:
    backgroundColor: '{colors.action-jade}'
    textColor: '{colors.action-text}'
    typography: '{typography.game-button}'
    rounded: '{rounded.game-square}'
    padding: '10px 15px'
  game-button-gold:
    backgroundColor: '{colors.action-gold}'
    textColor: '{colors.action-text}'
    typography: '{typography.game-button}'
    rounded: '{rounded.game-square}'
    padding: '10px 15px'
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
    width: '320px'
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
    padding: '0 10px'
    height: '32px'
  game-counter:
    textColor: '{colors.hud-text}'
    padding: '9px 0'
  game-icon-button:
    backgroundColor: '#21382b'
    textColor: '#e5eacb'
    rounded: '{rounded.game-square}'
    width: '34px'
    height: '34px'
    padding: '7px'
---

# Design System: TFT EUNUCO

## Overview

**Creative North Star: "La arena como centro de juego"**

Partida local es una escena táctica de PC: carbón, jade profundo, latón envejecido y letras marfil sobre placas geométricas originales. La arena Mar de Cristal domina; economía, reclutamiento y contexto permanecen en sus márgenes. P6B.4 refina por código el mundo confirmado, sin sustituir la ilustración ni la geometría del tablero.

Arena de pruebas conserva su propósito de diagnóstico y composición independiente. DOLEA y VARGAS conservan sus assets originales; las unidades sin asset mantienen su representación provisional.

**Key Characteristics:**

- Arena dominante; inspector contextual superpuesto, sin columna derecha permanente.
- Nueve plazas de banquillo y cinco retratos de reclutamiento protagonistas.
- Rasgos abajo a la izquierda, inmediatamente sobre el nombre; precio abajo a la derecha.
- Economía a la izquierda; renovar y bloquear a la derecha.
- Marcos biselados, carriles interiores y glifos SVG originales de una misma familia.
- Progreso de combate procedente del estado autoritativo, con cifras y etiquetas legibles.

Fuentes normativas: `apps/web/src/match/hud/visualSystem.css`, `recruitment.css`, `traits.css`, `GameFrame.tsx`, `GameIcon.tsx`, `GameButton.tsx`, `GameCounter.tsx`, `GameIconButton.tsx`, `apps/web/src/match/gameHud.css`, `apps/web/src/game/visualScale.ts` y `combatCounters.ts`. La cascada final prevalece sobre reglas base. El contrato P6B.4 de `apps/web/.impeccable/surfaces/apps-web-src-match-shop-tsx.md` sustituye la antigua ubicación superior de los rasgos.

## Colors

Los valores del frontmatter son normativos. Carbón y jade sostienen la escena; el latón concentra moneda, progreso activo y confirmación.

### Primary

- **Jade del HUD:** selección y lectura de acciones; superficies jade para XP y bloqueo.
- **Latón envejecido:** oro, precios, estrellas y umbrales activos. Renovar conserva su superficie dorada.

### Secondary

- **Metales de coste:** familias verde, azul y ámbar para costes uno, dos y tres; cada familia conserva campo, placa, borde y luz. El número sigue siendo imprescindible.
- **Jade y ámbar técnicos:** identidad de los lados de Arena de pruebas, conservada.
- **Cobre de rechazo:** destinos inválidos y falta de oro, siempre con señal textual.

### Neutral

- **Carbón, metal, marfil y verde grisáceo:** fondo, carriles, texto principal y texto secundario.
- **Respaldo de rasgo:** carbón casi opaco que mantiene legible el texto sobre la imagen.
- **Foco marfil:** contorno de ofertas; marco luminoso y subrayado en acciones biseladas.

**The Trait Contrast Rule.** Los rasgos llevan respaldo oscuro y permanecen inmediatamente sobre la placa inferior; el retrato nunca reduce su lectura.

## Typography

Space Grotesk presenta ronda (26px), reloj (25px), oro (29px), nombres/precios de oferta (17px), nombre de ficha (22px) y cifras de contadores (20px). DM Sans sostiene controles (12px), rasgos (11px, peso 600), nombres de contador (12px) y explicaciones (11px). Ambas familias se sirven localmente; las cifras del HUD son tabulares. La monoespaciada queda para diagnóstico.

Desde 1700px las ofertas usan nombres/precios de 19px, rasgos de 12px y botones de 13px. Hasta 1099px los nombres/precios de oferta usan 14px y los rasgos 10px. No hay titulares promocionales dentro de la partida.

## Layout

Desde 1100px, navegación de 38px y HUD de `calc(100dvh - 38px)`, sin límite de ancho: cabecera de 48px, arena flexible y reclutamiento de 192px. Padding lateral de 16px e inferior de 12px. Desde 1700px: cabecera de 52px, reclutamiento de 212px, padding lateral de 24px e inferior de 16px.

El rail izquierdo de 156px flota sobre la arena. Participantes, registro y rasgos conviven sin añadir una columna al canvas. En escritorio de hasta 800px de alto, participantes y controles se compactan; solo la lista de rasgos tiene desplazamiento vertical propio cuando crece el progreso de combate.

El banquillo flota al pie del campo: nueve plazas, alto base de 64px y máximo de 1000px de ancho; desde 1700px, alto de 76px. En escritorios bajos se compacta a 56px y máximo de 720px. La cámara recibe su rectángulo real para reservar espacio sobre él. El escalado visual de personajes no modifica esta geometría.

Economía de 190px y tienda flexible, separadas por 14px. Cinco cartas con separación de 7px; controles de 164px a la derecha, separados por 12px. Desde 1700px economía de 220px, controles de 190px y separación de 16px. Cada carta termina en una placa de 32px (36px desde 1700px). Los rasgos se anclan a 43px del borde inferior (48px desde 1700px), a 13px de la izquierda. Avisos y «Reclutar» ocupan la parte superior.

La ficha superpuesta tiene 320px de ancho, scroll propio y reserva inferior para el banquillo; abrirla no redimensiona el canvas. A alturas desktop de hasta 800px compacta el inset superior a 8px y padding a 12px. Su retrato usa 62 × 78px, reduciendo el alto a 60px hasta 800px.

Por debajo de 1100px el HUD entra en flujo: cabecera automática, campo de 520px y reclutamiento de 234px; controles sobre las ofertas. Hasta 650px, campo de 482px, economía en dos columnas y tienda de 256px; cinco ofertas con mínimo de 115px y desplazamiento horizontal propio. La ficha mide `min(320px, calc(100% - 24px))` y empieza a 145px. Esta adaptación admite scroll de página y no redefine la prioridad PC.

## Elevation & Depth

Carriles interiores, líneas de luz y degradados suaves dan volumen al metal. La arena conserva su imagen y perspectiva. Ficha, tooltip y consola usan sombra estructural `0 12px 28px #03090766`; no se convierte el campo en una caja.

Acciones: transición de fondo/texto de 120ms y desplazamiento de 1px al pulsar; recibo de éxito de 260ms. Confirmación de compra de 180ms. El retrato de tienda permanece inmóvil al hover. La ficha conserva entrada de 140ms y salida de 120ms. Movimiento reducido elimina transiciones y animaciones sin eliminar confirmaciones textuales. Los efectos de combate representan eventos y snapshots autoritativos.

## Shapes

`GameFrame` usa una rejilla SVG de 200 × 160, esquinas biseladas y carriles interiores; `preserveAspectRatio="none"` adapta la geometría y `non-scaling-stroke` conserva líneas de 1–2px. Los botones recortan sus esquinas a 8px y mantienen radio cero. `GameIcon` utiliza una rejilla de 24 unidades, trazo de 1.8 y uniones en inglete; no usa caracteres tipográficos como iconos.

El pixel-art conserva contención y bordes nítidos. En las ofertas, el retrato ocupa el 86% del ancho y el alto completo del campo, anclado abajo y a la derecha, con desplazamiento derecho de −2%. No reemplazar originales de DOLEA o VARGAS.

**The Stable Foot Rule.** Los personajes con asset real usan multiplicador visual 1.4 sobre perspectiva, tras comparar 1, 1.2, 1.3 y 1.4 con el mismo pie. Los dos manifiestos actuales normalizan el cuerpo a 64px; el factor común conserva esa relación. Los provisionales no crecen, las estrellas no añaden escala y los límites originales de interacción se conservan mediante `originalHitBounds`. Un nuevo asset exige comprobar su normalización antes de heredar el factor.

## Components

- **GameButton:** marco, icono, etiqueta y coste opcional; jade para XP/bloqueo y oro para renovar. Padding 10px × 15px, mínimo de 43px de alto (47px desde 1700px). Foco mediante marco claro y subrayado, hover propio y deshabilitado legible con opacidad completa. Bloqueo usa `aria-pressed`, conserva ofertas y permite comprar. El recibo y `success` solo se producen si la acción acepta; `onCue` es opcional, sin audio conectado.
- **GameIconButton:** control de 34 × 34px con nombre accesible y título; cierre de ficha de 30 × 30px. Comparte marco y glifos originales; conserva hover y deshabilitado.
- **Oferta:** cinco botones iguales con retrato protagonista; rasgos abajo a la izquierda sobre el nombre, coste a la derecha de la placa. No inventar un segundo rasgo. El aviso provisional solo aparece cuando ninguna afinidad tiene definición configurada. Hover/foco revela «Reclutar» arriba; estados reales `available`, `unaffordable`, `unavailable`, `closed` y `empty`. Falta de oro añade texto; atenuar únicamente el retrato. Compra aceptada muestra check, «Reclutado» y nombre; renovar borra recibos.
- **Rasgos de formación:** icono, nombre, miembros y estado; tooltip por hover, foco o click con descripción, umbrales y contribuyentes, cerrable con Escape. Iconos de contenido originales y fallback neutral. Los créditos de combate nunca se suman al número de miembros.
- **Ficha:** una habilidad principal con tipo Activa/Pasiva/Mixta, coste de maná cuando procede, descripciones, vida/maná, estadísticas efectivas, afinidades y acciones propias. Escape/cierre explícito; retorno de foco al tablero cuando corresponde. No cambia el tamaño de la arena.
- **GameCounter v1:** icono de 22px, nombre, valor, medidor cuando existe objetivo, umbrales y explicación. Lee kills, lanzamientos naturales, stacks, progreso de rasgos y activaciones de pasiva del snapshot muestreado. Solo muestra denominador cuando hay `max`; un próximo umbral no es un máximo. Distingue acumulando, listo y activo; explica consumo, bonos reales y duraciones restantes. Resaca consume al completar ciclo; Depredador conserva acumulaciones del combate y expresa sus hitos; Créditos UPM son individuales. Nunca simular progreso con temporizadores de interfaz.
- **Controles de desarrollo:** consola y selector de escala pertenecen al modo DEV; no forman parte de la interfaz pública. Arena de pruebas sigue siendo una superficie independiente.

## Do's and Don'ts

### Do:

- Mantener el tablero como campo principal y el contexto en los márgenes.
- Conservar originales de DOLEA y VARGAS, contención y píxeles nítidos.
- Mostrar cifras, nombres y estados junto a las señales de color.
- Respetar foco, Escape, cierre explícito y movimiento reducido.
- Mantener pie, perspectiva y límites de interacción al cambiar escala visual.

### Don't:

- No crear una columna permanente para la ficha ni redimensionar el canvas al abrirla.
- No mover rasgos a la parte superior ni separar nombre y coste de la placa inferior.
- No copiar personajes o recursos de TFT ni sustituir originales por arte inventado.
- No inventar contadores, progreso o efectos ni confundir créditos con miembros.
- No aplicar crecimiento automático por estrellas o a sprites provisionales.
- No interpretar bloqueo como prohibición de compra ni añadir audio por defecto.
