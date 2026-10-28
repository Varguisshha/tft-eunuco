disposition: ship

Alcance: exploración cromática F0-P6B.5-A2, pendiente de elección humana. Referencia vinculante: las tres composiciones originales de Festival Pop C. No se aportan card QUALITY BAR, comp generada, state/spec ni informes comp-diff; no se exige una nueva ronda de dirección o de composición porque el encargo fija expresamente el diseño incumbente. Revisión realizada sobre archivos; no se abrió navegador ni se ejecutó otro detector.

## persistence

Pass. `PRODUCT.md` existe en la raíz. `comparison/CONTRACT.md` registra C como base confirmada, las seis familias y sus semillas, los invariantes, el aislamiento y la necesidad de decisión humana. `REPORT.md`, `CONTRAST.md/json`, los tokens por paleta y los registros técnicos persisten dentro de la exploración. La ausencia de un DESIGN local en este punto queda cubierta por la documentación posterior anunciada; el DESIGN de producción no es la autoridad cromática de estas propuestas.

Evidencia válida: se abrieron las 18 composiciones de las seis carpetas, las tres referencias originales, `gallery-1920.png`, `gallery-1280.png`, `gallery-mobile.png`, `comparator-1920.png` y la captura corregida `supplements-scroll-1920.png`. Las 18 láminas tienen 1920 × 1080 y muestran la vista indicada. Las capturas de galería muestran el inicio de documento a los tamaños correspondientes; el suplemento está identificado como captura desplazada. El bloqueo anterior fue un error de captura y está resuelto.

Se comprobó directamente que `shared/base.css` es idéntico al `shared/styles.css` anterior. El diff del renderer añade selección de paleta y tinta/brillo mediante tokens; mantiene el markup original. El registro técnico declara cero cambios de producción y de la exploración anterior, sin push; esta revisión no sustituye una auditoría Git independiente.

## fidelity

Inventario visual tomado de C: arena central urbana con ocho unidades; placa superior ancha, achaflanada, con ronda y temporizador; clasificación y sinergias a la izquierda; medallón económico abajo; nueve plazas de banquillo; cinco tarjetas con plano diagonal claro, medallón, rasgos, nombre y precio; dos acciones a la derecha; inspector superpuesto con marco asimétrico; hoja de detalles con cinco retratos, cinco estados, muestras de color e iconos.

| Elemento | Estado | Evidencia |
|---|---|---|
| Composición, densidad, jerarquía y posiciones | match | Las 18 capturas conservan el inventario de C. `geometry-verification.json` informa cero desplazamientos o cambios de tamaño en partida e inspector; los detalles conservan contenedores y posiciones. |
| TYPE | match | Mismo Bungee de titulares y DM Sans de datos; se mantienen proporciones, peso, tamaño y forma de las letras. Auditoría de 390/488/300 nodos por partida/inspector/detalles y fuentes cargadas en las seis variantes. |
| MATERIAL | match | Se conservan encastres pixelados, planos diagonales, bordes escalonados, medallones, remates, reflejo lineal y profundidad de C. No se sustituyen sprites ni escenario por imitaciones o nuevos recursos. |
| GROUND | adaptation | Cambia la temperatura del campo de interfaz conforme a las seis recetas cromáticas del encargo, secciones 4–6; no existe aprobación de los colores originales. Royal conserva violeta, Neon azul noche, Tropical petróleo, Coastal petróleo apagado, Soft pizarra lavanda y Warm grafito cálido. La plaza conserva su iluminación original. |
| Arena, retratos y sprites | match | Encuadre y escala visual coinciden con C. `asset-verification.json` registra igualdad SHA-256 de los recursos. Las pequeñas diferencias de píxel de capturas JPEG convertidas a PNG están reconocidas en `arena-pixel-verification.json`; no se afirma identidad de capturas bit a bit. |
| Siluetas, tarjetas, medallones e iconografía | match | Se reconocen las mismas formas y el mismo sistema lineal en las seis paletas; las categorías de coste permanecen plata/menta/oro y conservan número y pips. |
| Color integral y estados | adaptation | Autorizado por las secciones 4, 5 y 8 del encargo. El color alcanza clasificación, sinergias, botones, economía, tarjetas, banquillo e inspector. Las hojas muestran normal, hover, pulsado, activo y deshabilitado sin nuevas geometrías. |
| Contenido y semántica | match | Ronda 03, 18.4 s, 52 de oro, nivel 4, XP 4/10, mismos participantes/ofertas y estadísticas de muestra. Vida, rival, maná, escudo, daño y umbrales conservan significados. |
| Cinco etiquetas HEX del detalle | adaptation | El encargo exige consultar las cinco semillas de cada paleta. Solo cambia el ancho intrínseco de esos glifos proporcionales; la auditoría mantiene contenedor, posición y tipografía. |
| Galería, dos columnas, vistas y ampliación | match | Capturas con imágenes reales; el código contiene selección de paleta, cambio compartido de las tres vistas, retorno, diálogo de ampliación a 1920 × 1080 y ajuste a pantalla. Los resultados de navegación se atribuyen a `technical-verification.json`; no se repitieron aquí. |
| Tooltip, resultado, contador y estados suplementarios | adaptation | Requisitos del encargo, secciones 8–10. Se presentan como muestras identificadas fuera de las 18 láminas para respetar C. La captura corregida muestra Copita Perhaps, Victoria ilustrativa, El Depredador 5 y cuatro estados; la generación usa los tokens de cada paleta. |

