# Puertas de salida de R0 y autorización P9B

## Preparación local reproducible

- [ ] Base `4e17a218ca93906278f75c38328ca7e929adda64`, rama aislada, originales intactos.
- [ ] Instalar lockfile; compilar antes del baseline TLS (sirve dist).
- [ ] Baseline 1342/1342 conservado; suite final con nuevas pruebas, sin omisiones de PostgreSQL/TLS.
- [ ] TypeScript, ESLint, build web/servidor, `verify:public`, `verify:railway`, auditoría de assets y diff check.
- [ ] Contexto limpio construido solo con archivos rastreados; sin .env, certificados, artefactos o originales no versionados.
- [ ] Ensayo privado con `HOST=0.0.0.0`, PORT dinámico, servidor de producción compilado, TLS válido, WSS, Auth de fixture externo al servidor y PostgreSQL desechable.
- [ ] Cuatro jugadores: lobby/invitación/ready, compras, combate, objetos, repartos, reconexión, recuperación activa/final y clasificación.
- [ ] Rechazos: configuración incompleta, protocolo/Host/Origin incorrectos, JWT inválido, acceso no autorizado, PG no disponible, segunda autoridad y recursos inválidos.
- [ ] MIME TTF correcto y FestivalPop realmente cargada en navegador; sprites, atlas e imágenes presentes.

Resultado concreto de estos checks: [informe R0](F0_P9B_R0_REPORT.md). Las casillas de esta plantilla no sustituyen evidencia de una ejecución.

## Antes de ejecutar cualquier paso remoto

1. Autorización explícita del usuario para P9B, Hobby y presupuesto. R0 no la concede.
2. Identificar proyecto/entorno Railway y Supabase dedicado. Confirmar una réplica, un servicio, sin TCP público ni pares privados, sin autodeploy, suspensión ni PostgreSQL adicional.
3. Revisar la configuración IaC actual con CLI vigente y la cuenta elegida. Validación SDK local no equivale a aceptación por Railway ni prueba de su proxy real.
4. Revisar migraciones pendientes, RLS y grants mediante lectura autorizada; preparar backup y ensayo de restauración. Aprobar el SQL exacto antes de aplicarlo. No inferir que remoto tiene `authority_health` ni `authority_lease`.
5. Introducir secretos en Railway, separar VITE/servidor, revisar claves correctas sin imprimir valores. Nunca `--show-values` ni subir `.env`.
6. Dominio definitivo HTTPS, redirect Auth exacto, SMTP y flujo de recuperación confirmados.
7. Verificar presupuesto 2 GiB, 2 vCPU y límite de gasto en la cuenta real; aclarar coste variable y ausencia de garantía de capacidad.
8. Publicar release limpia y revisar sus hashes; los derivados públicos tienen procedencia del proyecto y Bungee tiene OFL. No subir originales personales.
9. Readiness restaurada, autenticación real, font/asset y WSS desde dos ordenadores/redes; cuatro usuarios supervisados. Validar que el edge sobrescribe forwarded como se documenta y que el puerto Node no tiene vía pública directa.
10. Ensayar reconexión/reinicio y rollback compatible, con registro de métricas y responsable de parada.

## Comandos locales y separación de permisos

Desde raíz, con variables de prueba previamente cargadas sin imprimir secretos:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm check
pnpm verify:public
pnpm verify:railway
node scripts/railway/audit-assets.mjs
git diff --check
```

Para incluir integración local: `NODE_EXTRA_CA_CERTS` apunta a la CA de laboratorio; `P9A_TLS_TESTS=1`, `P9A_TEST_DATABASE_URL` a `tft_remote_test`, `PERSISTENCE_TEST_URL` a `tft_persistence_test`, `P9B_FENCE_TEST_URL` a `tft_railway_fence_test`, todos PostgreSQL 127.0.0.1:55439. No usar estos scripts con bases reales. El laboratorio P9B usa otra base `tft_railway_test`, puertos TLS 9447/9448 y puerto Node libre. Ver [instrucciones](../scripts/diagnostics/p9b/README.md).

El preflight sin `--check-storage` no hace red. Con ese indicador hace lectura, pero no equivale a permiso para acceder a Supabase remoto. Aplicación de migraciones, configuración Auth, Railway `config apply`/`up`, contratación y push quedan pendientes de autorización posterior.


## F0-P9B-R1 — ejecución autorizada (26-10-2026)

Preflight refrescado: proyecto Supabase correcto, tres versiones iniciales, dos partidas cerradas, cuatro membresías, cero escritores activos observados y sin diferencias inesperadas. Copia acotada restaurada localmente; transacción remota con guardas y NOWAIT aplicó solo 202610260001/002. SQL e historial posterior verificados, RLS y permisos restringidos. Railway verificado y luego detenido; al reanudar repetir control de autoridad/estado, no reaplicar migraciones.

[Informe y evidencias](RAILWAY_FIRST_DEPLOYMENT_REPORT.md).

## C — actualización autorizada y verificada (26-10-2026)

C ya está completada: Site URL `https://tft-eunuco-private.up.railway.app/` y redirect HTTPS exacto añadidos; `http://127.0.0.1:4173/` conservado como redirect. Comparación de 243 campos Auth: solo site_url y uri_allow_list cambiaron. SMTP, usuarios, contraseñas y SQL sin modificaciones. Railway permanece detenido (REMOVED), sin nuevo despliegue y sin integrar P10A. Las menciones anteriores a C pendiente describen el cierre previo de A/B. [Verificación C](evidence/p9b-r1/auth-c-verification.json).
