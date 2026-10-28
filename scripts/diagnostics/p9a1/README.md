# P9A.1 — Laboratorio local opt-in

No lo importa el servidor normal. No ejecutar en paralelo con benchmarks, suite TLS o laboratorio P9A. Requiere Node del proyecto, `pnpm install --frozen-lockfile`, cliente compilado y PostgreSQL **local desechable**, con esquema de persistencia existente, en `127.0.0.1:55439/tft_memory_test`. El harness trunca exclusivamente esa base al arrancar; no apuntarlo a datos que se deban conservar. No contiene migración remota ni integración Supabase real.

Preparar el esquema con las migraciones del repositorio o un volcado **solo de esquema** de otra base local de diagnóstico. Los certificados se preparan como indica `scripts/remote/README.md`; `NODE_EXTRA_CA_CERTS` apunta a la CA local de `artifacts/p9a/tls/ca.pem`. Nunca desactivar verificación TLS. Puertos reservados: backend 2600, control 2601, HTTPS 9445, redirect 9080. No tocar 4173/2567.

Variables:

- `P9A1_DATABASE_URL`: conexión únicamente a la base desechable indicada. Mantenerla fuera de documentación pública/logs cuando incluya credenciales.
- `P9A1_MODE`: `baseline`, `after`, `normal`, `consecutive`; nombre separado para una restauración grande.
- `P9A1_RESTORE_FILE`: documento local ignorado, solo fixtures. Mismo fichero para comparar antes/después. No publicar snapshot ni heap dump.
- `P9A1_STATIC_DIR`: cliente compilado de diagnóstico opcional.
- `P9A1_PLAYWRIGHT_PATH`: módulo Playwright instalado; opcional, prueba de resultado restaurado con UI real compilada. Usa perfil Chrome desechable `artifacts/p9a1/chrome-profile` con CA localhost configurada; nunca perfil personal.

Arranque desde la raíz, con entorno ya cargado sin imprimirlo:

```sh
node --import ./apps/server/node_modules/tsx/dist/loader.mjs scripts/diagnostics/p9a1/campaign.mjs
node scripts/diagnostics/p9a1/report.mjs
```

El padre crea una clave aleatoria y cuatro JWT fixture de dos horas, los comunica solo al hijo y a los clientes, y los descarta al terminar. El control escucha en loopback y exige Bearer; las métricas no incluyen tokens ni payloads. No inspector. El hijo usa `--expose-gc` solo aquí. Detener con SIGTERM los procesos propios si se interrumpe el padre; no matar servicios ajenos.

## Escenarios

- `baseline`/`after`: cuatro participantes por acciones públicas, compra/despliegue/objetos, reconexión, final conectado/desconectado, SIGKILL y restauración final. Solo estos guiones aceleran fases mediante control local. La fase normal del juego no se modifica.
- `normal`: cuatro SDK reales por HTTPS/WSS con el mismo guion, **sin llamadas a advance**. El hijo rechaza advance con 403. Preservar todos los temporizadores y dejar finalizar; el límite del harness es 40 minutos. No ejecutar tests/builds durante esta medición.
- `consecutive`: cinco partidas de dos y tres de cuatro, mismo PID/PG, sin reset entre partidas. Retención exclusivamente diagnóstica de 8000 ms; espera liberación natural, compara tiendas iniciales de semilla fija y verifica identidad/match de cada perspectiva. Espera también el barrido final de 31 s.
- Restauración grande: carga el mismo documento local antes de arrancar y mide diez segundos retenido. Después libera la sala y recoge GC. Es un control aislado, no una partida normal.

Los bots compran ofertas, despliegan hasta capacidad y combinan/equipan componentes. Desde ronda siete, todos salvo el último venden sus unidades mediante comandos autorizados para acotar la campaña; no se cambian vida, daño, RNG ni relojes. **No equivale a una partida humana equilibrada ni a una prueba de carga concurrente.** Las primeras pruebas sin compras se conservan como `empty-control`; no forman parte de la evidencia principal.

## Métricas

`metrics.jsonl` solo proceso servidor: memoria en bytes, CPU acumulada en microsegundos, GC, histogramas por ventana, recursos de proceso y por sala, serialización/restore/commit/consulta/envío. Snapshot detallado exporta y serializa bajo petición, añadiendo coste propio; no mezclar esa muestra con un benchmark sin instrumentación. El contador WS mide buffers encolados por el encoder de Colyseus; excluye cabeceras TLS/TCP, tráfico entrante y protocolo de lobby. No es captura de red ni bytes confirmados por el receptor.

`report.mjs` produce únicamente agregados numéricos. Los percentiles son máximos de percentiles de ventanas de dos segundos, **no percentiles globales**. Las fases de intervalo se atribuyen según la sala al final de la ventana; una transición puede incluir trabajo de la fase anterior. La fila A se obtiene tras cargar módulos, antes del runtime: no es la memoria literal del primer instante del proceso.

Para el smoke UI, copiar los tres `.fixture` de `browser/` a `apps/web/artifacts/p9a1/` sin su sufijo, construir desde apps/web con su `vite.config.mjs` y apuntar `P9A1_STATIC_DIR` a `artifacts/p9a1/browser-dist`. La fixture importa `LocalGame`, `LocalSession` y `RemoteCoordinator` reales, deshabilita DEV y recibe la identidad vía init script del navegador, sin guardar tokens como recurso estático. No distribuir ese bundle; `verify:public` se aplica al bundle público normal.
