# Combates simultáneos y liquidación — F0-P7C.1

## Coordinación

Una AuthoritativeMatch con capacidad tres/cuatro contiene dos registros Duel, cada uno con pairing, entrada, replay, resultado, tick final y estado de liquidación. Cada simulación sigue siendo de dos equipos y usa el motor determinista sin modificaciones. Para cuatro hay dos duelos humanos; para tres, humano + fantasma.

Las dos llamadas runCombat se calculan síncronamente en el proceso Node, y se reproducen simultáneamente dentro de una fase común. «Simultáneo» significa mismo comienzo y reloj global, no paralelismo de CPU ni worker threads. No se mezclan cuatro equipos sobre un tablero.

## Reloj

- Preparación: 30 000ms.
- Cada simulación: hasta 450 ticks de 100ms; Overtime desde 300 según reglas existentes.
- Deadline global de Combat: `phaseStart + max(tickFinal de todos los duelos) × 100 + 600ms`.
- Resolución: 5 000ms.

Un duelo corto queda en `awaiting_round` al alcanzar su final +600ms. El servidor publica ese estado, pero no permite compras ni paga aún. La liquidación conjunta ocurre cuando todos terminaron su ventana de reproducción. El límite global es 45 600ms, de los cuales los últimos 600ms son exclusivamente cola visual. Ningún ACK del navegador ni velocidad de animación altera esos plazos. En cada pulso vencido se realiza una transición; no se recuperan múltiples rondas ausentes.

## Liquidación atómica

Se prepara un resultado económico validado por cada humano desde la perspectiva south de su duelo; el lado north se invierte solo para reutilizar el adaptador económico. No se vuelve a simular. Todos los estados y registros se validan antes de reemplazar los estados activos.

ID global histórico: `matchId/round/N/settlement`. ID individual: `IDglobal/UUID`. Cada registro incluye jugador, ronda, combatId, outcome, daño aplicado, oro acreditado y XP. La guarda de settlementId y el avance de fase impiden repetir el pago. Los requests de usuario conservan requestId/secuencia/revisión; ningún cliente tiene una intención resolve_round.

El propietario fantasma se liquida por su duelo humano; el receptor por su duelo fantasma. Solo hay tantas liquidaciones como humanos. Los cambios de fase y llamadas repetidas no agregan daño, oro o XP adicionales. Se conservan los importes, rachas e intereses del motor existente.

## Pool y privacidad

Un pool central; externalCopies suma inventarios y ofertas reservadas de **todos** los otros humanos. Cada transacción económica se ejecuta síncronamente y replica el pool actualizado a los estados de trabajo. Las cuatro tiendas reservan copias reales; comprar no vuelve a descontar, fusionar conserva 1/3/9 y vender devuelve sus copias. El fantasma no participa en la suma. Se valida conservación después de comandos, pagos y renovación de ronda.

Cada socket recibe su snapshot privado y su DuelMessage; no existe broadcast de todas las trazas. Las coordenadas permanecen canónicas. `side` y pairing indican la perspectiva del receptor; un cliente futuro debe rotar solo presentación cuando sea north. Los clientes de dos y la geometría de Mar de Cristal siguen intactos.

## Límites de esta fase

El motor detiene el escenario completo cuando el primer humano llega a cero, como salvaguarda coherente con el comportamiento anterior de dos. No elimina, no reempareja sobrevivientes ni asigna campeón/puestos finales; `eliminated` permanece false y la clasificación es provisional. La eliminación competitiva y la continuación del roster reducido quedan para F0-P7C.3. Las rondas de diagnóstico previas a ese límite avanzan automáticamente.

No hay persistencia de partida, recuperación tras reinicio, reconexión completa ni espectadores. No se ha adaptado el HUD a tres/cuatro ni se ha habilitado ese inicio en lobby. P7C.2 deberá integrar esas vistas y la transición real usando estos contratos, manteniendo la separación de autoridad.
