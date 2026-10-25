# Salas privadas — F0-P7B.2

El menú Jugar permite crear una sala, entrar por código o volver a Partida local. Los perfiles siguen en Supabase; las salas están en memoria de un único proceso Colyseus. Reiniciar el servidor elimina salas, códigos y partidas. No hay búsqueda pública, recuperación de combate ni persistencia de salas.

## Componentes

- `packages/shared/src/lobby.ts`: contratos Zod, versión `f0p7b2-1`, normalización y explicación de requisitos de inicio.
- `LobbyHub`: autoridad de participantes, códigos, permisos, preparación, presencia y transición. No conoce economía ni combate.
- `lobby_gateway`: canal Colyseus privado por cuenta. Autentica con el mismo verificador Supabase que MatchRoom. Publica exclusivamente la sala del titular.
- `private_match`: extiende MatchRoom y usa AuthoritativeMatch sin cambiar sus reglas. Solo se crea con un permiso efímero interno del servidor, y solo admite los UUID capturados al iniciar.
- `Multiplayer.tsx` y `lobby.css`: menú, creación, código, participantes y enlace a RemoteCoordinator/LocalGame.

## Ciclo de vida

`waiting → starting → in_match → closed`. Un fallo de creación o entrada devuelve a `waiting`, borra destino y preparación. `closed` se publica antes de limpiar índices. También puede cerrarse desde `waiting` por anfitrión, vacío o caducidad.

Una cuenta solo mantiene un canal activo y una sala. Otra ventana activa se rechaza. Un nuevo canal puede recuperar el lobby durante 30 segundos de ausencia, conservando plaza pero no Listo. Al expirar la gracia se retira el participante. El anfitrión saliente transfiere su puesto al primer participante conectado en orden de entrada, o al primero restante si todos están ausentes. No se reemplazan identidades por nombres.

Las salas caducan tras 15 minutos sin acciones aceptadas que cambien su estado. Sincronizar o repetir una solicitud no extiende ese plazo. La gracia se barre también cuando desaparece el último canal. Los límites y recibos se limpian al caducar su ventana y no existir conexión ni membresía. La partida tiene los límites de tiempo de MatchRoom.

## Códigos y preparación

Ocho caracteres del alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (40 bits), generados con `crypto.randomInt`; se presentan `XXXX-XXXX`. Se normalizan espacios, guiones y mayúsculas. La unicidad se comprueba entre códigos activos; al cerrar se revocan. Son independientes de invitaciones de registro.

La preparación es un booleano explícito del emisor. Entrar, salir, cambiar capacidad o perder conexión invalida preparación según corresponda. Una solicitud repetida no vuelve a ejecutar la acción. Al comenzar se congela el roster antes de esperar la creación de partida.

## Capacidades

Se admiten 2, 3 o 4 plazas. Solo una sala configurada para **2**, con dos participantes conectados y listos, permite jugar. El anfitrión puede reducir la capacidad si caben todos; todos deben prepararse de nuevo. Las salas de 3/4 indican F0-P7C y bloquean el inicio, aunque temporalmente tengan dos ocupantes. No se implementa emparejamiento múltiple.

## Uso local

Con los archivos `.env.local` existentes: `pnpm build:local`, `pnpm --filter @tft/server build`, `node --env-file=.env.local apps/server/dist/main.js`, `pnpm preview:local`. Abre `http://127.0.0.1:4173/`, Salas privadas, inicia sesión y entra en Jugar. Usa navegadores distintos para dos cuentas. El servidor está limitado a loopback: compartir un código no hace accesible el juego desde otro ordenador. No se inventa URL pública ni deep link.

La nueva superficie hereda Festival Pop × Neon Playground: GameFrame, GameIcon, FestivalPop, DM Sans y tokens existentes. La composición tiene ancho máximo de 1220px para no crecer sin límite en monitores grandes; se apila y permite desplazamiento vertical en móvil. El HUD de combate y el modo local permanecen independientes.