No hay filas missing ni contradicted. Los cambios de color constituyen el objeto de esta fase, no una desviación de la composición aprobada.

## ceiling

Reached dentro del alcance fijado. No procede exigir nuevas formas, fuentes, escalas, ornamentos o movimiento: impedirían la comparación cromática solicitada. Royal y Neon concentran la energía en controles y marcos; Tropical integra el petróleo con la vegetación; Coastal, Soft y Warm reducen saturación sin perder las siluetas de videojuego. Las diferencias se aprecian en las capturas completas, especialmente en banquillo, economía, inspector y estados. La menor energía de las paletas sobrias es una elección comparativa documentada, no un defecto estructural.

El contrato mantiene sus promesas de base C, invariantes, color semántico, evidencia real y herramienta aislada. Las seis semillas provienen directamente del encargo; no corresponde exigir una tirada de concepto ni seed aleatoria. El primer viewport permite reconocer el mismo juego y localizar las seis propuestas sin decoración exclusiva por paleta.

Los 216 pares no exentos de `contrast.json` cumplen sus umbrales; el mínimo medido para texto normal es 4.9617:1 y las seis mediciones de deshabilitado están correctamente exentas. La legibilidad observada es coherente con esos datos. Se conserva la limitación del texto de banquillo sobre imagen y de los tamaños pequeños heredados; no se afirma conformidad WCAG global ni comodidad comprobada durante partidas largas.

El detector previo queda resuelto en su alcance: el elemento de zoom tiene src real en `index.html`; fuentes, tamaños y colores fuera del DESIGN de producción son intencionales en esta exploración y están explicados en `detector-disposition.md`. No se repitió el detector. La galería utiliza iconos reales, foco visible, selección y controles legibles; no se observa una nueva infracción material del craft floor. Los marcos y planos heredados están fijados por el brief.

Los valores heredados aparecen como datos de muestra, los resultados complementarios como ilustrativos y las valoraciones como juicio de dirección artística. No se presentan operaciones económicas estáticas como ejecutables ni hipótesis de fatiga como pruebas con usuarios.

## material_fixes

Ninguno dentro del alcance revisado. El antiguo fallo de `supplements-1920.png` está resuelto con `supplements-scroll-1920.png`; el registro `capture-notes.md` explica la sustitución. Ship autoriza presentar y comparar las propuestas, no seleccionar una paleta ni integrar el HUD en producción.

## keep

Conservar la composición exacta de C, la arena y los sprites originales, la tipografía y las medidas comunes, las señales semánticas del juego y la decisión final de color reservada al usuario.
