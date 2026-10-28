# F0-P7B.1-R — Activación real (parcial)

Fecha: 24 de octubre de 2026. **Proyecto remoto creado y vinculado; flujo principal E2E verificado; escenarios adicionales pendientes.** El usuario solicitó una organización independiente. Se creó TFT EUNUCO en Free y su proyecto de desarrollo sin borrar Sillage ni alterar los otros proyectos.

## Estado final verificable

| Área                  | Resultado                                                                                                                                                                                                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Conexión              | API Auth, PostgreSQL y servidor Colyseus conectados al proyecto real.                                                                                                                                                                                                                            |
| Proyecto              | `tft-eunuco-dev` / `qiombjvkaolllnjqzspz`, organización TFT EUNUCO / `xreevrfhfpwmhtggfhry`, eu-west-1, Free/Nano verificado. Sillage intacto.                                                                                                                                                   |
| Migraciones           | `202610240001` y `202610240002` aplicadas; inspección previa y dry-run sin conflictos.                                                                                                                                                                                                           |
| RLS                   | Pruebas REST con dos usuarios y prueba SQL remota transaccional correctas; lectura anónima rechazada.                                                                                                                                                                                            |
| Invitaciones          | CLI privada emitió dos tokens ligados a email; registros consumieron una vez cada invitación y crearon perfiles/auditoría. Limpieza de metadata corregida y comprobada. Expiración, reutilización, email distinto y unicidad/rollback verificados por SQL remoto; concurrencia GoTrue pendiente. |
| Correo                | Gmail SMTP guardado por propietario; dos confirmaciones y recuperación recibidas. Solo pruebas, entregabilidad de producción no acreditada.                                                                                                                                                      |
| Registro/login        | Dos registros API con invitación y confirmación real; login posterior y rechazo previo a confirmar comprobados. Registro visual PKCE no repetido.                                                                                                                                                |
| Sesiones/recuperación | Refresh real, logout/revocación y socket revocado rechazado; recarga del navegador conserva identidad. Recuperación iniciada desde Safari con PKCE; propietario cambió contraseña e inició sesión; Safari muestra Vargas, contraseña anterior rechazada.                                         |
| Perfiles              | UUID persistente, edición propia/avatar, lectura autenticada, unicidad, identidad inmutable y bloqueo cruzado A/B correctos.                                                                                                                                                                     |
| Colyseus              | Producción sin mocks, identidad Supabase real; tokens falsos/ausentes, duplicados y cambio de identidad rechazados.                                                                                                                                                                              |
| Partida               | Dos compradores, despliegue, mismo trace/resultado, daño/recompensas coherentes y ronda 2.                                                                                                                                                                                                       |
| Tests                 | 689 pruebas/49 archivos, typecheck/lint/build y verify:public correctos. Regresión SQL local y remota correctas. Scripts opt-in añadidos y lint posterior correcto.                                                                                                                              |
| Límites               | Concurrencia contra GoTrue remoto, enlaces caducados/reutilizados, registro visual PKCE y expiración natural de JWT no se declaran superados.                                                                                                                                                    |
| Acción manual         | Ninguna necesaria para el flujo principal. Vargas tiene contraseña elegida por propietario; Florin conserva credencial temporal privada. Para usar Florin personalmente, solicitar recuperación desde la web.                                                                                    |
| Git                   | Misma rama, sin push, recursos ajenos preservados. Cambios: migración correctiva, regresión SQL, escenarios de integración y documentación.                                                                                                                                                      |
| P7B.2                 | No iniciada. Criterio principal de dos cuentas y partida real demostrado; matriz exhaustiva adicional sigue parcial.                                                                                                                                                                             |

## Pruebas reales completadas después de activar Gmail

