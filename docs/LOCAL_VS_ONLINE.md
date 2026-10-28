# LOCAL y ONLINE

ONLINE permanece en Railway, apagado (deployment retirado). Release: `9450d26c6ebb37efb115a3c4b8c6934bc5e74740`, catálogo `f0p8d-florin-1`. No hay autodeploy ni integración P10A. Usa Supabase `qiombjvkaolllnjqzspz`, cuentas personales, JWT de Supabase y lease exclusivo. El servidor y frontend públicos comparten origen; no incluyen DEV.

LOCAL se ejecuta con `pnpm dev:local`: Vite 4173, Colyseus 2567, control 2559 y PostgreSQL 55440, todos en 127.0.0.1. Vite remite `/__game` al servidor local manteniendo Origin y validación de Host. Usa cuatro identidades de diagnóstico; nunca registra usuarios ni envía correos. El portal se sustituye solo en memoria mediante el lanzador, fuera del bundle público.

El lanzador no carga `.env` ni el `vite.config` del worktree. Rechaza variables remotas heredadas y transmite a Node una lista mínima de variables. La URL de persistencia es fija y validada: PostgreSQL loopback y base `tft_local_<identidad>`. No utiliza credenciales Supabase. Una conexión mantiene un advisory lock durante toda la vida de la autoridad local.

Cada ruta de worktree y huella del código del catálogo dispone de su propia base y directorio. No compartir directorios ni copiar snapshots entre catálogos. Los datos anteriores se conservan; no se borran para resolver incompatibilidades. El hash de fuentes del lanzador es una protección adicional, diferente del fingerprint semántico del catálogo que ya utiliza el juego.

Consulta [desarrollo local](LOCAL_DEVELOPMENT.md), [jugar online](HOW_TO_PLAY_ON_RAILWAY.md) y [releases](RELEASE_WORKFLOW.md).

## Dominio y pool versionado — 26-10-2026

Dominio asignado: `tfteunuco.up.railway.app`; Railway permanece retirado. Auth y variables canónicas verificados, sin despliegue. Véase [operación de dominio](RAILWAY_DOMAIN_CHANGE.md).

Nuevas partidas de esta rama: economía `tft-set18-pool-1`, copias por identidad 30/25/18/10/9. Las partidas históricas conservan su configuración y fingerprint. La release online continúa con su economía anterior; publicar este cambio requiere autorización específica. [Referencia](CHAMPION_POOL_REFERENCE.md) y [contabilidad, persistencia e integración futura de P10A](CHAMPION_POOL_MIGRATION.md).
