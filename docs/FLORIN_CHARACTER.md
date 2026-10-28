# FLORIN — catálogo florin-1

## Fuente y alcance

Fuente principal íntegra: `TFPeru/Florin/Habilidades_y_demas.txt`, copiada sin modificar desde el proyecto original. Se conserva su texto literal al final. Los sprites son ataques cuerpo a cuerpo: puños a 1★, puños y patada a 2★, martillo a 3★. No hay proyectil ni fotograma exclusivamente de efecto. La activa física existe en el TXT; no se ha inventado una definitiva.

ID `florin`; cuarto personaje original, coste **3**, rol duelista (`striker`). Afinidades: **Ruman Trinity**, **Perdidos por el Mundo**, **Mano de Obra**. La única incorporación al roster es FLORIN. Los personajes ficticios anteriores se conservan; no se crean miembros adicionales para alcanzar umbrales.

## Reglas explícitas y parámetros propuestos

| Componente                                             | Reglas del TXT                                                                                                                                                                                                                                             | Decisiones provisionales necesarias                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Suela reforzada                                        | Después de 5/4/3 básicos, el siguiente añade 50/60/75 % AD; a 3★ ralentiza 20 % durante 1 s                                                                                                                                                                | Contar básicos confirmados, incluyendo impactos absorbidos; el golpe reforzado es el 6.º/5.º/4.º. La ralentización afecta movimiento. Cancelaciones y animaciones no suman                                                                                                                                           |
| Pisotón Carmesí / Pisotón Demoledor / ¡A Picar Piedra! | 180/260/400 % AD físico; aturde 1/1,5/2 s; secundarios reciben 50/60/75 %; 2★ gana 10 % AS 3 s, 3★ gana 20 % AS 4 s                                                                                                                                        | 80 maná, 0 inicial, lanzamiento 4 ticks; radio hexagonal 1/2/3 sobre el objetivo. Aturdimiento solo al principal, conforme al texto que lo describe. No se añade escalado AP                                                                                                                                         |
| Mano de Obra                                           | Primera salida al 60 %, segunda al 30 %; fuera no ataca ni recibe daño; se cura; vuelve al 100 % o cuando mueren todos sus compañeros. Primera vuelta +25 % AS y +15 % movimiento; segunda convierte básicos en verdadero. Cada salida una vez por combate | Cura 8 % de vida máxima efectiva cada segundo; heridas y overtime la reducen. Umbrales no letales: no es una resurrección. La segunda salida exige regresar de la primera; si volvió ya por debajo del 30 %, se evalúa en el siguiente daño recibido. Regresa a la casilla libre más próxima, desempate fila/columna |

La bonificación de Suela forma parte de un único básico: mismo crítico y una sola confirmación de impacto. Tras la segunda vuelta se convierte todo ese básico en daño verdadero; la activa sigue siendo física. Al salir se cancela la acción pendiente, desaparece de targeting y ocupación, pero sigue vivo para el resultado. Los compañeros temporalmente fuera siguen vivos: no provocan un retorno prematuro. No se aplican daños periódicos durante la ausencia ni se acumula una ráfaga diferida de esos daños al regresar. La velocidad de movimiento conserva fracciones entre pasos para que el 15 % tenga efecto con ticks discretos.

## Estadísticas propuestas

| Estadística             |           1★ |           2★ |           3★ |
| ----------------------- | -----------: | -----------: | -----------: |
| Vida                    |          620 |         1116 |         2008 |
| AD                      |           55 |           99 |          178 |
| AP                      |            0 |            0 |            0 |
| Ataques/s base          |         0,70 |         0,70 |         0,70 |
| Armadura / RM           |      25 / 25 |      25 / 25 |      25 / 25 |
| Crítico / multiplicador | 10 % / 150 % | 10 % / 150 % | 10 % / 150 % |
| Alcance                 |            1 |            1 |            1 |
| Maná inicial / máximo   |       0 / 80 |       0 / 80 |       0 / 80 |

Escalado general existente 1000/1800/3240, redondeo entero del motor. Movimiento base 3 ticks, preparación del básico 3 ticks. Coste y cifras en `FLORIN_TUNING` (`packages/game-data/src/florin.ts`). Coste 3 por su control de área, dos ventanas de supervivencia y conversión final a verdadero. Se compensa con 620 HP, 55 AD y 0,70 AS frente a VARGAS (700 HP, 70 AD y 0,80 AS), sin modificar a VARGAS, DOLEA ni JARAMILLO.

## Sinergias

