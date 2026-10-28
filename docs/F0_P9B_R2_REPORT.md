# F0-P9B-R2 — separación LOCAL / ONLINE

Fecha: 26-10-2026. Implementación local preparada; no hay cambios remotos. La matriz visual completa queda parcialmente pendiente por una limitación del navegador de validación.

## Estado y operación

1. Base: `1a4ca5b6bbbd06d8c619461dc206d595e4dff69a` (R1 + autorización C documentada), sobre release estable `9450d26c6ebb37efb115a3c4b8c6934bc5e74740`. Rama R2: `codex/f0-p9b-r2-local-online`.
2. Railway sigue offline/REMOVED. Mismo proyecto, entorno private, servicio tft-eunuco; una réplica Amsterdam,2 GiB,2 vCPU, sin serverless ni autodeploy. No se creó, encendió ni desplegó nada.
3. Dominio actual: `tft-eunuco-private.up.railway.app`, puerto 8080; permanece sin cambios.
4. Railway mostró **Available** para `tfteunuco.up.railway.app`. La lectura del editor está en evidencia; no es una reserva. La captura del panel no reproduce el texto del formulario, por lo que no se usa como prueba de disponibilidad.
5. Plan: renombrar el dominio existente (sustituye el anterior), actualizar dos variables canónicas sin desplegar y verificar. [Operaciones exactas](RAILWAY_DOMAIN_CHANGE.md).
6. Auth futuro: Site URL y redirect HTTPS nuevos; conservar localhost 4173; retirar redirect online antiguo después de aprobar el plan. Sin wildcards ni otros cambios. Auth actual se releyó y mantiene exactamente las URLs autorizadas en C.
7. LOCAL: loopback, PostgreSQL propio, JWT firmados efímeros y cuatro identidades de diagnóstico. ONLINE: Supabase personal y lease. No hay acceso local a los datos remotos.
8. Arranque: `pnpm dev:local` desde este worktree; `--worktree '/ruta/al/worktree'` selecciona desarrollo. P10A probado desde su ruta, sin modificarlo.
9. Parada: `pnpm stop:local`; estado: `pnpm status:local`. Control 2559, web 4173, juego 2567, PostgreSQL 55440. Todos los procesos LOCAL quedaron detenidos al terminar las pruebas.
10. Persistencia local: base por ruta + huella de fuentes del catálogo. Nueva huella usa otra base; no borra la anterior. Lock local exclusivo, validación de data_directory y rechazo de URLs remotas. Supabase remoto:2 partidas cerradas,4 miembros,0 activas, fence habilitado y lease liberado; historial de 5 migraciones intacto.
11. ONLINE conserva `f0p8d-florin-1`. LOCAL actual carga ese catálogo; P10A carga `f0p10a-1`,34 registrados / 4 jugables / 30 borradores. Hash de archivos P10A antes/después idéntico. No integración, merge ni push.
12. Sala local validada con Vargas y Florin diagnósticos: crear, código, entrar, Ready y comenzar. Compra DOLEA confirmada; inspector, inventario y clasificación visibles.
13. Invitación: compartir URL vigente + código de 8 caracteres, cuentas personales confirmadas online. En LOCAL el mensaje advierte que el enlace no es público. No se crearon cuentas remotas.
14. Encendido: el deployment estable retirado ofrece Redeploy en su menú; no se ejecutó. Apagado: retirar únicamente deployment después de terminar partidas, verificar lease, conservar recursos. [Guía](HOW_TO_PLAY_ON_RAILWAY.md).
15. Releases: candidato fijo, catálogo/fingerprint registrados, gates, backup restaurado, compatibilidad histórica, autorización, única autoridad, validación y rollback compatible. [Procedimiento](RELEASE_WORKFLOW.md).
16. Validación: `pnpm check` pasó TypeScript, ESLint,100 archivos / 1379 tests, cliente y servidor. PostgreSQL diagnóstico 55439, TLS local y pruebas de fence activados. Después de endurecer el cierre y verificar data_directory,6 tests específicos pasaron, incluidos arranque/puerto ocupado/SIGTERM/puertos liberados. `verify:public` y `verify:railway` pasan. Evidencias adjuntas.
17. Límites: revisión real HUD solo 1280×720, sin scroll vertical y cinco ofertas visibles. Los overrides 1440×900,1920×1080,2560×1440 y 3840×2160 devolvieron siempre 1280×720 incluso en nueva pestaña: **no se consideran verificados**. No se rediseñó HUD. Flujo de combate y clasificación cubierto por suite existente y ejecución local; no se hizo una partida remota con personas reales. Auth online/refresh/correos requieren servicio activo y sesión supervisada. JWT diagnóstico dura 1 h, reentrada manual tras expiración/reinicio; no es un proveedor de cuentas persistentes. HMR solo UI/assets; servidor/catalogo exige reinicio. Aviso de bundles>500kB existente, sin relajar umbral.
18. Git: cambios exclusivos en lanzador, guardia del entrypoint, pruebas, comprobación del bundle y documentación R2. Sprites y TFPeru preexistentes no se incluyen. No push; no nueva release online. P10A íntegro según comparación de todos los archivos versionados/no ignorados.
19. Pendiente: autorización específica para renombrar dominio, dos variables y Auth según plan; otra autorización para encender y supervisar. R2 no activa facturación de compute. No se modifica SMTP, usuarios, contraseñas, RLS, SQL ni migraciones.

## Incidencias resueltas

- Conexión de navegador entre 4173/2567 fallaba: proxy Vite same-origin `/__game`, sin debilitar CORS/Host del servidor.
- Control 2568 coincidía con tests antiguos: movido a 2559; suite repetida satisfactoriamente.
- Parada devolvía antes de acabar: espera eliminación autenticada del registro de propiedad; no mata procesos ajenos.

## Guías y evidencias

- [LOCAL y ONLINE](LOCAL_VS_ONLINE.md)
- [Desarrollo local](LOCAL_DEVELOPMENT.md)
- [Railway y amigos](HOW_TO_PLAY_ON_RAILWAY.md)
- [Releases](RELEASE_WORKFLOW.md)
- [Cambio de dominio](RAILWAY_DOMAIN_CHANGE.md)
- [Pruebas completas](evidence/p9b-r2/check.log)
- [Pruebas de aislamiento y ciclo de vida](evidence/p9b-r2/local-tests.log)
- [Integridad P10A](evidence/p9b-r2/p10a-integrity.json)
