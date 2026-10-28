# F0-P9A.1 — Rendimiento local reproducible

Equipo: Apple M5, 10 núcleos, 24 GiB, macOS arm64, Node 26.9.0. PostgreSQL local aislado, HTTPS/WSS con CA verificada. Solo un benchmark a la vez. Los valores son observaciones de este equipo, no un presupuesto de producción.

## Partida completa a velocidad normal

Duración del guion hasta resultado asentado: **921109 ms (15 min 21,1 s)**. Cuatro identidades fixture, sala privada, servidor real, SDK por HTTPS/WSS; no avance artificial. Temporizadores normales. Se observaron preparación, combate, Overtime, resolución, eliminaciones y clasificación completa. Reconexión autenticada en ronda cuatro con inventario idéntico. No GC forzada durante el juego; sí en reposo inicial y liberación final.

235 solicitudes: 94 compras, 21 movimientos, 8 combinaciones, 6 equipamientos y 30 ventas aceptadas; 71 compras y 5 equipamientos rechazados por reglas normales. Cuatro repartos confirmados (rondas 3, 6, 9 y 12). El guion vende unidades desde ronda siete salvo el último jugador para terminar sin cambiar mecánicas. No representa comportamiento humano competitivo equilibrado ni carga de varias salas simultáneas.

La ventana completa del proceso medida fue 923,90 s, con 302,91 s de CPU (32,79 % de un núcleo). Pico **muestreado**: RSS 865,8 MiB, heapUsed 466,1 MiB. Puede haber máximos entre muestras. Tras liberar la sala y GC: RSS 214,8 MiB, heap 41,4 MiB; no quedan salas ni sockets de juego. El RSS no vuelve necesariamente al arranque.

### Event loop

Resolución de histograma 10 ms; valores en ms. Son **máximos de los percentiles de ventanas de dos segundos**, no un percentil global. Una ventana de transición puede contener trabajo de la fase anterior.

| Fase | Ventanas | Máx. p50 de ventana | Máx. p95 | Máx. p99 | Mayor pausa |
|---|---:|---:|---:|---:|---:|
| Preparación | 229 | 11,54 | 15,64 | 417,07 | 742,39 |
| Combate | 182 | 11,34 | 12,33 | 752,35 | 772,80 |
| Resolución | 40 | 11,34 | 13,62 | 781,19 | 781,19 |
| Final retenido | 6 | 10,87 | 11,43 | 23,59 | 46,60 |

El p95 relativamente bajo no elimina las pausas largas: el p99 y el máximo muestran bloqueos importantes. Exportaciones: 2313 / 107,81 s acumulados; restauraciones: 1156 / 48,52 s; commits: 1155 / 37,18 s; consultas PG dentro de ellos: 8,59 s; envíos: 0,84 s. Los tiempos son categorías anidadas y **no se suman como costes independientes**. GC de ventanas de combate: 19090 eventos / 14,17 s. La serialización copy-on-write y gzip activo siguen teniendo coste; no se reduce la garantía transaccional para ocultarlo.

### WebSocket

Bytes de aplicación codificados y encolados por Colyseus, no captura de red: excluyen TLS/TCP, mensajes entrantes y lobby. MB decimales. No se envían autoridades privadas completas en la instrumentación.

| Tipo | Mensajes | Bytes |
|---|---:|---:|
| combat_trace | 58 | 126361982 |
| state_snapshot | 841 | 10272917 |
| action_receipt | 235 | 27224 |
| final_results | 4 | 12684 |
| resume_accepted | 5 | 1641 |
| service_status | 5 | 335 |

Total: **136676783 bytes (136,68 MB)**. Por participante fixture: 35,46 / 33,78 / 34,43 / 33,00 MB. Mayor mensaje: 7913387 bytes. La mayor parte corresponde a replays; no se propone un cambio de protocolo en esta fase. Los 338,3 MB de P9A eran otra campaña acelerada: no permiten inferir un porcentaje de ahorro respecto a esta normal. En el control final silencioso no se repite el replay ni el resultado; reconectar autoriza una nueva entrega legítima.

## Comparación controlada

Un mismo final grande, sin sockets, antes/después: [perfil de memoria](SERVER_MEMORY_PROFILE.md). Se conservan replay de 12593343 bytes y snapshot de 13100048 bytes. En diez segundos se eliminan diez commits redundantes y la copia fuente `permit.saved`; no se cambia el formato.

La campaña acelerada de cuatro jugadores pasa de 320→323 commits durante tres segundos de final conectado a 318→318. Su restauración final pasa de 2→11 commits en diez segundos a 0→0. Diferencias totales entre partidas no son un benchmark estricto de lógica: IDs de partida separan streams de reparto, y el GC/planificador no son deterministas. El documento grande idéntico es el control causal principal.

## Interpretación y límites

- La reducción demostrada está en finales; no se afirma haber solucionado los picos activos.
- La retención predeterminada es cinco minutos y no se renueva al reconectar. [Contrato](MATCH_RETENTION_POLICY.md).
- No heap dump, inspector remoto, Supabase real, cambio de reglas ni despliegue.
- Las métricas incluyen coste del laboratorio; no son una prueba de capacidad concurrente ni de hardware de hosting.
- No se ha introducido compresión WS, deltas ni caché global. Cualquier optimización activa futura necesita equivalencia y privacidad demostradas.

## Matriz de estados A–L

