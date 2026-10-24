# F0-P7B.1-R — Activación real (parcial)

Fecha: 24 de octubre de 2026. **La integración remota no está activada ni validada.** El propietario ha indicado que hay que crear un proyecto en su organización. Falta autenticar la CLI para identificar esa organización, comprobar recursos existentes y verificar que la creación no active costes.

## Resultado de la auditoría

| Área                    | Resultado real                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Conexión                | CLI instalada 2.120.0; consulta `projects list` rechazada por falta de autenticación. Sin conector Supabase disponible.                           |
| Proyecto de desarrollo  | Ninguno vinculado a este repositorio; no se puede enumerar la cuenta sin login. No se ha creado ninguno.                                          |
| SDK                     | Supabase JS2.118.0 existente, sin reinstalar ni reconstruir.                                                                                      |
| Configuración           | No hay variables SUPABASE/SMTP/RESEND en el entorno; solo `.env.example`, sin valores reales.                                                     |
| Migraciones             | 202610240001_accounts.sql inspeccionada. Historial remoto, conflictos, propietarios y aplicación pendientes de acceso.                            |
| RLS                     | Validación anterior en PostgreSQL aislado; no sustituye las pruebas con dos identidades en Supabase remoto.                                       |
| Invitaciones            | Implementación existente preservada; emisión y concurrencia remotas pendientes.                                                                   |
| Correo                  | Sin proveedor/proyecto accesible; no se ha enviado ni recibido ningún correo real.                                                                |
| Registro y login        | E2E remoto pendiente; ninguna cuenta creada ni verificación desactivada.                                                                          |
| Sesiones y recuperación | Persistencia, renovación, revocación y recuperación reales pendientes.                                                                            |
| Perfiles                | Creación/edición/uniqueness remotas pendientes.                                                                                                   |
| Colyseus                | Integración existente conservada; no se ha afirmado una autenticación real contra Supabase.                                                       |
| Dos cuentas             | Pendiente de dos cuentas de prueba autorizadas y entrega de email funcional.                                                                      |
| Tests locales           | `pnpm check`:689 pruebas en49 archivos, typecheck/lint/build correctos. `pnpm verify:public` correcto.                                            |
| Git                     | Base f0ac0bd, misma rama; recursos ajenos intactos. Sin push. Cambios de esta revisión: preflight, comprobación de configuración y documentación. |
| P7B.2                   | No iniciada. Criterio de éxito remoto de P7B.1-R aún no alcanzado.                                                                                |

## Paso necesario del propietario

Ejecutar `supabase login` en su terminal y completar la autenticación oficial. No pegar tokens, contraseñas ni enlaces sensibles en el chat. Después indicar que el login ha terminado; se podrá listar organizaciones/proyectos y seleccionar el destino autorizado. Si hay varias organizaciones, habrá que identificar la correcta. No crear un proyecto hasta comprobar la organización y disponibilidad sin costes.

Más adelante serán necesarias dos direcciones de prueba autorizadas para correo y, si no sirve el SMTP predeterminado, configuración de un SMTP autorizado. No se solicitan claves en texto abierto ni se contrata un proveedor.

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

El [SMTP predeterminado de Supabase](https://supabase.com/docs/guides/auth/auth-smtp) solo permite direcciones del equipo y actualmente limita a2 mensajes/hora; esto no demuestra qué proveedor tendrá el proyecto por crear. Para otras direcciones habrá que configurar SMTP adecuado. No se ha contratado ningún servicio ni realizado ninguna entrega.

La [referencia CLI](https://supabase.com/docs/reference/cli/supabase-projects-create) y la ayuda de la CLI instalada se consultaron para preparar el acceso. No se ejecutó creación remota.

## Límites de esta revisión

No hay nuevas capturas de estados autenticados: sin configuración no se pueden acreditar. Se conserva Neon Playground y la validación visual anterior de estados públicos. No se ha cambiado UI, motor, economía, arena, guardados, personajes o mecánicas. La ausencia de acceso remoto bloquea esas operaciones, no invalida las689 pruebas locales.
