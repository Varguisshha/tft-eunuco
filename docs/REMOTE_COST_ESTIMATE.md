# Costes y capacidad — consulta 26/10/2026

No se ha contratado ni activado ningún servicio. Los precios son referencias de planificación; disponibilidad regional, impuestos, moneda y condiciones deben volver a comprobarse al autorizar.

- Hetzner publica para CX23 en Alemania/Finlandia **5,49 €/mes**, excluidos IVA e IPv4, en su ajuste vigente para nuevas contrataciones desde 15/06/2026. No incluye dominio, backups ni administración. [Tabla oficial](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/).
- Supabase Free: 500 MB de base y 5 GB de salida; puede pausarse tras una semana inactivo. Pro parte de **25 USD/mes** y amplía cuotas/backups. No se cambia el plan existente. [Precios oficiales](https://supabase.com/pricing).
- Alternativa A: hosting estático + servicio Node permanente. Render documenta ambos servicios, pero su página dinámica de precios no permitió verificar aquí una tarifa concreta de cómputo: no se reutiliza una cifra antigua. Los servicios Free se suspenden tras 15 minutos sin tráfico y no se recomiendan para este juego. [Tipos de servicio](https://render.com/docs/service-types), [FAQ](https://render.com/docs/faq), [precios](https://render.com/pricing).

Presupuesto orientativo B: coste base de VM desde la tarifa anterior, más IPv4/impuestos/dominio/backups; Supabase existente solo si sus límites bastan. Si requiere Pro, sumar su tarifa en USD y conversión real. No presentar como coste cerrado ni garantía de capacidad. A puede ahorrar administración pero requiere cotización del servicio persistente y coordinación de dos releases.

## Capacidad y medidas

Frontend público aproximadamente 7,2 MB en disco antes de esta fase; los tamaños exactos finales figuran en el log de build. La base P8F mide replay integrado de 56,6 MB JSON / 3,05 MB gzip; estrés P8C 63 MB / 3,86 MB gzip, con límites existentes conservados. No todos esos bytes se transmiten simultáneamente: depende de trazas, snapshots, espectadores y reconexiones.

P9A captura tráfico real del proxy local, checkpoints, RSS/heap y CPU en `artifacts/p9a/`. CPU/local/memoria no extrapolan una VM compartida: simular combate y comprimir snapshots produce picos. Los snapshots se sustituyen transaccionalmente; el coste de escrituras/WAL puede exceder mucho el espacio final de la tabla. Revisar espacio, cantidad de partidas retenidas y volumen diario de salida; el coste de Supabase no depende solo del número de amigos.

Inicio prudente: una partida simultánea de cuatro personas, medir y aumentar únicamente con evidencia. No se declara soporte de decenas de salas ni alta disponibilidad. Proponer 2 vCPU y 2–4 GB como punto de ensayo, no como capacidad certificada. Mantener margen sobre RSS máximo y vigilar event loop, persistencia y reinicios.

## Medición del recorrido Chrome P9A

Laboratorio local, partida acelerada de cuatro identidades, 16 rondas y reautenticaciones para capturar fases; **no equivale al tráfico de una partida remota a velocidad normal**:

- 31 acciones visuales verificadas; cinco tamaños entre 1280×720 y 3840×2160.
- Cinco muestras de RSS durante actividad: 571,6–661,8 MiB; heap máximo muestreado 411,2 MiB. CPU acumulada hasta la última muestra: 133,69 s (usuario+sistema), no porcentaje de una VM.
- 423 checkpoints observados: mediana 8,92 ms; máximo 242,29 ms.
- p95 del event loop por ventana de 30 s: 21,97–583,53 ms. Los saltos acelerados provocan trabajo síncrono apreciable; no se promete baja latencia ni concurrencia adicional.
- Proxy: 748 peticiones HTTP, 56 upgrades WS, 54.402 bytes de cliente y 338.276.935 bytes de servidor (~322,6 MiB), sin contar overhead TLS/IP. Las reconexiones artificiales multiplican sincronizaciones completas.

Riesgo principal para P9B: medir una partida a velocidad normal y el volumen de snapshots/replays en cada reconexión antes de invitar a más gente. Un cupo pequeño de salida puede agotarse rápidamente; no inferir un número de partidas por mes con este escenario artificial. Optimizar transmisión/CPU, si resulta necesario, debe ser una fase separada sin rebajar garantías de autoridad.

La primera ejecución acumulada TLS alcanzó el timeout de una campaña. Además del coste artificial de reconstruir replays en el guion (eliminado), las salas finales conservadas y restauradas siguen generando checkpoints durante su retención existente. Las campañas finales son independientes; no certifican múltiples partidas acumuladas. Medir también partidas consecutivas y restauración de historial antes de ampliar el ensayo.

## Campañas TLS finales y resultado retenido

Tres campañas independientes completas (2/3/4 clientes): **1.045.673.091 bytes** enviados y 272.868 recibidos por WS, 22 upgrades. No es una tasa por segundo ni un presupuesto mensual. Máximo de ocho muestras: RSS **991,5 MiB**, heap 444,1 MiB y p95 del bucle de eventos por ventana hasta 1.018,17 ms. 1.337 checkpoints medidos: mediana 6,03 ms, máximo 433,63 ms. El diagnóstico también transfiere snapshots de control por HTTP; esos bytes no están incluidos en el contador WS.

Base diagnóstica al terminar las campañas y restaurar el resultado: 60.085.939 bytes de base, 52.051.968 de tabla/índices/TOAST de authority_matches y 73.728 de authority_members. Incluye versiones muertas y actividad de ensayo; no equivale al tamaño lógico de un único snapshot ni a la retención mensual.

En reposo **con un resultado final restaurado**, muestras de RSS 585,4–698,5 MiB y unos 20 s CPU por ventana de 30 s: los checkpoints existentes continúan durante la retención final. Esto es un riesgo operativo concreto, no solo sobrecarga del guion. P9B debe abordar/medir el coste de finales retenidos y la transmisión de replays antes de ampliar participantes o partidas consecutivas. No se modificó ese comportamiento del motor en P9A.

Reposo vacío medido aparte, después de vaciar únicamente la base diagnóstica con el proceso detenido: RSS 124,6–124,7 MiB, heap 42,9–43,3 MiB; CPU total a los 60 s 0,54 s y delta de CPU entre las dos muestras de 30 s de unos 0,04 s. Sin salas ni resultados restaurados. Evidencia `idle-runtime.jsonl`. El contraste confirma que el coste del resultado retenido merece atención específica.
