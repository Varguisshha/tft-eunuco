# Mecánicas avanzadas — F0-P6B.2

Contrato de mecánicas **1**, reglas **`f0p6b2-1`**, catálogo **`f0p6b2`**, protocolo de transporte **3**. Solo herramientas genéricas y diagnósticos ficticios. No incluye el contenido de F0-P6B.3.

## Autoridad y composición

`packages/shared/src/mechanics.ts` contiene los contratos estrictos. `CombatMechanics` implementa operaciones sobre el estado que posee `CombatEngine`; nunca decide a partir de Phaser. El motor conserva una sola cola de señales y un solo ejecutor de reglas pasivas. Las definiciones de acumulaciones se compilan a reglas internas `@stack:N`; las reglas de progreso usan el mismo contrato y ejecutor, con su propio registro de runtime por sinergia. `@` queda reservado para identificadores internos.

No hay scripts, callbacks de personaje ni `eval` en los datos. Los efectos antiguos de daño, curación, escudo y estadísticas también sirven como recompensas por umbral o eliminación. Las operaciones nuevas son acumulación, consumo, cooldown, mejora, repetición, salto y daño periódico.

## Acumulaciones

`profile.mechanics = { version: 1, stacks: StackDefinition[] }`. Una definición declara:

| Campo                   | Semántica                                                                   |
| ----------------------- | --------------------------------------------------------------------------- |
| `id`, `name`, `version` | Identidad estable, nombre visible y versión 1                               |
| `trigger`, `conditions` | Señal y condiciones del sistema de pasivas                                  |
| `maxStacks`             | 1–100; la ganancia se limita antes de evaluar umbrales                      |
| `durationTicks`         | `null` durante todo el combate o 1–450 ticks                                |
| `refresh`               | `on_gain` renueva el vencimiento; `keep` mantiene el de la primera ganancia |
| `consumption`           | `manual`, `threshold` o `none`                                              |
| `reset`                 | `combat`; no existe persistencia entre rondas en esta versión               |
| `modifiers`             | Aporte por acumulación; plano o porcentaje en milésimas                     |
| `thresholds`            | Cruce ascendente, consumo opcional, repetición y efectos                    |

El estado guarda fuente otorgante, propietario, objetivo, disparador, contador, máximo, vencimiento y umbrales no repetibles ya utilizados. Hay un contador por definición y objetivo, no un contador por cada otorgante: la última fuente que concede la acumulación asume su duración. El propietario y el objetivo permanecen en esa unidad. Los efectos de umbral se ejecutan por su propietario; la fuente otorgante continúa registrada en los eventos de acumulación.

Los porcentajes por acumulación se suman con las demás fuentes sobre la base escalada por estrellas. No se escribe sobre el perfil base. Cada cambio reconstruye exclusivamente los modificadores de esa definición. Al consumir la última acumulación se retira su vencimiento. La muerte de su fuente o propietario retira sus acumulaciones; la expiración retira también sus modificadores. No se concede vida a una unidad ya eliminada.

Un umbral solo se dispara al cruzarlo desde abajo, en orden de contador e identificador. `repeatable: false` permite una activación por combate. `repeatable: true` admite otro cruce tras consumir o expirar. El consumo ocurre antes de aplicar sus efectos dentro del mismo tick. Una ganancia grande puede cruzar varios umbrales; cada uno comprueba el contador que queda después del consumo anterior.

El diagnóstico `stack-cycle` configura +4% de velocidad por impacto válido; cinco acumulaciones se consumen, curan el 5% de vida máxima y otorgan +20% de velocidad durante 30 ticks (3 s). El efecto de 3 s se renueva por clave, sin acumularse consigo mismo. La curación respeta la vida que falta y la reducción de Overtime.

### Señales

