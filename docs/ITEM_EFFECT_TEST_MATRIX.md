> **Contrato vigente P11H:** contenido/economía `f0p11h-1`, combate `f0p11h-1`, objetos `f0p11h-18.5-1`. 32 completos disponibles y cuatro bloqueados. [Auditoría y límites](ITEM_FIDELITY_AUDIT.md), [arte individual](ITEM_ICON_ASSET_MANIFEST.md), [entrega y tooltips/compras](F0_P11H_REPORT.md). El cuerpo siguiente es histórico y conserva las reglas de su versión; no describe por sí solo el catálogo vigente.

# Matriz de validación individual · F0-P8C

Cada fila tiene receta, estadísticas, restricciones, copia y reproducción doble en `packages/game-core/src/items/execution.test.ts`. Las pruebas mecánicas del mismo archivo verifican valores y cambios reales de HP/maná/estados/proyectiles; no sustituyen resultados por snapshots de presencia. `execution-invariants.test.ts` prueba conservación y fusión.

| Registro congelado | Receta                                          | Operaciones y señal                                                      | Duración/límite                                                         | Estado                |
| ------------------ | ----------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- | --------------------- |
| RabadonsDeathcap   | component-ap + component-ap                     | damage_amp / combat_start                                                | effect-1: combate, independent                                          | Operativo, habilitado |
| InfinityEdge       | component-ad + component-critical               | ability_critical / combat_start                                          | effect-1: combate, independent                                          | Operativo, habilitado |
| FrozenHeart        | component-armor + component-mana                | shield / health_threshold; resists / health_threshold                    | effect-1: 50 ticks, unique; effect-2: combate, unique                   | Operativo, habilitado |
| Redemption         | component-health + component-mana               | heal / periodic; damage_reduction / periodic                             | effect-1: combate, independent; effect-2: 50 ticks, strongest           | Operativo, habilitado |
| ThiefsGloves       | component-critical + component-critical         | random_items / round_start                                               | effect-1: combate, unique                                               | Operativo, habilitado |
| GuinsoosRageblade  | component-ap + component-attack_speed           | attack_speed_stacks / attack_release                                     | effect-1: combate, add                                                  | Operativo, habilitado |
| IonicSpark         | component-ap + component-magic_resist           | resistance_reduction / aura; cast_punishment / enemy_cast                | effect-1: combate, nonstacking_debuff; effect-2: combate, independent   | Operativo, habilitado |
| SteraksGage        | component-ad + component-health                 | health_ad_surge / health_threshold                                       | effect-1: combate, unique                                               | Operativo, habilitado |
| DragonsClaw        | component-magic_resist + component-magic_resist | heal / periodic                                                          | effect-1: combate, independent                                          | Operativo, habilitado |
| PowerGauntlet      | component-critical + component-health           | damage_amp / shield_damage                                               | effect-1: 30 ticks, refresh                                             | Operativo, habilitado |
| GargoyleStoneplate | component-armor + component-magic_resist        | targeting_resists / targeting_change                                     | effect-1: combate, add                                                  | Operativo, habilitado |
| BrambleVest        | component-armor + component-armor               | damage_reduction / combat_start; retaliation / received_attack           | effect-1: combate, independent; effect-2: combate, independent          | Operativo, habilitado |
| MadredsBloodrazor  | component-ad + component-attack_speed           | damage_amp / damage_dealt                                                | effect-1: combate, independent                                          | Operativo, habilitado |
| RedBuff            | component-armor + component-health              | burn_wound / periodic                                                    | effect-1: 100 ticks, nonstacking_debuff                                 | Operativo, habilitado |
| UnstableConcoction | component-critical + component-mana             | omnivamp / damage_dealt; round_random_bonus / round_start                | effect-1: combate, independent; effect-2: combate, independent          | Operativo, habilitado |
| GuardianAngel      | component-ad + component-armor                  | untargetable_cleanse / health_threshold; attack_speed / health_threshold | effect-1: combate, unique; effect-2: combate, unique                    | Operativo, habilitado |
| TitansResolve      | component-armor + component-attack_speed        | dual_power_stacks / attack_or_damage_taken                               | effect-1: combate, add                                                  | Operativo, habilitado |
| RunaansHurricane   | component-attack_speed + component-magic_resist | secondary_bolt / attack_release                                          | effect-1: combate, independent                                          | Operativo, habilitado |
| Bloodthirster      | component-ad + component-magic_resist           | omnivamp / damage_dealt; shield / health_threshold                       | effect-1: combate, independent; effect-2: 50 ticks, unique              | Operativo, habilitado |
| ArchangelsStaff    | component-ap + component-mana                   | ability_power / periodic                                                 | effect-1: combate, add                                                  | Operativo, habilitado |
| SpearOfShojin      | component-ad + component-mana                   | attack_mana / attack_release                                             | effect-1: combate, independent                                          | Operativo, habilitado |
| SpectralGauntlet   | component-health + component-magic_resist       | resistance_reduction / aura; resists / combat_start                      | effect-1: combate, nonstacking_debuff; effect-2: 100 ticks, independent | Operativo, habilitado |
| Leviathan          | component-attack_speed + component-health       | attack_speed / ability_cast                                              | effect-1: 50 ticks, refresh                                             | Operativo, habilitado |
| Morellonomicon     | component-ap + component-health                 | burn_wound / attack_or_ability_damage                                    | effect-1: 100 ticks, nonstacking_debuff                                 | Operativo, habilitado |
| RapidFireCannon    | component-attack_speed + component-attack_speed | damage_amp / combat_start; burn_wound / attack_or_ability_damage         | effect-1: combate, independent; effect-2: 50 ticks, nonstacking_debuff  | Operativo, habilitado |
| Crownguard         | component-ap + component-armor                  | shield / combat_start; ability_power / shield_expire                     | effect-1: 80 ticks, unique; effect-2: combate, unique                   | Operativo, habilitado |
| AdaptiveHelm       | component-magic_resist + component-mana         | positional_bonuses / combat_start                                        | effect-1: combate, independent                                          | Operativo, habilitado |
| BlueBuff           | component-mana + component-mana                 | max_mana_reduction / combat_start; damage_amp / takedown                 | effect-1: combate, independent; effect-2: 80 ticks, refresh             | Operativo, habilitado |
| LastWhisper        | component-attack_speed + component-critical     | resistance_reduction / physical_damage                                   | effect-1: 30 ticks, nonstacking_debuff                                  | Operativo, habilitado |
| JeweledGauntlet    | component-ap + component-critical               | ability_critical / combat_start                                          | effect-1: combate, independent                                          | Operativo, habilitado |
| NightHarvester     | component-armor + component-critical            | damage_reduction / combat_start                                          | effect-1: combate, independent                                          | Operativo, habilitado |
| Quicksilver        | component-critical + component-magic_resist     | crowd_control_immunity / combat_start; attack_speed_stacks / periodic    | effect-1: 140 ticks, independent; effect-2: 140 ticks, add              | Operativo, habilitado |
| Deathblade         | component-ad + component-ad                     | damage_amp / combat_start                                                | effect-1: combate, independent                                          | Operativo, habilitado |
| WarmogsArmor       | component-health + component-health             | Estadísticas efectivas                                                   | Hasta final de combate; no deriva al recalcular                         | Operativo, habilitado |
| StatikkShiv        | component-attack_speed + component-mana         | chain_magic / attack_release                                             | effect-1: 50 ticks, nonstacking_debuff                                  | Operativo, habilitado |
| HextechGunblade    | component-ad + component-ap                     | omnivamp / damage_dealt                                                  | effect-1: combate, independent                                          | Operativo, habilitado |

