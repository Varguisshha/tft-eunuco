# Festival Pop — seis paletas para decidir

## 1. Base confirmada

Festival Pop (C) es la dirección elegida por el usuario y su grupo. Se ha mantenido su composición; esta fase explora exclusivamente el color. Ninguna paleta está aprobada todavía.

## 2. Seis propuestas completas

Royal Pop, Neon Playground, Tropical Party, Coastal Mint, Soft Royal y Warm Sand. Cada una tiene 64 tokens semánticos y sus cinco colores iniciales documentados en PALETTE.md y tokens.json. Las rampas derivan de las semillas con blanco/negro. No hay colores nuevos sin función.

## 3. Dieciocho composiciones

Cada carpeta contiene screen-1920.png, inspector-1920.png y components-1920.png: PNG reales de 1920×1080, sin redimensionar. Mismos participantes, números, ofertas, retratos, arena y diseño de C. Los montajes overview son derivados de las capturas, no sustitutos de las composiciones completas.

## 4. Galería local

Abrir [la galería](http://127.0.0.1:4186/). La [referencia C original](http://127.0.0.1:4185/festival-pop/index.html) permanece disponible e intacta.

La galería admite partida, inspector y detalles, muestra las seis juntas, permite seleccionar y volver a la vista general. La ampliación 100% conserva los píxeles reales 1920×1080 y permite desplazarse; ajustar a pantalla y volver al comparador son controles independientes.

## 5. Comparador

«Seleccionar y comparar» abre una paleta; «Comparar con» añade la segunda en paralelo. Las tres vistas cambian simultáneamente en ambas columnas. Debajo se muestran cinco semillas, tokens y muestras adicionales de tooltip, resultado, contador, selección, bloqueo, oro insuficiente y deshabilitado.

## 6. Tablas y tokens

Un único renderer de C, un CSS base copiado sin cambios y una capa de color común. Cada ruta carga sus tokens.css; las tres composiciones comparten esos valores. Ver los tokens.json de cada paleta y [las mediciones de contraste](CONTRAST.html).

Los costes mantienen plata1, menta2 y oro3. Vida jade, enemigo ámbar, maná azul, escudo frío, peligro coral y umbrales activos menta conservan el significado. Precio e icono de moneda siguen dorados en todas. Tipografía, geometrías y arte quedan fijados.

## 7. Contraste y validación

| Paleta | Texto normal mínimo | Precio | Botones: normal / hover / pulsado | Mediciones válidas |
|---|---:|---:|---|---:|
| Royal Pop | 5.04:1 | 6.97:1 | 5.04 / 5.05 / 6.46 | 36 / 36 |
| Neon Playground | 5.00:1 | 8.80:1 | 5.00 / 5.02 / 6.70 | 36 / 36 |
| Tropical Party | 4.96:1 | 5.14:1 | 5.05 / 5.10 / 6.35 | 36 / 36 |
| Coastal Mint | 5.00:1 | 5.83:1 | 5.00 / 5.06 / 6.48 | 36 / 36 |
| Soft Royal | 5.02:1 | 5.33:1 | 5.05 / 5.04 / 6.45 | 36 / 36 |
| Warm Sand | 5.09:1 | 6.31:1 | 5.09 / 5.12 / 6.49 | 36 / 36 |

216 pares pasan sus umbrales, más seis mediciones exentas de deshabilitado. Se adoptan 4.5:1 para texto normal y 3:1 para información gráfica esencial conforme a [W3C — WCAG 2.2: contraste de texto](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) y [contraste no textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Es una evaluación de pares cromáticos, no una certificación WCAG de la aplicación.

Los botones usan una variante más oscura del marco para la tinta clara. El texto de apoyo se expresa en text.secondary; se corrigió el denominador pequeño de Tropical Party, cuyo alpha heredado daba 4.43:1. Todos los ajustes y parejas figuran en CONTRAST.md/json y tokens.json.

Se verificaron dimensiones y fuentes de todos los nodos, contenido, trazados SVG, ausencia de recursos faltantes, y 18 capturas sin scroll. Partida e inspector: cero diferencias geométricas frente a C. Detalles: posiciones y componentes iguales; solo varía el ancho natural de los cinco códigos hexadecimales. Recursos idénticos por SHA-256. La imagen fuente de la arena mantiene exactamente los mismos bytes y su geometría y filtros no cambian. Las capturas del navegador llegan comprimidas en JPEG y se convierten a PNG sin redimensionar; sus píxeles no son idénticos bit a bit. La comparación de una región de arena documenta las diferencias de captura en arena-pixel-verification.json.

La navegación de la galería, selector doble, tres vistas, zoom al 100 %, ajuste y retorno se probaron en navegador; sin errores de consola. El inspector abre al seleccionar una ficha y cierra desde su aspa. Los controles de economía de las composiciones son muestras heredadas sin operaciones ni guardados.

## 8. Evaluación comparativa

Escala 1–10, valoración de dirección artística sobre las capturas finales. No es una prueba con usuarios. Ninguna puntuación representa rendimiento del juego.

| Criterio | Royal | Neon | Tropical | Coastal | Soft | Warm |
|---|---:|---:|---:|---:|---:|---:|
| Calidad visual | 9 | 8 | 9 | 8 | 9 | 8 |
| Personalidad | 9 | 10 | 9 | 7 | 8 | 7 |
| Equilibrio cromático | 9 | 7 | 8 | 9 | 9 | 9 |
| Legibilidad | 9 | 9 | 9 | 9 | 9 | 9 |
| Integración con Mar de Cristal | 8 | 7 | 9 | 10 | 8 | 10 |
| Compatibilidad con pixel-art | 9 | 9 | 9 | 8 | 9 | 8 |
| Calidad de botones | 9 | 9 | 8 | 8 | 9 | 8 |
| Claridad de tarjetas | 9 | 9 | 9 | 9 | 9 | 9 |
| Comodidad en partidas largas* | 8 | 7 | 8 | 9 | 9 | 9 |
| Sensación de videojuego profesional | 9 | 8 | 9 | 9 | 9 | 8 |
| Media simple | 8.8 | 8.3 | 8.7 | 8.6 | 8.8 | 8.5 |

*Comodidad en partidas largas es una hipótesis visual basada en saturación y área de acentos. Requiere comprobarse jugando; no se han hecho sesiones de fatiga.

### Royal Pop

Fortaleza: Equilibra fantasía, energía y lectura; violeta propio, cielo para acciones y oro reconocible.

Debilidad: El violeta se separa mucho del entorno urbano; el cielo debe seguir limitado a acciones.

### Neon Playground

Fortaleza: El lima identifica rápido los controles; la fascia azul y el magenta dejan una personalidad arcade clara.

Debilidad: Mayor tensión cromática con el verde de árboles y sprites; no conviene ampliar las superficies lima.

### Tropical Party

Fortaleza: El petróleo integra bien el cielo y la vegetación; coral y menta mantienen el tono de celebración.

Debilidad: La menta se aproxima a las señales de vida; se conserva su contexto e iconografía y el oro sigue separado.

### Coastal Mint

Fortaleza: Jerarquía tranquila; los retratos y la plaza ganan atención sin perder el acabado cerámico.

Debilidad: Los acentos apagados reducen la energía de Festival Pop; menos reconocible en una miniatura.

### Soft Royal

Fortaleza: Lavanda y champán sostienen fantasía sin ruido; muy buena continuidad entre inspector y economía.

Debilidad: Se parece más a la familia Royal a tamaño pequeño; necesita el detalle para apreciar la suavidad.

### Warm Sand

Fortaleza: La terracota acompaña ladrillo y sol de Mar de Cristal; la arena y los personajes dominan.

Debilidad: Menos contraste emocional entre estados activos y entorno; la señal debe apoyarse en la etiqueta.

## 9. Recomendación

Recomiendo Royal Pop como primera candidata: conserva el carácter festivo y fantástico de C, diferencia bien los controles con cielo y mantiene el oro como señal económica. Es expresiva sin llenar la arena de superficies brillantes. Soft Royal es una alternativa cercana si se prefiere reducir saturación; Coastal Mint si se quiere que la plaza domine todavía más. La recomendación no selecciona ni implementa ninguna.

## 10. Límites conocidos

Las pantallas son prototipos estáticos, no partidas reales ni una nueva aplicación de juego. El temporizador y los contadores no avanzan. Los tres modos conservan las cifras ilustrativas anteriores y el pie histórico F0-P6B.5-A para mantener el contenido exactamente igual a C.

Los tooltips y resultados no existían en las tres láminas de C; se muestran como muestras complementarias de la galería con los mismos tokens. No se añadieron dentro de la arena ni se inventaron reglas de resultado. El juego real conserva sus recursos provisionales K-01/R-03 y sus retratos reales de DOLEA/VARGAS, sin generar ni editar sprites.

El título del banquillo sobre la imagen depende de su sombra original; no se declara contraste global sobre una fotografía. Los tamaños pequeños originales no se han rediseñado porque el encargo fija la geometría. La viñeta original se conserva idéntica y no se tiñe por paleta. No hay validación de daltonismo ni fatiga real. La galería se adapta a pantallas pequeñas; las láminas siguen siendo composiciones PC de 1920×1080.

## 11. Aislamiento y Git

Rama codex/f0-p6b5a2-festival-pop-palettes, nacida de 8d4fcd3. Solo se versiona design-exploration/f0-p6b5a2. Aplicación, CSS de producción, guardados, DEV y la exploración anterior intactos. Se preservan los archivos ajenos sin seguimiento. Sin push ni cambios de remoto.

La validación corresponde a estos prototipos: no se atribuye una nueva ejecución de la batería del juego. La evidencia técnica está en geometry-verification.json, asset-verification.json, image-metadata.json, browser-audit.json y technical-verification.json. La revisión visual independiente se recoge en finish-review.md.

## 12. Cómo continuar

El grupo debe elegir una de las seis paletas, o indicar ajustes de color concretos. Después se podrá abrir una fase de implementación que lleve sus tokens al HUD real manteniendo semántica, estados y pruebas de juego. F0-P6B.5-B no ha comenzado.
