# C — Festival Pop

Estado: propuesta fijada para comparación, sin elección aprobada. Alcance exclusivo de F0-P6B.5-A; no es el sistema visual del producto.

## THESIS

**La insignia de torneo.** Alternancia de crema y amatista: reloj claro, fascia de carta oscura y retrato sobre plano partido. La arena sigue dominando la escena y los controles forman una familia gráfica propia.

## OWN-WORLD

- **Forma y superficie:** Placas asimétricas con encastres, corte diagonal de superficie y medallón romboidal de coste. Cerámica tintada y juntas de premio como intención; planos vectoriales divididos, sin textura cerámica pintada final.
- **Tipografía e iconografía:** Bungee en display, con nombres de carta 21px y reloj 37px; DM Sans en lectura, nombres de participante (20px) y Comprar XP (21px). Oro, XP, renovación, bloqueo y estrella tienen paths propios; vida, maná y rasgos comparten paths de A con trazo de 2.8px y unión bevel.
- **Paleta:** valores normativos en `tokens.json`. El botón oscuro usa la variante de contraste documentada allí, además de los colores principales de la lámina.

Estas dos relaciones —silueta/material y voz tipográfica/iconos— definen la dirección; cambiar solo el color no conserva esta propuesta.

## STORY

El personaje lidera la compra: retrato, rasgos inferiores, nombre izquierdo y precio derecho. Placa con medallón es la firma que se repite en controles e inspector. Los costes 1/2/3 añaden señales cromáticas y marcas de cantidad, sin cambiar las reglas.

## FIRST VIEWPORT

Lienzo 1920×1080 con el mismo contenido de A/B/C: ocho figuras, fase y tiempo arriba, clasificación y sinergias a la izquierda, arena, banquillo de nueve huecos, cinco cartas y economía. Inspector flotante de VARGAS en su segunda composición. A 1280×720 se escala el lienzo a 2/3 y se amplían ciertos textos antes de escalar; no es un diseño responsive de producción.

## FORM

Placas asimétricas con encastres, corte diagonal de superficie y medallón romboidal de coste. Alternancia de crema y amatista: reloj claro, fascia de carta oscura y retrato sobre plano partido. Oro, XP, renovación, bloqueo y estrella tienen paths propios; vida, maná y rasgos comparten paths de A con trazo de 2.8px y unión bevel. Profundidad mediante capas de SVG, brillos interiores y sombra suave; el material es una propuesta vectorial. Normal, hover, pulsado, activo y deshabilitado se muestran en la lámina de componentes. El foco de teclado tiene contorno visible y reduced-motion anula transiciones.

## Recursos y límites

Mar de Cristal, DOLEA y VARGAS son copias sin modificación; K-01/R-03 exportan los rectángulos existentes exactos. Fuentes locales con SIL OFL incluida. Datos de muestra, sin simulación, compras ni guardados. Referencias de organización: TFT PC/Dignitas, estudios de UI Wargroove2/Midio y 8bit Game Progress de 21st; no se copiaron sus assets. Procedencia en `../shared/assets/provenance.json` y enlaces en `../comparison/REPORT.md`.

Los encastres y contornos contrastados pueden producir ruido; Bungee necesita aire. La revisión final y sus límites se registran en `../comparison/REPORT.md`; este contrato no declara una validación superada. Conservar las tres variantes hasta la elección del usuario.