- `attack_hit`: un impacto básico válido confirmado, incluso absorbido íntegramente o con daño cero. **No** corresponde a iniciar o reproducir una animación.
- `ability_cast`: inicio de un lanzamiento original o adicional autorizado por sus políticas.
- `damage_dealt`: pérdida efectiva de vida; la absorción sin daño de vida no cuenta.
- `damage_received`: daño o absorción positivos, igual que en las reglas previas.
- `kill`: eliminación atribuida tras resolver las muertes comprometidas.
- `combat_start` y `effect_expired`: inicio y expiración lógica de una fuente.

`attack` conserva su significado previo de liberación del básico. Cada básico nuevo lleva un `attackId`, conservado durante el vuelo. La confirmación se deduplica por esa identidad. Un windup cancelado, un objetivo muerto o un proyectil descartado no confirman impactos. Reproducir la traza no genera señales.

## Eliminaciones

La primera reducción de vida a cero registra su evento letal, sin emitir daño adicional. Tras comprometer los impactos del tick, las muertes se procesan por ID estable de víctima y se emite una sola atribución:

```ts
{
  combatId, victimId, killerId, sourceId, damageType,
  cause: 'attack' | 'ability' | 'periodic' | 'environment',
  damageEvent: { tick, order }, causalId
}
```

El responsable puede ser `null`. El daño ambiental conserva el emisor técnico en `damage.sourceId`, pero identifica `responsibleId: null`, origen ambiental y atribución sin asesino ni fuente personal. El daño periódico conserva la unidad y el responsable originales, aunque esa unidad ya haya muerto. Los proyectiles también retienen su fuente.

Los ataques/casts simultáneos ya comprometidos se resuelven aunque uno de sus emisores haya recibido daño letal durante ese lote. Ambos pueden recibir crédito. Se marcan todas las muertes del lote antes de activar `kill`; una unidad muerta conserva el crédito y su contador, pero no recibe curaciones, saltos ni otras recompensas póstumas. Si un bando desaparece, el combate termina y no continúa esperando daños periódicos o proyectiles futuros.

`onKill` se expresa como regla `trigger: { kind: 'kill' }`. Puede aplicar efectos normales de curación, escudo, AD, AP o velocidad, otorgar acumulaciones y ejecutar acciones controladas. `cooldown` identifica una regla pasiva (`ruleId`, `abilityId` opcional) y reinicia o reduce su espera; no reinicia su máximo de activaciones. Las habilidades activas existentes dependen de maná y tiempo de lanzamiento, no de un cooldown inventado en esta fase.

## Sinergias únicas y progresivas

El conteo de membresía usa definiciones de personajes **distintas y desplegadas**. Duplicados, estrellas y banquillo no agregan miembros. Un umbral 1 activa 1/1 sin lógica especial de personaje. La preparación recalcula sobre perfiles nuevos; las bonificaciones no se acumulan al consultar la formación.

`trait.progress = { version: 1, scope: 'unit' | 'team', rules }`. Cada regla añade `memberThreshold`, que debe referenciar un umbral declarado. Las estadísticas iniciales continúan en `thresholds.bonuses`; los efectos dinámicos se habilitan solo al alcanzar su umbral de miembros.

- `unit`: runtime, lanzamientos y eliminaciones independientes por unidad receptora.
- `team`: un registro compartido por sinergia y bando, actualizado por sus receptores.
- `ability_cast.every: 3`: selecciona el tercer, sexto, etc. lanzamiento del ámbito configurado. Cada señal captura el ordinal al emitirse; seis lanzamientos en el mismo tick no ven todos el mismo contador final.
- Los contadores se reinician en cada combate. No alteran la membresía ni los umbrales de formación, que quedan fijados al comenzar esa ronda.

Diagnósticos: dos miembros dan estadísticas iniciales; cuatro habilitan curación al lanzar; seis mejoran cada tercer lanzamiento. `progress-6` utiliza contadores individuales; `progress-team` comparte el contador. `kill-marks` usa una sinergia ficticia 1/1 con escudo al eliminar y marcas independientes del conteo de miembros. No entran en tienda, pool ni rivales de partida.

