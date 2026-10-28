# Actualización F0-P7A

Online publica combat_trace f0p7a-1 con matchId/combatId/startedAt y replay completo, idéntico en ambos sockets. Se valida orden/contigüidad. Florin rota exclusivamente presentación; no ejecuta otra simulación. La publicación anticipada permite inspeccionar el resultado futuro en un cliente modificado.

Véase [arquitectura multijugador](MULTIPLAYER_ARCHITECTURE.md), [protocolo](SERVER_PROTOCOL.md) y [partida autoritativa](AUTHORITATIVE_MATCH.md). Las afirmaciones históricas «servidor no implementado» de las secciones inferiores quedan superadas por esta actualización.

---

# Protocolo de combate v3 — Overtime y doble derrota

## Extensión aditiva de estadísticas — F0-P6B.1

Entradas nuevas usan reglas `f0p6b1-1`; registros históricos conservan sus reglas y su forma anterior. `damage.payload.critical?` identifica el resultado real del impacto. Acción de ataque y proyectil también conservan `critical?` junto al bruto ya comprometido; un vuelo no vuelve a tirar al impactar. En trazas nuevas el campo es booleano explícito; las anteriores lo omiten.

Estados modificadores avanzados añaden `mode?: flat | percent_milli` y `origin?: trait | active | passive`. `expiresTick: null` representa permanencia durante el combate. Las bonificaciones de sinergia aparecen en estados iniciales identificados por su fuente; su activación mantiene `trait_activate`. Las fuentes temporales conservan `status_apply`/`status_expire` y su orden anterior.

No se añaden eventos de crítico ni cálculos al renderer. El protocolo3 conserva metadatos opcionales aditivos y `rulesVersion` fija su semántica; un cliente que no conozca esas reglas debe rechazarlas. Las entradas antiguas no admiten campos estadísticos o efectos avanzados. [Fórmulas, momentos de tirada y compatibilidad](ADVANCED_STATS.md).

## Auditoría de pasivas y escudos — F0-P6A.1

El protocolo existente es suficiente: **sin nuevos eventos, campos, versión o duplicaciones** en P6A.1. Se conservan protocolo 3 y reglas `f0p6a-1`; las secciones de Overtime inferiores documentan también reglas históricas `f0p3.1-1`.

Eventos modernos incorporados en P6A, que completan la tabla histórica inferior:

| Tipo              | Payload                                                  |
| ----------------- | -------------------------------------------------------- |
| `passive_trigger` | `unitId`, `abilityId`, `ruleId`, `trigger`, `activation` |
| `trait_activate`  | `side`, `traitId`, `count`, `threshold`, `unitIds`       |

Una pasiva de umbral sigue el orden autoritativo `damage` → `passive_trigger` → `shield_apply`. El golpe que cruza el umbral ya ha aplicado su daño; el escudo protege golpes posteriores. `shield_apply.status.amount` expresa la concesión real tras modificadores, y `shieldAfter` el total. El snapshot conserva estados independientes para acumulaciones.

`damage.absorbed` permite mostrar absorción sin curación; `amount` es HP perdido, con `hpAfter` y `shieldAfter` resultantes. Al agotar un estado se emite `status_expire` con `reason: consumed` antes del evento `damage` de ese impacto. Para identificar qué expiró se enlaza `statusId` con el estado recibido en `shield_apply`; `duration` distingue expiración temporal y `death` eliminación. La presentación del total toma el snapshot del tick, por lo que no deja restos al agotarse o expirar.

Los contadores `CombatUnit.passiveState` confirman disponibilidad y consumo. Su ausencia en un registro antiguo no permite afirmar que una pasiva moderna esté disponible o activada. Los efectos visuales son una lectura de la traza, nunca una fuente de eventos. Pausar y buscar un momento no reemite eventos ni vuelve a simular.

Fuente: `packages/shared/src/combat.ts`; reglas de emisión en [COMBAT_SPEC](COMBAT_SPEC.md). Todos los contratos de esta versión son Zod strict, datos JSON sin clases, fechas, Map ni referencias gráficas.