- **Ruman Trinity** (`ruman_trinity`): 2 distintos desplegados, miembros +10 % AS y +10 AP; 3 distintos, +20 % AS, +20 AP y escudo inicial del 12 % HP efectivo durante 50 ticks. El umbral 3 sustituye al 2. No afecta a otros aliados.
- **Perdidos por el Mundo** (`perdidos_por_el_mundo`): 2 distintos, miembros +10 % HP; 3 distintos, +18 % HP y una curación del 8 % HP efectivo al cruzar por debajo del 40 %, una vez por unidad/combate. Respeta heridas, no genera otra señal de daño ni una curación recursiva.
- **Mano de Obra** (`mano_de_obra`): única 1/1, runtime por unidad. Las dos salidas se registran mediante reglas de progreso del sistema de rasgos y una operación genérica `recovery`.

Actualmente solo FLORIN pertenece a Ruman Trinity y Perdidos. Duplicados y banquillo no completan umbrales. Las pruebas reasignan afinidades de unidades existentes únicamente dentro de fixtures; no amplían el roster. Todos los valores colectivos son provisionales y están centralizados en `FLORIN_TUNING`.

## Animación y fallbacks

| Estrellas   | Archivos únicos | Secuencia explícita                | Impacto visual |
| ----------- | --------------: | ---------------------------------- | -------------: |
| 1★ / Nivel1 |               3 | 1y4, 2, 3, 1y4                     |       índice 2 |
| 2★ / Nivel2 |               6 | 1y4y8, 2, 3, 1y4y8, 5, 6, 7, 1y4y8 |       índice 5 |
| 3★ / Nivel3 |               7 | 1y8, 2, 3, 4, 5, 6, 7, 1y8         |       índice 5 |

Los números combinados indican reutilización explícita de la misma pose de recuperación. PNG con alpha real, sin fondo opaco. Fuente 1★ 1312×1199; 2★ 1122×1402; 3★ 1122×1402 salvo fotograma 5 de 1305×1205. Atlas por evolución de celdas 192×176; anclaje (96,160), orientación derecha con espejo permitido, escala visual 2/3 y escalado global existente. El importador normaliza sobre la zona de contacto de los zapatos rojos, recorta solo el derivado y verifica que el contenido cabe en la celda.

**Pendiente original:** Idle, Walk, Ability y Death de las tres evoluciones. Idle/Walk congelan la primera pose de esa misma evolución; Death usa esa pose con el desvanecimiento existente; Ability utiliza el ataque de esa evolución como sustituto declarado. El contrato genérico `fallbackPresentation` evita presentar golpes en bucle como marcha original. No se generan nuevos sprites. El martillo permanece unido al cuerpo: no hay efectos independientes que justifiquen usar la composición cuerpo/proyectil/impacto de JARAMILLO; esa infraestructura se conserva íntegra.

## Objetos, persistencia y DEV

Tres objetos completos mediante el inventario existente; el cuarto se rechaza. Las 36 definiciones/recetas y la economía permanecen intactas. Se comprueban los 36 ejecutores sobre FLORIN, heridas durante recuperación, coexistencia de escudos, críticos, maná y habilidades. El AP de objetos sigue disponible para sus efectos; no se inventa escalado AP para un pisotón definido por AD.

Nuevo catálogo/reglas `florin-1`, objetos `f0p8c-1`. Los catálogos anteriores siguen seleccionando sus perfiles/versiones. Nuevo fingerprint incluye roster, perfiles, rasgos, tuning, catálogo de objetos y política de ejecución. `basicAttacks`, restos de movimiento y recuperación viven en `UnitMechanics`; el progreso 1/1 usa el runtime de rasgos. Todo viaja en los snapshots/replays ya existentes. No hay guardado paralelo ni acumulaciones permanentes nuevas: cada combate empieza con estado limpio.

DEV local: crear prueba → «Prueba FLORIN y splash arts», comprar o generar Florin 1/2/3★ desde el controlador existente. Arena local ofrece «Prueba FLORIN 1★/2★/3★» con un adversario diagnóstico identificado. Los botones y la creación del escenario se eliminan/deshabilitan por `__DEVTOOLS__` en producción; `pnpm verify:public` comprueba identificadores y textos de esta fase. El servidor recibe únicamente comandos públicos de inventario/formación.

## Balance reproducible y límites

Ejecutar `pnpm --filter @tft/server exec tsx ../../scripts/florin-balance.ts` desde la raíz. Resultados en `artifacts/florin/balance.json`: 216 duelos adyacentes (12 semillas, ambos lados, tres estrellas y tres rivales), sin objetos. En cada estrella FLORIN gana 24/24 frente a DOLEA y JARAMILLO (coste 2) y pierde 24/24 frente a VARGAS (coste 3). No invalida automáticamente al coste 3 actual. Al estar solo vuelve inmediatamente y no cura en esos duelos: esta prueba no representa su supervivencia con compañeros.