Memoria en MiB. Comparación acelerada antes/después separada de la campaña normal. GC en B, C, D, G, H, I y J de las campañas aceleradas; en la normal solo B y L. E/F no fuerzan GC. La fila D puede incluir inicio de intercambio de perspectivas.

| Estado | Antes RSS / heap | Después RSS / heap | Normal RSS / heap |
|---|---:|---:|---:|
| A-start | 129.6 / 42.8 | 138.7 / 42.1 | 137.8 / 42.7 |
| B-empty | 132.3 / 31.9 | 141.6 / 32.1 | 140.9 / 32.1 |
| C-0-waiting | 132.7 / 32.5 | 141.9 / 32.7 | 141.1 / 33.8 |
| D-0-preparation | 135.3 / 34.9 | 157.6 / 35.1 | 144.5 / 51.8 |
| E-0-combat | 303.0 / 136.9 | 311.4 / 136.7 | 280.6 / 79.2 |
| F-0-overtime | 372.8 / 177.0 | 369.5 / 58.8 | 436.4 / 73.2 |
| G-0-final-settled | 449.2 / 39.8 | 441.3 / 40.1 | 217.1 / 52.1 |
| H-0-final-connected | 449.2 / 40.8 | 440.5 / 41.1 | 224.8 / 73.4 |
| I-0-final-disconnected | 447.8 / 39.9 | 440.8 / 40.2 | 215.4 / 59.2 |
| J: final restaurado pequeño | 177,0 / 37,5 | 151,4 / 35,8 | No reinicio durante normal |
| K: ocho partidas, último final liberado | Sin campaña equivalente previa | 714,9 / 39,7 | Escenario separado acelerado |
| L: barrido terminado, GC | No comparable | 217,0 / 39,7 | 214,8 / 41,4 |

Los agregados JSON incluyen también heapTotal, external, arrayBuffers, timers, sockets y listeners para cada punto; las columnas de RSS/heap no sustituyen esas métricas. En C hay cuatro gateways (4 sockets); en D–H cinco salas (8 sockets); en I solo queda la sala de partida (0 sockets); en L ninguna.

## Ocho partidas consecutivas en el mismo proceso

Cinco de dos y tres de cuatro, mismo PID, sin reset de PostgreSQL entre partidas. Ventana diagnóstica 8 s y **liberación natural**; no se fuerza dispose para obtener el resultado. Se valida identidad/match de cada perspectiva y se comparan tiendas iniciales con semilla fija. Los repartos incluyen el ID de partida en su stream: no se exige que partidas distintas tengan drops idénticos.

| Partida | Participantes | Heap tras liberar y GC (MiB) | Salas / sockets / timers / listeners de sala |
|---|---:|---:|---|
| 1 | 2 | 37.85 | 0 / 0 / 0 / 0 |
| 2 | 2 | 38.37 | 0 / 0 / 0 / 0 |
| 3 | 2 | 38.95 | 0 / 0 / 0 / 0 |
| 4 | 2 | 39.19 | 0 / 0 / 0 / 0 |
| 5 | 2 | 39.30 | 0 / 0 / 0 / 0 |
| 6 | 4 | 39.70 | 0 / 0 / 0 / 0 |
| 7 | 4 | 39.72 | 0 / 0 / 0 / 0 |
| 8 | 4 | 39.73 | 0 / 0 / 0 / 0 |

Tras 32 s adicionales: heap 39,67 MiB, RSS 217,0 MiB; cero recursos de sala. Los timers de proceso pasan de tres en reposo inicial a dos (telemetría/laboratorio); permanecen servidores HTTP y la conexión del control, no jugadores. Heap inicial 31,91 MiB; la diferencia de calentamiento de ~7,8 MiB no se atribuye íntegramente a una causa concreta. Los últimos tres puntos forman una meseta (39,70 / 39,72 / 39,73); no hay acumulación de salas ni evidencia de crecimiento injustificado en este ensayo. No demuestra ausencia de fuga para un número ilimitado de partidas.

## Quality gates y cliente compilado

Baseline 1337/1337 en 91 archivos. Cierre 1342/1342 en 92 archivos (272,58 s), PostgreSQL y TLS incluidos, sin omisiones. Tipos, ESLint, build cliente/servidor, `verify:public` y diff check correctos. El cliente UI compilado recupera un final de cuatro posiciones y reconecta con un socket nuevo, preservando el resultado y sin errores JS. Es un smoke separado de la campaña normal SDK; la fixture local se reimporta con vencimiento nuevo solo para esta comprobación.

Evidencia numérica sin payloads: [mediciones](evidence/p9a1/measurements.json), [campañas y auditoría de objetos](evidence/p9a1/campaigns.json). [Informe de cierre](F0_P9A1_REPORT.md).


## F0-P9B-R0 — Railway Hobby

R0 usa estas mediciones como referencia conservadora, no como prueba de capacidad Railway. Objetivo 2 GiB/2 vCPU, una partida y cinco minutos de final. No se reducen reglas ni pruebas para encajar; los nuevos logs incluyen salas, conexiones, P99 y máximo del bucle, además de P95. Costes, umbrales y límites en RAILWAY_OPERATIONS.

[Despliegue](RAILWAY_DEPLOYMENT.md) · [Variables](RAILWAY_ENVIRONMENT.md) · [Operación](RAILWAY_OPERATIONS.md) · [Preflight](RAILWAY_PREFLIGHT.md).
