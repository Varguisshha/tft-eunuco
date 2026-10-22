# Combate F0-P3.1 — reglas f0p3.1-1

Estado: implementado en local. Protocolo **3**, reglas **f0p3.1-1**. Son reglas del laboratorio, no balance definitivo. La autoridad es `packages/game-core/src/combat`; React y Phaser solo presentan resultados.

## Entrada, tiempo y salida

`CombatInputSchema` valida semilla uint32 (0 a 4294967295), versión, perfiles completos, IDs únicos, límites de tablero, ocupación y obstáculos sin duplicados ni solapamientos. Hasta 56 unidades. No exige mitad durante combate; la preparación sí mantiene las mitades de F0-P1. `createCombatInput` resuelve IDs contra el catálogo y rechaza perfiles desconocidos. El motor recibe datos completos y no consulta contenido global.

Tick fijo **100 ms**; límite predeterminado **450 ticks = 45 segundos lógicos**, reducible entre 1 y 450 exclusivamente para pruebas. El estado inicial se clona y las unidades se ordenan por ID. Todas empiezan con vida máxima, maná inicial y ataque listo. Snapshot 0 después de pasivas; un snapshot al terminar cada tick. `snapshot`, `allEvents` y `step` devuelven copias separadas del estado interno.

`CombatEngine(input)` permite avanzar con `step()` sin reloj ni entorno gráfico. `runCombat(input)` devuelve entrada, snapshots, eventos y resultado. `step()` tras terminar devuelve `[]` sin modificar nada. Vacío: `double_loss` con motivo `empty` en tick 0 (solo Arena; la partida exige desplegar). Un solo equipo: `win` inmediato. Sin supervivientes tras resolver impactos simultáneos: `double_loss`, motivo `elimination`. Al llegar al límite con ambos equipos vivos: `double_loss`, motivo `timeout`, sin desempatar por vida, daño ni azar. La eliminación tiene prioridad sobre el límite. Al terminar se cancelan acciones, se retiran proyectiles y `combat_end` es el último evento.

Ejemplo de consumo headless desde un consumidor TypeScript del monorepo:

```ts
import { createCombatInput } from '@tft/game-data';
import { runCombat } from '@tft/game-core';
const replay = runCombat(createCombatInput(board, 42));
console.log(JSON.stringify(replay.result));
```

Ejecutar escenarios headless reales: `pnpm exec vitest run packages/game-core/src/combat/engine.test.ts`. Vitest usa Node; no crea navegador ni canvas. No se entrega un CLI empaquetado.

## PRNG y aritmética

Mulberry32 implementado con sumas uint32, desplazamientos y `Math.imul`. Estado inicial = seed, incluido cero. Cada ataque básico iniciado consume exactamente un uint32; orden de consumo = orden de decisiones. Vector de referencia: estado inicial 0 → estado 1831565813, salida 1144304738. No hay `Math.random`, Date ni temporizadores en el motor.

El ataque toma su valor efectivo al comenzar: `raw = min(1000000, floor(attack * (950 + randomUint32 % 101) / 1000))`. Variación discreta entre 95 % y 105 %; módulo 101 con el pequeño sesgo de módulo correspondiente. No hay críticos ni aleatoriedad en habilidades, selección o rutas. Cancelar un ataque no devuelve ese consumo de PRNG.

Estadísticas enteras; velocidad expresada en milésimas: 1500 = 1,5 ataques/s. HP, daño bruto, maná y escudo total limitados a 1000000; vida máxima y maná máximo al menos 1. Velocidad efectiva antes de overtime limitada a [1,5000]; overtime multiplica la carga de ese tick sin tocar estadísticas base. Defensas de entrada en [-1000000,1000000], efectivas limitadas a [-10000,10000]. Modificadores individuales en [-10000,10000]. Valores no finitos se rechazan. Los productos usados permanecen dentro de enteros seguros de JavaScript.

## Prioridad exacta del tick

Tick 0: `combat_start`, pasivas en orden de ID y lista de efectos, liquidación de muertes, comprobación de final.

El tick terminal (450 por defecto) solo comprueba el final y cancela pendientes: no expira estados, mueve, impacta, acumula carga ni decide. En ticks de acción 1–449:

