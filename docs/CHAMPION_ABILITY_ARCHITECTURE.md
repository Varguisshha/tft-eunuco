# Arquitectura de personajes y habilidades — propuesta P13A

Estado: propuesta revisable para P13B. Base: `d38f18bb8e0c4279c9ac92883942200225f0cb94`. Ninguno de los tipos o módulos propuestos en este documento se ha incorporado al motor de producción.

La [auditoría](F0_P13A_ARCHITECTURE_AUDIT.md) identifica fuentes, líneas y semánticas; el [plan P13B](P13B_MIGRATION_PLAN.md) define extracción, equivalencia y rollback.

## 1. Decisión: evolución híbrida del motor existente

Conservar `CombatEngine` como propietario del tick, daño, RNG, secuencia de eventos y estado mutable. Conservar `CombatMechanics` para operaciones compuestas y `ItemEffectExecutor` para objetos. Los personajes declaran identidad, perfil, habilidades, afinidades y referencias a assets; las excepciones usan capacidades tipadas invocadas en puntos concretos del motor.

No se propone introducir un ECS completo, una máquina de expresiones JSON, un bus de eventos alternativo, otro procesador de daño ni un scheduler genérico paralelo. El motor ya es en gran parte declarativo: `CombatEffect`, `ChampionAbility`, `PassiveRule`, `StackDefinition` y `TraitDefinition` son los contratos de partida.

### 1.1 Alternativas comparadas

| Criterio            | A. Mantener estructura actual                              | B. Todo declarativo                                               | C. Declarativo + capacidades tipadas                                |
| ------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| Complejidad inicial | Baja                                                       | Alta: DSL/interpretación/validación                               | Moderada y acotada por extracción                                   |
| Duplicación         | Builders y ensamblado siguen repartidos                    | Menos texto, más reglas del intérprete                            | Reutiliza primitivas existentes; extrae solo repetición probada     |
| Añadir personaje    | Fácil si usa efectos actuales; fricción al cruzar archivos | Fácil solo dentro de la DSL                                       | Definición común y handler cuando haya semántica nueva              |
| Rendimiento         | Baseline ya medido                                         | Coste adicional de interpretación, sin medición que lo justifique | Llamadas estáticas; preservar asignaciones y validar rendimiento    |
| Depuración          | Recorrido largo pero visible                               | Más indirección y errores de configuración                        | Breakpoints en handler/efecto con contexto explícito                |
| Tipado              | Uniones Zod buenas; registros con strings amplios          | Uniones posibles, dificultad con condiciones compuestas           | Reusar uniones, registros cerrados y parsers actuales               |
| Determinismo        | Acreditado para la base                                    | Posible, exige especificar orden y evaluación de toda la DSL      | Preservar los puntos de ejecución actuales y demostrar equivalencia |
| Persistencia        | Contratos actuales                                         | Riesgo de cambiar representación y versión de intérprete          | DTO actuales, funciones fuera del guardado                          |
| Migración           | Ninguna, deuda crece con 30 habilidades                    | Reescritura de alto riesgo                                        | Una capacidad/personaje por checkpoint                              |
| Mantenibilidad      | Se degrada al añadir excepciones al mismo engine           | El intérprete puede convertirse en otro monolito                  | Responsabilidades explícitas, sin perder casos especiales           |

**Recomendación C**, condicionada a igualdad exacta de trazas. No se afirma mejora de rendimiento sin medirla. A sigue siendo rollback válido; B no aporta una ventaja demostrada para salida/retorno y progreso entre rondas.

## 2. Capas y dependencias permitidas

1. **Autoría (`game-data`).** Identidad, costes, estadísticas base, afinidades, habilidades y parámetros de capacidades. Zod valida las definiciones. Puede ejecutar factorías puras de datos, sin IO, reloj, RNG global ni importaciones de core/cliente.
2. **Contratos (`shared`).** Reutilizar esquemas existentes de habilidad, efectos, perfil, eventos y estado. Las nuevas vistas de autoría no se añaden automáticamente a schemas de red/persistencia.
3. **Simulación (`game-core/combat`).** Único ejecutor: efectos básicos, mecánicas compuestas y adaptadores internos. IDs de instancia distintos de IDs de campeón/definición. Sin React, Phaser, DOM, promesas de IO ni audio.
4. **Partida (`game-core/match` y autoridad).** Progreso por victoria, fusión, equipo, congelación, reintentos y liquidación. No cobrar progreso dentro de una animación ni de un handler de daño.
5. **Presentación (`apps/web` + `sprite-contract`).** Resuelve manifests, sprites, splash y eventos semánticos. Las animaciones muestrean resultados ya decididos. Sus claves no forman parte de la fórmula de daño.

