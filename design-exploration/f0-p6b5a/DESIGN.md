---
name: TFT EUNUCO — F0-P6B.5-A
description: Tres mundos visuales de exploración, ninguno seleccionado.
colors:
  a-orange: "#ff9b48"
  a-coral: "#f85e85"
  a-turquoise: "#61d5cc"
  a-violet: "#a98cf5"
  a-ivory: "#fff0b9"
  a-ink: "#302348"
  a-button: "#74456d"
  a-cost-1: "#a7c3cf"
  b-blue: "#3578dd"
  b-gold: "#f5b642"
  b-pink: "#ec668e"
  b-mint: "#63cdb2"
  b-plate: "#393361"
  b-light: "#e6f2e6"
  b-ink: "#252446"
  b-button: "#2856a1"
  b-cost-1: "#81a2bb"
  b-card: "#c2d7e6"
  c-gold: "#ffb755"
  c-pink: "#f4759e"
  c-mint: "#74e1cd"
  c-violet: "#8065cf"
  c-plate: "#393354"
  c-light: "#fff1d5"
  c-ink: "#292541"
  c-button: "#6950b0"
  c-cost-1: "#a9b5c7"
  c-trim: "#b298eb"
typography:
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  a-display:
    fontFamily: "Barlow Condensed, sans-serif"
    fontWeight: 700
    lineHeight: 1
  b-display:
    fontFamily: "Silkscreen, sans-serif"
    fontWeight: 700
    lineHeight: 1
  c-display:
    fontFamily: "Bungee, sans-serif"
    fontWeight: 700
    lineHeight: 1
spacing:
  card-gap: "8px"
  dock-gap: "14px"
components:
  a-button:
    backgroundColor: "{colors.a-button}"
    textColor: "{colors.a-ivory}"
    height: "67px"
  a-button-active:
    backgroundColor: "{colors.a-turquoise}"
    textColor: "{colors.a-ink}"
  b-button:
    backgroundColor: "{colors.b-button}"
    textColor: "{colors.b-light}"
    height: "67px"
  b-button-active:
    backgroundColor: "{colors.b-mint}"
    textColor: "{colors.b-ink}"
  c-button:
    backgroundColor: "{colors.c-button}"
    textColor: "{colors.c-light}"
    height: "67px"
  c-button-active:
    backgroundColor: "{colors.c-mint}"
    textColor: "{colors.c-ink}"
---

# Design System: exploración F0-P6B.5-A

## Overview

**Creative North Star: "Tres identidades para una misma arena"**

Registro del código de los previews aislados, no autorización para cambiar el juego. A, B y C permanecen como alternativas completas; la recomendación del informe no equivale a una selección. Los tokens usan prefijos por dirección para evitar un tema ganador implícito.

El contrato de cada mundo está en su `DIRECTION.md` y sus valores de trabajo en `tokens.json`. Las fuentes de verdad observadas son `shared/styles.css` y `shared/app.js`. El informe comparativo conserva la evaluación y el estado de revisión final.

**Key Characteristics:**
- Arena y retratos originales, con HUD de geometría específica por mundo.
- Mismo contenido funcional y jerarquía de compra en las tres propuestas.
- Materiales interpretados en vector, pendientes de acabado final si se eligen.

## Colors

A usa naranja/coral de festival con marfil y tinta ciruela. B organiza azul esmaltado, dorado y menta sobre violeta. C alterna crema/amatista, rosa y medallones dorados. Los colores de botón oscuro son variantes de contraste reales, distintas de las muestras principales de paleta. Los costes se distinguen también por marcas de cantidad; consultar cada `tokens.json`.

**The Unselected Worlds Rule.** Ningún prefijo sustituye al sistema de producción hasta la elección del usuario.

## Typography

A: Barlow Condensed; B: Silkscreen; C: Bungee. DM Sans sirve datos y lectura común. Todas se cargan desde `shared/fonts/` con licencias SIL OFL locales. Los aliases del CSS son Festival, Pixel, Pop y DM. El CSS solicita peso 700 en display; los archivos de Silkscreen/Bungee son Regular y el navegador resuelve esa negrita.

En el lienzo nativo, las cartas usan nombres 26/20/21px y el reloj 44/36/37px (A/B/C). El texto de rasgos usa DM Sans 13px; bajo 1400px de viewport pasa a 18px antes de la escala. Comprar XP usa 21px y en B/C se compone en DM Sans. Los participantes de C usan nombre DM Sans 20px con marcador y subtítulo en pistas separadas.

**The Reading Face Rule.** La voz display caracteriza el mundo; las acciones económicas estrechas de B/C conservan su cara de lectura.

## Layout

Lienzo fijo de 1920×1080 ajustado proporcionalmente al viewport. Tienda inferior de cinco columnas, economía de 246px y controles de 225px; separación de cartas y dock en frontmatter. Banquillo de nueve posiciones sobre la tienda. Inspector flotante de 360×654px. A 1280×720 la escala es 2/3 y hay ajustes de texto; no promete comportamiento responsive fuera de las capturas.

## Elevation & Depth

Marcos SVG propios en capas, brillos de canto y sombras suaves. La sombra común de marco es un drop-shadow de 0 5px 3px con tinta translúcida. Las cintas tejidas, esmalte y cerámica son intención de material; los previews no contienen acabados pintados o texturas finales. Los retratos mantienen proporción y nearest-neighbor; la arena conserva su perspectiva original.

## Shapes

A: ticket con mordidas curvas y perforación, cintas, emblemas circulares. B: cartucho escalonado y ventana hundida, insignias angulares. C: encastres asimétricos, superficie partida y medallón romboidal. No existe un radio universal que represente las tres familias.

## Components

**Cartas.** Retrato protagonista, sinergias inferiores sobre el nombre, nombre izquierdo y coste derecho. Cinco ofertas comunes; costes 1/2/3 definidos por dirección. No modificar DOLEA/VARGAS para adaptarlos al marco.

**Botones.** Marcos propios con cara y canto. Hover eleva 2px y aclara; pulsado baja 3px y oscurece; activo cambia a menta; disabled conserva texto. Foco visible de 3px con separación de 4px. Las muestras presentan cinco estados; las acciones no ejecutan operaciones de juego.

**Insignias e iconos.** A curva, B a retícula, C con medallón y uniones biseladas. C dispone de paths propios en oro/XP/renovar/bloqueo/estrella; comparte el resto de paths con A cambiando su tratamiento. Los nombres reales de rasgo permanecen Hortaleza, Llama de Pádel, UPM y El Depredador.

**Movimiento.** Respuestas de 110ms en acciones y 120ms en cartas, ease-out. Reduced-motion elimina las transiciones. Es una sugerencia de interacción visual.

## Do's and Don'ts

- **Do** conservar las tres alternativas hasta la elección del usuario.
- **Do** conservar arena y retratos exactos; provisionales desde sus pixelRects existentes.
- **Do** comprobar el resultado a tamaño nativo y al reducir el lienzo.
- **Don't** promover esta documentación al DESIGN.md del producto.
- **Don't** describir la intención vectorial como textura pintada terminada.
- **Don't** tratar los datos de muestra como un combate conectado o la recomendación como aprobación.