1. En tick 300 emitir `overtime_start` con order 0. Expirar estados con `expiresTick <= tick`; acumular carga de ataque de unidades vivas no aturdidas.
2. Completar movimientos cuyo `endTick <= tick`, por ID.
3. Recoger proyectiles vencidos en orden de lanzamiento; después ataques y habilidades que terminan, por ID. Validar fuente viva para nuevas liberaciones y objetivo vivo/en alcance. Los proyectiles ya lanzados pueden sobrevivir a su fuente.
4. Resolver efectos de apoyo (curación, escudos, modificadores, stun) antes del daño. Dentro de cada grupo se conserva el orden de recogida, lista de efectos y objetivos por ID. Las acciones que llegaron a esta fase ya están comprometidas: un stun simultáneo no retira su impacto.
5. Liquidar muertes por ID: cancelar acción pendiente, expirar estados, emitir `unit_death`. Comprobar victoria/doble derrota/límite antes de nuevas decisiones.
6. Decidir nuevas acciones. Partir de IDs ordenados y rotar el inicio `(tick-1) % numeroTotalDeUnidades` (incluidas eliminadas, que se saltan). Para cada viva, libre y no aturdida: buscar objetivo/ruta; mover un paso si falta alcance; si ya alcanza, habilidad con maná suficiente tiene prioridad sobre ataque básico listo.

Comparación de IDs por operadores de cadenas de JS, sin `localeCompare` ni dependencia del idioma. Eventos llevan `order` creciente desde cero en cada tick. Los impactos comprometidos se resuelven antes de liquidar muertes, permitiendo eliminación mutua; no se aplican daños adicionales a una víctima que ya llegó a cero. No existe resurrección.

## Targeting, A\* y reservas

Se conserva axial `(q,r)` y rectángulo odd-r 7×8. Distancia `(|dq|+|dr|+|dq+dr|)/2`. Se ordenan enemigos vivos: primero los que ya están en alcance, después distancia hexagonal, después ID. Se elige el primero alcanzable, no el de menor longitud total de ruta. La elección se recalcula en cada decisión libre; no se conserva a toda costa el objetivo anterior.

A\* busca una celda libre desde la que atacar, no la casilla ocupada del rival. Coste de paso 1; heurística distancia mínima a una celda objetivo. Empates por `f`, `h`, fila `r`, coordenada `q`; vecinos ordenados por fila y q. Devuelve pasos sin origen, `[]` si ya está en posición y `null` si no hay ruta. Máximo 56 celdas visitables.

Obstáculos, posiciones de vivos y destinos reservados bloquean rutas. Una unidad en tránsito conserva ocupado el origen y reserva exclusivamente el destino. No hay swaps ni atravesar aliados; los muertos liberan casilla. Al llegar, interrumpirse o morir se libera la reserva. Decisiones secuenciales ven reservas previas del mismo tick. La rotación evita favorecer siempre al primer ID. Si no hay objetivo accesible, espera y vuelve a intentar. No hay recursión ilimitada; los embotellamientos irresolubles terminan como máximo al tick 450. No se garantiza solución cooperativa a toda congestión. Obstáculos bloquean movimiento, no línea de visión ni proyectiles.

## Ataques, alcance y cadencia

Carga inicial 10000. Al iniciar ataque se restan 10000. En cada tick no aturdido, si la carga está por debajo de 10000 se añade `floor(attackSpeedMilliEfectivo * multiplicadorOvertime / 1000)`; el exceso se conserva (máximo 14999 en normal; 18749 con overtime predeterminado; contrato hasta 29999 para configuración ×4). Una vez listo no almacena ataques extra. Acumula durante movimiento/casteo/windup; solo inicia una acción cuando está libre. Un windup largo o casteo limita la cadencia efectiva. El stun detiene la acumulación, sin borrar la carga existente.

Intervalo nominal en ms = `1000000 / attackSpeedMilli`. Para 1500 y un objetivo fijo sin interrupciones, inicios en ticks **1, 8, 15, 21, 28**: no se redondea cada intervalo perdiendo el resto. Windup independiente en ticks; el catálogo usa 2 ticks.

Alcance inclusivo hexagonal. Se comprueba al inicio y al liberar ataque/habilidad. Si el objetivo muere o sale de alcance antes de liberar, se cancela sin reembolso de carga o maná; se vuelve a decidir. Alcance >1 implica básico a distancia. Proyectil liberado al terminar windup; vuelo `max(2, ceil(distancia*2/3))` ticks. Impacta al objetivo vivo aunque este se mueva o la fuente muera; si el objetivo ya murió, se descarta. Al acabar el combate se descartan todos los pendientes. No hay daño por colisión visual.

