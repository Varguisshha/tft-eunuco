# Estado vigente — F0-P7C.2 (25/10/2026)

Las salas privadas conectan ahora el lobby existente con el motor de 2–4 participantes. LobbyHub congela UUID y perfiles verificados; private_match deriva la capacidad del permiso interno y espera todas las conexiones y suscripciones. RemoteCoordinator acepta el contrato f0p7c1-1 y proyecta únicamente economía propia y duelo autorizado. El motor, sus emparejamientos y las fórmulas no cambian.

[Informe, evidencias y limitaciones](MULTIPLAYER_4P_INTEGRATION.md). Las restricciones de capacidad dos que figuran debajo pertenecen al histórico y quedan sustituidas por este estado.

---

> **Estado F0-P7C.1 (25/10/2026):** motor de rondas para 2–4, lobby real limitado a dos. [Informe](F0_P7C1_REPORT.md). Los apartados de fases anteriores son históricos.

> **Estado actual F0-P7B.2 (24/10/2026):** salas privadas implementadas; partidas funcionales de dos. [Informe](F0_P7B2_REPORT.md). Los apartados anteriores de fases se conservan como histórico.

> **F0-P7B.1-R (24/10/2026): flujo principal real verificado.** Supabase Free conectado; dos cuentas confirmadas por correo, perfiles/RLS, recuperación y partida Colyseus hasta ronda 2 comprobados. Quedan escenarios adicionales de borde detallados en [SUPABASE_REAL_VALIDATION.md](SUPABASE_REAL_VALIDATION.md). F0-P7B.2 no iniciada.

# Actualización F0-P7B.1

El acceso de producción a test_match requiere Supabase verificado. El UUID de cuenta es propietario; sessionId solo identifica la conexión. Dos perfiles diferentes reemplazan Vargas/Florin en online. No se implementan salas finales ni matchmaking. Los nombres provisionales quedan solo en local y fixtures explícitas.

Ver [AUTH_SYSTEM.md](AUTH_SYSTEM.md), [PLAYER_PROFILES.md](PLAYER_PROFILES.md), [SUPABASE_SETUP.md](SUPABASE_SETUP.md) y [PRIVATE_REGISTRATION.md](PRIVATE_REGISTRATION.md). El contenido anterior se conserva como histórico.

---

# F0-P7A — Fundación multijugador

## Arquitectura implementada

`apps/server` ejecuta Node y Colyseus. `MatchRoom` mantiene una instancia de `AuthoritativeMatch`: dos participantes, un pool, un MatchClock monotónico y una traza de combate. Los callbacks de comandos son síncronos, sin await dentro de la transacción. El orden de recepción en el event loop define el orden de aplicación; no se promete un orden basado en relojes cliente.

`packages/game-core` conserva las transacciones existentes. `applySharedEconomy` añade un contexto **interno** de reservas ajenas y prefijo de identidad; `validateMatchState` suma esas reservas a la conservación local. Las llamadas históricas sin contexto conservan exactamente su comportamiento. La liquidación usa la misma función económica, con estrellas reales de los perfiles participantes. No hay segunda tabla de precios, ingresos, XP, daño o probabilidades.

`packages/shared/network.ts` define protocolo estricto `f0p7a-1`. `RemoteCoordinator` traduce snapshots a una proyección de presentación que utiliza LocalSession, LocalGame, Shop, Bench, UnitInspector, GameCanvas y CombatPlayback existentes. Esta proyección NO es un guardado: pool vacío, semillas privadas ausentes, historial ausente. La disponibilidad de compra se calcula en servidor. No debe pasarse a restoreMatch ni utilizarse como autoridad.

LocalSession conserva `coordinator` exclusivamente local (persistencia y DEV); `authority` selecciona el adaptador de presentación local/remoto. El host local nunca pulsa ni guarda el remoto. Multijugador no monta DevelopmentAccess. Los comandos de fases y DEV no existen en el schema de intención de red.

## Tecnologías verificadas

- Node instalado: 26.9.0; proyecto exige >=22.12, Colyseus core exige >=22.
- @colyseus/core 0.18.23; @colyseus/ws-transport 0.18.4; @colyseus/sdk 0.18.6.
- TypeScript ~5.9.3; tsx 4.23.15; esbuild 0.28.2; validación Zod.
- Dependencias fijadas en manifests/lock. La extensión nativa opcional msgpackr-extract no ejecuta scripts; se usa el camino JS.