Cada evento: `{ protocolVersion: 3, tick: entero >= 0, order: entero >= 0, type, payload }`. La clave `(tick,order)` ordena los eventos de un combate; no identifica globalmente una partida. `order` se reinicia a cero cada tick. No se ordenan por tiempo de llegada al cliente. Cambios de reglas que afecten determinismo exigirán otra `rulesVersion`; cambios incompatibles de estructura, otro protocolo. Las versiones desconocidas se rechazan, no se adaptan silenciosamente.

| type              | payload                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| combat_start      | rulesVersion, seed, maxTicks, overtime, units (estado inicial antes de pasivas), obstacles                                       |
| move_start        | unitId, from, to, endTick                                                                                                        |
| move_end          | unitId, from, to                                                                                                                 |
| attack_start      | unitId, targetId, releaseTick, ranged                                                                                            |
| projectile_launch | id, sourceId, targetId, launchTick, impactTick, from, to, rawDamage, damageType                                                  |
| damage            | sourceId, targetId, amount (HP perdido), absorbed, hpAfter, shieldAfter, damageType, cause (attack/ability), impact (hex lógico) |
| heal              | sourceId, targetId, amount (real), hpAfter                                                                                       |
| shield_apply      | unitId, status, shieldAfter                                                                                                      |
| mana_gain         | unitId, amount (real), manaAfter                                                                                                 |
| ability_cast      | unitId, targetId, abilityId, stage (start/resolve), endTick, manaAfter, center                                                   |
| status_apply      | unitId, status                                                                                                                   |
| status_expire     | unitId, statusId, reason (duration/consumed/death)                                                                               |
| action_cancel     | unitId, action (move/attack/cast), reason (stun/death/invalid-target/combat-end)                                                 |
| unit_death        | unitId, position                                                                                                                 |
| combat_end        | outcome (win/double_loss), winner (north/south/null), reason (elimination/empty/timeout), tick                                   |

`status`: id, sourceId, kind (shield/modifier/stun), stat (attack/armor/magicResist/attackSpeedMilli o null), amount, expiresTick. Stun lleva amount0; shield lleva stat null. El emisor mantiene esas relaciones; el schema valida los tipos y límites de cada campo. No sustituye las invariantes semánticas de la autoridad.

`ability_cast.start` descuenta maná; `resolve` representa la liberación, los efectos concretos siguen en eventos. No inferir daño del inicio de ataque ni del nombre de habilidad. Una cancelación puede dejar un inicio sin resolución. Daño cero es posible; un escudo puede absorber todo. `combat_end` es terminal y no hay acciones posteriores.

## Estado y lotes

`CombatState`: protocolo, rulesVersion, tick, rngState, effectCounter, units, projectiles, result. Cada unidad conserva definición/perfil, posición lógica, HP, maná, carga, estados, acción en curso, targetId y deathTick. Los muertos permanecen para reproducir la muerte e inspeccionar. Los snapshots emitidos por la autoridad se clonan; el schema no demuestra por sí solo que un estado recibido proceda de una simulación válida.

`CombatBatchSchema` valida `{protocolVersion:3,rulesVersion:'f0p3.1-1',fromTick,toTick,events,snapshots}`: rango creciente, eventos dentro del rango y orden estricto `(tick,order)`, snapshots en ticks crecientes dentro del rango. Permite ticks sin eventos y lotes vacíos. No garantiza contigüidad entre lotes, autenticidad ni identidad de combate. El futuro transporte deberá añadir combatId, secuencia de lote, reintentos/deduplicación, revisión de reglas y gestión de huecos. No hay servidor conectado en P2.

El reproductor actual utiliza snapshot por tick y eventos para efectos; **no es un reducer completo de eventos aislados**. Por eso el contrato de lote incluye snapshots. Un servidor puede ejecutar `CombatEngine.step()` y entregar eventos junto al snapshot de ese tick sin mover reglas a Phaser. El adaptador de recepción/buffer se implementará en la fase online.

## Compatibilidad con F0-P1

`board-contracts.ts` conserva sin cambios los contratos originales, reexportados desde `shared/index.ts`, incluido `CombatEventSchema` histórico con `sequence`. El motor nuevo usa exclusivamente `CombatEventV3Schema` con `order`. No mezclar ambos ni asumir migración automática. Las 35 pruebas originales se mantienen. La nueva entrada incluye perfiles completos y versiones explícitas para poder reproducir aunque el catálogo cambie después.

## Reloj visual

