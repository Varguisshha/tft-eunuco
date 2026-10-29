# Sistema de arenas — contrato visual v1

F0-P12I, 29 de octubre de 2026. La Partida local utiliza `mar-de-cristal`. El anfitrión de una sala privada puede elegir Mar de Cristal o Cafetería UPM — ETSISI antes del inicio. La Arena técnica mantiene su escenario original. No hay tienda de arenas ni cambios en reglas.

## Responsabilidades

- `apps/web/src/arenas/arena.ts`: contrato `ArenaDefinition`, validación, proyección, escala y política de cuadrícula.
- `marDeCristal.ts` / `cafeteriaUpm.ts`: configuración propia de cada ilustración: recurso, dimensiones, perímetro, controles, cámara, cuadrícula y escala de personajes.
- `registry.ts`: `ArenaRegistry`, registro exhaustivo por `ArenaId`, descripción, miniatura, aspect ratio, versión de configuración y precarga de la imagen seleccionada.
- `geometry.ts`: homografía de cuatro correspondencias, inversa, transformación de puntos y comprobación de polígonos convexos. La matriz se calcula al iniciar o cambiar calibración, nunca por fotograma.
- `camera.ts`: encuadre uniforme del fondo y del mundo proyectado, límites de seguridad del tablero y puntos de interés opcionales (`camera.landmarks`), cuya visibilidad tiene prioridad sobre cover. El modo opcional `camera.framing: contain` conserva la imagen entera al zoom por defecto. El rectángulo del banquillo flotante determina un margen inferior protegido para las casillas.
- `ArenaCalibration.tsx`: herramientas exclusivas de partidas de desarrollo. Persistencia separada y exportación JSON.
- `projection.ts`: conserva la proyección afín técnica e incorpora matrices opcionales. Los consumidores siguen usando `hexToWorld`, `hexCorners` y `worldToHex`.
- `BoardScene`: carga imagen, pinta overlays temporales y traduce clics y drops. `GameCanvas` conserva ResizeObserver, densidad limitada a 2 y el puente React/Phaser.
- `PhaserUnitVisual`: escala uniforme por profundidad, origen de pies del manifiesto y sombras. `CombatRenderer` proyecta la interpolación del movimiento lógico y los eventos existentes.

No se modifican `packages/game-core`, `packages/game-data`, el contrato de sprites ni el reloj de producción. `packages/shared` incorpora el ID visual y el contrato del selector. La calibración no se serializa dentro de los guardados de partida.

## Autoridad, persistencia y compatibilidad P12I

`packages/shared/src/arenas.ts` limita los IDs a `mar-de-cristal` y `cafeteria-upm-etsisi`. `LobbyHub` crea salas con Mar, acepta `set_arena` solo del anfitrión mientras están en espera y anula todos los estados Listo cuando cambia la selección. Repetir la misma selección no los anula. Invitados y cambios posteriores al inicio se rechazan en el servidor; no basta con deshabilitar el control en React.

`LobbySnapshot.arenaId` es metadata autoritativa de presentación. Se guarda con el lobby de `StoredMatch` al iniciar la partida y se restaura mediante el permiso de `LobbyRoom`. `MatchRoom` transmite la arena en cada snapshot de Cafetería; los snapshots de Mar conservan la forma histórica sin ese campo. `RemoteCoordinator` resuelve su ausencia como Mar. Los espectadores reciben la misma identidad visual a través del snapshot principal.

Las partidas guardadas sin `arenaId` y con contrato de lobby `f0p7b2-1` siguen siendo válidas y no se reescriben. Las acciones/eventos nuevos usan `f0p12i-1`: cliente y servidor deben actualizarse juntos. Un cliente antiguo no debe interpretar una partida de Cafetería como Mar. Los fingerprints de catálogos, objetos y snapshots del motor permanecen intactos: el ID no entra en la simulación ni en su semilla.

Las salas **previas al inicio** siguen siendo efímeras, como antes de P12I. Un reinicio elimina esas salas y su selección; la garantía PostgreSQL/reinicio/SIGKILL se aplica a partidas ya creadas. No se añade una tabla ni una migración para persistir salas en espera.

## Recursos y errores

El PNG suministrado se conserva byte por byte en `art/arenas/`. El navegador utiliza una conversión WebP lossless con igualdad de píxeles decodificados comprobada. `art/arenas/manifest.json` registra hashes, dimensiones y derivados. Las miniaturas son recursos locales independientes; al seleccionar solo se precarga y decodifica el fondo elegido. El catálogo registra URLs, no descarga ambos fondos completos al importar JavaScript.

Si falta una miniatura se conserva el nombre y la selección. Si falla el fondo, `BoardScene` dibuja el suelo provisional sobre la misma proyección y `GameCanvas` informa cómo reintentar. El fallo visual no modifica celdas ni comandos. No se usan CDNs externos.

## Contrato

Una arena declara versión, identificador/nombre, URL y clave de textura, archivo fuente y SHA-256, anchura/altura, polígono convexo de pavimento seguro, modelo y cuatro controles de proyección, foco/márgenes/límites de cámara, colores/política de cuadrícula y escala/profundidad de personajes.

