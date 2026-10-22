# Decisiones técnicas

Fecha de consulta y ejecución: **22 de octubre de 2026**.

| Decisión                                      | Motivo                                                                | Estado                   |
| --------------------------------------------- | --------------------------------------------------------------------- | ------------------------ |
| React + TS + Vite, pnpm y Vitest              | Stack del encargo                                                     | Confirmada               |
| Phaser 4.2.1 fijado                           | Última estable publicada, verificada en sitio oficial y registro npm  | Verificada               |
| Renderer WebGL                                | Canvas renderer está deprecado en v4                                  | Confirmada               |
| Axial + límites odd-r                         | Distancia/vecinos simples y rectángulo de 7 × 8                       | Técnica de esta fase     |
| Proyección en web, no en core                 | Cámara y resolución no alteran reglas                                 | Confirmada               |
| Array de unidades como única ocupación        | Máximo 56 casillas; evita dos fuentes de verdad                       | Técnica de esta fase     |
| Zod para contratos                            | Validación runtime además de TS                                       | Técnica de esta fase     |
| Store local observable                        | React y Phaser comparten snapshots sin frameworks de estado extra     | Técnica de esta fase     |
| Paquetes privados con exports TS fuente       | Build único; evita empaquetado innecesario                            | Técnica de esta fase     |
| apps/server solo README                       | Reservar frontera sin instalar un servidor ficticio                   | Ajuste menor documentado |
| Definiciones test-\* y habilidades null       | Sin personajes reales ni poderes inventados                           | Provisional              |
| Mitades north/south                           | Lados del duelo, no IDs de jugadores multijugador                     | Provisional              |
| Copias ilimitadas y cuatro unidades iniciales | Facilitar pruebas de tablero sin economía                             | Provisional              |
| Arena oscura jade/ámbar                       | Preferencia visual confirmada por el usuario                          | Confirmada               |
| Texturas por canvas 2D original               | Arte provisional generado por código; Phaser sigue renderizando WebGL | Confirmada               |
| TICK_MS = 100, seed uint32                    | Contratos mínimos; sin simulación/PRNG ficticios                      | Confirmada               |
| ESLint 10 en lugar de 9                       | La instalación inicial advirtió que 9 ya no recibe soporte            | Verificada               |

## Fuentes primarias consultadas antes de implementar Phaser

- [Descarga oficial de Phaser](https://phaser.io/download): versión estable 4.2.1.
- [Releases oficiales](https://github.com/phaserjs/phaser/releases): v4.2.1, 9 de julio de 2026.
- [Guía de migración fijada a v4.2.1](https://github.com/phaserjs/phaser/blob/v4.2.1/changelog/v4/4.0/MIGRATION-GUIDE.md): renderer nuevo, Canvas deprecado, Vector2 en lugar de Point, cambios de cámara y utilidades retiradas.
- [InputPlugin, API v4](https://docs.phaser.io/api-documentation/class/input-inputplugin): eventos de puntero.
- [Pointer, API 4.0](https://docs.phaser.io/api-documentation/4.0.0/class/input-pointer): coordenadas de puntero.
- Registro npm consultado con `npm view phaser version`, resultado 4.2.1. La dependencia instalada y el lockfile fijan esa versión.

Se contrastaron las llamadas con los tipos distribuidos por Phaser 4.2.1. No se usan pipelines de v3, Geom.Point, TextureManager.generate, setTintFill, FX antiguos ni acceso directo a matrices internas. La primera comprobación de tipos detectó que Graphics exige Vector2[]; se corrigió con conversiones en el adaptador de render, conservando Point puro en core.
