# TFT EUNUCO · F0-P2

Arena interna de un autobattler original: tablero hexagonal isométrico, preparación interactiva y combate automático determinista con reproducción Phaser. **Sin economía, cuentas, red ni persistencia.**

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

## Usar el prototipo

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

Consulta también las [reglas exactas de combate](docs/COMBAT_SPEC.md) y el [protocolo v2](docs/COMBAT_EVENTS.md). La Arena es una herramienta permanente, separada de la futura interfaz de partida.