Dependencias: `game-data → shared`; `game-core → shared/game-data`; servidor → core/datos/shared; cliente → contratos/datos/core para selectores puros y playback. `shared` no depende del registro concreto de game-data; no introducir ciclos al generar IDs tipados.

### 2.1 Organización candidata, no creada en P13A

```text
packages/game-data/src/champions/
  authoring.ts          # tipos de autoría, validación entre registros
  current.ts            # vista de los 34, conservando orden de Excel
  dolea.ts              # extracción futura de definición actual
  vargas.ts             # composición equivalente de habilidad/stacks
  jaramillo.ts          # definición y referencia al progreso existente
  florin.ts             # datos, ciclo, recovery y afinidades
packages/game-core/src/combat/
  effects/              # solo extracciones probadas de resolveEffects
  behaviors/            # adaptadores estáticos, sin registry dinámico externo
packages/game-core/src/match/progress.ts
                        # se conserva como dueño del progreso de partida
apps/web/src/game/characterAssets.ts
                        # conserva manifests y fallbacks de presentación
```

No mover archivos como primer paso si eso rompe imports históricos o cambia evaluación de módulos. La primera vista puede construirse desde exports existentes. Las rutas anteriores son una dirección de organización, no una nueva copia obligatoria del motor.

## 3. Contratos TypeScript propuestos

El siguiente bloque es un **borrador compilable contra la base**. Propone una vista de autoría resuelta y puertos internos, no un nuevo contrato serializado. Se utilizan alias para uniones actuales en lugar de recrear interfaces menos estrictas.

```ts
import type {
  UnitDefinition,
  CombatProfile,
  ChampionAbility,
  CombatEffect,
  CombatEventV3,
  CombatInput,
  CombatState,
  CombatUnit,
  CombatStatus,
  OwnedUnit,
  ChainContext,
} from '@tft/shared';
import type { CharacterPresentation } from '@tft/game-data';

export type DeepReadonly<T> = T extends readonly (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

// Son exactamente las uniones existentes, incluida la separación mixed/active/passive.
export type AbilityDefinition = ChampionAbility;
export type PassiveDefinition = NonNullable<ChampionAbility['passive']>;
export type EffectDefinition = CombatEffect;
// El nombre CombatEvent ya existe en board-contracts para el protocolo antiguo.
// Este alias es local al diseño: no sustituir ni volver a exportar el nombre antiguo.
export type CombatEvent = CombatEventV3;
export type PersistentChampionState = NonNullable<OwnedUnit['progress']>;

export type BehaviorId =
  | 'basic-attack-cycle-v1'
  | 'off-board-recovery-v1'
  | 'competitive-round-progress-v1';

export type ChampionReadiness =
  | { readonly kind: 'provisional'; readonly reason: string }
  | { readonly kind: 'implemented'; readonly validation: 'pending' }
  | {
      readonly kind: 'validated';
      readonly baseline: string;
      readonly equivalenceEvidence: readonly string[];
    };

export interface ChampionDefinition {
  readonly authoringVersion: 1;
  // ID, nombre, coste, rol del simulador, afinidades y refs de habilidad/sprite.
  readonly identity: DeepReadonly<UnitDefinition>;
  // Estadísticas, habilidad principal, mecánicas y escalados, sin recalcularlos aquí.
  readonly baseProfile: DeepReadonly<CombatProfile>;
  // Rol descriptivo y tipo principal de daño, distintos del rol de objetos.
  readonly presentation: DeepReadonly<CharacterPresentation>;
  readonly assets: {
    readonly spriteId: UnitDefinition['spriteId'];
    readonly splashArtKey: string | null;
  };
  readonly behaviors: readonly BehaviorId[];
  readonly readiness: ChampionReadiness;
}

export interface TemporaryEffectState {
  readonly statuses: readonly DeepReadonly<CombatStatus>[];
  readonly passiveState: DeepReadonly<CombatUnit['passiveState']>;
  readonly mechanics: DeepReadonly<CombatUnit['mechanics']>;
}

// Puerto interno mínimo para handlers que ejecuten efectos en el punto del caller.
// El engine resuelve fase, elegibles, prioridad, límites, RNG e IDs.
export interface AbilityContext {
  readonly input: DeepReadonly<CombatInput>;
  readonly tick: CombatState['tick'];
  readonly sourceId: CombatUnit['id'];
  readonly targetId: CombatUnit['id'];
  readonly chain: DeepReadonly<ChainContext>;
  readonly origin: 'active' | 'passive' | 'trait';
  readonly readUnit: (id: CombatUnit['id']) => DeepReadonly<CombatUnit> | undefined;
  readonly executeEffects: (
    targetId: CombatUnit['id'],
    effects: readonly EffectDefinition[],
    context: ChainContext,
    powerMilli?: number,
  ) => void;
}
```

