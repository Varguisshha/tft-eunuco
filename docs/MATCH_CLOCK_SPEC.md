# Actualización F0-P7A

Online usa MatchClock monotónico en Node. El servidor liquida por deadline de traza+600ms sin esperar animaciones; los clientes estiman tiempo con ping/pong y buscan el tick vigente. No aplica el límite de delta100ms local. Preparación30s y resolución5s se conservan.

Véase [arquitectura multijugador](MULTIPLAYER_ARCHITECTURE.md), [protocolo](SERVER_PROTOCOL.md) y [partida autoritativa](AUTHORITATIVE_MATCH.md). Las afirmaciones históricas «servidor no implementado» de las secciones inferiores quedan superadas por esta actualización.

---

# Reloj de partida — F0-P5

## Autoridad y contratos

`packages/shared/src/match-clock.ts` define `CLOCK_RULES = f0p5-1`, `AutomaticSaveSchema` versión 1, `PhaseSnapshot` y el puerto `MatchCoordinator`. Las reglas económicas y de combate continúan en `f0p3.1-1`; el catálogo sigue siendo `f0p4.1`. El envoltorio temporal tiene versión propia para conservar los contratos históricos.

Cada snapshot lleva `matchId`, `roundId`, `phaseId`, `phaseSequence`, `transitionId`, `phaseStart`, `phaseDeadline`, `phaseDuration`, `remainingMs`, `currentPhase`, `clockState` y `rulesVersion`. IDs: UUID de partida; `${matchId}/round/N`, `/phase/N`, `/transition/N`; liquidación `${roundId}/settlement`. Son identidades de secuencia, no marcas de tiempo ni credenciales.

`TimedCommand` vincula el intento a partida, fase y revisión económica. El coordinador comprueba el plazo al recibirlo y rechaza comandos de fase antiguos o manuales. No acepta del HUD ni ganador, ni tiempo cliente, ni oro, ni un comando de liquidación.

El puerto sustituible ofrece vistas de estado/reloj/traza/posición, suscripción, inicio e intentos. El adaptador remoto futuro puede recibir snapshots de servidor y enviar intenciones conservando esa frontera. El host, la migración y las herramientas actuales son adaptadores locales explícitos. No hay servidor ni dependencia de red añadidos.

## Cuatro tiempos diferentes

| Tiempo                   | Fuente y propietario                                                           | Uso                                               |
| ------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------- |
| Preparación / resolución | `MatchClock`, `TimeSource.now()` inyectable; navegador usa `performance.now()` | Autoridad de edición y transición por deadline    |
| Simulación               | Motor existente, tick fijo de 100 ms                                           | Eventos, daño, Overtime y resultado deterministas |
| Reproducción             | Coordinador local, posición acumulada desde diferencias monotónicas            | Muestrear la traza sin volver a simular           |
| Presentación             | `PhaseClock` y `CombatPlayback.frame()`                                        | Solo mostrar segundos, fase, sprites y efectos    |

Preparación: **30 000 ms**. Resolución: **5 000 ms**. Combate lógico: hasta **45 000 ms**, normal antes del tick 300 y Overtime desde 300 hasta 450. Tras `combat_end` se mantienen **600 ms de cola visual** para impactos/muerte; esos 600 ms no contienen más turnos ni daño. Una victoria temprana pasa a resolución tras su propio tick final y esa cola, sin esperar al máximo.

El deadline de combate describe su ventana máxima; **no dispara su liquidación**. El HUD usa posición de reproducción y el resultado llega únicamente cuando esa posición alcanza el final más la cola. El snapshot del reloj de combate y su cuenta máxima de tiempo de pared pueden divergir si la reproducción sufre interrupciones; no se usan como cuenta visual.

## Deadlines e interrupciones

`remaining = max(0, deadline - now)` en fases activas; nunca se resta un segundo por callback. El host hace pulsos nominales de 50 ms, pero no es la autoridad del plazo. Una compra recibida al límite o después se rechaza incluso si no se ejecutó ningún callback del temporizador.

