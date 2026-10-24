# Configurar Supabase — pendiente de entorno externo

No se encontraron URL, claves o proyecto Supabase configurados al implementar P7B.1. No se creó ningún recurso ni servicio de pago.

1. Elegir un proyecto Supabase autorizado (o Supabase local). Aplicar con CLI/SQL editor la migración `supabase/migrations/202610240001_accounts.sql` antes de permitir registros. Revisar el trigger sobre auth.users en un proyecto de prueba. No aplicar automáticamente sobre cuentas de producción existentes: se necesita una migración explícita de perfiles para usuarios previos.
2. Activar Email/password y **Confirm email**; desactivar proveedores anónimos/OAuth que no se ofrecen. Configurar mínimo de contraseña 12 caracteres y SMTP/rate limits. Signup debe estar habilitado para permitir el flujo, pero la migración lo restringe a invitaciones: no hay registro abierto. Si falla la migración, mantener signup deshabilitado.
3. Configurar Site URL y redirect allowlist exactos, por ejemplo `http://127.0.0.1:4173/` solo en desarrollo. No comodines de producción. Enlaces PKCE deben abrirse en el mismo navegador que inició registro/recuperación. Verificar plantillas de confirmación y recuperación con el flujo del SDK. En producción usar HTTPS y WSS.
4. Copiar los campos **públicos** de `.env.example` a `apps/web/.env.local`: VITE*SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY y VITE_GAME_SERVER_URL. Reiniciar Vite. No poner service_role ni sb_secret en variables VITE*. Las variables VITE se incluyen en el bundle.
5. Exportar SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY para el proceso del servidor. `pnpm dev:server` lee el entorno del proceso; no carga automáticamente un .env de la raíz. El servidor sin configuración rechaza acceso online y la web mantiene Partida local.
6. Solo para el proceso CLI de invitaciones, exportar SUPABASE_SERVICE_ROLE_KEY. Ejecutar la CLI de PRIVATE_REGISTRATION.md. No guardar claves en el repo ni entregar la service role al servidor de partidas.
7. Crear dos cuentas **de prueba** mediante invitaciones; confirmar emails, login, edición y avatar, recarga, logout, recuperación, nueva contraseña y partida de prueba. Comprobar revocación externa, RLS y que los nombres/UUID enviados manualmente no sustituyen la identidad verificada. Esta lista está pendiente contra Supabase real.

## Validación local reproducible

`pnpm check` ejecuta suite TypeScript, contratos, SDK con dobles y sockets Colyseus reales con verificador controlado. No necesita secretos. `pnpm verify:public` verifica exclusión de herramientas DEV.

SQL se ha probado en un PostgreSQL **desechable** con roles/tablas Auth mínimos de fixture. Nunca ejecutar bootstrap sobre un proyecto Supabase real ni una base del usuario:

```sh
initdb -D /tmp/tft-auth-fixture -A trust --no-locale
pg_ctl -D /tmp/tft-auth-fixture -l /tmp/tft-auth-fixture.log -o '-h 127.0.0.1 -p 55439' start
psql -h 127.0.0.1 -p 55439 -d postgres -v ON_ERROR_STOP=1 -f supabase/tests/bootstrap.sql -f supabase/migrations/202610240001_accounts.sql -f supabase/tests/authorization.sql
TFT_TEST_DATABASE_URL=postgresql://127.0.0.1:55439/postgres python3 supabase/tests/concurrency.py
pg_ctl -D /tmp/tft-auth-fixture stop
```

La fixture ejecuta SQL/RLS reales, pero **no** reproduce todos los triggers internos de GoTrue ni el envío de correos. Por tanto no demuestra integración end-to-end de Supabase. La contraseña no se almacena en la fixture y no contiene cuentas del usuario.