## Mitigación

Sea D el daño bruto no negativo y R armadura para físico o resistencia mágica para mágico:

- R ≥ 0: `floor(D * 100 / (100 + R))`.
- R < 0: `floor(D * (100 - 2*R) / (100 - R))`.
- Verdadero: D, ignora ambas defensas, pero sí consume escudos.
- D=0 produce 0; D>0 produce al menos 1 tras mitigación. R se limita antes a [-10000,10000].

Ejemplos para D=100: R=100 → 50; R=-100 →150; R=10000 →1; R=-10000 →199. La mitigación usa defensas del instante del impacto. Escudos absorben antes de HP; daño registrado es HP realmente perdido y absorción por separado, sin vida negativa.

## Maná y efectos

Un básico que pierde HP o consume escudo otorga 10 al atacante si sigue vivo. Cada impacto con pérdida/absorción otorga 5 al receptor si sobrevive; también para habilidades. Topado al máximo, sin evento cuando no aumenta. No hay regeneración por tiempo ni maná por movimiento. Habilidad resta coste al inicio; interrupción por stun, muerte o objetivo inválido no lo devuelve. Todas requieren un enemigo vivo en alcance para comenzar y resolver, incluso las defensivas de este catálogo.

Efectos declarativos validados (hasta 8 por habilidad/pasiva):

| Efecto   | Regla                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------- |
| damage   | Cantidad y tipo physical/magic/true; individual o área                                          |
| heal     | Recorta a vida máxima, no revive; solo emite si cura                                            |
| shield   | Capas independientes, total máximo 1000000; consumo por expiración más próxima, luego ID        |
| modifier | Suma aditiva por estadística; cada instancia expira por separado; límites efectivos posteriores |
| stun     | Interrumpe move/attack/cast pendiente; no decide ni acumula carga mientras exista alguno        |

Objetivos: `self` la fuente; `target` enemigo elegido; `allies` aliados vivos (incluida fuente) dentro del radio centrado en fuente; `enemies` enemigos vivos dentro del radio centrado en objetivo. Orden por ID, distancia hexagonal inclusiva. El radio no afecta self/target. Duración en ticks: aplicado en t dura hasta antes de procesar t+duración; múltiples stuns independientes equivalen a permanecer aturdido hasta el último vencimiento. Modificadores y escudos se eliminan al morir. Pasiva inicial soporta solo disparador `combat_start`; en ese disparador el target explícito es la propia fuente. No hay bonificaciones de sinergia.

## Catálogo ficticio

| ID / rol            |  HP | ATK | Arm / RM | Ataques/s | Rango | Maná inicial/máx |    Paso |
| ------------------- | --: | --: | -------- | --------: | ----: | ---------------- | ------: |
| test-k01 / tanque   | 520 |  35 | 45 / 30  |      0,75 |     1 | 0/50             | 4 ticks |
| test-v02 / luchador | 340 |  58 | 15 / 15  |      1,25 |     1 | 0/40             | 3 ticks |
| test-r03 / tirador  | 240 |  42 | 10 / 15  |       1,5 |     3 | 0/50             | 3 ticks |
| test-m04 / mago     | 260 |  30 | 5 / 25   |      0,85 |     3 | 35/60            | 3 ticks |

- K: coste50, casteo3; escudo110/40ticks, cura50 y armadura+25/30ticks sobre sí. Pasiva: escudo35/40ticks desde tick0.
- V: coste40, casteo3; daño verdadero85 individual y ataque+20/25ticks propio.
- R: coste50, casteo3; daño físico70 a enemigos en radio1 y stun8ticks al objetivo central.
- M: coste60, casteo5; daño mágico115 y stun5ticks a enemigos en radio1; cura55 a aliados en radio2 de la fuente.

M conserva `role: support` del contrato de F0-P1 y sprite asociado; el rol mostrado es Mago. IDs, costes y sinergias previos se conservan. No representa personas reales ni contenido definitivo.

## Reproducción y límites

El cliente calcula la traza completa localmente al iniciar y después la reproduce animada. No simula según FPS ni consulta el futuro desde las decisiones. `CombatPlayback` mantiene reloj visual: tiempo += delta×velocidad; pausa congela ese tiempo; snapshot de `floor(tiempo/100)` y eventos recientes ordenados. Movimiento/proyectiles se interpolan usando start/end tick; ataques, hechizos, barras, curación, stun y muerte son representaciones de datos autoritativos. Tras el último tick hay 600 ms visuales para terminar la muerte. Saltos de render conservan estado y resultado, aunque un efecto corto puede no verse en una pestaña suspendida.

