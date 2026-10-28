# Publicar una versión

Desarrollo LOCAL → gates → candidato fijado → autorización → publicación supervisada → verificación → parada o seguimiento. Ningún script LOCAL publica. No hay autodeploy.

Cada candidato registra commit limpio, catálogo y fingerprint semántico, fecha, pruebas, recursos (1 réplica,2 GiB,2 vCPU), migraciones necesarias y compatibilidad histórica. ONLINE actual: `9450d26c6ebb37efb115a3c4b8c6934bc5e74740` / `f0p8d-florin-1`. P10A (`f0p10a-1`) sigue siendo desarrollo separado y no está autorizado para Railway.

Antes de publicar: cerrar partidas normalmente, verificar ausencia de escritor concurrente, refrescar backup acotado y comprobar restauración local. Leer historial de migraciones y revisar el SQL exacto. Detener autoridad anterior, comprobar lease liberado; solo después activar una nueva. No borrar snapshots incompatibles. Conservar catálogos antiguos para restaurar partidas; el catálogo nuevo solo rige nuevas partidas.

Gates del repositorio: `pnpm check`, `pnpm verify:public`, `pnpm verify:railway`, `git diff --check`. Para todas las suites de persistencia/TLS, usar PostgreSQL de diagnóstico y certificados locales documentados en los informes P9A/P9B; nunca apuntar variables de tests a Supabase.

La publicación requiere aprobación específica del candidato, configuración y operación. Subir solo el checkout limpio fijado; jamás todo un worktree experimental. Verificar HTTPS, readiness, WSS, Auth, lobby, inventario, recuperación, autoridad y recursos. Registrar ID de build/deployment y consumo observado.

Rollback: parar primero la autoridad nueva y restaurar solo una versión compatible con los snapshots y migraciones actuales, con lease/fence. No volver a versiones sin lease. Un backup no autoriza restaurar destructivamente el remoto: revisar y autorizar ese procedimiento aparte. No activar dos escritores para acelerar el rollback.

## Dominio y pool versionado — 26-10-2026

Dominio asignado: `tfteunuco.up.railway.app`; Railway permanece retirado. Auth y variables canónicas verificados, sin despliegue. Véase [operación de dominio](RAILWAY_DOMAIN_CHANGE.md).

Nuevas partidas de esta rama: economía `tft-set18-pool-1`, copias por identidad 30/25/18/10/9. Las partidas históricas conservan su configuración y fingerprint. La release online continúa con su economía anterior; publicar este cambio requiere autorización específica. [Referencia](CHAMPION_POOL_REFERENCE.md) y [contabilidad, persistencia e integración futura de P10A](CHAMPION_POOL_MIGRATION.md).