APIs consultadas antes de instalar: [servidor vigente](https://docs.colyseus.io/server), [transporte WebSocket](https://docs.colyseus.io/server/transport/ws), [SDK](https://docs.colyseus.io/sdk). Se confirmó v0.18 en documentación y versiones del registro; no se copiaron ejemplos 0.15/0.16. Se usa defineServer/defineRoom y mensajes explícitos, sin Schema que difunda inadvertidamente el estado interno.

## Identidad y visibilidad

La primera conexión recibe Vargas/south; la segunda Florin/north. sessionId se asigna por Colyseus, se compara con el socket receptor y nunca se acepta como autoridad por sí solo. Los nombres son perfiles temporales, no cuentas ni autenticación definitiva. Una tercera conexión se rechaza. La sala se bloquea al completar dos plazas; una desconexión no abre una identidad sustitutiva.

Cada receptor recibe su economía, tienda, inventario y ledgers. Son públicos ID/nombre, conexión, vida, nivel y **formación desplegada durante todas las fases**. El banquillo rival, tienda, oro, XP, racha, historial y semillas económicas no se envían. El pool global se conserva solo en servidor: no se publica porque permitiría deducir compras/reservas. No hay protocolo de espectadores en esta fase.

Al comenzar combate se revela la traza completa, incluido resultado futuro; el HUD presenta el resultado al liquidar. Un cliente modificado puede inspeccionar ese resultado antes de la reproducción. Es una limitación explícita del envío precalculado permitido en P7A, no autoridad cliente.

## Ejecución local

Desde la raíz:

```sh
pnpm install
pnpm dev:server
# En otra terminal
pnpm --filter @tft/web exec vite --host 127.0.0.1 --port 4173
```

Abrir http://127.0.0.1:4173/ → Multijugador de prueba → Crear partida de prueba. Copiar el identificador técnico mostrado y, en otra ventana/pestaña, elegir Multijugador de prueba → Unirse a la sesión. Pulsar Iniciar partida con ambos conectados. Son dos sockets y dos almacenes React independientes, no dos jugadores dentro de un estado local.

Build completo: `pnpm build`. Servidor compilado: `pnpm --filter @tft/server start`. El bundle incluye los paquetes internos puros; las dependencias externas permanecen instaladas en el workspace. No se publica un paquete autónomo ni se configura despliegue.

Servidor ligado a 127.0.0.1:2567. Dos navegadores **en este equipo** funcionan; un segundo ordenador requiere una fase posterior de dirección/configuración/exposición. No se abre la LAN ni Internet en P7A.

## Vida de sesión y límites

Crear → unir dos → inicio explícito → rondas automáticas → terminado si cualquiera llega a 0 → destrucción. Sin clientes, Colyseus elimina la sala. Espera sin inicio: máximo 5 minutos. Límite de vida de sala: una hora. Finalizada: 60 segundos para revisar resultado. Cerrar una conexión conserva formación/economía y el reloj sigue para el restante. No hay reconexión, reemplazo, persistencia ni recuperación tras reiniciar proceso.

La futura cuenta debe resolver playerId detrás del transporte sin cambiar economía. La futura persistencia guardará estado autoritativo, RNG, reservas, transición y liquidación; jamás importará un snapshot enviado por un navegador. No se implementa F0-P7B/P7D.

## F0-P7B.2 — Salas privadas

La entrada de usuario pasa por sala privada, código y Listo. El gateway usa la identidad Supabase existente; una fábrica interna crea la partida de dos con whitelist. Lobbies de hasta cuatro sin emparejamientos de cuatro. `test_match` se conserva para compatibilidad y tests, fuera del menú nuevo.

Contratos, operación y ciclo: [PRIVATE_LOBBIES.md](PRIVATE_LOBBIES.md). Seguridad y evidencias: [LOBBY_SECURITY.md](LOBBY_SECURITY.md). Transición: [LOBBY_TO_MATCH.md](LOBBY_TO_MATCH.md).

## F0-P7C.1 — Motor de rondas 2–4

AuthoritativeMatch admite capacidad interna 2–4, historial y duelos independientes; MatchRoom publica la traza del receptor. Producción conserva capacidad 2. Los escenarios 3/4 solo están registrados en tests SDK con identidades controladas.

Detalles: [emparejamientos](MATCHMAKING_2_TO_4.md), [fantasmas](GHOST_COMBAT.md), [duelos paralelos](PARALLEL_COMBATS.md).


## F0-P7C.3 — ciclo competitivo

La autoridad incorpora estado competitivo separado de conexión, liquidación global de eliminaciones, puestos definitivos y espectadores de la propia partida. Selección de supervivientes y retorno de pool ocurren en AuthoritativeMatch; MatchRoom autoriza frames parciales; RemoteCoordinator consume puestos y resultados sin recalcularlos. Véanse [eliminaciones](ELIMINATION_RULES.md), [espectadores](SPECTATOR_MODE.md) y [finalización](MATCH_COMPLETION.md).