## Mejora y reejecución

`ability_empower` solo afecta al cast original actualmente iniciado: multiplica su `powerMilli` (límite ×4) y añade hasta ocho efectos básicos tipados. Los valores se escalan después de AD/AP y antes de crítico, Overtime y mitigación. No modifica permanentemente la habilidad del perfil.

`ability_repeat` programa una acción adicional después de `endTick + delayTicks`. Cada acción declara:

| Política                     | Efecto                                                        |
| ---------------------------- | ------------------------------------------------------------- |
| `targetPolicy`               | `same_only`, `same_or_nearest` o `nearest`                    |
| `countAsCast`                | Incrementa o no el contador; independiente de generar pasivas |
| `allowSourceProcs`           | Autoriza señales originadas por esta acción                   |
| `grantMana`                  | Autoriza la ganancia de maná derivada de sus impactos         |
| `powerMilli`, `extraEffects` | Potencia y efectos adicionales explícitos                     |
| `maxChain`                   | Presupuesto adicional, dentro del máximo global               |

Una repetición es gratuita: no paga maná y no ocupa otro windup. Respeta vida, aturdimiento y alcance de la habilidad al resolver. Se conserva el objetivo válido o se busca el enemigo más cercano, con desempate por ID. Las activas adyacentes exigen distancia 1; las de objetivo actual usan el alcance del perfil; las de sí mismo mantienen al emisor.

Un cast original cancelado cancela sus repeticiones pendientes. También se cancelan por muerte, aturdimiento, falta de objetivo o final de combate. Una repetición **nunca** programa otra repetición, incluso si autoriza pasivas y cuenta como cast. En `free-repeat`, el adicional permite señales, no paga ni genera maná y no cuenta como lanzamiento; se distingue por `additional`, `parentCastId` y un ID propio. Una regla `every` exige un lanzamiento que cuente; las reglas sin `every` pueden responder a adicionales autorizados que no cuenten.

## Saltos y acciones especiales

La operación `jump` elige enemigos vivos por distancia desde el emisor e ID. Para cada enemigo ordena los hexágonos adyacentes libres por distancia al emisor, fila y columna. Omite su origen y las celdas ocupadas o reservadas. Si ningún objetivo tiene un destino libre, no inicia el salto.

La unidad mantiene ocupado su origen hasta aterrizar y reserva exclusivamente el destino. El pathfinding normal considera esa reserva. No se consulta física, sprites ni colisiones visuales. Los impactos ordinarios del tick se comprometen antes de las llegadas especiales y sus ataques inmediatos.

Al aterrizar se comprueban de nuevo vida, aturdimiento, destino y objetivo:

- `retarget: 'cancel'`: cancela si el objetivo ya no vive o no está adyacente al destino.
- `retarget: 'adjacent'`: puede elegir otro enemigo vivo adyacente, con desempate estable.
- Muerte, stun o fin del combate cancelan y liberan la reserva; se conserva la celda de origen.
- `immediateAttack` resuelve un básico una sola vez después de `jump_end`, sin gastar carga normal. Usa AD y crítico efectivos al aterrizar; Overtime y mitigación se aplican en el impacto.
- `allowSourceProcs`, `grantMana` y `allowKillChain` deciden si ese básico puede provocar acumulaciones/maná y otra recompensa por eliminación. Un presupuesto agotado bloquea nuevas activaciones y emite `mechanics_limit`.

Cada acción guarda fuente, disparador, condiciones evaluadas, prioridad `after_impacts`, objetivo, estado y contexto causal. Los últimos 64 registros sirven de inspección; la cola pendiente también se limita a 64.

## Límites y determinismo

