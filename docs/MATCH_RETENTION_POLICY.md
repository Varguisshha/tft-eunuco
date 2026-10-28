# F0-P9A.1 — Retención de partidas

## Contrato

`TFT_FINAL_RETENTION_MS` configura la ventana final; valor predeterminado **300000 ms (cinco minutos)**. En desarrollo, privado y producción se admiten enteros entre 30000 y 3600000 ms; el laboratorio `diagnostic` permite desde 1000 ms para probar vencimientos. Valores inválidos impiden arrancar. No es un temporizador competitivo ni modifica preparación, combate, Overtime o resolución.

El primer commit final guarda `expiresAt = min(vencimiento activo, ahora + ventana)`. Reconectar, reiniciar y cambiar la configuración no amplían el vencimiento ya persistido. El límite activo de una hora permanece. Restaurar un registro caducado o cerrado no crea una sala, incluso si un adaptador lo entrega por error.

Dentro de la ventana se conserva el resultado, la clasificación, los recibos y el replay canónico necesario para una reconexión autenticada del roster congelado. También se conserva si todos se desconectan. Al vencer se cierran los sockets y se libera la sala, incluidos timers y cachés de entrega. El cliente que ya recibió los resultados conserva su representación; la ventana no promete una conexión eterna de la pantalla final.

## Estado volátil y durable

Eliminar la sala **no borra el registro PostgreSQL** ni lo transforma en cerrado si contiene un final confirmado. `authority_load` ya filtra vencimientos; el servidor añade una comprobación defensiva. El mantenimiento durable existente conserva su autorización y procedimiento; esta fase no ejecuta limpieza remota, cambia cuentas ni introduce migraciones.

El final confirmado no necesita checkpoints periódicos ni uno redundante al apagar. Las conexiones y solicitudes que sí cambian estado siguen pasando por el commit antes de publicar. En caso de fallo o respuesta ambigua no se sobrescribe el último documento; sigue el mecanismo existente de reintento/fail-closed. Una caída durante una partida activa sigue recuperando el último checkpoint confirmado.

## Recursos

- El callback de simulación de 50 ms continúa activando el reloj de Colyseus para autenticación y vencimiento, pero retorna inmediatamente en un final disponible. No se detiene el reloj que debe cerrar la sala.
- La puerta de inicio privado se desactiva después de iniciar; una restauración iniciada no espera de nuevo al roster.
- Tras hidratar la autoridad se elimina `permit.saved`. El permiso conserva exclusivamente membresía, callbacks y metadatos necesarios.
- Al disponer se vacían credenciales, ready y cachés de entrega. Colyseus elimina registro, intervalos y timers propios. La prueba conserva una referencia temporal al objeto para verificar estas invariantes sin depender de RSS.
- El barrido de lobby desconectado tiene un timer `unref` de 31 segundos; es acotado y no mantiene vivo el proceso. El laboratorio espera su vencimiento al medir recursos definitivamente liberados.

## Verificación

`retention-network.test.ts` restaura un final, verifica ausencia de escritura inicial/periódica, reconecta y compara resultado, comprueba deadline original, expiración con cliente conectado, eliminación del registro de sala, timers/cachés vacíos y rechazo posterior. Las pruebas durables verifican igualdad de replay, retención de registro y cierre bajo commit ambiguo. La configuración tiene límites comprobados.

Mediciones y alcance: [memoria](SERVER_MEMORY_PROFILE.md), [rendimiento](SERVER_PERFORMANCE_BASELINE.md).


## F0-P9B-R0 — Railway Hobby

Railway conserva 300000 ms y todos los contratos anteriores. Un final retenido cuenta contra el cupo de una partida del piloto. El permiso de autoridad tiene su propio plazo de 60 s, independiente de la retención de resultados; recuperar autoridad no renueva expiresAt de la partida.

[Despliegue](RAILWAY_DEPLOYMENT.md) · [Variables](RAILWAY_ENVIRONMENT.md) · [Operación](RAILWAY_OPERATIONS.md) · [Preflight](RAILWAY_PREFLIGHT.md).

El callback de expiración vuelve a comprobar el deadline de pared antes de desconectar. Si el reloj de sala lo dispara anticipadamente, reprograma únicamente el tiempo restante: evita una escritura final extra de onLeave sin extender la ventana durable. Cubierto por `remote/retention-deadline.test.ts` y el test de red anterior sin modificar.
