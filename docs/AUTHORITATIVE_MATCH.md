# Estado vigente — F0-P7C.2 (25/10/2026)

La autoridad de F0-P7C.1 se reutiliza sin cambios de combate, economía o rotación. private_match ya activa su capacidad real de 2–4. El frontend muestra HP, nivel, conexión y posición provisional enviados por el servidor. El resultado visual no liquida nada: awaiting_round espera el cierre global. La sesión sigue en memoria; no hay eliminación competitiva completa, espectadores ni clasificación definitiva.

[Informe, evidencias y limitaciones](MULTIPLAYER_4P_INTEGRATION.md). Las restricciones de capacidad dos que figuran debajo pertenecen al histórico y quedan sustituidas por este estado.

---

> **Estado F0-P7C.1 (25/10/2026):** motor de rondas para 2–4, lobby real limitado a dos. [Informe](F0_P7C1_REPORT.md). Los apartados de fases anteriores son históricos.

# Partida autoritativa F0-P7A

## Estado y transacciones

AuthoritativeMatch tiene dos estados económicos, con tiendas/RNG independientes; ambos referencian lógicamente un único pool central. Después de cada transacción se sincroniza el valor del pool a los estados de trabajo y se valida:

`disponibles + reservas de ambas tiendas + copias de ambos inventarios = copias iniciales`

Una oferta ya reserva una copia. Comprar mueve reserva a inventario sin descontar dos veces; fusionar conserva1/3/9 copias; vender devuelve todas; renovar libera reservas antiguas antes de extraer nuevas. El contexto externalCopies se calcula internamente desde el otro jugador, nunca desde red. Los IDs se separan por prefijo Vargas/Florin. Las fórmulas económicas y sus cifras no cambian.

## Reloj y combate

MatchClock reutiliza fuente monotónica performance.now del proceso. Preparación30s, resolución5s. El servidor congela las dos formaciones y bancos al vencer preparación, genera semilla propia, construye input con catálogo f0p6b3 y ejecuta una sola llamada runCombat. Sus resultados no proceden de los clientes.

El deadline de reproducción remota es `inicio + tickFinal×100ms +600ms`. Hasta45s lógicos, más la cola existente. A diferencia de la política **local** de limitar delta100ms para no saltar animaciones, el remoto liquida por tiempo servidor y no espera al renderer. Esta diferencia es deliberada y no cambia la simulación ni sus450ticks.

La liquidación aplica la función económica existente a ambas perspectivas de la misma traza; usa estrellas reales de supervivientes. Los dos resultados se calculan antes de publicarse. settlementId identifica el pago de la ronda. Una segunda llamada no vuelve a cobrar. Si cualquiera llega a cero termina; de otro modo, resolución5s y renovación de cada tienda que no esté bloqueada. Desconexión no pausa ni da autoridad DEV.

## Compatibilidad

Los parámetros nuevos de validación/transacción son optativos y la ruta local conserva sus valores históricos. No cambian schemas de guardado, claves localStorage, balance, catálogo, sprites ni CSS del HUD. Los nuevos mensajes usan su versión propia. La proyección remota usa el mismo contrato de lectura para facilitar reutilización incremental, pero no es válida como guardado local y no contiene el pool ni las semillas privadas.

## Seguridad y alcance

La autoridad solo acepta las siete intenciones permitidas. No hay rutas para modificar oro, nivel arbitrario, vida, seed, ganador o clock. Proporcionar una sesión ajena no autentica: debe coincidir con la del socket. Las acciones sobre ofertas/unidades rivales se rechazan. Sala llena se bloquea y no admite tercer jugador ni sustitución. Sin cuentas, HTTPS público, persistencia, hosting, espectadores, matchmaking público o reconexión completa.

## F0-P7C.1 — Motor de rondas 2–4

El pool/externalCopies se extiende a todos los humanos. El motor coordina dos duelos para 3/4, captura fantasmas sin inventario, valida todas las liquidaciones antes de commit y mantiene ledgers por humano. La proyección nueva omite la contraparte health.north histórica: las vidas públicas proceden de los estados propios.

Detalles: [emparejamientos](MATCHMAKING_2_TO_4.md), [fantasmas](GHOST_COMBAT.md), [duelos paralelos](PARALLEL_COMBATS.md).


## F0-P7C.3 — ciclo competitivo

P7C.3 sustituye el corte provisional al primer HP cero: ahora continúa con los supervivientes hasta quedar uno o ninguno. Eliminación irreversible al cierre global, inventario liberado una vez y final inmutable. No modifica simulación, fórmulas ni balance. [Reglas](ELIMINATION_RULES.md), [puestos](FINAL_STANDINGS.md), [final](MATCH_COMPLETION.md).


## F0-P7D.2 — persistencia autoritativa (2026-10-25)

exportState/restore conserva economía, pool, RNG, duelos canónicos, recibos, liquidaciones, eliminaciones y final. La restauración valida versiones y conservación, sin ejecutar otra simulación. Las acciones críticas se aplican a un candidato y se confirman tras commit SQL.

Detalle vigente: [arquitectura](PERSISTENCE_ARCHITECTURE.md), [recuperación](MATCH_RECOVERY.md) y [operación](PERSISTENCE_OPERATIONS.md). Esta sección sustituye las limitaciones históricas de persistencia anteriores para el servidor normal.
