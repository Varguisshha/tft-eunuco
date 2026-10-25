# Lobby → partida autoritativa

1. El anfitrión pide `start_match` con requestId. Se verifica waiting, capacidad 2, dos cuentas presentes y ambas listas.
2. Se reserva starting sin await, se bloquean incorporaciones/configuración y se captura una lista inmutable de UUID.
3. El servidor registra un permiso criptográfico efímero y crea `private_match`. Una petición directa del cliente no puede fabricar ese permiso. Se elimina incluso si falla la creación.
4. El destino usa AuthoritativeMatch y la autenticación Supabase ya existentes. `onJoin` coteja UUID contra whitelist; la identidad del cliente no procede de sus opciones.
5. Solo los participantes reciben matchId en su snapshot de lobby; el frontend se une mediante RemoteCoordinator, sin introducir otro motor.
6. Ambos clientes se suscriben con sync; el destino inicia automáticamente tras tener ambos jugadores y ambas suscripciones. El lobby pasa a in_match. El servidor sigue siendo autoridad de reloj, compras, despliegue, combate y resultados.
7. A los 25 segundos sin completar la transición se cancela el destino y se restablece waiting sin Listo. Una creación tardía se destruye; un fallo/cierre tardío de un intento antiguo no cancela el siguiente. Salir o desconectarse durante starting también cancela.
8. Al terminar/destruirse la partida se cierra el lobby. Tras inicio no se ofrece reconexión de combate. El botón Salir de la partida abandona el canal de partida y su pertenencia al lobby.

El roster se mantiene limitado a dos; las salas de cuatro solo preparan los contratos y UX de F0-P7C. No cambia semilla, pool, perspectiva, economía ni simulación. `test_match` conserva compatibilidad con pruebas anteriores, pero no se presenta como flujo de usuario en el menú nuevo.
