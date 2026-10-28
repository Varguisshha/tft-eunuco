# P11I — extensión de presentación de sinergias y especialización

## Overview

P11I es un refinamiento acotado de **Festival Pop C × Neon Playground**. Conserva Mar de Cristal, los retratos originales, cinco ofertas de tienda, nueve plazas de banquillo y la bolsa permanente de dos columnas. La autoridad sigue siendo `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json` y la extensión P11H. No establece otro mundo visual ni una composición nueva.

La intervención ordena las sinergias según su estado real, separa rol y tipo de daño de las afinidades y reduce el contenido ordinario del inspector. Este documento registra presentación y evidencia existente. La revisión visual no certifica mecánicas, balance, persistencia, red ni despliegue.

## Colors

Se mantienen las superficies oscuras, los marcos azules, el texto lavanda y las funciones de lima, magenta y oro del sistema vigente. Los estados de sinergia y la especialización incluyen texto; el color o el icono por sí solos no determinan activación, rol ni daño. No se añaden tokens globales.

## Typography

FestivalPop conserva nombres y jerarquía de juego; DM Sans sostiene etiquetas, explicación de especialización, habilidades y estadísticas. Rol y daño son dos datos descriptivos distintos, con sus propios iconos SVG originales y nombres accesibles. Una afinidad no sustituye ninguno de esos datos.

## Layout

Las ofertas reservan una fila superior para rol y daño; el retrato comienza debajo. Esta reserva evita cubrir ilustración, nombre, coste o afinidades. Las cinco ofertas y la bolsa de (112px), con dos columnas, mantienen su geometría. El campo conserva el espacio protagonista.

La ficha mantiene su altura disponible y el desplazamiento interno. Oculta los contadores internos de «Progreso de combate» en la interfaz ordinaria y reúne las afinidades completas en un único desplegable inicialmente cerrado. Conserva habilidades, pasivas, equipo y estadísticas. El cierre permanece fuera del contenido desplazable. En (1280 × 720), las habilidades largas siguen requiriendo desplazamiento interno y permanecen alcanzables.

Las métricas comparables de VARGAS en combate registran la siguiente reducción de contenido; no representan una reducción de tamaño de la ficha:

| Viewport    | Contenido anterior | Contenido P11I | Área visible interna |
| ----------- | ------------------ | -------------- | -------------------- |
| 1280 × 720  | 1778px             | 916px          | 304px                |
| 1440 × 900  | 1794px             | 929px          | 436px                |
| 1920 × 1080 | 1808px             | 938px          | 575px                |
| 2560 × 1440 | 1808px             | 938px          | 610px                |
| 3840 × 2160 | 1808px             | 938px          | 610px                |

`before-metrics.json` y `after-metrics.json` registran documento igual al viewport, cinco ofertas y bolsa de (112px) en preparación y combate para los cinco tamaños. Es evidencia de ausencia de desbordamiento del documento en esos estados concretos; el desplazamiento interno sigue permitido.

## Elevation & Depth

La ficha y las descripciones mantienen las capas superpuestas del HUD existente. La nueva cabecera de especialización pertenece a la tarjeta; no introduce una capa flotante sobre el retrato ni modifica la profundidad de la arena.

## Shapes

Se conserva la geometría angular, los marcos y los recursos de P11H. Los iconos de rol y daño son SVG propios, acompañados de texto accesible. El arte de objetos sigue resolviéndose por el manifiesto existente; esta pasada no recertifica sus 44 ilustraciones.

## Components

**Sinergias ordenadas.** Primero aparecen los efectos realmente activados; después se compara nivel alcanzado, progreso relativo exacto e identificador estable para resolver empates. Alcanzar un umbral de un efecto no implementado mantiene «Efectos pendientes», sin presentarlo como activación mecánica. El estado inactivo conserva su etiqueta. El Depredador y Mano de Obra muestran «Atributo único · Activo» y (1/1), sin sugerir un siguiente escalón inexistente. En la formación de referencia siguen presentes las 13 entradas.

**Especialización descriptiva.** La cabecera distingue los cuatro personajes con diseño propio del resto del catálogo pendiente:

