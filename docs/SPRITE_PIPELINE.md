# Pipeline de sprites F0-P4.1

## Ejecutar y revisar

1. `pnpm install` (Node >=22.12). `sharp@0.34.5` es dependencia de desarrollo; utiliza sus binarios opcionales del registro. No necesita scripts de instalación en este entorno (`allowBuilds.sharp:false`).
2. Guardar fuentes sin sobrescribir originales. Editar `scripts/sprites/config.json` para registrar el personaje.
3. Ejecutar `pnpm sprites:import` desde la raíz.
4. Revisar `docs/SPRITE_IMPORT_REPORT.json`, `docs/ANIMATION_COVERAGE.md` y los PNG derivados.
5. Ejecutar `pnpm check` y `pnpm format:check`; abrir la Arena, su inspector de animaciones y un combate.

El importador es `scripts/sprites/import.mjs`. No utiliza servicios de generación ni redibuja el arte. Produce hojas PNG horizontales y retratos estáticos en `apps/web/public/sprites/`, un registro validado en `apps/web/src/assets/characters.json`, un informe reproducible y cobertura. No contiene timestamps que cambien al repetirlo. Los tests repiten la importación en un directorio temporal y añaden un Walk real para comprobar que Attack permanece idéntico.

## Organización recomendada

```
Sprites/<id>/star1/idle/frame-1.png
Sprites/<id>/star1/walk/frame-1.png
Sprites/<id>/star1/attack/frame-1.png
Sprites/<id>/star1/attack/frame-2.png
Sprites/<id>/star2/attack/frame-1.png
Sprites/<id>/star3/death/frame-1.png
```

Se admiten `1.png`, `2.png`… o `frame-1.png`, `frame-2.png`…; orden numérico, no lexicográfico. Los estados vacíos permanecen `null`. La carpeta canónica prevalece sobre la nomenclatura heredada de DOLEA. Para las fuentes heredadas se toleran espacios y se ordena ATAQUE como primer frame. Las copias exactas con «copia» se verifican por SHA-256 y se ignoran; copias conflictivas o sin original se rechazan para no escoger arte arbitrariamente. Los saltos de numeración se registran; se importan los disponibles. Un marcador cuyo frame fuente falte queda nulo y señalado para revisión.

## Normalización

- Exige PNG con canal alfa, transparencia efectiva y contenido visible; rechaza imágenes vacías y fondos completamente opacos.
- Decodifica dimensiones de cada fuente: no presupone el mismo lienzo entre evoluciones.
- DOLEA utiliza `alphaCutoff:8`: únicamente en los derivados, elimina píxeles con opacidad <=8/255 (ruido casi invisible). Conserva el resto del alfa. Umbral configurable por personaje; no se inventan colores, fondos o píxeles de anatomía.
- Calcula límites de todo el contenido restante; el apoyo se estima desde la franja inferior del 12% de la silueta con alfa >127. Centros de ambos pies y línea inferior estable, con redondeo máximo de un píxel de raster.
- Una escala por evolución, derivada de la altura mediana de Attack (o primer estado disponible). Los futuros clips de esa evolución comparten esa escala: no estira un Walk agachado hasta hacerlo tan alto como Attack.
- Altura de referencia 96 px, altura de tablero 64 unidades de mundo. Un lienzo común por clip contiene todos los brazos/pies con margen. Mantiene la relación de aspecto salvo redondeo inevitable al píxel; nearest-neighbor, sin blur, contornos artificiales o filtros de suavizado.
- Pies/origen declarados por clip permiten distintas dimensiones entre clips. Phaser aplica el anclaje también al reflejar horizontalmente; casillas y targeting no dependen del tamaño de imagen.
- Retratos se recortan a la silueta de la primera pose para que tienda e inspector no hereden los márgenes técnicos de la hoja.

Para poses sin pies visibles, saltos, efectos distantes o recortes originales, la estimación automática necesita revisión artística; no puede reconstruir contenido ausente. No se afirma un sistema de rigging o detección anatómica.

## Importación real de DOLEA

32 archivos encontrados: 16 originales +16 copias binarias exactas. Ocho originales por evolución. Nivel 1:1254×1254; nivel 2:1086×1448. Todos RGBA. Existen muchos píxeles con alfa parcial (incluido el interior a253), conservados salvo el umbral indicado. El ruido inicial llegaba a los bordes; después de limpiarlo no hay contenido cortado por el lienzo derivado.

Salida: Attack1, 1024×128 (8 celdas128×128); Attack2,896×128 (8 celdas112×128), más dos retratos. No se creó una tercera evolución gráfica. El informe conserva nombres exactos, SHA-256, dimensiones, límites, apoyos, escala y anomalías por fuente. Los originales no se modificaron, renombraron ni eliminaron.

Marcador provisional: frame3 en 1★ (índice2), frame6 en 2★ (índice5), por la primera extensión de contacto clara de cada secuencia inspeccionada. Hay otras extensiones de puño en el arte; NO representan golpes mecánicos adicionales. El orden suministrado se conserva. Cambiar `impactFrames` en config y reimportar permite revisar esta decisión.

## Integración F0-P6B.3

VARGAS tiene5 fuentes RGBA1254×1254 de Nivel2 original, preservadas byte a byte en la carpeta canónica star2/attack. No había ficheros VARGAS ni1y5 en Sprites/. Los cinco adjuntos son transparentes; secuencia1→5 inspeccionada y documentada en `Sprites/vargas/PROVENANCE.json`. Una hoja star2/attack y un retrato derivados, sin duplicados de hojas1/3. El manifiesto admite procedencia y listas explícitas `fallbacks`; siempre busca recursos propios antes de esas referencias. Si no hay listas, se conserva la búsqueda inferior histórica de DOLEA. Los huecos futuros se importan por estrella/estado sin tocar gameplay. [Procedimiento y carencias](VARGAS_CHARACTER.md).

## F0-P6C · JARAMILLO

El importador admite `composites` y usa fuentes canónicas de Sprites/jaramillo, anclajes declarados, nearest-neighbor y SHA-256. La regeneración no depende de output/ ni attachments. Las tres poses limpiadas por generación no son idénticas a las fotos; se conserva procedencia separada. Véase COMPOSITE_ATTACK_ANIMATIONS.md.
