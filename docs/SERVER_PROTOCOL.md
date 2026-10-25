# Estado vigente — F0-P7C.2 (25/10/2026)

Todas las private_match de 2–4 usan RoundSnapshotSchema y DuelMessageSchema, versión f0p7c1-1; test_match de dos conserva el protocolo anterior. El cliente acepta ambas variantes, valida matchId/combatId/roster del duelo/ronda/lado antes de reproducir y admite llegada de traza antes o después del snapshot. Mantiene la identidad del replay entre revisiones para no reiniciarlo. Cada socket recibe su duelo: el propietario de un fantasma no es receptor de ese duelo por ser propietario. Las tiendas ajenas, pool interno y RNG económico no se publican. start manual no inicia private_match.

[Informe, evidencias y limitaciones](MULTIPLAYER_4P_INTEGRATION.md). Las restricciones de capacidad dos que figuran debajo pertenecen al histórico y quedan sustituidas por este estado.

---

> **Estado F0-P7C.1 (25/10/2026):** motor de rondas para 2–4, lobby real limitado a dos. [Informe](F0_P7C1_REPORT.md). Los apartados de fases anteriores son históricos.

> **Estado actual F0-P7B.2 (24/10/2026):** salas privadas implementadas; partidas funcionales de dos. [Informe](F0_P7B2_REPORT.md). Los apartados anteriores de fases se conservan como histórico.

# Actualización F0-P7B.1

Versión f0p7b1-1. Matchmaking usa client.auth.token; static onAuth devuelve identidad validada mediante Supabase y perfil. authenticate renueva el token del mismo UUID; cambio de usuario/caducidad/revocación cierran socket. snapshots jamás contienen token/email. name pasa de enum Vargas/Florin a texto validado (máximo32). Comandos, economía y reloj mantienen autoridad previa.

Ver [AUTH_SYSTEM.md](AUTH_SYSTEM.md), [PLAYER_PROFILES.md](PLAYER_PROFILES.md), [SUPABASE_SETUP.md](SUPABASE_SETUP.md) y [PRIVATE_REGISTRATION.md](PRIVATE_REGISTRATION.md). El contenido anterior se conserva como histórico.

---

# Protocolo de servidor f0p7a-1

Transporte Colyseus 0.18/WebSocket, sala `test_match`. Schemas en `packages/shared/src/network.ts`.

| Dirección | Mensaje        | Contrato y efecto                                                                                                              |
| --------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| C→S       | command        | version, sessionId, requestId, sequence, matchId, phaseId, action                                                              |
| C→S       | start          | null; solo participante conectado, dos conectados y not_started                                                                |
| C→S       | sync           | null; habilita recepción y devuelve proyección privada actual                                                                  |
| C→S       | ping           | número finito no negativo; eco temporal sin mutar reglas                                                                       |
| S→C       | state_snapshot | versión/revisión global, serverTime, playerId, jugadores públicos, reloj, own privado, purchaseErrors, combatId y settlementId |
| S→C       | combat_trace   | versión, matchId, combatId, startedAt, replay validado (input, snapshots, eventos y resultado)                                 |
| S→C       | action_receipt | requestId, sequence, accepted, reason, revision global                                                                         |
| S→C       | protocol_error | rechazo de mensaje desconocido o inicio inválido                                                                               |
| S→C       | pong           | echo y serverTime monotónico                                                                                                   |

No se implementa state_patch: snapshots pequeños tras transacciones/transiciones, y una traza por combate/receptor, son suficientes para dos jugadores. No se transmiten 60 fotogramas/s. La traza no se reenvía con cada snapshot.

## Comandos

Action incluye seq y expectedRevision de la economía individual. Solo buy_unit, sell_unit, reroll_shop, lock_shop, buy_xp, move_unit y swap_units. Schemas strict: no se aceptan campos adicionales ni NaN, cantidades, oro final, resultados, pausas o estados completos. Identificadores de ofertas/unidades llevan prefijo del participante; se buscan solo en su inventario/tienda. La revisión de otro jugador no invalida una intención propia: ambos comparten pool, pero sus revisiones económicas son distintas.

