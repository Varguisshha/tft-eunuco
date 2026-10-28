# Animaciones de ataque compuesto

Contrato visual v1 opcional de `CharacterManifest` v2, independiente del motor. JARAMILLO lo estrena; el renderer selecciona por manifiesto, sin comparar su ID.

| Campo               | Función                                                                   |
| ------------------- | ------------------------------------------------------------------------- |
| bodyAnimation       | Clip corporal de ataque                                                   |
| recoveryAnimation   | Recurso de recuperación separado                                          |
| projectileAnimation | Objeto y estela en vuelo                                                  |
| impactAnimation     | Humo de impacto                                                           |
| releaseMarker       | Índice corporal de liberación                                             |
| projectileOrigin    | Desplazamiento desde los pies, reflejado con la orientación               |
| targetAnchor        | Desplazamiento visual del objetivo                                        |
| visualTiming        | Liberación 80 ms, recuperación hasta 160 ms desde emisión, impacto 300 ms |
| fallbackPolicy      | `body-only`: nunca sustituir cuerpo por VFX                               |

## Flujo

1. El motor emite `attack_start` o `ability_cast`, con ticks de resolución.
2. La preparación corporal se muestrea con el reloj de reproducción.
3. `projectile_launch` fija origen, destino, lanzamiento e impacto. Phaser interpola esa traza, sin física ni cálculo de daño.
4. El cuerpo muestra lanzamiento, recuperación y después Idle; el cigarro es otro Sprite con textura y anclaje propios.
5. Solo un evento `damage` con el `projectileId` correspondiente activa el humo en su `impact` autoritativo. Un objetivo muerto antes de la llegada no recibe otro daño ni genera humo.
6. Los VFX no vistos en el fotograma se destruyen; `clear` limpia el conjunto al cambiar reproducción. Pausa, seek y velocidad usan el mismo reloj que el cuerpo. No se programan temporizadores de daño.

Los básicos siguen el pipeline existente. Las activas con `delivery: projectile` admiten efectos core directos sobre `current_enemy`, radio cero; el esquema rechaza combinaciones no soportadas como área o efectos mecánicos de salto. No es un segundo simulador.

## Pipeline y anclajes

`pnpm sprites:import` procesa `scripts/sprites/config.json` con `composite.mjs`. Comprueba canal alfa y transparencia real, dimensiones, límites del lienzo y conserva orden declarado. Escala nearest-neighbor, sin estirar. Registra SHA-256 de cada fuente en manifiesto y `SPRITE_IMPORT_REPORT.json`.

Los sprites corporales usan lienzo 160×128 con pie x72. Idle/Walk/Death/recovery apoyan y116; ataque y120 conserva el apoyo de sus derivados. Escala fuente declarada por clip; escala de representación común 2/3 antes de la calibración general del tablero. VFX tienen lienzos y anclajes propios. Posiciones de humo dentro de la foto no son coordenadas del mundo.

Fuentes canónicas reproducibles en `Sprites/jaramillo/original-frames`, `prepared-attack`; las fotos recibidas y salidas de edición se conservan por procedencia. No depende de archivos temporales de attachments ni de `output` para regenerar el juego. La apariencia nativa sigue pendiente.

## Integrar otro personaje

Clasificar primero qué imágenes contienen cuerpo, objeto e impacto. Declarar clips, escalas y anclajes; copiar fuentes canónicas sin sobrescribir originales. Añadir `composite` al manifiesto mediante el importador; preservar clips corporales para todas las solicitudes. Configurar el ataque lógico en datos. Si una nueva mecánica necesita área, salto o empoderamientos de proyectil, ampliar y probar ese contrato explícitamente antes de usarlo.

Pruebas puras: `compositeVisuals.test.ts`. Pruebas lógicas y cancelación: `combat/jaramillo.test.ts`. Evidencias de reproducción pausada: `artifacts/p6c/01-idle.png` a `09-cortina.png` (directorio local de validación).
