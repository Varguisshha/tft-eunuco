# Seguridad de lobby — F0-P7B.2

El código no autentica. Cada canal exige usuario confirmado de Supabase, JWT vigente, sesión activa y perfil válido. Se revalidan sesiones cada 5 segundos en lobby y cada 15 segundos en partida; los comandos también rechazan inmediatamente el vencimiento conocido del JWT. Hay una ventana acotada entre una revocación externa y su comprobación periódica. Un refresco solo puede conservar el mismo UUID; resultados tardíos sobre credenciales reemplazadas no expulsan la sesión nueva.

Zod estricto rechaza atributos adicionales, UUID elegidos por cliente, códigos malformados, versiones ajenas y comandos DEV/económicos. Cada acción lleva requestId UUID. El servidor conserva hasta 128 identificadores por usuario con su payload normalizado: una repetición devuelve el estado actual sin repetir efectos; reutilizar ID con otro payload se rechaza. No es un registro persistente de recibos: se pierde con el proceso y tiene retención acotada.

Límites por UUID, compartidos entre reconexiones: 8 intentos de creación/unión por minuto y 90 solicitudes por minuto; el transporte limita 12 mensajes/segundo/canal y 4096 bytes. Los códigos válidos inexistentes devuelven indisponibilidad; salas llenas explican el problema. No existe endpoint de listado de salas. `lobby_gateway` y `private_match` se marcan privados. No hay cuotas distribuidas ni protección global por IP: no es un despliegue público y sigue siendo un servidor único de desarrollo.

Las mutaciones de aforo y pertenencia son síncronas antes de cualquier await. El inicio cambia a starting y reserva la transición antes de crear el destino. El permiso efímero de creación nunca se publica. La partida verifica whitelist aunque un extraño conozca su identificador. Un acceso rechazado no autodestruye la sala vacía. Los callbacks de destinos anteriores no afectan a un nuevo intento.

Solo se publican UUID, nombre, avatar, conexión y preparación. No viajan emails, JWT, contraseñas, metadatos administrativos ni recursos privados de otros jugadores. El anfitrión no gana permisos económicos ni de desarrollo.

## Cierre de comprobaciones anteriores

- Baseline: 689 pruebas / 49 archivos, `pnpm check` completo antes de editar.
- PostgreSQL **fixture aislado** con las dos migraciones: ocho transacciones concurrentes de registro, exactamente una aceptada; autorización y redacción de metadatos correctas. El fixture antiguo inicialmente carecía de la migración 0002: se aplicó y repitió la prueba. No se tocó ninguna cuenta real.
- Supabase **real**: nueva sesión autorizada de Florin, conexión a MatchRoom, cierre local de esa sesión, expulsión del socket activo con 4001 en el intervalo de 15s; reconexión con JWT revocado rechazada. No se revocaron las sesiones del propietario.
- Tokens expirados, suplantación, cambio de UUID, sesión ausente/revocada y expiración con canal activo: verificador controlado y sockets Colyseus reales de tests. El tiempo del JWT se controla en fixtures; no se afirma haber esperado su expiración natural en Supabase.
- La concurrencia de invitaciones verifica el trigger PostgreSQL real en un esquema de prueba; **no** ocho registros GoTrue en el proyecto remoto. No se crean cuentas adicionales para aparentar esa validación.

No se cambian RLS, políticas Auth, SMTP, migraciones remotas ni credenciales en esta fase. Gmail sigue siendo únicamente el transporte de pruebas ya autorizado.
