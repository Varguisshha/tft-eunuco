# F0-P11D — Registro sin invitación, preparación local

Estado: implementación local y pruebas de contrato/base de datos. No se ha abierto el registro remoto ni se han cambiado Supabase, SMTP, usuarios reales o configuración de Auth. El código de lobby sigue siendo obligatorio para entrar en una sala privada.

## Flujo y activación acotada

El modo `open-local` elimina invitación de cuenta del formulario y de los metadatos de registro. Pide correo, usuario, contraseña y confirmación; envía el alta a Supabase y conduce a verificación de correo, inicio de sesión y salas privadas. Mantiene validación de usuario normalizado, contraseña de 12–128 caracteres y respuesta de recuperación sin enumeración. El servidor de juego sigue rechazando usuarios sin correo confirmado, anónimos, sesión cerrada o JWT caducado.

El modo público por defecto continúa `invited`. Tanto la configuración Vite como el módulo de modo rechazan activar `open-local` fuera de `local`/`local-isolated`. Manipular el cliente no abre el registro: la función remota de creación de perfiles conserva la exigencia de invitación. No hay migración nueva en la carpeta automática `supabase/migrations`.

`pnpm dev:local` ofrece `/__local/auth-preview`, una vista real del formulario con proveedor desconectado y claves públicas vacías. No crea cuentas ni envía correos ni solicita CAPTCHA externo. Su texto lo declara y el envío está deshabilitado. La ruta solo se sirve en loopback con Host exacto; no forma parte del servidor público.

## Protección contra automatización

Integración de Cloudflare Turnstile con renderizado explícito, tokens solo en memoria y entrega a Supabase en `options.captchaToken`, nunca en metadatos, almacenamiento o logs. Caducidad, error, cambio de formulario y cada envío limpian el token; cada reintento necesita una prueba nueva. El mismo contrato protege login, recuperación y reenvío cuando el modo preparado se activa. Sin sitekey o prueba, el formulario falla cerrado. Campo trampa adicional, sin considerarlo frontera de seguridad.

La verificación real del token corresponde a GoTrue. Antes de cualquier apertura remota habrá que configurar CAPTCHA y límites de Auth por IP/solicitud, verificar confirmación de correo habilitada y probar el proveedor. Una validación del navegador no sustituye esas protecciones.

## SQL solo para fixture local

`supabase/local/202610270001_open_registration.sql` está fuera de migraciones automáticas, exige base `tft_signup_p11_*` y dirección local. Sustituye solo el trigger de perfil en ese fixture, preserva normalización, restricciones y RLS, y añade dos cuotas globales: cinco altas por ventana fija de cinco minutos y 24 por ventana fija de una hora. No usa un indicador controlable por metadatos ni consume invitaciones. Bloqueo transaccional serializa solicitudes simultáneas; una colisión de usuario o cuota revierte alta, perfil y contador juntos. Contadores privados sin permisos para anon/authenticated/service_role.

Estas cuotas protegen altas confirmadas por inserción; los intentos fallidos anteriores a la base y las solicitudes por IP deben limitarse además en GoTrue. No se presenta la cuota SQL como sustituto de CAPTCHA o del rate limiting del proveedor.

## Pruebas y límites

- 49 pruebas de contrato de registro invitado/abierto, esquema, servicio y verificación del servidor: sin invitación en el nuevo payload, normalización, errores, honeypot, CAPTCHA obligatorio, login/recuperación protegidos y rechazo del modo en entornos públicos.
- `node supabase/tests/p11-open-registration.mjs`: crea una base local desechable sin credenciales, prueba primero el registro cerrado histórico, aplica únicamente el SQL local y verifica alta abierta, unicidad, validación, rollback, RLS y privacidad. Ocho solicitudes simultáneas producen exactamente cinco altas y contadores consistentes. No usa archivos de entorno del proyecto ni APIs remotas.
- Capturas y métricas `artifacts/p11/d/register-{1280,1440,1920,2560,3840}.png`: formulario sin invitación, campos esperados, envío bloqueado por falta de proveedor, cero overflow global, cero errores y cero solicitudes externas.
- **No se ha ejecutado un alta real de GoTrue, envío/confirmación de correo o verificación CAPTCHA real en esta fase.** Docker local no está disponible; PostgreSQL usa un fixture de `auth.users`, no emula la seguridad completa de GoTrue. Los contratos y la SQL pasan; el E2E real de proveedor queda pendiente y no debe darse por probado antes de abrir online.

## Apertura remota posterior, no ejecutada

Requerirá autorización específica y entrega separada: preflight/backup del proyecto autorizado; versión de SQL revisada para producción; CAPTCHA verificado por GoTrue con sitekey/secret por canal seguro; confirmación de correo y límites comprobados; configuración pública habilitada expresamente; prueba de alta, verificación, login, recuperación, reenvío y lobby con cuentas de prueba consentidas; rollback del modo público si falla. No copiar a producción la SQL restringida al fixture ni desactivar protecciones para pasar pruebas.

Fuentes de integración: [Supabase CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha) y [Turnstile explícito para SPA](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/), consultadas el 27-10-2026. No se incorporan recursos gráficos oficiales de TFT.

Validación de proyecto: typecheck, lint, suite completa y builds web/servidor aprobados (`artifacts/p11/audit/check-d-final.log`). Revisión visual independiente SHIP, limitada al formulario local, documentada en `F0_P11D_VISUAL_REVIEW.md`. La política CSP pública actual también necesitará revisión explícita antes de cargar Turnstile online; no se ha ampliado ahora.
