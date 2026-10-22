# Decisiones técnicas

Fecha de consulta y ejecución: **22 de octubre de 2026**.

| Decisión                                          | Motivo                                                                | Estado                   |
| ------------------------------------------------- | --------------------------------------------------------------------- | ------------------------ |
| React + TS + Vite, pnpm y Vitest                  | Stack del encargo                                                     | Confirmada               |
| Phaser 4.2.1 fijado                               | Última estable publicada, verificada en sitio oficial y registro npm  | Verificada               |
| Renderer WebGL                                    | Canvas renderer está deprecado en v4                                  | Confirmada               |
| Axial + límites odd-r                             | Distancia/vecinos simples y rectángulo de 7 × 8                       | Técnica de esta fase     |
| Proyección en web, no en core                     | Cámara y resolución no alteran reglas                                 | Confirmada               |
| Array de unidades como única ocupación            | Máximo 56 casillas; evita dos fuentes de verdad                       | Técnica de esta fase     |
| Zod para contratos                                | Validación runtime además de TS                                       | Técnica de esta fase     |
| Store local observable                            | React y Phaser comparten snapshots sin frameworks de estado extra     | Técnica de esta fase     |
| Paquetes privados con exports TS fuente           | Build único; evita empaquetado innecesario                            | Técnica de esta fase     |
| apps/server solo README                           | Reservar frontera sin instalar un servidor ficticio                   | Ajuste menor documentado |
| Definiciones test-\*; habilidades ficticias en P2 | Sin personajes reales; efectos de prueba documentados                 | Provisional              |
| Mitades north/south                               | Lados del duelo, no IDs de jugadores multijugador                     | Provisional              |
| Copias ilimitadas y cuatro unidades iniciales     | Facilitar pruebas de tablero sin economía                             | Provisional              |
| Arena oscura jade/ámbar                           | Preferencia visual confirmada por el usuario                          | Confirmada               |
| Texturas por canvas 2D original                   | Arte provisional generado por código; Phaser sigue renderizando WebGL | Confirmada               |
| TICK_MS = 100, seed uint32                        | Ticks y PRNG deterministas implementados en P2                        | Confirmada               |
| ESLint 10 en lugar de 9                           | La instalación inicial advirtió que 9 ya no recibe soporte            | Verificada               |

## Fuentes primarias consultadas antes de implementar Phaser

- [Descarga oficial de Phaser](https://phaser.io/download): versión estable 4.2.1.
- [Releases oficiales](https://github.com/phaserjs/phaser/releases): v4.2.1, 9 de julio de 2026.
- [Guía de migración fijada a v4.2.1](https://github.com/phaserjs/phaser/blob/v4.2.1/changelog/v4/4.0/MIGRATION-GUIDE.md): renderer nuevo, Canvas deprecado, Vector2 en lugar de Point, cambios de cámara y utilidades retiradas.
- [InputPlugin, API v4](https://docs.phaser.io/api-documentation/class/input-inputplugin): eventos de puntero.
- [Pointer, API 4.0](https://docs.phaser.io/api-documentation/4.0.0/class/input-pointer): coordenadas de puntero.
- Registro npm consultado con `npm view phaser version`, resultado 4.2.1. La dependencia instalada y el lockfile fijan esa versión.

Se contrastaron las llamadas con los tipos distribuidos por Phaser 4.2.1. No se usan pipelines de v3, Geom.Point, TextureManager.generate, setTintFill, FX antiguos ni acceso directo a matrices internas. La primera comprobación de tipos detectó que Graphics exige Vector2[]; se corrigió con conversiones en el adaptador de render, conservando Point puro en core.

## Decisiones F0-P2

| Decisión                                                       | Motivo / alcance                                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Protocolo 2 separado del contrato P1                           | Preserva compatibilidad de preparación y pruebas; versiones desconocidas se rechazan |
| Mulberry32, orden por ID y rotación por tick                   | Reproducibilidad sin idioma, reloj o FPS; conflictos de reserva explícitos           |
| Carga entera de ataque conservando resto                       | Cadencia fraccionaria sin deriva por redondear cada intervalo                        |
| Apoyo antes de daño, muertes después de impactos comprometidos | Define escudos/stuns simultáneos y permite muertes mutuas                            |
| A\* hacia posiciones de ataque, origen y destino reservados    | Sin superposición, swaps ni atravesar aliados; espera acotada por 300 ticks          |
| Habilidades como datos y perfiles completos en entrada         | Extensión por efectos; replay conserva datos aunque cambie catálogo                  |
| Traza local precomputada + reproductor independiente           | Resultado independiente de pausa, velocidad y FPS; futuro transporte fuera del motor |
| Snapshots en lotes, además de eventos                          | Reproductor actual no reconstruye todo el estado exclusivamente desde eventos        |
| Arena interna permanente                                       | Herramienta útil incluso al existir futura pantalla real; sin rediseño prematuro     |
| Arte original provisional y jade/ámbar                         | Preferencia confirmada; roster de amigos y terreno profundo para fase visual futura  |
| Sin nuevos servicios/dependencias                              | No Colyseus, Supabase, economía ni cuentas en esta entrega                           |

La auditoría encontró los 48 archivos nuevos anunciados en P1, sin cambios ajenos detectados ni coincidencias de credenciales en el escaneo. `pnpm check` confirmó 35 pruebas antes de editar. Commit inicial autorizado: `279be4d`; no se configuró remoto ni se hizo push. Evidencia y límites en VALIDATION.md.

Fuentes Phaser consultadas para P2: [Graphics](https://docs.phaser.io/api-documentation/class/gameobjects-graphics) y [ciclo de escenas](https://docs.phaser.io/phaser/concepts/scenes), contrastadas con los tipos instalados de 4.2.1. La lógica de simulación es propia y no depende de física Phaser.