### 3.1 Qué garantizan y qué no garantizan estos tipos

- `AbilityDefinition` conserva el discriminante `type`; `EffectDefinition` conserva `kind`, incluido recovery/periodic/jump. No usar `Record<string, unknown>` o `any` para efectos ejecutables.
- `PersistentChampionState` es **el tipo de `OwnedUnit.progress` actual**, sin meter objetos enteros de campeón ni runtime de combate. Su identidad se asocia a `OwnedUnit.id`; un contenedor de autoría no reemplaza OwnedUnit.
- `TemporaryEffectState` es una vista de campos existentes, no se agrega como propiedad a CombatUnit. Proyectiles y pendingRepeats siguen en CombatState, no se pierden por no estar en esta vista de unidad.
- `DeepReadonly` es protección de lectura en compilación, no aislamiento runtime. El engine mantiene propiedad exclusiva y snapshots parseados/copias profundas. Nunca entregar al handler una referencia mutable a estado global por debajo del tipo readonly.
- `authoringVersion` versiona la vista de desarrollo. No cambia `COMBAT_PROTOCOL=3`, rulesVersion, versión de habilidad=1 ni AuthoritySnapshot.schema=1.
- Los IDs de campeones, habilidades y assets del repositorio son strings validadas, no literales generados por el JSON. P13B puede derivar un conjunto cerrado desde las 34 identidades y comprobar pertenencia con parser/registro; no fingir que `typeof JSON[number]['id']` produce una unión literal si TypeScript lo infiere como string. No añadir nombres arbitrarios de funciones al catálogo.
- `BehaviorId` sí es una unión cerrada y versionada del adaptador propuesto. `competitive-round-progress-v1` se interpreta en capa de partida, **no** se despacha por `AbilityContext` dentro del tick.
- El puerto anterior describe ejecución de efectos, no es suficiente para implementar todo FLORIN: el adaptador de presencia conserva inicialmente el Host de CombatMechanics y sus escrituras tipadas actuales. Añadir un «setState» universal haría perder las garantías.
- `CombatEventV3` es la unión de red actual; no ampliarla con eventos privados de autoría. Los hooks internos no son CombatEvent ni se serializan por accidente.

### 3.2 Definiciones de ejemplo sin inventar habilidades

Este segundo bloque también es compilable; construye vistas a partir de los datos reales. No reemplaza exports actuales y no se ejecuta en producción en P13A.

```ts
import { P11_ROSTER, P11_COMBAT_PROFILES, characterPresentation } from '@tft/game-data';

export function championView(id: string): ChampionDefinition {
  const identity = P11_ROSTER.find((u) => u.id === id);
  const baseProfile = P11_COMBAT_PROFILES[id];
  if (!identity || !baseProfile) throw new Error('Unknown champion identity');
  const behaviors: BehaviorId[] = [];
  if (baseProfile.championAbility?.passive?.attackCycle) behaviors.push('basic-attack-cycle-v1');
  if (identity.synergies.includes('mano_de_obra')) behaviors.push('off-board-recovery-v1');
  if (baseProfile.championAbility?.passive?.matchProgress)
    behaviors.push('competitive-round-progress-v1');
  return {
    authoringVersion: 1,
    identity,
    baseProfile,
    presentation: characterPresentation(id),
    assets: {
      spriteId: identity.spriteId,
      splashArtKey: identity.provisional ? null : `${id}:splash:1`,
    },
    behaviors,
    readiness: identity.provisional
      ? { kind: 'provisional', reason: 'Habilidades y arte definitivos pendientes' }
      : { kind: 'implemented', validation: 'pending' },
  };
}

export const doleaExample = championView('dolea');
export const florinExample = championView('florin');
export const cosminExample = championView('cosmin');
```

