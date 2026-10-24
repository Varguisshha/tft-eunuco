# Servidor local F0-P7A

`pnpm dev:server` desde la raíz inicia Node/Colyseus en127.0.0.1:2567.

`pnpm build` compila cliente y servidor; `pnpm --filter @tft/server start` ejecuta el bundle compilado. No ejecutar dev y start a la vez en el mismo puerto.

En la web, Multijugador de prueba permite crear una sesión y unirse desde otra ventana mediante su ID técnico. No es un sistema final de invitaciones. Primer jugador Vargas; segundo Florin. Ambos deben conectarse antes de Iniciar partida.

Estado exclusivamente en memoria. Reiniciar pierde las sesiones. Sin cuentas, base de datos, reconexión ni despliegue. Solo loopback. Documentación: [arquitectura](../../docs/MULTIPLAYER_ARCHITECTURE.md), [protocolo](../../docs/SERVER_PROTOCOL.md), [autoridad](../../docs/AUTHORITATIVE_MATCH.md).
