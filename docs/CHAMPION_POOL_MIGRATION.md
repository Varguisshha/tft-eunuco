# Adopción del pool versionado

Base: `9c0d598d4e981d52dfe7d709d0026c6dc3842008`. Rama: `codex/domain-and-champion-pool`.

## Contabilidad auditada

Para cada identidad:

`máximo = stock libre + ofertas reservadas + suma de copias de unidades de todos los jugadores`.

Una oferta reserva físicamente una copia al generarse. Comprar transfiere esa reserva a una unidad, sin un segundo débito. Renovar devuelve las ofertas anteriores y reserva las nuevas mediante el RNG existente. Una tienda bloqueada conserva sus reservas entre rondas. Los pesos se limitan al stock disponible, sin ofrecer identidades agotadas.

Una unidad 1★/2★/3★ representa 1/3/9 copias. Fusionar conserva ese compromiso, incluso con cascadas y ubicaciones mixtas. Vender devuelve exactamente esas copias. Eliminar devuelve unidades y ofertas una sola vez mediante `poolReleased`; la recuperación conserva este marcador. El ganador sigue la política histórica de liquidación, sin añadir una devolución nueva.

## Persistencia y adopción

No hay migración SQL ni actualización de partidas guardadas. Los objetos históricos de configuración y sus fórmulas de fingerprint permanecen intactos. `snapshotConfig` resuelve separadamente el nuevo fingerprint, y el codec admite sus replays comprimidos con las mismas verificaciones de integridad. Restaurar usa la configuración de la partida, su pool, reservas, recibos y RNG guardados; nunca el valor por defecto actual.

Las partidas nuevas de App y del protocolo multijugador moderno de esta rama usan la nueva configuración. El protocolo antiguo y los diagnósticos históricos mantienen sus versiones explícitas. Esto se valida LOCAL: ningún código ni variable económica se publica en Railway.

Para integrar P10A posteriormente: conservar este registro histórico, crear una nueva combinación de catálogo jugable y economía con fingerprint propio, probar ausencia de borradores y revisar las probabilidades antes de habilitar costes 4/5. No reutilizar un fingerprint de esta rama con un roster distinto.

## Validación

`apps/server/src/champion-pool.test.ts` comprueba tabla, identidad, reservas de 2/3/4 jugadores, compra, recibos repetidos, restauración, bloqueo/refresh, ventas 1/2/3★, cascada de JARAMILLO, agotamiento de VARGAS independiente de FLORIN y partida de cuatro jugadores con semilla fijada hasta eliminaciones.

El escenario PostgreSQL de cuatro jugadores de `persistence/crash.test.ts` se ejecuta también con `pool`: SIGKILL antes/después del commit, reconexión, replays, recompensas hasta ronda 6 y comparación contra control continuo. Los escenarios históricos se mantienen. Resultados finales: véase VALIDATION.
