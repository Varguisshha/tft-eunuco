# Protocolo de combate v2

Fuente: `packages/shared/src/combat.ts`; reglas de emisión en [COMBAT_SPEC](COMBAT_SPEC.md). Todos los contratos de esta versión son Zod strict, datos JSON sin clases, fechas, Map ni referencias gráficas.

Cada evento: `{ protocolVersion: 2, tick: entero >= 0, order: entero >= 0, type, payload }`. La clave `(tick,order)` ordena los eventos de un combate; no identifica globalmente una partida. `order` se reinicia a cero cada tick. No se ordenan por tiempo de llegada al cliente. Cambios de reglas que afecten determinismo exigirán otra `rulesVersion`; cambios incompatibles de estructura, otro protocolo. Las versiones desconocidas se rechazan, no se adaptan silenciosamente.

| type              | payload                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| combat_start      | rulesVersion, seed, maxTicks, units (estado inicial antes de pasivas), obstacles                                                 |
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
| combat_end        | winner (north/south/null), reason (elimination/empty/timeout), tick                                                              |

`status`: id, sourceId, kind (shield/modifier/stun), stat (attack/armor/magicResist/attackSpeedMilli o null), amount, expiresTick. Stun lleva amount0; shield lleva stat null. El emisor mantiene esas relaciones; el schema valida los tipos y límites de cada campo. No sustituye las invariantes semánticas de la autoridad.

`ability_cast.start` descuenta maná; `resolve` representa la liberación, los efectos concretos siguen en eventos. No inferir daño del inicio de ataque ni del nombre de habilidad. Una cancelación puede dejar un inicio sin resolución. Daño cero es posible; un escudo puede absorber todo. `combat_end` es terminal y no hay acciones posteriores.

## Estado y lotes

`CombatState`: protocolo, rulesVersion, tick, rngState, effectCounter, units, projectiles, result. Cada unidad conserva definición/perfil, posición lógica, HP, maná, carga, estados, acción en curso, targetId y deathTick. Los muertos permanecen para reproducir la muerte e inspeccionar. Los snapshots emitidos por la autoridad se clonan; el schema no demuestra por sí solo que un estado recibido proceda de una simulación válida.

`CombatBatchSchema` valida `{protocolVersion:2,rulesVersion:'f0p2-1',fromTick,toTick,events,snapshots}`: rango creciente, eventos dentro del rango y orden estricto `(tick,order)`, snapshots en ticks crecientes dentro del rango. Permite ticks sin eventos y lotes vacíos. No garantiza contigüidad entre lotes, autenticidad ni identidad de combate. El futuro transporte deberá añadir combatId, secuencia de lote, reintentos/deduplicación, revisión de reglas y gestión de huecos. No hay servidor conectado en P2.

El reproductor actual utiliza snapshot por tick y eventos para efectos; **no es un reducer completo de eventos aislados**. Por eso el contrato de lote incluye snapshots. Un servidor puede ejecutar `CombatEngine.step()` y entregar eventos junto al snapshot de ese tick sin mover reglas a Phaser. El adaptador de recepción/buffer se implementará en la fase online.

## Compatibilidad con F0-P1

`board-contracts.ts` conserva sin cambios los contratos originales, reexportados desde `shared/index.ts`, incluido `CombatEventSchema` histórico con `sequence`. El motor nuevo usa exclusivamente `CombatEventV2Schema` con `order`. No mezclar ambos ni asumir migración automática. Las 35 pruebas originales se mantienen. La nueva entrada incluye perfiles completos y versiones explícitas para poder reproducir aunque el catálogo cambie después.

## Reloj visual

El reloj visual se congela al pausar y multiplica su avance en ×2. El tick de impacto manda; ni callbacks de sprites ni colisiones aplican daño. Un frame puede saltar varios ticks: se toma el último estado correspondiente y se conservan los efectos recientes de todos los eventos relevantes. ID de efecto visual `(tick,order)` evita colisiones entre daños simultáneos. Repetir crea un reproductor nuevo desde cero.
