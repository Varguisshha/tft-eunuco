# TFT EUNUCO · F0-P3

Arena interna de un autobattler original: tablero hexagonal isométrico, preparación interactiva y combate automático determinista con reproducción Phaser. Partida local con economía, tienda, banquillo, progresión y rondas. Guardado en el navegador; sin cuentas ni red.

## Arranque

Requisitos: Node.js **22.12 o superior**, pnpm **11.25.0**, navegador con WebGL y aceleración gráfica. Verificado en Node 26.9.0 y pnpm 11.25.0. Si no tienes pnpm, instala la versión indicada con `npm install -g pnpm@11.25.0`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Abre http://127.0.0.1:5173. Vite escucha solo en loopback. Si el puerto está ocupado, consulta la URL que imprime Vite.

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
# O ejecutar las cuatro verificaciones:
pnpm check
# Servir el build, después de compilar:
pnpm preview
```

## Partida local

Abre **Partida local**, elige semilla e inicia. Empiezas con10oro y nivel2. Compra ofertas, arrastra desde el banquillo al tablero y combate. Tres copias se combinan; puedes vender, renovar/bloquear y comprar XP. El resultado paga una vez y **Siguiente ronda** vuelve a preparación. **Continuar partida guardada** restaura la última sesión de este navegador tras validar su historial.

La tienda tiene5 espacios y el banquillo9. Click y controles columna/fila sirven como alternativa al arrastre. Las reglas exactas están en [economía](docs/ECONOMY_SPEC.md), [tienda/pool](docs/SHOP_POOL_SPEC.md), [progresión](docs/PROGRESSION_SPEC.md) y [rondas](docs/ROUND_FLOW.md). No hay final global de partida en este prototipo.

## Arena de pruebas conservada

- Empieza con cuatro unidades ficticias jade. Pulsa **Cargar duelo 4 × 4**, elige semilla y **Iniciar combate**.
- Pausa/reanuda, cambia ×1/×2 o repite la misma entrada/semilla. **Volver a preparación** recupera tu formación previa. Durante combate solo inspección y zoom; la edición queda protegida.
- Selecciona una unidad de la reserva y pulsa una casilla libre de tu mitad para colocarla.
- Selecciona una unidad del tablero; arrástrala o pulsa una casilla vacía para moverla. Pulsar otra unidad la selecciona. Un arrastre sobre una casilla ocupada se rechaza.
- Alterna Jade / Ámbar para editar cada mitad. Esto es una herramienta local de prueba, no un cambio de jugador autenticado.
- Alternativa sin ratón: Tab hasta el tablero, flechas para cambiar columna/fila, Intro o espacio para actuar y Escape para cancelar. También hay selectores de columna y fila con un botón explícito.
- Los puntos indican casillas disponibles. Un contorno con cruz cobre indica un destino inválido.
- Zoom visual 85 %, 100 % y 115 %. No cambia coordenadas ni reglas.
- «Restaurar formación» vuelve al ejemplo de cuatro unidades. Recargar la página descarta los cambios.

## Repositorio

```text
apps/
  web/                   React + Phaser 4.2.1 + Vite
    src/game/            Escena, proyección, sesión local y adaptador visual
  server/                Reserva documentada; sin implementación
packages/
  shared/                Esquemas Zod, contratos JSON y ticks
  game-data/             Cuatro definiciones ficticias
  game-core/             Hexágonos, preparación y motor determinista puro
  sprite-contract/       Metadatos, validación y puerto UnitVisual
docs/
  ARCHITECTURE.md
  GAME_DESIGN_V0.1.md
  SPRITE_SPEC.md
  ROADMAP.md
  DECISIONS.md
  COMBAT_SPEC.md
  COMBAT_EVENTS.md
  VALIDATION.md
```

Los paquetes privados exportan TypeScript fuente; Vite y Vitest los compilan dentro del monorepo. No se publican en npm. TypeScript strict y ESLint se ejecutan desde la raíz.

Consulta [arquitectura](docs/ARCHITECTURE.md), [decisiones y fuentes](docs/DECISIONS.md), [guía de arte](docs/SPRITE_SPEC.md) y [validación real](docs/VALIDATION.md).

Consulta también las [reglas exactas de combate](docs/COMBAT_SPEC.md) y el [protocolo v3](docs/COMBAT_EVENTS.md). La Arena es una herramienta permanente, separada de la futura interfaz de partida.

### F0-P3.1 — Overtime y doble derrota

Combate normal hasta tick299; overtime300–449; cierre en450 sin acciones extra. Indicador/contador compartidos, pruebas de límite en Arena, double_loss sin bonus de victoria/racha y vida mínima de ambos participantes con registro de daño. Reglas propias en [COMBAT_SPEC](docs/COMBAT_SPEC.md) y [ECONOMY_SPEC](docs/ECONOMY_SPEC.md). Guardado P3.1 separado; el guardado P3 anterior se conserva sin migración. No hay eliminación global: se permite seguir con0HP. F0-P4 no iniciado.
