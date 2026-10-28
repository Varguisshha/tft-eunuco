# VARGAS — F0-P6B.3

Catálogo `f0p6b3`, reglas `f0p6b3-1`, transporte 3. Segundo personaje propio, coste **3**, rol **Asesino**, melee de alcance 1. Todas las cifras son provisionales de balance; la ejecución y las estrellas están versionadas.

## Estadísticas

| Estadística                 |           1★ |           2★ |           3★ |
| --------------------------- | -----------: | -----------: | -----------: |
| Vida máxima                 |          700 |         1260 |         2268 |
| AD                          |           70 |          126 |          226 |
| AP                          |            0 |            0 |            0 |
| Ataques/s                   |         0,80 |         0,80 |         0,80 |
| Armadura / RM               |      25 / 25 |      25 / 25 |      25 / 25 |
| Probabilidad / daño crítico | 20 % / 150 % | 20 % / 150 % | 20 % / 150 % |
| Maná                        |         0/70 |         0/70 |         0/70 |

HP/AD reciben una sola vez el escalado general ×1/1,8/3,24, con suelo. Velocidad, AP, maná, críticos y defensas conservan sus bases. Estadísticas efectivas suman los modificadores del combate.

## Copita Perhaps

Una única `ChampionAbility` de tipo `mixed`. Los componentes son **Resaca Controlada** y **Blackhaus RPP**. Datos en `game-data/vargas.ts`, sin ramas por ID de personaje en el motor.

Resaca recibe una acumulación por básico confirmado válido, incluidos los básicos inmediatos de salto configurados con procs. Cada acumulación aporta +4 % de AS sobre la base. Al llegar a 5 consume las 5 inmediatamente, retira su porcentaje, cura 5 % de HP máximo efectivo y concede +20 % AS durante 30 ticks. La fuente temporal usa refresh; puede coexistir con nuevas acumulaciones. Comienza vacía cada combate. La activa no es un básico y no genera Resaca.

| Blackhaus RPP             |       1★ |       2★ |       3★ |
| ------------------------- | -------: | -------: | -------: |
| Daño físico / AD efectivo |    280 % |    420 % |    700 % |
| Curación del daño a HP    |     15 % |     20 % |     30 % |
| AS adicional sobre base   |     25 % |     35 % |     50 % |
| Duración / ticks          | 3 s / 30 | 4 s / 40 | 5 s / 50 |

Con 70 de maná consume 70 al inicio; windup de 3 ticks; objetivo enemigo actual en alcance 1 al iniciar y resolver. Un stun, muerte u objetivo inválido cancela como las activas anteriores. `canCrit:false` explícito y configurable por datos. El básico sí usa su 20 % crítico.

Orden: AD efectivo y ratio por estrella → potencia de cast → crítico autorizado → Overtime de daño → armadura → escudos → HP. La recuperación toma solo HP aplicado, sin absorción ni exceso, selecciona su ratio y atraviesa Overtime de curación y cap de HP. Se difiere hasta terminar los daños comprometidos del lote: nunca rescata una fuente muerta. La bonificación de AS se aplica después del daño y recuperación, con duración por estrella; no multiplica estrellas de nuevo.

## UPM — Supervivientes de la Politécnica

Colectiva acumulativa: 2 miembros distintos desplegados conceden +100 HP y +20 AP; 4 añaden cura 4 % HP por cast natural; 6 potencian cada tercer cast natural individual al 150 % y programan un adicional al 50 % de la potencia original. El adicional no consume ni genera maná, no activa procs de fuente, no cuenta como cast/Crédito y no programa otra repetición. Reutiliza cancelación del padre, selección y presupuestos B2.

**Créditos** es la etiqueta temática de los contadores de lanzamientos existentes; no hay un stack o moneda nuevo. La membresía 2/4/6 no depende de ellos. Se conservan contadores desde el primer umbral activo, incluso si todavía no hay reglas dinámicas elegibles. El lateral puede sumar Créditos para presentación, mientras cada unidad comprueba su propio ordinal. AP no aporta potencia implícita a Blackhaus: su ratio AP es 0.

Solo VARGAS tiene membresía UPM en el roster actual. Los acompañantes de los diagnósticos `upm-2/4/6` son perfiles ficticios fuera de catálogo, tienda, pool y guardados de partida.