El contexto causal guarda ID, profundidad, presupuesto restante y políticas. Cada regla derivada y cada acción especial consumen un nivel/paso. Máximo ocho por linaje causal. Los hermanos de un mismo desencadenante conservan presupuestos de linaje independientes; no es un límite de ocho eventos totales por combate. Además hay 4096 tareas y 1024 señales por tick, 64 repeticiones pendientes y 256 fuentes periódicas por objetivo. Los límites emiten un evento tipado y detienen la rama correspondiente. Los datos no pueden ejecutar recursión arbitraria.

El orden es estable: expiración de acumulaciones/estados, carga, periódicos, resolución de sus pasivas y muertes, llegadas normales, lote de impactos comprometidos, estabilización, aterrizajes y ataques especiales, repeticiones, estabilización y decisiones nuevas. Los umbrales se consumen antes de aplicar sus recompensas. El tick terminal 450 continúa siendo solo una comprobación; Overtime comienza en 300. PRNG y redondeos siguen el contrato de estadísticas avanzadas.

## Presentación

Phaser interpola la misma proyección de movimiento para caminar y saltar. El arco solo desplaza el sprite y se elimina con movimiento reducido; el motor conserva su celda lógica. Hay contador compacto de acumulaciones, mensajes breves de umbral/eliminación/mejora/repetición y pose de ataque encadenado. Los mensajes comparten las seis vías de feedback existentes. Un ataque encadenado tiene prioridad visual sobre un nuevo salto en el mismo tick.

El inspector contextual muestra contadores, acumulaciones, duración, fuentes estadísticas activas y ámbito del progreso cuando existen datos útiles. El lateral muestra miembros y progreso por separado, incluido 1/1. La Arena técnica permite buscar eventos reales de la traza. No se ha añadido un panel permanente al HUD de partida.

## Compatibilidad y límites de alcance

- Nuevas partidas optan por catálogo `f0p6b2`, con los mismos precios, pool, personajes y temporizadores de `f0p6b1`.
- Los catálogos históricos siguen seleccionando sus reglas originales; no se migran silenciosamente guardados.
- `combatId` es obligatorio en el nuevo contrato; las partidas usan semilla y ronda. Los diagnósticos tienen identidad reproducible.
- Los campos nuevos son optativos en esquemas históricos y se rechazan como operaciones de entrada bajo reglas antiguas.
- 39 trazas históricas completas (27 previas y 12 P6B.1) y tres guardados capturados protegen eventos, snapshots y PRNG mediante referencias SHA-256.
- El estado es serializable y los guardados de partida conservan su traza completa mediante deltas. No hay API para reanudar `CombatEngine` desde un snapshot intermedio aislado: la reproducción se restaura desde la traza y la simulación se repite desde su input.
- Acumulaciones por unidad, no compartidas por equipo; el contador compartido implementado es el de progreso de sinergia. No hay persistencia de stacks entre combates ni cooldown activo adicional al maná.
- Los diagnósticos usan arte provisional ya disponible. No se importan sprites ni se balancean personajes nuevos.

## Configuración de futuros personajes

1. Seleccionar explícitamente reglas/catálogo de mecánicas.
2. Declarar las estadísticas y el escalado mediante los contratos existentes de AD/AP/crítico.
3. Añadir definiciones de stacks y sus umbrales al perfil, con claves estables para buffs renovables.
4. Usar reglas pasivas de `attack_hit`, `kill` o `ability_cast`, sin derivarlas del render.
5. Declarar membresías y reglas de progreso con ámbito explícito; elegir si un adicional cuenta y produce señales.
6. Configurar saltos y reejecuciones con objetivo, interrupción, maná y presupuesto explícitos.
7. Añadir casos reproducibles de cancelación, simultaneidad, Overtime, serialización y compatibilidad antes de incorporar contenido al catálogo.

VARGAS, Copita Perhaps, Blackhaus RPP, UPM y **El Depredador** quedan para F0-P6B.3, que no se inicia en esta entrega.
