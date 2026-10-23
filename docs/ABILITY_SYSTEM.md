# Sistema de habilidades — F0-P6A

Contrato v1 en `packages/shared/src/abilities.ts`; datos en `packages/game-data/src/abilities.ts`; ejecución en `packages/game-core/src/combat/engine.ts`. JSON estricto validado por Zod, sin funciones ni evaluación de código.

## Una identidad, tres formas

`ChampionAbility` contiene `id`, `name`, `description`, `icon`, `version: 1` y `type`:

- `active`: componente activo obligatorio; pasiva ausente o nula.
- `passive`: componente pasivo obligatorio; activa ausente o nula.
- `mixed`: ambos componentes obligatorios bajo una única identidad.

Un perfil moderno no puede mezclar `championAbility` con los campos históricos `ability`/`passive`. Su maná coincide con `active.manaCost` y `active.initialMana`; si solo tiene pasiva, ambos valores son cero. Renderer e inspector omiten esa barra. Los perfiles históricos siguen usando su contrato anterior.

## Activa

Incluye nombre/descripción del componente, maná inicial/coste, `castTicks`, condiciones, targeting, efectos y política de ejecución. En v1: `animation: ability`, consumo `on_start`, prioridad `before_attack`, interrupción `stun_or_death`. Estas opciones son deliberadamente cerradas; ampliar políticas exige contrato, motor y pruebas.

Cuando termina la acción anterior, una unidad viva no aturdida con suficiente maná comprueba condiciones y elige objetivo. `current_enemy` respeta alcance; `adjacent_enemies` requiere un enemigo adyacente; `self` no exige enemigo próximo. Se consume el coste una vez, se emite `ability_cast/start` y tras los ticks de lanzamiento se resuelven los efectos y se emite `resolve`. Aturdimiento/muerte interrumpen sin devolver maná. No hay daño desde sprites ni desde React.

## Pasiva

Cada componente contiene 1–8 reglas con ID único, desencadenante, condiciones, efectos, máximo de activaciones y cooldown en ticks. Desencadenantes:

| Tipo                 | Momento                                                     |
| -------------------- | ----------------------------------------------------------- |
| `combat_start`       | Después de preparar perfiles y sinergias                    |
| `attack` con `every` | Cada N ataques liberados, no anticipaciones canceladas      |
| `damage_received`    | Daño aplicado al receptor                                   |
| `hp_crossed`         | Antes estaba en/encima del umbral y después está por debajo |
| `ability_cast`       | Inicio lógico de lanzamiento                                |
| `kill`               | Fuente del daño letal                                       |
| `effect_expired`     | Expiración por duración; admite filtrar `key`               |

Las condiciones disponibles son `hp_below`, `enemies_nearby`, `not_stunned`. El estado serializable de cada regla conserva `count`, `seen` y `lastTick`. Se limita a una activación de cada regla por tick, incluso con cooldown cero, y a `maxActivations` por combate. La cola se procesa en orden determinista; no se ejecutan reglas de unidades muertas. Los impactos comprometidos de un lote se resuelven antes de evaluar pasivas: un escudo no rescata una muerte simultánea. Consumir o reemplazar un efecto no dispara `effect_expired`.

## Efectos

Operaciones tipadas: daño físico/mágico/verdadero, curación, escudo, aturdimiento y modificadores de vida máxima, ataque, armadura, resistencia mágica y velocidad de ataque. Objetivos `self`, `target`, `allies`, `enemies`; radio hexagonal y centro explícito opcional (`source`/`target`).

`amount` es plano. `scaling` añade una fracción entera (`ratioMilli`) de vida máxima o ataque efectivo de fuente/receptor. `starScaling: stat` multiplica solo el importe base al preparar el perfil por estrellas; `flat` lo conserva. El porcentaje de una estadística ya escalada no vuelve a escalarse. División con suelo, límites de estadísticas y fórmula general de mitigación conservados.

Estados temporales llevan ticks absolutos de expiración. `stacking: refresh` requiere clave estable, reemplaza el efecto de la misma fuente/clave y reinicia duración; `stack` conserva acumulación. Un modificador de vida máxima ajusta la vida actual por el mismo delta; al expirar limita la vida al máximo efectivo. Los nuevos escudos y curaciones atraviesan las reglas existentes de Overtime.

## DOLEA: Volumen Sucio

| Parámetro             | Regla actual                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------- |
| Pasiva Volumen eterno | Primer cruce por debajo del 50 %, vivo, una vez por combate                                 |
| Escudo                | Suelo del 12 % de vida máxima efectiva; duración 450 ticks, suficiente hasta fin de combate |
| Activa Press de banca | Maná 0/70; lanzamiento 3 ticks (0,3 s)                                                      |
| Área                  | Enemigos a distancia hexagonal ≤1 de DOLEA al resolver                                      |
| Daño físico           | 100 / 180 / 324 según 1★ / 2★ / 3★, antes de mitigación                                     |
| Armadura              | +20 durante 40 ticks (4 s), renovable sin acumulación                                       |
| Animación             | Solicita `ability`; fallback Attack 1★/2★; 3★ utiliza apariencia 2★                         |

Vida y ataque base escalan ×1 / ×1,8 / ×3,24. Armadura, maná, duración y porcentaje de escudo son planos. Sin sinergias, vida 600/1080/1944; escudos 72/129/233 por redondeo. La vida plana de Hortaleza se añade después del escalado y sí forma parte del escudo. El estado de pasiva comienza vacío cada combate.

## Versionado y extensiones

Catálogo nuevo `f0p6a`, reglas nuevas `f0p6a-1`, protocolo de transporte v3 conservado. El parser admite además reglas históricas `f0p3.1-1`; rechaza campos modernos bajo reglas antiguas. Los catálogos anteriores conservan perfiles congelados y sus habilidades. La traza guardada se reproduce sin reinterpretarla con datos nuevos.

Para añadir una operación única: extender la unión validada, implementar resolución pura, definir orden y límites, añadir pruebas y una versión de reglas. Nunca introducir una condición por nombre de personaje. Para modificar balance publicado, crear una versión de catálogo/reglas que preserve los perfiles de los guardados anteriores; no editar silenciosamente una versión histórica. Un cambio solo de icono no requiere migrar combate.