## EL DEPREDADOR

Única 1/1 al desplegar VARGAS. Copias/estrellas cuentan una definición; banquillo no activa. Cada eliminación atribuida suma una marca, cura 5 % HP y aporta +5 AD plano durante ese combate. Desde la tercera eliminación cura otro 5 %. Al alcanzar 4, añade +15 AD una sola vez. Desde la séptima, cada eliminación puede iniciar un salto al siguiente enemigo válido y un básico inmediato. No se redujo el umbral 6.

Las condiciones `stack_count` se evalúan al recoger las reglas, antes de aplicar la ganancia de esa señal: la eliminación 2 no recibe la cura extra y la 6 no salta. Un kill tiene una atribución; la regla de salto se recoge una vez. Los básicos de salto no conceden maná, sí pueden criticar y activar procs, con presupuesto de linaje máximo 8 y reservas de ocupación existentes. El contador no añade miembros a 1/1.

## Arte: origen oficial Nivel 2

**Los cinco originales adjuntos pertenecen a VARGAS Nivel 2 / 2★.** No existen recursos nativos 1★/3★ ni clips idle/walk/ability/death. Se preservaron los adjuntos byte a byte; las fuentes reproducibles están en `Sprites/vargas/star2/attack/frame-1..5.png` y su correspondencia/hash en `Sprites/vargas/PROVENANCE.json`.

Los cinco PNG son 1254×1254 RGBA, con alfa efectivo 0..255. Ninguno de los adjuntos actuales contiene un damero opaco; no se excluyó ninguno. `Sprites/` no contenía archivos VARGAS ni el ambiguo `Vargas_Atk_1y5.png`. Por ello no se interpretó ese nombre como dos frames. Secuencia inspeccionada: guardia, anticipación, giro, extensión, recuperación (adjuntos 1→5). Impacto visual en índice 3. Sin generación ni poses inventadas.

`pnpm sprites:import` produce una sola hoja y un retrato en `public/sprites/vargas/star2/`; no crea directorios star1/star3. Normaliza con nearest-neighbor, conserva proporción y ancla de pies, sin alterar originales. El manifiesto declara procedencia 2, apariencia nativa star2, huecos pendientes y fallbacks explícitos star1→2 y star3→2. DOLEA no tiene esa opción y conserva su búsqueda descendente.

El resolver devuelve por separado estrellas lógicas/visuales y estado solicitado/resuelto. Idle, walk, ability y death usan el ataque disponible; eso no produce daño. La apariencia 2★ es la nativa de su evolución, aunque la secuencia visual sigue siendo una integración inicial de cinco poses.

### Incorporar arte nativo 1★ o 3★

Añadir las nuevas fuentes a `Sprites/vargas/starN/<estado>/`, actualizar los metadatos y retirar solo el fallback correspondiente si procede. Importar de nuevo. Los recursos propios tienen prioridad antes de referencias explícitas, incluso antes de retirar el fallback antiguo. No modificar catálogo, personaje, estrellas, estadísticas, economía, habilidades, sinergias ni combate.

## Integración y siguiente personaje

VARGAS usa 18 copias de coste 3 y las probabilidades existentes. Compra 3, venta 3/9/27, fusiones 1/3/9 y capacidad normal. Inspector, retratos y renderers utilizan los mismos contratos genéricos que DOLEA. Iconos UPM/Depredador/Copita originales SVG de geometría pixel; sin logos oficiales.

Para el siguiente personaje: definir habilidad y perfil con contratos, crear un nuevo catálogo versionado si cambia contenido publicado, declarar membresías, importar arte con su procedencia real y fallbacks explícitos, comprobar pool/fusiones/escalados y añadir diagnósticos sintéticos fuera de roster. No introducir excepciones del motor por nombre.

La potencia UPM conserva la semántica B2: escala importes de los efectos, no duraciones. Repeticiones conservan claves refresh: el último efecto de la misma fuente/clave reemplaza al anterior, aunque tenga menor potencia. Esta interacción forma parte del balance provisional, sin política nueva de «conservar el mayor».

Pruebas y capturas: [informe de fase](F0_P6B3_REPORT.md).
