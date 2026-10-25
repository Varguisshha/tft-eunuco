# Reconexión autenticada — F0-P7D.1

La recuperación existe únicamente mientras vive el mismo proceso Node. No hay Redis, persistencia del estado competitivo, despliegue ni recuperación después de reiniciar el servidor. El motor de combate, balance, economía y reglas competitivas no cambian.

## Identidades y autoridad

| Identificador       | Propietario y función                                                 |
| ------------------- | --------------------------------------------------------------------- |
| UUID Supabase       | Lo obtiene `verifyIdentity`, nunca una opción enviada por el cliente. |
| Participante        | UUID estable dentro de una partida; conserva estado y recibos.        |
| Partida             | `roomId` de Colyseus; localiza estado, no concede acceso.             |
| Conexión            | Nuevo `sessionId` de Colyseus en cada entrada autenticada.            |
| Generación          | Entero creciente del participante; empieza en 1.                      |
| Ronda, fase y duelo | IDs autoritativos existentes, conservados durante el retorno.         |

Cada `joinById` vuelve a pasar por `static onAuth`: `getUser`, email confirmado, `getClaims` no caducado, RPC `player_session_active` y perfil propio. El roster privado congelado comprueba pertenencia. No se confía en códigos, nombres, UUID ni snapshots remitidos por el navegador. No se emite una nueva credencial de recuperación: se reutiliza el access token gestionado por Supabase; no se persiste otro secreto.

`resume(sessionId, verifiedUUID)` cambia sincrónicamente el socket propietario e incrementa generación. Inmediatamente se borran las credenciales y readiness del socket antiguo y se cierra con 4002. El callback tardío de su desconexión no encuentra al participante bajo ese socket y no lo marca offline. Cada mensaje competitivo valida credencial, conexión actual y fase; un socket viejo no puede recuperar autoridad enviando una generación o UUID. La generación se informa en el handshake; el identificador de conexión del contrato existente cumple la exclusión en los comandos. El cliente ignora callbacks de objetos Room sustituidos.

## Transporte y límites

Colyseus core 0.18.23 / SDK 0.18.6 ofrecen `allowReconnection` y reconexión por token del SDK. No se habilitan: la entrada fresca autenticada permite recuperar tras cerrar una pestaña y revalidar revocación sin convertir un token de transporte en credencial alternativa. Referencias: [autenticación de salas](https://docs.colyseus.io/auth/room), implementación instalada de `MatchMaker.joinById` y `Room.allowReconnection`.

La sala privada permanece privada y no se bloquea al completar el roster. Tiene hasta 16 plazas **de transporte** para permitir sustituciones y reservas pendientes; el roster y `AuthoritativeMatch.capacity` siguen limitados a 2–4 participantes. Un extraño no recibe snapshot ni participa aunque conozca `roomId`. Las reservas de Colyseus y los límites de mensajes continúan aplicándose. No hay una cuota global nueva contra abuso de matchmaking; es una limitación antes de exposición pública, que no se realiza en esta fase.

`autoDispose=false`; estar sin sockets no destruye una partida. Se conserva el límite duro de una hora desde creación y cinco minutos tras finalización (lo que ocurra primero). Inicio incompleto: 25 segundos. Lobby en espera: ausencia de 30 segundos y expiración de 15 minutos según reglas anteriores. Durante transición la ausencia no cancela inmediatamente: mantiene el plazo original de 25 segundos. En partida la pertenencia se conserva hasta abandono voluntario o destrucción. Ningún límite se amplía por reconectar.

## Recuperación por fase

- **Preparación:** snapshot privado actual con tienda, bloqueo, oro, XP, nivel, unidades, formación y deadline original. La ausencia no ejecuta compras. Un comando de fase vencida se rechaza.
- **Combate:** misma traza calculada, `combatId`, duelo y perspectiva propia. `getPlaybackMs` usa tiempo estimado del servidor menos `phaseStart`, limitado al tick final más 600 ms. `CombatPlayback.seek` muestrea snapshots de 100 ms y eventos alcanzados: posiciones, vida, maná, escudos, estados, acumulaciones, muertes, proyectiles y cues se reconstruyen sin simular. Los eventos de feedback conservan sus ventanas existentes; no se repite toda la historia visual.
- **Resolución:** estado ya liquidado, resultado y tiempo restante. La conexión no invoca recompensas ni daño.
- **Eliminado:** mismo puesto, inventario final y bloqueo competitivo. Conserva selección de duelo y secuencia de espectador; solo recibe frames ya alcanzados, sin RNG ni traza futura de vivos. Sigue pudiendo cambiar de duelo.
- **Final:** `finalResults` inmutable retenido; no se crea otra partida. Si expiró, error de sala inexistente (522 en Colyseus 0.18), sin prometer recuperación.

Los snapshots incluyen la conexión pública de cada participante. El reloj sigue durante ausencia, aunque todos estén desconectados. La simulación y liquidación dependen del servidor, nunca de los ACK o del renderer.

## Reintentos y presentación

La reconexión automática nativa sigue desactivada. `RemoteCoordinator` reintenta hasta cinco veces: 750, 1500, 3000, 6000 y 12000 ms, con variación acotada ±15 %. Cada intento utiliza el token más reciente disponible. No se reenvía ninguna intención pendiente. Un candidato recibe snapshot antes de sustituir la conexión visual; un candidato que termine después de cancelar se cierra.

Al agotar la serie aparece Reintentar (nueva serie limitada). 401/4001 detienen por sesión no válida; 403 por acceso; 4002 por sustitución; 522 por sala ausente. El mensaje de sesión combina «caducada o cerrada»: no se inventa una distinción que el verificador actual no expone. Los errores transitorios usan backoff. El gateway tiene presupuesto de cinco reintentos por montaje, renovable manualmente. Desmontaje por logout/cambio de UUID cancela timers y sockets; abandono voluntario cancela la recuperación del combate y elimina pertenencia al recuperar el gateway si estaba caído.

Aviso compacto con progreso por intento, sin porcentaje ficticio. Confirmación de 3,5 s y retirada real del DOM. Foco lima y marco azul del sistema existente. El HUD, los sprites y la arena se conservan.

## Seguridad e idempotencia

Se mantienen secuencias y caché de recibos del participante. `resume_accepted` comunica el siguiente número para que el cliente nuevo no reinicie en cero. Nunca se reproduce la compra cuyo ACK se perdió: el snapshot explica si se aplicó. Reloj y ledger de liquidaciones no se reinician. Una cuenta nueva no puede resucitar, tomar otra perspectiva, obtener tiendas ajenas ni crear una segunda plaza.

La revisión periódica sigue a 5 s en gateway y 15 s en partida; no significa revocación instantánea. Refrescar Supabase manda `authenticate` a ambos sockets y exige el mismo UUID. La retirada de conexión anterior es sincrónica dentro de la autoridad, aunque su cierre físico tarde.


## F0-P7D.2 — persistencia autoritativa (2026-10-25)

La reentrada autenticada funciona también después de reiniciar Node, conservando Match UUID y roster. service_status version 1 informa disponibilidad de persistencia; error congela reloj/reproducción y bloquea acciones. Se mantiene la sustitución de conexión y el filtrado de perspectiva.

Detalle vigente: [arquitectura](PERSISTENCE_ARCHITECTURE.md), [recuperación](MATCH_RECOVERY.md) y [operación](PERSISTENCE_OPERATIONS.md). Esta sección sustituye las limitaciones históricas de persistencia anteriores para el servidor normal.