Una preparación vencida inicia un solo combate al siguiente pulso. No hay bucle que recupere varias rondas atrasadas. Una resolución atrasada inicia una preparación completa desde la transición efectiva. Por tanto una pestaña lenta no amplía la ventana de compra y tampoco cobra rondas que nadie ha jugado.

La reproducción admite un máximo de 100 ms por pulso. Esto evita saltar una batalla completa o su muerte final al volver de una pestaña suspendida. Su duración de pared puede ser mayor que 45 s cuando el navegador ralentiza los callbacks. Es una decisión visual local: no modifica la simulación ni su límite de 450 ticks. El adaptador Phaser solo muestrea; salir a la Arena no detiene el host local.

La fuente debe ser finita y no negativa. El reloj limita retrocesos accidentales a su último valor. No utiliza `Date.now()` ni fecha del sistema para calcular recompensas.

## Pausa y recuperación

Estados de reloj: `ready`, `running`, `paused`, `stopped`. `not_started` está preparado pero no permite comprar ni consume tiempo. `finished` está detenido. Una partida normal no ofrece pausa ni aceleración. Solo la partida explícita de desarrollo permite congelar reloj y edición; al reanudar se fija `deadline = now + remaining`.

Al restaurar se conserva el restante y se rebasa al origen monotónico del nuevo proceso. Un desplazamiento lógico asegura inicio no negativo y timestamps coherentes incluso si la aplicación acaba de arrancar. `lastPulse` también se rebasa: la primera actualización no incorpora tiempo de la sesión anterior. Se conserva la posición exacta del combate guardado y el estado de pausa. `recovered` permite distinguir la recuperación del arranque inicial.

## Persistencia

Clave normal: `tft-eunuco-local-f0p5-1`. Clave técnica: `tft-eunuco-dev-f0p5-1`. Se guardan estado económico completo, historial, formación, tienda/pool, semillas, recompensa, ambos ledgers, IDs de liquidación, fase/clock y traza con posición. `snapshot-deltas-v1` almacena el primer snapshot y diferencias de campos sucesivas para no repetir cientos de perfiles de unidad; al decodificar se validan snapshots, orden/rango de eventos, resultado final, fase y liquidaciones.

Los guardados automáticos P5 no vuelven a ejecutar el simulador. El host guarda tras cambios de revisión/fase y, durante la reproducción, como máximo cada 500 ms; fuerza escritura en `pagehide` y cambios de visibilidad. Un cierre abrupto del proceso puede perder hasta el último checkpoint temporal; una escritura fallida se anuncia y deja la sesión en memoria. No se promete persistencia infalible ni sincronización entre ventanas.

La aplicación cerrada no produce tiempo ni ingresos. El lobby requiere **Continuar** para recuperar. Se restaura el último instante guardado, no se resta la ausencia de un reloj civil.

Migración explícita al pulsar Continuar si no existe P5: validar el guardado P3.1/P4/P4.1 con su replay histórico y catálogo original, calcular una vez la traza del combate activo si existe, asignar IDs de liquidación ya pagada, dar 30 s a preparación / 5 s a resolución. Un combate antiguo carece de posición guardada y se recupera desde el inicio; una resolución desde el final. Su clave antigua permanece intacta. Un guardado histórico ya a cero HP y sin combate pendiente termina inmediatamente sin cobrar otra ronda, conservando el contador histórico de ronda aunque hubiera avanzado manualmente. P3 anterior a Overtime permanece separado e identificado como incompatible, sin borrarlo.

## Límites de confianza

Las validaciones detectan inconsistencias, no autentican un navegador ni un archivo contra un atacante. En online, el servidor poseerá reloj, pool, RNG, traza y liquidación; no deberá importar un snapshot cliente como autoridad. Los controles de desarrollo no pertenecen a `MatchCoordinator.submit`. No hay protección multiventana, cuentas, reconexión de red o firma criptográfica en P5.