DOLEA conserva escudo/armadura; VARGAS conserva robo de vida, saltos y escalado; JARAMILLO conserva rango 3, proyectiles y Kilómetros. Hortaleza compartida DOLEA/JARAMILLO sigue aumentando HP; Llama de Pádel y UPM no alcanzan 2 con el roster original actual; El Depredador y Fumón mantienen sus reglas únicas. Las nuevas colectivas tampoco alcanzan 2. Vida efectiva base de FLORIN frente a físico: 620×1,25=775 antes de críticos, curación y objetos. DPS básico base 38,5 antes de variación, críticos y pasiva; activa de área y retorno modifican su valor según combate.

Roster pequeño, colocación, kiteo, foco, compañeros, objetos y control pueden cambiar el resultado. No se presenta esta campaña como equilibrio competitivo final. Las interacciones de objetos/supervivencia de equipo se verifican funcionalmente, no como búsqueda exhaustiva del meta.

## TXT original íntegro

```text
1. Habilidad activa: Pisotón Carmesí
El personaje levanta uno de sus zapatos rojos y pisa con fuerza al enemigo objetivo, infligiendo daño físico y aturdiéndolo. El impacto también alcanza a los enemigos cercanos al objetivo, aunque con daño reducido.

★ Nivel 1 — Pisotón Carmesí
Un golpe contundente y sencillo.
- Daño: 180% del daño de ataque.
- Aturdimiento: 1 segundo.
- Área: objetivo principal y enemigos inmediatamente cercanos, con un 50% del daño.
★★ Nivel 2 — Pisotón Demoledor
Mayor impacto y control de área.
- Daño: 260% del daño de ataque.
- Aturdimiento: 1,5 segundos.
- Área: alcanza a más enemigos alrededor del objetivo, con un 60% del daño.
- Extra: obtiene un 10% de velocidad de ataque durante 3 segundos tras lanzar la habilidad.
★★★ Nivel 3 — ¡A Picar Piedra!
El pisotón se convierte en un ataque de área devastador.
- Daño: 400% del daño de ataque.
- Aturdimiento: 2 segundos.
- Área: golpea a todos los enemigos en una zona amplia, con un 75% del daño a los objetivos secundarios.
- Extra: obtiene un 20% de velocidad de ataque durante 4 segundos tras lanzar la habilidad.

2. Pasiva: Suela reforzada
Concepto: cuanto más golpea, más aprovecha sus zapatos rojos para mantener el ritmo del combate.

Cada cierto número de ataques básicos, su siguiente ataque obtiene un efecto adicional.
Nivel	Efecto de la pasiva
★	Cada 5 ataques básicos, el siguiente inflige un 50% de daño de ataque adicional.
★★	Cada 4 ataques básicos, el siguiente inflige un 60% de daño de ataque adicional.
★★★	Cada 3 ataques básicos, el siguiente inflige un 75% de daño de ataque adicional y ralentiza al objetivo un 20% durante 1 segundo.


3. Atributo único: Mano de Obra
Reglas de las secundarias
- Mientras está fuera del tablero, no ataca ni puede recibir daño.
- Se cura progresivamente mientras hace las secundarias.
- Si llega al 100% de vida, regresa inmediatamente, siempre que el combate siga en curso.
- Si todos sus compañeros mueren antes de que termine de curarse, regresa con la vida que haya conseguido recuperar.
- La segunda salida funciona igual que la primera, pero desbloquea el daño verdadero en lugar de las bonificaciones de velocidad.
- Cada salida solo puede activarse una vez por combate.
Primera salida — 60% de vida: abandona el tablero para hacer secundarias y se cura. Al regresar, obtiene +25% de velocidad de ataque y +15% de velocidad de movimiento durante el resto del combate.
Segunda salida — 30% de vida: vuelve a abandonar el tablero para hacer secundarias y curarse. Al regresar, todo el daño de sus ataques básicos se convierte en daño verdadero, ignorando por completo la armadura enemiga.

```

## Diagnósticos entregados

En Arena DEV, «FLORIN · sinergias de prueba» ofrece Ruman Trinity y Perdidos por el Mundo a 1/2/3 miembros. Son afinidades de fixture explícitas, sin alta de otros miembros reales. En Modo DEV, «FLORIN 1★/2★/3★ con objetos» prepara una unidad con tres objetos completos mediante `grantItemInstances` y `applyItemCommand`, conserva UUID de inventario, valida restauración y permite avanzar al combate con el controlador existente. Si el reloj aún no ha iniciado, pulsar Avanzar fase y después Iniciar combate. El inspector muestra los tres objetos por sus etiquetas accesibles del catálogo.


## Consolidación P8D + FLORIN — 2026-10-26

Las reglas integradas habilitan la misma implementación que florin-1 sin cambiar tuning.

Versiones, fingerprints, conflictos, pruebas, capturas y límites: [INTEGRATION_P8D_FLORIN.md](INTEGRATION_P8D_FLORIN.md).