El reloj visual se congela al pausar y multiplica su avance en ×2. El tick de impacto manda; ni callbacks de sprites ni colisiones aplican daño. Un frame puede saltar varios ticks: se toma el último estado correspondiente y se conservan los efectos recientes de todos los eventos relevantes. ID de efecto visual `(tick,order)` evita colisiones entre daños simultáneos. Repetir crea un reproductor nuevo desde cero.

## Cambio de versión y compatibilidad

La presencia de `outcome`, los resultados double_loss y el nuevo tipo de evento requieren **protocolo 3**, reglas **f0p3.1-1**. No se etiquetan eventos nuevos como v2. Los contratos de preparación P1 siguen intactos; los contratos completos v2 se conservan sin cambios en `combat-v2.ts`, exportados bajo `LegacyCombatV2`. `CombatEventV2Schema` y su tipo también mantienen su exportación directa para consumidores históricos. Validar un documento v2 no significa poder simularlo con las reglas nuevas: el motor actual exige v3. No hay conversión silenciosa de eventos, resultados ni partidas antiguas.

## overtime_start

Una emisión en `tick:300`, `order:0`, antes de expiraciones/carga/acciones de ese tick, solo si el combate sigue activo y su límite supera 300. Envelope `protocolVersion:3`. Payload:

```json
{
  "rulesVersion": "f0p3.1-1",
  "startTick": 300,
  "endTick": 450,
  "modifiers": {
    "damageMilli": [1250, 2000],
    "attackSpeedMilli": [1200, 1750],
    "healMilli": [800, 400],
    "shieldMilli": [800, 400]
  }
}
```

La entrada y combat_start también incluyen `overtime` para fijar la configuración del replay. El esquema valida tick/order del evento y configuración; el motor garantiza emisión única por combate. El schema de lote no representa identidad global ni autenticación: futuros receptores deberán deduplicar lotes por identidad de combate. No hay oro, rachas ni vida del jugador en este evento.

combat_end conserva winner/reason/tick y añade outcome. Doble eliminación: `{outcome:'double_loss',winner:null,reason:'elimination',tick:t}`. Límite: mismo outcome, reason timeout, tick450 (o límite reducido de test). El tick del payload debe coincidir con el envelope. Tick450 no contiene efectos nuevos, únicamente cancelaciones terminales y combat_end. La traza incluye snapshot450 final.

## Eventos aditivos de F0-P6B.2

Se conserva transporte v3 y se negocian reglas `f0p6b2-1`. Nuevos tipos estrictos: `stack_gain`, `stack_consume`, `stack_threshold`, `attack_confirmed`, `kill_attributed`, `ability_empowered`, `ability_repeat`, `jump_start`, `jump_end`, `chain_attack`, `periodic_apply` y `mechanics_limit`. Todos heredan tick/orden/protocolo. Los payloads registran fuente, destinatario y causalidad según la operación; la atribución incluye combate y referencia exacta `{tick, order}` al daño letal.

`damage` sigue siendo la única pérdida de vida: los indicadores no duplican daño. Bajo reglas nuevas añade responsable, causalidad, origen periódico/ambiental y `attackId` cuando corresponde. `ability_cast` distingue cast original/adicional y padre; las cancelaciones incluyen salto. Los campos adicionales no se rellenan en trazas antiguas. Contratos en `packages/shared/src/combat.ts`; semántica en [ADVANCED_MECHANICS.md](ADVANCED_MECHANICS.md).

## F0-P6C · JARAMILLO

Las reglas f0p6c-1 añaden entrega activa por projectile_launch (cause/effects opcionales) y vinculan damage mediante projectileId. El humo visual solo aparece con ese daño real. Un proyectil contra un objetivo ya muerto se descarta sin impacto. Protocolo 3 y trazas históricas conservan compatibilidad.


## Actualización F0-P8C · 26-10-2026

P8C añade `item_signal` (liberación), `item_effect` y metadata opcional `itemSource` en daño, heal, estados y proyectiles. El origen conserva definición/instancia/operación, tick, clase causal, señal y padre de evento. Las raíces periódicas/geométricas no tienen padre artificial. La reproducción no emite señales lógicas.

Detalle: [ejecutor](ITEM_EFFECT_EXECUTOR.md), [decisiones](ITEM_EFFECT_EVENT_ORDER.md) y [matriz de pruebas](ITEM_EFFECT_TEST_MATRIX.md).
