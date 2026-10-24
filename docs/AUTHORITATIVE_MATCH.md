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