sequence cuenta solicitudes válidas de una conexión, incluso si se rechazan por fase o regla. requestId conserva respuesta y payload de las últimas128 solicitudes. Una repetición exacta devuelve el mismo recibo sin repetir efectos; mismo ID con otro contenido se rechaza. Fuera de la caché, una secuencia antigua sigue rechazada. Identidad inválida y payload inválido no consumen secuencia.

El servidor comprueba el deadline al recibir cada comando **antes** de aplicarlo, aunque no haya ocurrido el pulso periódico. Una intención de la preparación anterior no se acepta en la siguiente. No hay tolerancia retroactiva ni confianza en timestamps cliente.

## Límites y orden

Máximo4096 bytes por frame entrante y30 mensajes/s por conexión en Colyseus; exceso cierra conexión. Todos los mensajes, incluidos desconocidos, cuentan. Los mensajes de combate salientes pueden ser mayores: incluyen snapshots completos para el reproductor actual. No hay límite HTTP global por IP ni mitigación de ataques distribuidos; el servidor solo escucha loopback.

Callbacks de compra/venta/XP/movimiento son síncronos y transaccionales sobre clones. Recibo seguido de snapshot confirmado. La UI mantiene como máximo una intención pendiente; no aplica cambios optimistas a oro/unidades. Al desconectar se cierra la edición. La interfaz informa rechazos; no garantiza entrega tras cierre ni reintenta como reconexión.

## Validación receptora y reproducción tardía

El cliente valida snapshots, versión, trazas y recibos. Una traza exige CombatBatchSchema, snapshots contiguos desde0, resultado final coherente y un solo combat_end. WebSocket garantiza orden dentro de la conexión. El servidor envía traza antes del snapshot de inicio. No hay lotes fuera de orden ni reconstrucción de huecos implementada; para un transporte fragmentado futuro deberán añadirse esos contratos.

El tiempo se estima con ping/pong usando el punto medio de la muestra de menor RTT. La UI interpola deadline menos tiempo estimado. Si el cliente se suspende o recibe tarde, busca directamente el tick correspondiente; puede omitir cues antiguos, pero conserva HP/eventos/resultado. No prolonga fases. La precisión de LAN/Internet no está garantizada ni probada en P7A.

Ambos sockets reciben la traza canónica idéntica. Florin rota solo la presentación180° e intercambia etiquetas north/south para mantener su mitad jade abajo. No resimula: IDs, orden, ticks y daño son idénticos. reversePerspective es involutivo y se prueba con trazas reales.

## F0-P7B.2 — Salas privadas

Se añade protocolo de lobby `f0p7b2-1` separado del protocolo de partida `f0p7b1-1`. Canal `lobby_action`: create_lobby(capacity), join_lobby(roomCode), set_capacity(capacity), set_ready(readyState), leave_lobby, close_lobby, start_match, sync. Todos llevan version y requestId UUID; Zod strict rechaza campos extra. `lobby_event` contiene version, requestId nullable, error nullable y lobby nullable. El snapshot revisionado representa altas, bajas, preparación, anfitrión y destino: reemplaza eventos parciales y evita aplicar deltas fuera de orden. El emisor identifica al actor; nunca se acepta userId en acciones.

Contratos, operación y ciclo: [PRIVATE_LOBBIES.md](PRIVATE_LOBBIES.md). Seguridad y evidencias: [LOBBY_SECURITY.md](LOBBY_SECURITY.md). Transición: [LOBBY_TO_MATCH.md](LOBBY_TO_MATCH.md).

## F0-P7C.1 — Motor de rondas 2–4

Nuevo protocolo de lectura f0p7c1-1: Pairing/Plan, DuelRecord, PlayerSettlement, RoundSnapshot y DuelMessage. Solo 3/4 diagnósticos usan la lectura nueva; dos conserva f0p7b1-1. Las siete intenciones económicas y el envelope previo no cambian. Sin broadcast de tiendas/trazas ajenas ni semillas maestras.

Detalles: [emparejamientos](MATCHMAKING_2_TO_4.md), [fantasmas](GHOST_COMBAT.md), [duelos paralelos](PARALLEL_COMBATS.md).
