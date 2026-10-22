# Contrato inicial de sprites v1

## Entrega al desarrollador

Entregar PNG con transparencia, spritesheet de celdas regulares sin padding ni separación, y JSON validable con `SpriteMetadataSchema` de `packages/sprite-contract`. No incrustar suelo, sombras permanentes, barras de vida, UI ni texto en el sprite. Arte y nombres originales, sin recursos de TFT ni personas reales. Mantener en todas las celdas el mismo lienzo, origen y punto de apoyo; incluir aire para efectos y armas sin recortes.

El placeholder mide **32 × 40 px**; esta es una medida provisional, no una limitación del formato. Acordar dimensiones definitivas antes de producir todo el roster. Los pixels se escalan con nearest-neighbor. Una sola orientación lateral con espejo es suficiente para este prototipo; si el arte no puede espejarse, `mirrorAllowed:false` y acordar un atlas/contrato direccional posterior. No fingir soporte para ocho direcciones que aún no existe.

## Campos

- `version`: 1.
- `id`, `textureKey`: IDs únicos y estables, ligados al `spriteId` de la definición.
- `frameWidth`, `frameHeight`: píxeles enteros positivos por celda.
- `frameCount`: cantidad total de celdas utilizables. Orden de lectura por filas desde la esquina superior izquierda.
- `origin`: coordenadas normalizadas [0,1], origen visual usado por el renderer.
- `foot`: píxeles dentro del frame, punto de contacto con el centro de la casilla. Se recomienda alinear el apoyo X con el origen X.
- `facing`: orientación del original, `left` o `right`; `mirrorAllowed` indica si puede reflejarse horizontalmente.
- `animations`: exactamente `idle`, `walk`, `attack`, `ability`, `death`.
- Cada clip tiene `frames` (índices absolutos desde 0 en la hoja), `fps` positivo ≤60, `loop` booleano e `impactFrame` (índice **dentro del clip**, desde 0, o `null`). El marcador se valida contra la longitud del clip; no es el número absoluto del frame.

Ejemplo ilustrativo de hoja real, **no arte entregado ni animaciones ya implementadas**:

```json
{
  "version": 1,
  "id": "original-unit-v1",
  "textureKey": "original-unit-v1",
  "frameWidth": 64,
  "frameHeight": 64,
  "frameCount": 24,
  "origin": { "x": 0.5, "y": 1 },
  "foot": { "x": 32, "y": 60 },
  "facing": "right",
  "mirrorAllowed": true,
  "animations": {
    "idle": { "frames": [0, 1, 2, 3], "fps": 6, "loop": true, "impactFrame": null },
    "walk": { "frames": [4, 5, 6, 7, 8, 9], "fps": 10, "loop": true, "impactFrame": null },
    "attack": { "frames": [10, 11, 12, 13], "fps": 10, "loop": false, "impactFrame": 2 },
    "ability": { "frames": [14, 15, 16, 17, 18], "fps": 10, "loop": false, "impactFrame": 3 },
    "death": { "frames": [19, 20, 21, 22, 23], "fps": 8, "loop": false, "impactFrame": null }
  }
}
```

## Integración

1. Validar el JSON con `SpriteMetadataSchema`. Validar además que la imagen física contiene los frames declarados: el schema no decodifica PNGs.
2. Cargar la hoja en `preload` con `scene.load.spritesheet(textureKey, url, {frameWidth, frameHeight})` y metadatos asociados.
3. Sustituir el proveedor `registerPlaceholder` en la capa web por un registro de assets que devuelva esos metadatos. `PhaserUnitVisual` ya registra los clips de una hoja de varios frames.
4. Mantener el puerto `UnitVisual`: `setFootPosition`, `setSelected`, `setFacing`, `play`, `destroy`. No cambiar las reglas de tablero ni guardar sprites en UnitInstance.
5. Comprobar apoyo, espejo, escalado, orden Y y alineación entre todos los clips. El offset visual es `(origin * frameSize − foot) * scale`; el eje X cambia de signo al reflejar.

El placeholder usa un único frame en los cinco clips y no finge animación. El adaptador con hojas reales está implementado, pero **no validado con arte definitivo**, que está fuera de alcance.

## Impacto y autoridad

`impactFrame` describe cuándo el arte representa contacto; sirve como referencia de reproducción. No aplica daño, no avanza ticks y no modifica reglas. La reproducción futura deberá alinear los efectos con eventos autoritativos. FPS visual y tick lógico de 100 ms son relojes distintos. No existe aún un reproductor de combate ni callback de impacto que resuelva reglas.

## Criterios de aceptación del arte

Transparencia limpia, sin suavizado accidental; dimensiones constantes; todos los clips identificados; sin saltos del apoyo; death no se repite; ausencia de material protegido; archivos y metadatos versionados. Guardar fuente editable junto a cada entrega fuera del runtime si el colaborador lo desea. No integrar archivos definitivos en F0-P1.