Repetir semilla reproduce entrada y semilla de la última simulación, sin consumir estado RNG residual. Volver a preparación recupera el tablero guardado antes de iniciar; la simulación nunca lo modifica. Restaurar formación vuelve al ejemplo P1 de cuatro jade. Cargar duelo monta cuatro contra cuatro. Los controles de edición se bloquean durante reproducción; selección y zoom siguen activos.

El adaptador local almacena todos los snapshots (hasta 451); suficiente para laboratorio, sin optimización de memoria ni transporte online. El contrato de lotes prepara el límite servidor/cliente, pero no hay conexión, reconexión, buffering de red, verificación criptográfica ni restauración del motor desde snapshot. Reproducir desde entrada+semilla sí está soportado. No se afirma balance ni rendimiento de una partida de 4 jugadores.

## Overtime y doble derrota

Ticks de 100 ms. Normal: 0–299; tiempo extra: 300–449; 450 es una comprobación final sin acciones adicionales. Una eliminación al terminar 299 evita overtime; una eliminación en 300 o 449 finaliza inmediatamente tras resolver todos los impactos comprometidos. Proyectiles o habilidades cuyo impacto corresponde a 450 se cancelan, no reciben un último turno. Los límites reducidos de test usan esa misma convención terminal.

Valores propios y provisionales, configurables en `input.overtime` y registrados con la entrada:

| Multiplicador       |  Tick 300 |  Tick 449 |
| ------------------- | --------: | --------: |
| Daño                | 1250/1000 | 2000/1000 |
| Velocidad de ataque | 1200/1000 | 1750/1000 |
| Curación            |  800/1000 |  400/1000 |
| Escudos nuevos      |  800/1000 |  400/1000 |

Para t ≥ 300, `p = min(149, max(0, t−300))`; cada multiplicador entero es `floor((inicio*(149−p) + final*p)/149)`. Antes de 300 todos valen 1000. Los extremos alcanzan exactamente sus valores en 300 y 449. Ponderaciones no negativas evitan diferencias de redondeo en rampas descendentes. Configuración exige bonus crecientes entre 1000 y 4000, soporte decreciente entre 0 y 1000; rechaza NaN, infinitos, fracciones y valores fuera de límites.

Daño: amplificar bruto **al impactar**, antes de mitigación, `min(1000000, floor(bruto*Mdaño/1000))`. Se aplica igual a físicos, mágicos, verdaderos, básicos y habilidades. Un proyectil lanzado en normal que impacta en overtime utiliza el multiplicador del impacto. Su daño bruto original permanece en la traza. Curación y escudo nuevo usan esa misma escala entera antes de recortar por vida máxima/capacidad; un resultado cero es válido. No se recalculan capas de escudo ya existentes.

Cadencia: añadir `floor(velocidadEfectivaMilli*Mvelocidad/1000)` a la carga solo cuando sea <10000, conservando resto. Al atacar, restar 10000. No se redondea un intervalo por ataque; no se modifica el perfil ni se acumulan buffs permanentes. Windup/casteo/stun siguen limitando acciones, como antes; como máximo una nueva decisión por unidad/tick. RNG y orden de efectos no dependen de FPS ni tiempo del navegador.

Resultado explícito `outcome: win | double_loss`. `win` exige `winner` no nulo y motivo `elimination`; `double_loss` exige winner null. La doble eliminación se determina después de efectos comprometidos de ambos equipos, nunca después del primer impacto aislado. Recompensas y daño al jugador pertenecen a match, no al renderer ni al protocolo visual.

Reproductor: un indicador Phaser por escena, reutilizado y ocultado al volver a preparación; escala de entrada durante 600 ms del reloj visual. Contador DOM accesible junto al canvas en Arena y Partida local: tiempo lógico hasta límite, cero al terminar. Pausa congela contador y transición; ×2 avanza ambos. Saltar frames o recuperar una resolución conserva el estado de overtime aunque su evento de inicio ya no esté en efectos recientes. Repetir crea una línea temporal nueva.

Arena incluye tres escenarios técnicos con perfiles sintéticos legales, separados del rival local: victoria durante overtime, supervivencia hasta 450 y eliminación mutua. Sirven para reproducir límites sin modificar el catálogo ni la economía del jugador.