- Propietario guardó Gmail SMTP en Supabase y confirmó la recepción y apertura de los dos correos de registro. Auth creó ambas cuentas sin sesión antes de confirmar; el login previo rechazó ambas con `email_not_confirmed`.
- Registro realizado mediante API Auth pública y dos invitaciones emitidas por la CLI privada existente. Contraseñas aleatorias solo en ficheros privados 0600 fuera del repositorio. No se usó autoconfirm ni creación administrativa de usuarios.
- Tras confirmación: login válido, UUID persistente, perfil automático, edición propia y avatar, lectura compartida, bloqueo de edición ajena en ambos sentidos, UUID inmutable, nombre duplicado rechazado, private y RPC administrativa inaccesibles, refresh real y contraseña incorrecta rechazada.
- Colyseus de producción en 127.0.0.1:2567 con entorno público: dos cuentas reales Vargas/Florin, UUID distinto de sessionId, nombre falsificado ignorado, token falso/ausente y duplicación de cuenta rechazados; tiendas privadas, compra y despliegue por ambos jugadores, reloj automático, mismo trace, daño/resultado coherente, 11 oro por jugador y ronda 2. Cambio de identidad en socket rechazado con 4001.
- Trace SHA256: `b86ea067c3dcff0bab989f5b02f4c5deb381faa6158a9b5fb72e251c414ae758`. Vida en ronda 2: 97/97. Un cierre 4002 en el registro corresponde a la prueba deliberada de cuenta duplicada.
- Logout real: RPC de sesión devuelve false, socket con JWT revocado rechazado y refresh invalidado. Al concluir se revocaron globalmente las sesiones temporales de las dos cuentas; no se eliminaron cuentas ni perfiles.
- Navegador integrado: login real de Vargas, edición y guardado del avatar Pulso, recarga y restauración sin credenciales. Capturas de inicio/perfil/edición a escritorio y perfil móvil; no se cambió el HUD. La pestaña local y guardados se conservaron.
- `pnpm check` repetido: 689/49 correctos, typecheck/lint/build correctos. `pnpm verify:public` correcto. Fixture SQL aislada con ambas migraciones y regresión de reescritura de metadata: correcta.

## Corrección encontrada con GoTrue real

La limpieza del AFTER INSERT no bastaba: GoTrue vuelve a escribir raw_user_meta_data después del trigger inicial. Se observaron 2 cuentas con el campo de invitación persistido. La migración aditiva `202610240002_redact_invitation_metadata.sql` incorpora limpieza BEFORE UPDATE de ese campo y sanea únicamente el campo consumido de cuentas con auditoría de invitación. Prueba remota en transacción con ROLLBACK: elimina invitación y conserva otros metadatos. Dry-run y aplicación confirmados; recuento posterior: 0 invitaciones en metadata. La prueba SQL local ahora reproduce la escritura posterior de GoTrue.

## Recuperación real completada

Recuperación solicitada desde el formulario del juego en Safari, que usa SDK PKCE. El propietario confirmó recepción, cambio de contraseña (sin revelarla) e inicio de sesión. Se observó la pantalla autenticada de Vargas en Safari y el login con la contraseña temporal anterior devolvió `invalid_credentials`. Se eliminó la contraseña obsoleta del fichero privado de pruebas. No se leyó ni almacenó la nueva contraseña.

Los dos registros iniciales se realizaron por API Auth y usaron confirmación implícita; esto valida entrega/verificación y no sustituye una prueba de registro visual PKCE. Los tokens temporales de esas pruebas fueron revocados. El flujo de recuperación sí se originó desde el SDK PKCE de la web. No guardar enlaces completos en logs/capturas.

## Reproducción de escenarios reales

Los scripts `scripts/supabase/validate-real-auth.mjs`, `validate-real-match.mjs` y `validate-real-logout.mjs` son opt-in: requieren `TFT_E2E_DIR` apuntando a ficheros privados de las dos cuentas autorizadas y `.env.local` con URL/clave pública. No contienen contraseñas ni emails de los usuarios. No se ejecutan con la suite local. auth requiere `vargas_test.json` y `florin_test.json` (email, password, user_id), genera sesiones privadas; match usa esas sesiones y el servidor real; logout revoca la sesión de Florin. Solo usar cuentas de prueba autorizadas: auth modifica nombre visible y avatar y prueba restricciones; match espera una ronda real. Las contraseñas temporales pueden dejar de servir después de recuperación; no reintentar usando credenciales antiguas.

Evidencias locales en `artifacts/p7b1r/` (directorio ignorado): real-match.log, redaction-sql.log, home-authenticated.png, edit-desktop.png, profile-mobile.png. La primera captura edit-mobile se tomó durante el ajuste de viewport y no se considera evidencia visual válida; profile-mobile sí se inspeccionó después de estabilizarse.

## Evidencia y recuperación

La consulta múltiple de preflight por CLI devolvió solo el último resultado; se repitieron individualmente todas las consultas de catálogo en transacciones de solo lectura. No había objetos de la aplicación ni conflictos. La primera simulación falló con el rol temporal de CLI; se repitió con la contraseña DB del proyecto capturada de forma privada y terminó correctamente. La aplicación posterior y el historial remoto confirmaron la versión. No se ejecutaron reset, repair, DROP ni borrado de usuarios. Ante cambios posteriores, usar migraciones correctivas revisadas sin eliminar cuentas/perfiles.

## Reanudación segura

