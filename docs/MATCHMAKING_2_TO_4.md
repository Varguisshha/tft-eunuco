# Emparejamientos de 2–4 — F0-P7C.1

Estado: motor disponible en autoridad y escenarios SDK controlados; lobby de producción sigue iniciando exclusivamente dos jugadores. No se ha iniciado F0-P7C.2.

## Frontera de autoridad

`AuthoritativeMatch` acepta capacidad 2 (por defecto), 3 o 4 mediante constructor **interno**, nunca mediante opciones del cliente. `MatchRoom.createMatch()` es la factoría protegida. La implementación de producción y `PrivateMatch` siguen usando capacidad 2. Solo el servidor de tests registra `diagnostic_three` y `diagnostic_four`; esos tipos, sus credenciales ficticias y el control de reloj no se importan desde `main.ts`.

Cada participante posee estado económico, sesión, UUID, avatar, conexión, historial de oponentes y reserva `eliminated: false`. El ID de jugador dentro de la partida es su UUID autenticado (se interpreta junto a matchId); sessionId es únicamente la conexión. Los nombres no identifican ni emparejan. No hay reemplazo ni reconexión completa. Los estados de prueba antiguos de dos conservan sus IDs históricos; los escenarios nuevos requieren UUID.

## Algoritmo balanced-history-v1

Módulo puro `apps/server/src/pairings.ts`. Entradas: IDs elegibles, ronda, historial, semilla de autoridad, matchId y ventana reciente (seis rondas por defecto). Salida validada: pares, IDs estables, tipo, metadatos fantasma y registro de decisión con puntuación y desempate.

1. Ordenar IDs lexicográficamente para desacoplar el orden de conexiones.
2. Dos: único duelo. Cuatro: enumerar los tres emparejamientos perfectos. Tres: enumerar las seis combinaciones de receptor/propietario fantasma, con los dos restantes en duelo humano.
3. Para tres, priorizar menor número histórico de recepciones de fantasma y después menor número de préstamos como propietario.
4. Minimizar lexicográficamente: máximo de exposiciones históricas entre los pares candidatos; suma de exposiciones; penalización por recencia. Cada duelo humano o fantasma cuenta como exposición a esa formación, de forma no dirigida.
5. Penalización reciente: `max(0, ventana + 1 - (rondaActual - rondaAnterior))` por exposición coincidente.
6. Resolver empates con hash uint32 estable de semilla, ronda y candidato. Si colisiona, ordenar la representación canónica. No Math.random, reloj, nombres ni orden de conexión.

Para cuatro sin cambios de roster, se completa el ciclo de tres rivales antes de repetir. Las pruebas cubren cuatro ciclos y varias semillas. Para tres, se prueba equilibrio de receptores y propietarios durante 60 rondas, además de tres rondas SDK y seis rondas de autoridad. No se afirma equidad con eliminaciones dinámicas: esa política pertenece a P7C.3.

## IDs y semillas

Pares: `matchId/round/N/pair/I`; combates: `matchId/round/N/combat/I`. Son estables para el mismo input. Para dos se conserva el ID histórico `matchId/combat/N` y la orientación de asientos previa, sin cambiar el orden de llamadas al proveedor de semillas.

La primera semilla de ronda fija la semilla de emparejamientos de esta partida. Para tres/cuatro, la base de combate deriva de esa semilla, el número de ronda y la semilla autoritativa de ronda; se suma el índice del duelo módulo 2^32, garantizando semillas diferentes dentro de la ronda. La semilla maestra y el RNG económico nunca se publican. La semilla propia del combate forma parte de su replay autorizado, igual que en P7A.

Reproducibilidad exige las mismas semillas, formaciones y orden de transacciones económicas. Las compras concurrentes se serializan por recepción en el servidor; no se promete el mismo pool si cambia ese orden. La selección de rivales no depende del orden de conexión.

## Proyección y seguridad

Los contratos nuevos `f0p7c1-1` están en `packages/shared/src/pairings.ts`: Pairing, PairingPlan, DuelRecord, PlayerSettlement, RoundSnapshot y DuelMessage. Los comandos económicos conservan el protocolo existente y sus siete intenciones. El transporte de dos conserva exactamente sus snapshots y mensajes históricos.

RoundSnapshot publica nombres, avatar, UUID, HP real, nivel, conexión, formación desplegada, rival, estado del duelo, posición provisional y último resultado. La posición usa vida descendente; empates comparten posición. No hay puestos finales ni eliminación competitiva.

`own` contiene solo la economía del receptor. Nunca se difunden tiendas/banquillos rivales, pool, historial económico ajeno ni RNG económico. La vida `north` del adaptador económico histórico es un acumulador interno de contraparte, no la vida de un rival cambiante: el protocolo nuevo la omite junto a sus entradas de ledger, y publica únicamente HP/ledger propios. Las vidas reales de otros jugadores proceden de sus propios estados. Así se reutilizan las fórmulas sin falsear la clasificación.

`duelFor(sessionId)` localiza exclusivamente la participación humana: el propietario de un fantasma recibe la traza de su duelo humano, nunca una segunda traza por ser fuente. MatchRoom valida sesión antes de sincronizar/publicar. No hay espectadores. Los resultados públicos aparecen al liquidar; el replay del propio duelo contiene su resultado precalculado y puede inspeccionarse antes de tiempo, limitación histórica explícita.

## Diagnóstico reproducible

`pnpm diagnostics:multiplayer --disableConsoleIntercept`

Ejecuta algoritmo, autoridad y dos escenarios Colyseus/SDK con tres/cuatro conexiones independientes. El servidor de diagnóstico se liga temporalmente a 127.0.0.1:2572 y se cierra al terminar. No requiere Supabase, no crea cuentas remotas y no abre rutas de desarrollo en el servidor normal. El reloj se avanza desde el harness del servidor; el cliente SDK no puede modificarlo. Los tiempos lógicos siguen siendo 30s/45s+600ms/5s. Los resultados JSON incluyen rondas, emparejamientos, hashes de trazas, vida y liquidaciones.

Ver [GHOST_COMBAT.md](GHOST_COMBAT.md), [PARALLEL_COMBATS.md](PARALLEL_COMBATS.md) e [informe](F0_P7C1_REPORT.md).