DOLEA ya resuelve escudo/área con efectos comunes y no recibe un handler artificial. FLORIN referencia ciclo y capacidad recovery existente; la elegibilidad real de Mano de Obra sigue siendo la afinidad activa, no basta figurar en `behaviors`. Cosmin conserva perfil provisional con habilidades nulas; no hereda habilidades de otro personaje.

El ejemplo marca completos como implemented/pending **respecto de una futura migración**, sin negar la validación P12J de su implementación anterior. Para pasar a validated hay que registrar baseline y evidencias de equivalencia del nuevo camino. Las claves de splash son referencias del cliente, no URLs nuevas ni descargas. La validación cruzada debe comprobar que existen en `SPLASH_ARTS` o resolver fallback; no imponer que todo ID provisional tenga arte.

En un registro final de P13B, validar también que las referencias active/passive de `UnitDefinition` apuntan a componentes válidos. FLORIN tiene `activeAbilityId='pisoton-carmesi'` y `passiveAbilityId='suela-reforzada'`, pero su paquete ChampionAbility usa `id='pisoton-carmesi'` con passive.attackCycle: hace falta una asociación explícita de componente, no exigir igualdad de ambas cadenas con el ID del paquete.

### 3.3 Registro de capacidades e interfaces futuras

No se requiere un callback por campeón para efectos que ya entiende `resolveEffects`. Como diseño de dispatch estático para las excepciones, separar estas firmas:

| Capacidad                  | Hook interno actual a preservar                            | Entrada/salida                                                     | Runtime propietario                      |
| -------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------- |
| basic-attack-cycle         | `basicAttackPower` antes del crítico; contador en `damage` | cálculo numérico puro y actualización en damage en su punto actual | UnitMechanics.basicAttacks               |
| off-board-recovery         | `CombatMechanics.apply`, `recoveries` y presencia          | Effect recovery validado; tick/return en fases actuales            | UnitMechanics.recovery, action, position |
| competitive-round-progress | liquidación de autoridad → `awardRoundProgress`            | elegibilidad/ganador/input/ronda; estado económico                 | OwnedUnit.progress y lastRound           |

Los hooks reciben contextos distintos y tipados; no una función `handle(event: string, payload: any)`. P13B debe adaptar cada llamada existente al nuevo módulo **en el mismo punto de ejecución**, no insertar una notificación asíncrona global. La selección de un handler no cambia el input del replay ni depende de React, filesystem, hora real, nombre visible o preferencias gráficas.

Si otro de los 30 personajes necesita una nueva capacidad, primero documentar su semántica y decidir si requiere extensión de `EffectSchema`, una regla actual o un handler local. No generalizar anticipadamente la máquina de estados de todos los futuros personajes.

## 4. Primitivas: reutilización antes que extracción

