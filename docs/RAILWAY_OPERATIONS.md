# Operación del piloto Railway

## Capacidad inicial

Una réplica, una partida reservada/activa/final retenida a la vez, cuatro jugadores. Máximo ocho gateways autenticados para permitir la transición/reentrada y espera; la novena conexión de lobby se rechaza. La reserva de partida es atómica dentro del proceso, incluyendo arranques simultáneos. Un final retenido ocupa el cupo hasta vencer. No aumentar cupos sin otra prueba de carga. Si recuperación encuentra más de una partida vigente, arranque falla cerrado: no omite partidas silenciosamente.

Objetivo declarativo: límite de **2 GiB RAM** y 2 vCPU, sujeto a aceptación/capacidades del plan real. El límite es un techo, no RAM reservada, gratuita ni capacidad demostrada. V8 old space 1280 MiB deja margen para buffers, código, stacks y memoria nativa; el límite total lo impone el proveedor. No autoscaling horizontal.

P9A.1 midió pico activo de 865,8 MiB, final grande 733,7→353,5 MiB y reposo ~217 MiB en Apple M5/24 GiB. Pausa máxima 781,19 ms. Persisten costes de copy-on-write, JSON, gzip síncrono y replay. No extrapolar dos partidas como doble de una ni equiparar CPU Railway al equipo local. [Medición de referencia](SERVER_PERFORMANCE_BASELINE.md).

## Observación y criterios de parada

Las siguientes cifras son límites iniciales operativos, no resultados de rendimiento garantizados. Usar métricas Railway y logs numéricos del proceso cada 30 s. CPU del log es acumulada: calcular delta CPU / delta tiempo; 100 % significa un núcleo. Event loop P95/P99/máximo corresponde a cada ventana, no al total de la sesión.

| Señal | Advertir / actuar |
|---|---|
| RSS | >1,4 GiB durante 60 s: cerrar nuevas pruebas e investigar. >1,7 GiB, OOM o crecimiento sostenido tras finales: detener piloto y conservar datos |
| CPU | >80 % de los 2 vCPU durante 60 s: cerrar admisión; saturación persistente/retraso de reloj: parada supervisada |
| Partidas | Nunca >1 reservada/activa/retenida. Si se detecta más, detener y revisar autoridad; no eliminar filas |
| Conexiones | Hasta 8 gateways + 4 jugadores. Investigar sockets que no bajan tras expiración/barrido; no subir límites para ocultarlo |
| Event loop | P95 >100 ms durante dos ventanas o máximo >1 s: revisar serialización y CPU. Máximo >2 s/repetición o desincronización perceptible: detener pruebas |
| Persistencia | Primer fallo: readiness 503 / commits sin publicación. Pérdida de concesión: salida inmediata. Cualquier avance visible sin commit confirmado: detener |
| Arranque | Concesión tras crash puede requerir 60 s; presupuesto de adquisición 80 s y healthcheck 120 s. No listener antes de restauración. Si excede, investigar en vez de ampliar a ciegas |
| Reinicios | ON_FAILURE, máximo 3. Segundo reinicio no provocado en sesión: suspender piloto; no bucle ilimitado |
| WS / egress | Referencia P9A.1 ~136,68 MB/partida, mayor mensaje ~7,9 MB. Alertar si duplica sin más rondas/reconexiones. Revisar Network/Egress del proveedor; bytes reales incluyen overhead |
| Snapshots | Presupuesto codec sin cambios: 12 MiB base64 de replay, 128 MiB expandido, SQL <16 MiB envelope. Advertir antes del 75 % del límite correspondiente; un rechazo es incidente, nunca elevar límite sin análisis |
| Coste | Revisar al inicio, después de cada ensayo y diariamente mientras esté encendido; configurar aviso y límite de gasto del proveedor tras aprobar presupuesto |

Consultar tamaños con lectura agregada autorizada de `octet_length(snapshot::text)` y estado, sin descargar snapshots ni tokens a logs. No exponer endpoints de métricas privadas. Readiness consulta Auth/PG con caché de cinco segundos y sonda periódica; Railway solo la usa al desplegar. El ensayo requiere una persona supervisando, no se afirma haber creado alertas remotas.

## Retención y cierre

`TFT_FINAL_RETENTION_MS=300000`. Final/reconexión dentro de ventana, expiración y liberación natural conservan el deadline durable; reinicio no lo renueva. El callback final no realiza checkpoints redundantes. Resultado vencido permanece en almacenamiento bajo política existente; no se ejecuta limpieza en arranque/preflight. No prolongar finales para resolver incidencias de capacidad.

Para detener: impedir nuevas invitaciones, avisar a participantes, preferir terminar ronda/partida, SIGTERM mediante retirada del deployment, verificar cierre y último commit; conservar Supabase y release. El checkpoint controlado tiene 30 s, drenaje Railway 35 s. Si falla DB, recuperar el último commit confirmado. SIGKILL no garantiza operaciones en vuelo; la concesión caduca a los 60 s y el siguiente proceso recupera. Nunca levantar otro proceso manual para “ayudar” al primero.

La concesión usa fila privada serializada con cada commit, propietario aleatorio por arranque y funciones solo service_role. No se registra propietario. Si falla renovación, el proceso deja de operar; no continúa simulando como autoridad tras volver la red. El wrapper bloquea también escritores antiguos sin concesión después de activarla. Este mecanismo protege el piloto, no constituye alta disponibilidad distribuida ni permite escalar réplicas.

## Coste orientativo

Consulta 26-10-2026: Hobby tiene mínimo de 5 USD/mes acreditado a consumo. RAM 10 USD/GB-mes, CPU 20 USD/vCPU-mes y egress 0,05 USD/GB. Como ejemplo **hipotético**, 0,4 GB RAM media + 0,1 vCPU media + 2 GB egress serían 6,10 USD/mes de consumo, antes de impuestos/otros recursos; no 5 + 6,10. RAM sostenida de 2 GB tendría por sí sola ~20 USD/mes: el techo 2 GiB no es cuota incluida. Uso real, unidades del proveedor y duración de actividad determinan factura. Supabase/SMTP conservan sus costes y límites independientes.

No se ha contratado Hobby ni configurado facturación/alertas. Revalidar tarifas y límite real al autorizar P9B. [Precios oficiales](https://docs.railway.com/pricing), [control de gasto](https://docs.railway.com/pricing/cost-control).


## F0-P9B-R1 — ejecución autorizada (26-10-2026)

A/B autorizadas y ejecutadas. Consumo incremental observado: 0,000209378 USD (sujeto a retraso). Piloto terminado con retirada del deployment y liberación de concesión, sin cómputo dejado activo esperando C. No se puede garantizar vigilancia continua de 24 h desde este chat. Para otra ventana: supervisión efectiva, aviso a 3 USD y parada a 5 USD o al fin del piloto, sin límites globales ni cortes exactos prometidos. No ampliar recursos.

[Informe y evidencias](RAILWAY_FIRST_DEPLOYMENT_REPORT.md).

## C — actualización autorizada y verificada (26-10-2026)

C ya está completada: Site URL `https://tft-eunuco-private.up.railway.app/` y redirect HTTPS exacto añadidos; `http://127.0.0.1:4173/` conservado como redirect. Comparación de 243 campos Auth: solo site_url y uri_allow_list cambiaron. SMTP, usuarios, contraseñas y SQL sin modificaciones. Railway permanece detenido (REMOVED), sin nuevo despliegue y sin integrar P10A. Las menciones anteriores a C pendiente describen el cierre previo de A/B. [Verificación C](evidence/p9b-r1/auth-c-verification.json).
