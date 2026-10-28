# P12A-R2 — arnés de validación de la release saneada

Base: `96911dca67ea25fcb1d3963274ce99386350f19f`, rama `release/p11k-public-safe`. No se reconstruye la rama ni se modifica LOCAL original, GitHub, Railway o Supabase remoto.

## Corrección demostrada del arnés SIGKILL

La sonda de R1 arrancaba sus 100 intentos de 20 ms al enviar `/advance`, aunque `DurableMatch.run` todavía debía restaurar, ejecutar y validar el candidato antes de invocar el repositorio. Un escritor aún no enviado al SQL no puede aparecer esperando un bloqueo. Una preparación artificial de 2300 ms, exclusivamente en la fixture loopback, reproduce `blocked=false` con el arnés anterior. No demuestra pérdida o duplicación de datos.

La fixture comunica por IPC el punto inmediatamente anterior a enviar `authority_commit`; el test espera ese punto usando su espera de sincronización existente y conserva intacta la ventana de observación SQL y los límites globales. Después exige observar el escritor **bloqueado por el backend que mantiene el lock del test**, no cualquier transacción ajena. Los tres consumidores reutilizan esta sonda. Se mantienen SIGKILL real, terminación de los PIDs precisos en PostgreSQL aislado, rollback del lock, ausencia de publicación previa, restauración, recibos e igualdad de inventarios/replays. Los casos de reparto que ejercitan esa frontera incorporan el retraso de 2300 ms como regresión permanente.

El experimento de `pg_stat_activity` con dos conexiones mostró que la actividad sí se actualiza durante esta transacción; no se presenta una caché de estadísticas como causa demostrada del fallo. Se conserva la actualización explícita de la observación al consultar/terminar escritores.

## Mediciones temporales

La prueba 7v7 mantiene su timeout de 5000 ms, el límite de 5000 ms de la primera simulación, segunda ejecución determinista, validación de cada snapshot y límites de bytes/gzip. Se registran separadamente preparación, primera simulación y validación/serialización. El timeout del test abarca más trabajo que el cronómetro de la primera simulación; no se confunden ambos valores.

La prueba visual mantiene 240 muestras a ambas velocidades, identidad del estado y p95 menor de 16,7 ms. La construcción del replay se mide aparte; no se elimina ningún muestreo ni aserción y no se resta GC o CPU del tiempo medido.

Mediciones iniciales de laboratorio: Node 24.22.1, 7v7 completo 1621,45 ms, primera simulación 393,15 ms; reproducción 2094,20 ms y p95 7,34 ms. Node 26.9.0: 7v7 1601,80 ms y reproducción 2114,38 ms. No hay evidencia de que cambiar de Node explique R1. Con los tres archivos simultáneos, 7v7 subió a 1901,83 ms y reproducción a 2464,86 ms; es una penalización de concurrencia medida, aunque ese experimento aún cumple los umbrales. No se afirma haber reproducido exactamente la carga del host que existía durante R1 ni haber identificado un navegador concreto como culpable.

Se elimina la concurrencia por defecto de archivos y se ejecutan primero las dos mediciones de presupuesto, antes de las campañas extensas de red/crash. Un secuenciador estable conserva cada especificación y el aislamiento de workers; su test comprueba ausencia de pérdidas, duplicación o mutación. No se amplían límites, reintentos ni timeouts, ni se omiten pruebas de juego. Los fallos de R1 permanecen registrados; no se sustituyen por repeticiones individuales.

## Instrumentación reproducible

`P12R2_DIAGNOSTICS=1` activa únicamente hooks del runner y trazas de la fixture: CPU, RSS, GC observado, duración completa, fases previas al SQL y datos de las mediciones. `scripts/diagnostics/p12r2/observe.py` muestrea procesos y descendientes cada dos segundos, sin argumentos ni variables de entorno. Ninguna entrada de producción importa estos módulos. No se fuerza GC ni se modifica la simulación.

Las evidencias permanecen en `artifacts/p12a-r2/`, ignoradas por Git. No ejecutar builds ni control de navegador durante las ventanas temporizadas. Usar un único runner, PostgreSQL aislado en 55439 y los certificados locales de diagnóstico; no detener servidores ajenos ni la base compartida. El opt-in de ciclo LOCAL requiere sus puertos libres y se ejecuta por separado, cerrando solo sus hijos.

## Criterio de cierre

Sobre el mismo SHA final de código: ejecutar juntas las tres regresiones, después `pnpm check` completo con PostgreSQL y TLS/WSS, después el opt-in LOCAL separado y builds/verificaciones públicas, Railway estática e historial. El informe de preparación se genera en `artifacts/p12a-r2/F0_P12A_R2_REPORT.md` con el SHA probado y los resultados efectivos, sin cambiar el commit después de validar. Este documento describe método y corrección; no declara anticipadamente aprobada la batería completa.

Se mantienen excluidos del historial los 44 iconos oficiales, packs originales ignorados y diagnósticos. Solo hay cambios en fixtures/tests, configuración del runner, instrumentación y documentación. Motor, estadísticas, balance, HUD y catálogos de producción permanecen byte a byte iguales a R1/P11K; los fingerprints históricos se comprobarán de nuevo. La fase se detiene antes del push y del despliegue incluso si todo pasa.
