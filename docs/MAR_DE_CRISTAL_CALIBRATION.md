# Mar de Cristal — calibración F0-P5.2

## Fuente confirmada

`Plaza urbana isométrica junto al metro.png`, localizada en la raíz del repositorio, **1672×941 RGB**, 3.597.375 bytes.

SHA-256: `710815591780ff893603bca90f7bbf544d233585ba373ddb357a19097511761a`.

No se usó `Sprites/Plaza pixelada junto a Mar de Cristal.png`. No se generó otra imagen. El original permanece intacto y sin seguimiento. El derivado `/assets/arenas/mar-de-cristal.webp` mantiene exactamente dimensiones y píxeles: comparación de ambos buffers RGB decodificados idéntica. Tamaño 2.672.720 bytes, reducción del 25,7 %. Reproducción: `node scripts/arenas/import.mjs`, desde la raíz. Informe: `ARENA_IMPORT_REPORT.json`.

## Modelo seleccionado

Homografía de cuatro correspondencias entre el rectángulo que contiene todos los vértices hexagonales en plano cartesiano y el cuadrilátero de control en píxeles de la imagen. Se descartó colocar el antiguo tablero por encima de la foto y también una transformación afín única: los lados de la plaza convergen. En los controles finales, la condición de paralelogramo `P0 + P2 = P1 + P3` deja un residual de aproximadamente **107 px**; forzar una afín desplazaría significativamente una esquina.

La homografía tiene ocho grados de libertad y `h33 = 1`. Se resuelve una vez, se guarda junto a su inversa y se aplica a centros, esquinas y posiciones interpoladas. No se necesita malla deformable, shader, perspectiva sobre sprites ni cambios en el motor.

## Parámetros finales

Coordenadas en la imagen original, origen superior izquierdo. Orden circular constante:

| Punto     | Control X | Control Y | Perímetro seguro X | Perímetro seguro Y |
| --------- | --------- | --------- | ------------------ | ------------------ |
| Fondo     | 721       | 306       | 715                | 280                |
| Derecha   | 1330      | 509       | 1380               | 505                |
| Frente    | 880       | 810       | 880                | 850                |
| Izquierda | 290       | 501       | 235                | 492                |

El perímetro seguro delimita asfalto interior evitando aceras, árboles y mobiliario. El cuadrilátero blanco es la envolvente de calibración; el contorno real de las celdas es dentado y queda dentro. Son 7 columnas, 8 filas, 56 celdas, 4 filas por equipo. Los 336 vértices se verifican contra el perímetro convexo, no solo los centros.

A petición del usuario, la huella se amplió desde 164.981,5 a 261.444 píxeles cuadrados de la imagen (+58,5 % en su envolvente). Las celdas aprovechan más asfalto sin invadir el perímetro seguro. La configuración es única en todos los viewports: no se deforma el suelo al redimensionar.

### Cámara

Foco preferido `(836, 420)`. Fondo y personajes usan la misma cámara y escala uniforme. Se reserva 172 px CSS a la izquierda en escritorio, 16 a la derecha, 8 arriba y 12 abajo; la caja añade 90 px de mundo para cabezas, 40 laterales y 24 debajo.

Los puntos de interés `camera.landmarks` incluyen las esquinas `(1205,10)` y `(1387,85)` del letrero de Carrefour. El modo `camera.framing: contain` encuadra la imagen completa al 100%. Al acercar, los límites de estos puntos y del tablero ampliado siguen siendo obligatorios. La visibilidad tiene prioridad sobre llenar todo el ancho: cuando cover cortaría el cartel o las filas delanteras, se abre el encuadre y se centra la ilustración junto al panel de jugadores, con espacio lateral del color del HUD. La imagen no se estira, repite ni recompone.

Zoom solicitado 0,85–1,15, limitado por la visibilidad del cartel y las casillas. Varios porcentajes pueden coincidir al alcanzar ese límite. Abrir el inspector no cambia cámara ni canvas. El banquillo está superpuesto dentro del campo; su límite superior real se transmite a la cámara para proteger los hexágonos, mientras la ilustración sigue detrás. El tamaño en pantalla depende del espacio disponible: ampliar las casillas respecto al asfalto no garantiza que crezcan en píxeles en pantallas bajas al mostrar también el edificio.

### Personajes

Factor uniforme `1,12 × lerp(0,94, 1,06, clamp((Y − 335) / 445))`, aplicado sobre la escala de cada asset. Variación suave, determinista y solo visual. Pies del manifiesto de DOLEA; sombras elípticas de contacto; profundidad `1000 + Y`. Flip horizontal conservado. DOLEA 3★ usa la apariencia 2★ existente. Idle/Walk/Death siguen usando los fallbacks del contrato; no se inventan animaciones direccionales. La dirección diagonal se aproxima mediante las dos orientaciones disponibles.

## Procedimiento de ajuste

Abrir herramientas de desarrollo en el lobby, crear o recuperar una partida de desarrollo y abrir «Calibrar arena». Para trabajar sin avance del reloj, usar la pausa técnica. Revisar el perímetro amarillo, los cuatro controles blancos, los 56 centros y las dos mitades. Ajustar puntos o posición/escala; cualquier celda exterior impide aplicar y guardar la propuesta. Las coordenadas bajo el cursor se muestran en axial y en píxeles de imagen.

Guardar/recuperar no modifica el guardado de partida. Exportar JSON identifica arena, versión y hash del original. Los parámetros aceptados están centralizados en `apps/web/src/arenas/marDeCristal.ts`.

## Límites

La ilustración es una representación artística, no un levantamiento métrico. Los controles se han ajustado visualmente al plano central. No hay máscaras de árboles ni edificios porque ninguna casilla los invade. Al abrir la calibración se usa un encuadre de diagnóstico que muestra la imagen y el perímetro completos junto a los controles, con espacio oscuro auxiliar. Al cerrar se restaura el encuadre de partida con el cartel visible. Esta vista técnica permite revisar también los detalles periféricos recortados durante el juego. Bajo 1100 px se conserva el flujo móvil anterior, sin declarar validación táctil ni encuadre completo para todos los formatos posibles.