| Personaje                     | Rol                       | Daño principal y condición                                                                                        |
| ----------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| DOLEA                         | Tanque                    | Físico                                                                                                            |
| VARGAS                        | Asesino                   | Físico                                                                                                            |
| JARAMILLO                     | Tirador de apoyo          | Físico; el debilitamiento no implica daño mágico                                                                  |
| FLORIN                        | Luchador duelista         | Físico y verdadero; los básicos pasan a verdadero tras la segunda vuelta de Mano de Obra, con ese atributo activo |
| PEIBOL y los demás pendientes | Especialización pendiente | Sin definir                                                                                                       |

La ficha explica la condición de FLORIN en texto. Los parámetros provisionales de simulación de los 30 personajes pendientes no acreditan una especialización definitiva. Estas etiquetas describen el diseño de combate; no modifican sus reglas.

**Inspector ordinario y diagnóstico.** El contador interno de progreso desaparece de la ficha ordinaria tanto en preparación como en combate. Arena de diagnóstico conserva sus contadores DEV. El desplegable permite consultar todas las afinidades sin mantenerlas expandidas durante cada inspección.

**Equipo, descripciones y estadísticas.** `visual/interactions.json` registra las etiquetas de DOLEA, VARGAS, JARAMILLO, FLORIN y PEIBOL, sus afinidades y habilidades alcanzables; registra además desplazamiento de bolsa, una sola descripción de objeto visible y acceso a las estadísticas de combate, sin errores JavaScript en esa sesión. `role-*.png`, `ability-*.png` y `statistics-{1280,1920}.png` acompañan esos registros. Son evidencia de presentación e interacción, no del cálculo de daño o efectos.

## Do's and Don'ts

- Do reservar espacio para rol y daño sin cubrir retrato, nombre, coste o afinidades.
- Do ordenar por activación efectiva y conservar desempates estables.
- Do distinguir nivel alcanzado de efectos implementados y mantener visibles los pendientes.
- Do identificar los atributos únicos con (1/1) y explicar condiciones de daño en texto.
- Do conservar habilidades, pasivas, equipo, estadísticas y acceso a todas las afinidades.
- Don't inferir rol o daño a partir de afinidades o parámetros provisionales.
- Don't reintroducir contadores de diagnóstico en la ficha ordinaria.
- Don't ampliar el veredicto visual a simulación, red o despliegue.

### Evidencia y disposición

**Disposición visual: ship**, según la revisión independiente del refinamiento P11I comunicada en esta pasada. Su alcance son sinergias, cabecera de especialización e inspector. El paquete contiene 20 capturas `visual/{before,after}-{preparation,combat}-{1280,1440,1920,2560,3840}.png`, con las dimensiones de la tabla, más `before-metrics.json` y `after-metrics.json`. El estado anterior procede de la compilación local P11H sin modificar; el posterior, de P11I. Ambos vuelven a seleccionar VARGAS después del cambio de fase. Esta escritura consulta el paquete y los registros existentes; no ejecuta navegador ni una nueva revisión visual de las 20 imágenes. No se ejecutó detector en esta pasada.

Como evidencia funcional separada, `network/multiplayer.json` registra salas privadas de dos, tres y cuatro jugadores con latencia saliente simulada de (250ms), colocaciones confirmadas y orden de sinergias conservado. La reconexión sin recarga se ejercitó y aprobó con cuatro jugadores; no se ejercitó con dos o tres, según `reconnectionExercised`. El valor falso de `reconnectedWithoutReload` en esos dos casos no representa una recuperación fallida. El registro no contiene mediciones de viewport en red. Por tanto, no se extrapola recuperación sin recarga a los tres tamaños de sala ni se convierte esta evidencia en una certificación de red mediante capturas.

El paquete identifica comprobación de 13 huellas de simulación y catálogo sin cambios. Esa comprobación pertenece a la validación técnica del cambio, no al veredicto visual de este documento.

### Desfase documental preexistente, sin reparación

Se preservan `DESIGN.md` y `.impeccable/design.json`. Continúa el desfase documentado en P11H: el máximo histórico de banquillo de aproximadamente (85.3px) frente a la cascada P11G de (108.24px) con la unidad máxima vigente, y la ausencia de la bolsa permanente de (112px) y el tooltip compartido en su inventario de componentes. P11I tampoco regenera ese inventario. Además, `DESIGN.md` conserva la indicación histórica de ocultar el rol secundario de oferta hasta (800px) de altura; la cabecera reservada y las capturas P11I describen el tratamiento actual de especialización en los tamaños aquí registrados. Se consigna la diferencia sin restaurar geometrías históricas, sobrescribir tokens ni ampliar la autoridad de esta extensión a otras superficies.
