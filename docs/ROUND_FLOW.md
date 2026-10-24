# Actualización F0-P7A

Online: dos conexiones → inicio explícito → preparación30s → una simulación servidor → reproducción tickFinal×100ms+600ms → liquidación única → resolución5s → siguiente ronda. Finaliza si cualquiera llega a0. La política local descrita abajo permanece local.

Véase [arquitectura multijugador](MULTIPLAYER_ARCHITECTURE.md), [protocolo](SERVER_PROTOCOL.md) y [partida autoritativa](AUTHORITATIVE_MATCH.md). Las afirmaciones históricas «servidor no implementado» de las secciones inferiores quedan superadas por esta actualización.

---

# Flujo vigente de rondas — F0-P5

La Partida local usa `LocalMatchCoordinator` y un reloj independiente de React/Phaser. La Arena mantiene `BoardSession` manual y no participa en la economía ni en los guardados automáticos.

| Fase temporal | Entrada                               | Edición                | Salida                                  |
| ------------- | ------------------------------------- | ---------------------- | --------------------------------------- |
| not_started   | Crear o recuperar partida preparada   | Cerrada                | Inicio explícito                        |
| preparation   | Inicio / nueva ronda                  | Abierta hasta deadline | 30 s, inicio automático                 |
| combat        | Captura de formación y una simulación | Cerrada                | `combat_end` reproducido + cola de600ms |
| resolution    | Pago único ya aplicado                | Cerrada                | 5 s, nueva preparación                  |
| finished      | Vargas llega a0 tras liquidar         | Cerrada                | Nueva partida elegida por usuario       |

En combate se mantienen 100ms/tick, normal0–30s, Overtime30–45s y cierre anticipado por eliminación. La cola visual no prolonga la simulación. El resultado precalculado no aparece en el HUD hasta terminar la reproducción. La preparación vacía se resuelve como derrota; no espera indefinidamente ni realiza compras automáticas.

La captura, recompensa, daño, XP, racha y tienda usan el motor económico anterior. `RoundAuthority` retiene la traza y se la entrega a la liquidación existente; no vuelve a simular en P5. `start_combat_auto` es un comando interno que permite formación vacía; los intentos del jugador no pueden iniciar/resolver/avanzar rondas. La ruta manual histórica sigue disponible para tests y migraciones.

El envoltorio temporal versionado distingue preparada, activa, pausada en desarrollo, recuperada y finalizada. El estado económico interno mantiene su forma histórica para evitar migraciones destructivas. `finished` detiene el ciclo y conserva la liquidación final; el rival Florin no representa una clasificación real.

El host pertenece a la vida de la sesión en App, no a la escena. Navegar a Arena no deja abierto indefinidamente un plazo de preparación. Los comandos incluyen fase y revisión; se comprueba el tiempo al recibirlos. Un callback atrasado hace una transición, nunca recupera varias rondas de golpe.

Al cerrar, se guarda el restante; al volver no se descuentan horas de ausencia. Reproducción, trazas y IDs se restauran sin generar pagos. Los guardados P3.1/P4/P4.1 se migran explícitamente al continuar y su clave anterior se conserva. P3 previo a Overtime se identifica y mantiene separado.

La API económica original sigue ofreciendo las operaciones buy/sell/reroll/lock/XP/move/swap, con secuencia/revisión y transacciones validadas. El coordinador añade la ventana temporal sin duplicar fórmulas, pool ni historial.

Detalles completos: [MATCH_CLOCK_SPEC.md](MATCH_CLOCK_SPEC.md), [AUTOMATIC_ROUNDS.md](AUTOMATIC_ROUNDS.md), [ECONOMY_SPEC.md](ECONOMY_SPEC.md). La descripción manual de P3/P3.1 es histórica y queda reemplazada en la aplicación local por este flujo.
