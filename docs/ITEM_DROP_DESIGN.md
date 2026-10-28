# Reparto autoritativo de componentes · F0-P8D

## Regla activada

Solo las nuevas partidas privadas modernas con `DROP_ITEMS_ECONOMY_CONFIG` y catálogo `f0p8d-1` reparten al liquidar las rondas 3, 6, 9… Se calculan primero daño y supervivientes. Si quedan menos de dos vivos, la partida termina y no se reparte en esa ronda. Derrota sin eliminación y desconexión temporal conservan el derecho. Un fantasma es una copia de formación, nunca un destinatario.

El sorteo común devuelve 2 con probabilidad 50 % y 3 con probabilidad 50 %. Cada UUID recibe esa cantidad, con tipos independientes, ocho categorías equiprobables, con reposición. No hay protección contra duplicados, premios por victoria, orbes ni encuentros.

## Aleatoriedad e identidad

`ITEM_DROP_POLICY` congela la versión, periodicidad, pesos, orden de categorías, algoritmo y elegibilidad. La autoridad crea y persiste una semilla uint32 exclusiva de recompensas con entropía del servidor. No consume RNG económico, de combate ni emparejamientos.

La identidad de ronda es SHA-256 de JSON `["f0p8d-1", matchId, round]`. `deriveSeed` existente deriva un estado por ronda; las etiquetas `quantity` y `types/UUID` separan sorteos. Se reutiliza `randomUint32` (Mulberry32) del motor. Cantidad: resultado menor que 2^31 → 2, resto → 3. Tipo: módulo 8; 8 divide exactamente 2^32, sin sesgo de módulo. Se recorren UUID ordenados lexicográficamente. La conexión, los comandos y los FPS no intervienen.

Reproducir exige misma identidad de partida, semilla, ronda y UUID; cambiar la identidad de partida cambia el resultado aunque se mantenga la semilla. La semilla real no viaja al cliente: el campo histórico `distributions.seed` lleva cero como marcador en las vistas públicas/privadas de red. No se restaura autoridad desde esas vistas.

## Entrega y transacción

`AuthoritativeMatch.settle` prepara estados candidatos de todos los participantes, calcula elegibles y llama a `grantItemInstances` para cada uno. Solo después de validar todas las entregas publica los estados de la liquidación. Se conserva el ID de concesión común dentro del ledger propio de cada propietario; las instancias siguen `ownerUUID/item/N`. No se crea otra ruta de inventario ni se combina al recibir.

Bandeja de 16: excedentes a pendientes. Los límites existentes rechazan una operación completa antes de publicarla. El journal de reparto admite 1000 rondas, dentro de los límites previos. No se descartan componentes al alcanzar límites.

El registro global contiene partida, ronda, versión, cantidad, elegibles, semillas individuales, tipos, concesiones, instancias y estado `confirmed`. Esa palabra describe el candidato destinado al commit; nunca significa que pueda publicarse antes del éxito de almacenamiento. `DurableMatch` mantiene el candidato privado hasta confirmar la transacción PostgreSQL/CAS. Un fallo no publica recompensas. Un commit ambiguo se reintenta con el mismo documento e identidad. Tras SIGKILL se restaura el último documento duradero.

La liquidación estable y los ledgers impiden duplicar; restauración valida sorteo reproducible, elegibilidad histórica, correspondencia con concesiones y registros individuales, duplicados y ausencias. Ni reconectar ni reproducir trazas ejecuta una concesión.

## Versiones y privacidad

`ITEM_DROP_DESIGN` histórico continúa deshabilitado e inalterado, conservando fingerprints P8A/B/C. `DROP_ITEM_CATALOG` copia exactamente componentes, recetas y efectos ejecutables P8C bajo identidad P8D. El loadout de combate mantiene el ejecutor P8C. La nueva huella incorpora política P8D y la compresión de replays admite ambas huellas ejecutables. No se migra SQL ni partidas previas.

Solo el propietario recibe su inventario, `distributions` y `grants`; de ellos P8E puede obtener ronda, cantidad, tipos e IDs y deduplicar un aviso por ID de reparto. Otros jugadores/espectadores siguen viendo únicamente formación y equipo públicos. El journal global y sus semillas permanecen en servidor. No hay HUD nuevo.

## Diagnóstico y límites

`item-drops.test.ts` cubre semillas congeladas (0 → 2 y 1 → 3 para identidad `fixture`, ronda 3), orden inverso, reposición, todos los tipos, rondas, 2/3/4 jugadores, desconexión, eliminación, final, pendientes, conservación, fallo y privacidad. El fixture de proceso aislado acepta `P8D_DIAGNOSTIC=1`; sus controles son loopback y no forman parte de producción. La prueba PostgreSQL llega a ronda 6, bloquea el commit de ronda 3, mata el proceso, recupera, confirma, vuelve a matar y compara con ejecución sin interrupción.

El modo local de un jugador y el laboratorio antiguo mantienen sus versiones previas. P8D activa exclusivamente la autoridad multijugador moderna. F0-P8E queda pendiente: presentación visual y controles finales de inventario.


## Consolidación P8D + FLORIN — 2026-10-26

La nueva identidad no modifica el stream ni la política; igualdad P8D/integrado probada.

Versiones, fingerprints, conflictos, pruebas, capturas y límites: [INTEGRATION_P8D_FLORIN.md](INTEGRATION_P8D_FLORIN.md).


## F0-P8E · 26-10-2026

La presentación lee los repartos privados confirmados y deduplica por ID en `DeliveryTracker`. Muestra ronda, cantidad 2/3, iconos y aviso de pendientes; al montar con historia existente informa «Recompensa ya recibida». Dura ocho segundos y no bloquea la preparación. Un remontaje no ejecuta concesiones. Los tipos pueden resolverse desde la concesión privada si la instancia ya se consumió. No cambian sorteo, periodicidad, persistencia ni elegibilidad. Véase [ITEM_HUD](ITEM_HUD.md).