La validación rechaza contratos desconocidos, dimensiones no finitas, escalas inválidas, cuadriláteros invertidos o degenerados, horizonte dentro del tablero y casillas fuera del pavimento. Los 336 vértices de las 56 celdas deben estar dentro del perímetro. No se cambia la ocupación para adaptar el dibujo.

## Geometría e interacción

El motor conserva odd-r 7×8 y coordenadas axiales. La web transforma el plano cartesiano de hexágonos unitarios mediante una homografía 3×3. Los polígonos se construyen proyectando sus seis vértices, no escalando hexágonos de pantalla.

El puntero pasa de cliente CSS a buffer de render, luego por la inversa de cámara, por la inversa de homografía y finalmente por `cartesianToAxial`/redondeo cúbico. Se conserva la validación de límites y mitades del core. No se elige por proximidad a centros proyectados. Las pruebas incluyen ambos lados de cada arista compartida a 0,000001 de la frontera, centros, vértices interiores y puntos exteriores.

La selección de personajes considera sus bounds visuales visibles; los drops siempre usan el suelo proyectado. El umbral de arrastre es 5 píxeles CSS, independiente del DPR. Al terminar un drop aceptado en el tablero se cierra la selección visual y se oculta la cuadrícula. Los rechazos mantienen el estado lógico intacto y muestran el error existente.

## Capas

| Capa                                                  | Orden                |
| ----------------------------------------------------- | -------------------- |
| Imagen completa                                       | −100                 |
| Cuadrícula temporal / calibración                     | 2                    |
| Sombras de contacto                                   | 100                  |
| Personajes                                            | 1000 + Y de los pies |
| Proyectiles, habilidades, barras y estados de combate | 4000                 |
| Números de daño/curación                              | 4100                 |
| Estrellas                                             | 4200                 |
| Decoración técnica de overtime                        | 4300                 |
| HUD e inspector                                       | DOM superpuesto      |

Los proyectiles y efectos conservan el renderer compartido; no se generan eventos de juego desde animaciones. Los sprites no reciben homografía, estiramientos ni rotaciones nuevas. Se transforman sus pies y se escala X/Y por el mismo factor. Las sombras permanecen bajo todos los cuerpos.

## Cuadrícula y calibración

Sin selección ni arrastre, no se dibuja cuadrícula. En preparación editable: jade para destinos propios, ámbar para mitad rival, relleno más intenso para ocupadas, contorno de hover y cruz coral para destino prohibido. Combate/resolución: oculta incluso con personaje seleccionado. La excepción explícita es la calibración técnica.

En una partida de desarrollo, «Calibrar arena» encuadra temporalmente la imagen completa junto al panel y muestra controles de cuatro puntos, desplazamiento, escala, centros, perímetro y coordenadas bajo el cursor. Ajustar cada par X/Y cambia también la perspectiva. Dos casillas permiten aislar fondo y cuadrícula sin tocar las unidades lógicas. Una propuesta inválida muestra el motivo y conserva la última proyección válida; cerrar siempre restaura la configuración oficial y todas las capas normales.

Guardar usa `tft-arena-calibration-v1:<id>`. Recuperar comprueba versión, arena, hash de imagen y geometría; nunca se carga automáticamente en partidas normales. Exportar descarga un JSON y el desplegable permite copiarlo. Para aceptar una calibración de producción, trasladar sus controles al manifiesto y ejecutar las pruebas y validaciones visuales. No hay escritura de código desde el navegador.

## Añadir otra arena

1. Conservar el original e identificarlo mediante dimensiones y hash. Crear un derivado reproducible si aporta valor.
2. Declarar otro `ArenaDefinition`, sin modificar los módulos geométricos ni el motor.
3. Marcar un perímetro de suelo libre de obstáculos y cuatro controles en orden fondo/derecha/frente/izquierda.
4. Ajustar cámara y escala con las herramientas de desarrollo; exportar y revisar los datos.
5. Validar manifiesto, esquinas, bordes, inversa, zoom, cinco tamaños, DOLEA y guardados.
6. Añadir el ID al enum compartido y la definición/miniatura al registro tipado; incrementar la versión del contrato de selección si exige incompatibilidad. El selector enumera el registro y `LocalGame` pasa la arena autoritativa a `GameCanvas`, sin un motor nuevo. La Arena técnica continúa sin esta opción.

Para una tercera arena, las tareas principales son su definición/calibración, los dos assets de navegador y su entrada en el manifiesto. Ejecutar las pruebas parametrizadas de `arena.test.ts`, `visualIntegration.test.ts` y `registry.test.ts`, además de selección/persistencia y revisión visual. No editar combate, daño, targeting, inventario ni economía.

El contrato actual implementa una superficie plana proyectiva. Escenarios con desniveles, máscaras de oclusión de edificios o múltiples planos requerirán una extensión explícita; no deben simularse alterando coordenadas del combate.
