# Fin competitivo — F0-P7C.3

Después de la liquidación global y las eliminaciones simultáneas: dos o más vivos continúan; uno vivo gana; cero vivos terminan con el criterio de clasificación, admitiendo primer puesto compartido.

La elegibilidad de emparejamiento usa exclusivamente vivos. Cuatro generan dos duelos humanos, tres un humano y un fantasma de un participante vivo, dos un duelo directo. El historial previo se conserva y no se consumen copias por fantasmas. Ni los eliminados ni sus formaciones son candidatos nuevos.

El final entra en fase `finished` con reloj detenido. No hay ronda siguiente, nuevas tiendas, ingresos ni acciones económicas. Se construye una única copia de resultados con `completionId = matchId/finished/round`. Sus datos no se vuelven a calcular por desconexiones, ACK, sync o pulsos posteriores. Los consumidores obtienen copias; no pueden mutar el registro almacenado.

`MatchRoom` emite `final_results` una vez por conexión preparada. El mismo resultado permanece en los snapshots, por lo que una repetición de sync permite leerlo sin volver a publicar el evento. La limpieza final se programa una vez a cinco minutos (sigue existiendo el límite general de una hora de sala).

La pantalla final muestra ganador(es), avatar, clasificación completa, puesto propio, HP final, ronda de eliminación y rondas jugadas. El HUD de juego deja de montarse para evitar controles económicos detrás de resultados. Volver al menú abandona la sala y el combate. Un primer puesto compartido se identifica explícitamente.

Estado en memoria solamente. No hay persistencia tras reinicio, reconexión completa, despliegue, premios, temporada o ranking permanente. F0-P7D no iniciada.


## F0-P7D.1 — Recuperación autenticada (25/10/2026)

Todos los sockets pueden desaparecer sin destruir la partida privada. La pantalla final sigue recuperable mediante identidad y pertenencia durante cinco minutos desde finalización, sujeta al límite duro de una hora desde creación. El callback de desconexión no repite liquidaciones ni crea otra partida. Expirado el estado, joinById rechaza sala inexistente; reiniciar Node tampoco permite recuperación.

Esta sección sustituye las limitaciones históricas de «sin reconexión». Especificación: [RECONNECTION_SPEC.md](RECONNECTION_SPEC.md). Flujo, contratos y límites: [SESSION_RECOVERY.md](SESSION_RECOVERY.md).
