# Laboratorio HTTPS/WSS P9A (solo loopback)

Ejecutar desde la raíz del worktree. No publica nada. Requiere Node/pnpm del repositorio, OpenSSL, PostgreSQL local aislado y, para la prueba visual, Chrome y Playwright. No usar una base real ni ejecutar dos laboratorios P9A a la vez. Puertos: HTTPS 9443, redirección 9080, backend 2596, control 2597, relay PostgreSQL 55441; el PostgreSQL aislado escucha 55439. No toca 4173/2567.

## Base desechable

Crear `tft_remote_test` en un clúster **local de diagnóstico** en 127.0.0.1:55439. Las pruebas se niegan a usar otro destino y truncan exclusivamente sus tablas de autoridad. Para una base nueva vacía, crear esquema `private`, roles NOLOGIN `anon`, `authenticated`, `service_role` si no existen en ese clúster, y aplicar únicamente:

- `supabase/migrations/202610250001_authority_persistence.sql`
- `supabase/migrations/202610260001_authority_health.sql`

No requiere usuarios, perfiles ni copia de datos Supabase. En esta validación se copió **solo el esquema** del otro PostgreSQL diagnóstico y se aplicó localmente la nueva función. El rol de prueba necesita ejecutar las RPC y vaciar sus tablas; nunca trasladar esos privilegios al servidor remoto.

## Suite de transporte

```sh
pnpm install --frozen-lockfile
pnpm build
node scripts/remote/certificates.mjs
```

Cargar `P9A_TEST_DATABASE_URL` desde un archivo local ignorado con el destino aislado anterior; no imprimirlo. La suite histórica requiere además `PERSISTENCE_TEST_URL` apuntando a su propia base desechable `tft_persistence_test`, nunca a la de P9A. Después:

```sh
NODE_EXTRA_CA_CERTS="$PWD/artifacts/p9a/tls/ca.pem" P9A_TLS_TESTS=1 pnpm check
pnpm verify:public
git diff --check
```

Cada campaña usa la semilla diagnóstica fija y reinicia el backend/vacía exclusivamente su base antes de comenzar; el reinicio que se prueba dentro de la campaña conserva todos sus datos. No compara concurrencia entre partidas. La suite inicia y detiene sus hijos y genera evidencias en `artifacts/p9a/`. El certificado dura siete días; regenerar y actualizar la confianza si caduca. La confianza Node se limita a ese proceso. No usar `NODE_TLS_REJECT_UNAUTHORIZED=0`, `ignoreHTTPSErrors` ni flags equivalentes. Una prueba independiente comprueba el rechazo sin la CA.

## Navegador real

Las plantillas reutilizan componentes reales con autenticación firmada exclusivamente diagnóstica. No forman parte del build público. Preparar:

```sh
mkdir -p apps/web/artifacts/p9a artifacts/p9a
cp scripts/remote/browser/network.jsx.fixture apps/web/artifacts/p9a/network.jsx
cp scripts/remote/browser/index.html.fixture apps/web/artifacts/p9a/index.html
cp scripts/remote/browser/vite.config.mjs.fixture apps/web/artifacts/p9a/vite.config.mjs
cp scripts/remote/browser/lab.mjs.fixture artifacts/p9a/browser-lab.mjs
cp scripts/remote/browser/play.mjs.fixture artifacts/p9a/browser-play.mjs
pnpm --filter @tft/web exec vite build --config artifacts/p9a/vite.config.mjs
```

Ajustar únicamente la ruta de Playwright y el ejecutable Chrome en la copia del guion para otro equipo. Inicializar un perfil **desechable** en `artifacts/p9a/chrome-profile` abriendo Chrome con ese `--user-data-dir`, entrar en `chrome://certificate-manager`, cerrar completamente ese Chrome y ejecutar:

```sh
python3 scripts/remote/prepare-browser-trust.py
```

El script modifica solo el almacén de ese perfil y limita la CA a `localhost`. No modifica llavero ni perfiles personales. La tabla sigue el contrato Chromium enlazado en el script; si cambia, se debe revisar, no eludir TLS.

En una terminal dedicada arrancar `node artifacts/p9a/browser-lab.mjs`; en otra, `node artifacts/p9a/browser-play.mjs`. El laboratorio genera una clave efímera con permisos 0600 y tokens con duración de una hora, válidos solo para cuatro identidades de prueba. Los guarda únicamente en carpetas ignoradas. Detener el proceso del laboratorio con SIGTERM al acabar; antes de repetir, comprobar que no queda una sala diagnóstica activa de esas identidades. La suite TLS vacía su base al iniciar; no ejecutar ambas a la vez.

Se avanza el reloj mediante un control autenticado en loopback; las compras, oro, objetos y combates siguen las reglas normales. El muestreo visual reautentica entre fases, pero conserva el resultado en memoria al terminar (una sala terminada puede haberse cerrado). La recuperación se comprueba además cortando un socket real y comparando el estado recuperado.

## Proxy de publicación

`local-proxy.mjs` es el terminador TLS del laboratorio y registra contadores agregados. La publicación prevista usa `infra/remote/Caddyfile`, validada con Caddy oficial, y `infra/remote/tft.service`. No se ha instalado un servicio systemd ni emitido certificados públicos. Ver `docs/REMOTE_PREFLIGHT.md` antes de cualquier despliegue autorizado.

Comprobaciones negativas de build reproducibles (no contactan Supabase): copiar `browser/check-public-config.mjs.fixture` a `artifacts/p9a/check-public-config.mjs` y ejecutarlo con Node. Las cuatro configuraciones inválidas deben rechazarse antes de compilar: entorno privado incompleto, clave secreta nueva, variable VITE de service-role y JWT legacy de service-role. Los valores son marcadores de prueba.

Smoke opcional con Caddy oficial: con el backend diagnóstico ya iniciado, usar una configuración local que escuche **solo 127.0.0.1:9444**, TLS con `artifacts/p9a/tls/server.pem` y su clave, sin admin API ni ACME público, y proxy 127.0.0.1:2596 sobrescribiendo Host a `localhost:9443` y X-Forwarded-Proto a https. Copiar `browser/caddy-smoke.mjs.fixture` a `artifacts/p9a/caddy-smoke.mjs` y ejecutar con `NODE_EXTRA_CA_CERTS` apuntando a la CA. Comprueba readiness, dos clientes WSS autenticados y rechazo de Origin ajeno. El origen canónico se mantiene en 9443 para este ensayo del proxy; no es una configuración de dominio remoto. Detener Caddy y laboratorio al acabar.