36/36 objetos operativos y habilitados en `f0p8c-1`. Ningún objeto P8B se habilita retroactivamente.

## Pruebas transversales

- 36 recetas y políticas de duplicación; 36 replays dobles con todos los eventos y snapshots validados.
- Escudos, umbrales letales/no letales, sobrecuración, herida, críticos, quemadura, auras, castigo, proyectiles y acumulaciones con valores numéricos.
- Expiración real del motor para ventanas; dos fuentes, dos copias, una señal y ninguna recursión.
- 30 combinaciones de semilla/ronda para objetos aleatorios; exclusión, identidad y slots.
- 64 secuencias de conservación con fallos atómicos, fabricación/equipamiento/venta; fusión de estrellas con guantes de tres ranuras.
- DOLEA, VARGAS y JARAMILLO con tres objetos y fuente de eliminación única.
- Restore y codec para 2/3/4 jugadores; corrupción/versión/límites; hashes históricos literales.
- PostgreSQL + SIGKILL para 2/3/4; comparación con partida sin interrupción, reconexión autenticada y liquidación idempotente.
- Reproducción 1×/2× a 30/60/144 FPS y espectadores; 240 muestras de formación completa.

Los 1004 tests anteriores se mantienen. Ver VALIDATION y F0_P8C_REPORT para resultados del cierre.