| Necesidad de autoría      | Mecanismo existente                                                                                                                                 | Acción propuesta                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| applyDamage               | [CombatEngine.damage](../packages/game-core/src/combat/engine.ts#L618)                                                                              | Reutilizar único pipeline; no exportar una copia que salte objetos, escudos, clones o accounting    |
| applyHeal                 | [resolveEffects: heal](../packages/game-core/src/combat/engine.ts#L491)                                                                             | Adaptador a CombatEffect heal; respeta heridas, overtime, clamp y events                            |
| applyShield               | [resolveEffects](../packages/game-core/src/combat/engine.ts#L566)                                                                                   | Reutilizar efecto shield; multiplicador overtime/cap comunes                                        |
| applyBuff / applyDebuff   | [modifier](../packages/game-core/src/combat/engine.ts#L554), [armor_reduction](../packages/game-core/src/combat/engine.ts#L528)                     | No son dos sistemas nuevos; preservar signos/modos/refresh/grupo                                    |
| addStacks / consumeStacks | [gain](../packages/game-core/src/combat/mechanics.ts#L301) / [consume](../packages/game-core/src/combat/mechanics.ts#L278)                          | Reutilizar efectos stack_gain/stack_consume y umbrales actuales                                     |
| checkHealthThreshold      | [flushPassives](../packages/game-core/src/combat/engine.ts#L124) / [abilityConditions](../packages/game-core/src/combat/abilities.ts#L22)           | Distinguir cruzar umbral de estar por debajo; extraer como predicado solo si no cambia instante     |
| selectTargets             | [effectTasks](../packages/game-core/src/combat/engine.ts#L352), [chooseTarget](../packages/game-core/src/combat/pathfinding.ts#L55), enemies/nearby | Políticas explícitas distintas: objetivos de efecto, camino, salto, objetos; no una sola ordenación |
| spawnProjectile           | construcciones engine.ts:1013/1081                                                                                                                  | Candidato nuevo: constructor puro con distancia/identidad y metadatos explícitos, sin resolver daño |
| applyAreaEffect           | effectTasks + resolveEffects                                                                                                                        | Ya existe centro source/target, radio por estrellas y excluir primario; reutilizar                  |
| scheduleEffect            | action.endTick, pendingRepeats, periodics, recovery.nextHealTick, statuses.expiresTick                                                              | No crear scheduler unificado en P13B; adaptar plazos actuales con ticks                             |
| expireEffect              | step, expireStacks, settleDeaths, cancelAction, finish                                                                                              | Limpieza por dominio y razones actuales; no llamar a todos los callbacks en cualquier expiración    |
| escalado                  | [effectAmount](../packages/game-core/src/combat/stats.ts#L17), scaledProfile, effectiveStat                                                         | Mantener capas/enteros/floor; no aplicar estrellas dos veces                                        |
| críticos                  | [criticalRoll](../packages/game-core/src/combat/stats.ts#L50)                                                                                       | Mantener draws RNG y veto canCrit:false según rulesVersion                                          |
| progreso de partida       | [progress.ts](../packages/game-core/src/match/progress.ts#L3)                                                                                       | Reutilizar; no mezclar con stacks de combate                                                        |

**Nuevas piezas justificadas:** vista/validación cruzada de autoría de campeón, registro cerrado de capacidades y, tras pruebas, constructor puro de proyectil y helper puro de ajuste HP al variar máximo. Las factorías de literales son conveniencia, no requisito para ejecutar personajes. No hay necesidad demostrada de nuevas primitivas de daño/curación/área ni de un framework ECS.

## 5. Determinismo y compatibilidad

### 5.1 Reglas de ejecución innegociables

- Mismo CombatInput validado, misma seed, mismas versiones, **mismos events y snapshots completos**, no solo mismo ganador.
- Conservar tick de 100 ms, overtime 300 y tick terminal 450. No actualizar buff, llegada ni impacto en tick 450.
- Conservar orden estable compareIds, r/q de casillas y rotación de decisiones. Mantener orden de registros, reglas, arrays y claves cuando interviene JSON.stringify/fingerprint.
- Mantener todos los floor, límites enteros, orden de capas y RNG. No usar Math.random/Date.now/tiempo de render en handlers; el reloj de autoridad persiste fuera del motor.
- Mantener causales, effectCounter, procs, castCounts, original/additional y budgets 4096 efectos/1024 señales/profundidad 8. No «simplificar» emitiendo otro evento o asignando otro ID.
- En resolveEffects conservar elegibles del lote, prioridad 0/1/2, vaciado de curación derivada y estabilización de muertes.
- La repetición actual de `CombatMechanics.repeats` aplica efectos directamente; no reenviarla a delivery=projectile al extraer JARAMILLO aunque parezca más consistente. Cualquier cambio de esa política sería funcional y requiere otra versión, fuera de P13B equivalente.
- Mantener una sola aplicación del factor de clon al daño después de defensas y antes de escudos/HP. No reducir curación, escudos, stats, duración de stun ni fórmula del proyectil por copiar un ejército.

### 5.2 Persistencia sin cambios de formato iniciales

Los handlers son funciones internas y no se serializan. Los datos requeridos para reproducción siguen en CombatInput/CombatState/CombatReplay. Los datos ganados entre rondas siguen en OwnedUnit.progress. No añadir `{handler: Function}`, closures, Map o Set a DTOs persistidos.

`AuthoritativeMatch.exportState/restore` mantiene AuthoritySnapshot.schema=1, catálogo, reglas, inputs, replays, receipts y liquidación idempotente. `DurableMatch` conserva commit antes de publicar y reintento del mismo documento. El codec mantiene JSON de duelos, gzip-base64, longitud y digest. Una extracción de archivos no justifica migración SQL.

Los 19 fingerprints listados en la auditoría deben permanecer iguales a P12J, incluidos los 18 históricos acreditados. El fingerprint actual P12F es encadenado; no cubre por sí solo cada instrucción de handlers ni toda la definición de perfil. Por eso se añaden gates de igualdad de definiciones, fuentes de identidad y trazas.

Si una nueva habilidad posterior necesita nuevos campos serializados, definir nueva versión explícita de contrato y reglas para partidas nuevas, conservar lector y semántica histórica y preparar migración aparte. No usar el mismo rulesVersion para reinterpretar snapshots antiguos. P13B comienza sin ese cambio de schema; si no puede cumplirlo, detener ese subpaso y replantearlo antes de tocar partidas existentes.

## 6. Assets, eventos y presentación

`UnitDefinition.spriteId` se resuelve en el cliente con `CharacterManifestSchema` versión 2, evoluciones por estrella y fallbacks existentes. Referenciar arte no obliga a importarlo en game-core. El splash permanece en `SPLASH_ARTS` y su provenance; no incorporar binarios privados ni nuevos recursos oficiales a la genealogía pública.

| Semántica emitida o estado actual                 | Interpretación visual existente                | Límite de responsabilidad                             |
| ------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------- |
| move_start/end y action move/jump                 | walk, interpolación y orientación              | No avanzar casilla lógica desde un tween              |
| attack_start / chain_attack                       | unitAnimationCue y frames attack               | El impacto depende del engine, no del frame           |
| ability_cast start/resolve                        | pose ability y recuperación                    | No consumir maná en React/Phaser                      |
| projectile_launch y damage.projectileId           | compositeFlight/impacto JARAMILLO              | Trayectoria y humo visual no calculan armor_reduction |
| unit_presence y recovery.away                     | recoveryVisual salida/indicador/retorno FLORIN | No deducir fecha futura de retorno por animación      |
| passive*trigger / stack*_ / shield*apply/status*_ | feedback y lecturas de estado                  | No incrementar stacks desde el HUD                    |
| unit_death / combat_end                           | death y cierre visual                          | Mantener cola visual sin prolongar ticks de combate   |

La arquitectura conserva Mar de Cristal y UPM, el sistema de zoom y los cuatro splash arts existentes. Las animaciones pueden caer en fallback sin que cambie la simulación. «Personaje validado» no significa tener arte nativo para cada animación/estrella: registrar coberturas y fallbacks explícitos en las evidencias.

## 7. Incorporación progresiva de los 30 pendientes

1. Seleccionar una identidad ya presente en el Excel; conservar ID, nombre y afiliaciones actuales.
2. Diseñar/autorizar estadísticas definitivas, separadas de sus parámetros provisionales. Esto será desarrollo posterior, no parte de esta refactorización equivalente.
3. Mantener las afinidades de catálogo y definir efectos nuevos solo mediante un encargo de diseño. Los escalones pending_effects no se rellenan por deducción.
4. Declarar pasiva con reglas comunes o capacidad tipada justificada; conservar null si sigue pendiente.
5. Declarar activa mediante ChampionAbilitySchema; validar maná, efectos, targeting y escalados por estrella.
6. Vincular sprite/splash/proyectil/impacto en manifests del cliente; documentar fallback y provenance.
7. Añadir tests de fórmula, disparadores, interacción, traza y estados intermedios. Si cambia mecánica respecto al provisional, no exigir equivalencia con «solo básicos»: exige nueva especificación/versionado de contenido.
8. Incorporar la definición al registro de autoría con validación cruzada de IDs y referencias; mantener export ordenado de P11/históricos sin mutación.
9. Probar snapshots, fusión/progreso/equipo si aplica, clon, reintento y recuperación de autoridad.
10. Comprobar presentación en ambas arenas y marcar implemented o validated con evidencia, sin cambiar unilateralmente el flag de provisionales de partidas históricas.

Estos pasos son una guía para desarrollar personajes después de consolidar P13B. No se diseñan aquí habilidades de Cosmin ni de ningún otro provisional. La aceptación y el orden de cada nuevo personaje requerirán tareas posteriores.