1. Enumerar organizaciones y proyectos con la CLI autenticada; descartar duplicados y producción. Confirmar cuenta/plan/región y disponibilidad de un proyecto de desarrollo sin cargos. Crear solo ese proyecto, conservando sus secretos fuera de Git/logs.
2. Identificar project ref y vincularlo al repositorio. Inspeccionar historial remoto de migraciones; ejecutar `supabase/preflight.sql` mediante conexión autorizada. Este archivo solo consulta catálogo, nunca filas de usuarios o secretos.
3. Inspeccionar diferencias con la migración existente y realizar dry-run de las pendientes. Si hay objetos preexistentes o cuentas sin perfil, detener la aplicación hasta resolver específicamente el conflicto; no ejecutar reset, DROP ni repair de historial para forzar éxito.
4. Recuperación: conservar copia privada del esquema previo y resultados del catálogo, revisar el cambio como transacción y mantener signup cerrado durante aplicación. Ante fallo, rollback transaccional; tras una aplicación confirmada, corregir mediante una migración posterior revisada, sin borrar cuentas/perfiles. No reembolsar invitaciones automáticamente.
5. Configurar Auth: email/password, confirmación obligatoria, mínimo12 caracteres, Site URL y redirect exactos `http://127.0.0.1:4173/`. Sin comodines. Evaluar SMTP y límites antes de pruebas; no usar autoconfirm para eludir correo.
6. Guardar URL/clave pública en entorno del frontend y servidor, clave privilegiada solo en proceso administrativo. Ejecutar `node scripts/supabase/check-config.mjs`: informa presencia y rechaza indicios de claves privilegiadas VITE sin imprimir valores. Es un control estático de configuración, no una prueba de conexión ni un escaneo exhaustivo del bundle.
7. Ejecutar matriz E2E: invitación válida/caducada/usada/email distinto/sin invitación; confirmación; login válido/incorrecto/no confirmado; recarga/refresh/logout/revocación/recuperación; edición/username duplicado; RLS A↔B e identidad inmutable; tablas/RPC administrativas inaccesibles.
8. Dos clientes independientes con las cuentas: crear/unir sesión de prueba, verificar UUID/perfiles, comprar/desplegar, combate/recompensas/daño/ronda siguiente y suplantación rechazada. Capturas sin contraseñas, JWT ni enlaces de confirmación completos.
9. Validar pantallas autenticadas a escritorio/móvil y marcar resultados uno a uno con evidencia. No sustituirlos por los tests con dobles ya existentes.

## Correo: documentación comprobada

El [SMTP predeterminado de Supabase](https://supabase.com/docs/guides/auth/auth-smtp) solo permite direcciones del equipo y actualmente limita a2 mensajes/hora; esa fue la configuración inicial. Posteriormente el propietario configuró Gmail SMTP de pruebas y se verificaron confirmaciones y recuperación con las dos cuentas autorizadas. No se ha contratado un servicio de pago.

La [referencia CLI](https://supabase.com/docs/reference/cli/supabase-projects-create) y la ayuda de la CLI instalada se consultaron para preparar el acceso. Se crearon la organización y el proyecto indicados, sin activar un plan de pago.

## Límites de esta revisión

Hay capturas de inicio y perfil autenticados y edición; se conserva Neon Playground. El registro visual con invitación todavía no se declara acreditado. No se ha cambiado UI, motor, economía, arena, guardados, personajes o mecánicas. Dos cuentas y entrega están verificadas; siguen pendientes registro visual PKCE, caducidad/reutilización de enlaces, expiración natural de JWT y concurrencia de invitaciones contra GoTrue remoto. Las pruebas locales no sustituyen esos escenarios.

## SQL remoto reproducible

`supabase db query --linked --file supabase/tests/remote-authorization.sql --output json` ejecuta una fixture transaccional sobre el proyecto de desarrollo: no bootstrap, colisiones de IDs detectadas, eliminación limitada a la sesión creada dentro de esa transacción y ROLLBACK final. No usar sobre producción. Comprueba email/invitación ausente/caducada/reutilizada, normalización, auditoría, unicidad con rollback de consumo, grants/RLS y revocación. La ejecución remota terminó correctamente y no dejó cuentas fixture persistentes. No equivale a concurrencia ni a entrega de correo por GoTrue.

## Continuación P7B.2

Revocación durante una conexión activa comprobada contra Supabase real con una nueva sesión de Florin; esa sesión fue cerrada sin revocar la del propietario. Concurrencia de ocho registros y autorización repetidas en PostgreSQL aislado con ambas migraciones. La caducidad de JWT se prueba con verificador controlado y sockets reales, sin afirmar expiración natural remota. Partida real desde el nuevo lobby Vargas–Florin hasta ronda8, con compra, despliegue y Overtime: [informe](F0_P7B2_REPORT.md).
