# Integración controlada P8D + FLORIN / Splash Arts

Fecha: 2026-10-26. Rama: `codex/integration-p8d-florin`.

## Historia y preservación

Base común: `b4e12eee4c28175d4e49d5984a19f5fc5a610bf8`.
P8D estable: `2d622b4`, rama `codex/f0-p8d-component-drops`, sin cambios rastreados pendientes.
FLORIN partía de la base común con trabajo sin commit. Se auditó y conservó selectivamente en `4aa8cef` (`codex/florin-splash`): 91 archivos, código, derivados y documentación. No se incluyeron indiscriminadamente TFPeru, Sprites ni archivos personales.

La consolidación parte de P8D y realiza un merge de FLORIN en un tercer worktree. Ambos worktrees originales permanecen disponibles. No hay push, despliegue, modificación de Supabase real ni intervención en los servicios normales 2567/4173. La revisión visual utilizó 4185; las pruebas de recuperación, PostgreSQL de diagnóstico en 55439 y procesos aislados.

## Conflictos y decisiones

Se resolvieron 16 archivos en conflicto, conservando funcionalidad de ambos lados:

| Archivos | Resolución | Evidencia |
| --- | --- | --- |
| `AuthoritativeMatch.ts`, `MatchRoom.ts` | Nueva identidad para partidas nuevas; journal P8D, ejecución FLORIN y exportación histórica separadas | integration-p8d-florin, florin, drops y red |
| `persistence/snapshot.ts`, `codec.ts` | Ocho identidades explícitas; compresión y límites existentes | históricos, codec y SIGKILL |
| `persistence/crash-fixture.ts`, `crash.test.ts` | Modos P8C, P8D, FLORIN e integrado diferenciados; conservar escenarios originales | 14 pruebas PostgreSQL |
| `game-data/economy.ts`, `index.ts`, `shared/match.ts` | Exportar nuevo catálogo sin reescribir configuraciones anteriores | contratos y restauración |
| ARCHITECTURE, DECISIONS, ITEM_SYSTEM, MULTIPLAYER_ARCHITECTURE, PERSISTENCE_ARCHITECTURE, ROADMAP, VALIDATION | Conservar ambas secciones históricas y añadir enlace a esta consolidación | revisión documental |

La revisión en navegador del snapshot auténtico descubrió un fallo adicional: `RemoteCoordinator.rivals()` pasaba el inventario propio al calcular el equipo rival. Ahora crea un contexto vacío con el propietario rival y el catálogo público, y calcula únicamente su equipo visible. No accede al inventario privado rival ni modifica propiedad. Una prueba verifica bonos, carga de objetos y ausencia de mutación del inventario propio.

## Versiones y fingerprints

Reglas y catálogo nuevos: `f0p8d-florin-1`. Catálogo de objetos: **`f0p8d-1`**, intencionadamente conservado para reutilizar exactamente las recetas, efectos y política de reparto P8D. Las partidas históricas seleccionan su configuración original; no reciben repartos retroactivos. No se requieren migraciones.

| Identidad | SHA-256 |
| --- | --- |
| P7D.2 | `6ea00046ac77e4b6d6a6da066fa9f7de2f3d79b921bb68c451820430e1773814` |
| P6C | `9d7856e10295c0b9a8385215d4727c0c024c6830f7eb73df5aee192103437365` |
| P8A | `3b28bee386abbbcf4ad39ebb9ea23bf0d7ea8dd0123686ec32d4290f37374e93` |
| P8B | `082b6bdf5fb3d91865720fa0b919fd3222347d92e8ad96f8e52b532c24267d72` |
| P8C | `8107c0053d8c6445ad25607ab14cea7c6fe296a1271dbe2223819b8d9f9a3e5a` |
| P8D | `d4df4a0d295e1222d3239933419f8a87012141ffc4545fcb113b00f6096291cf` |
| FLORIN aislado | `3844748d2c84597e79f8e80883754a33b77dec1b7247109b2b747d422baa9499` |
| Integrado | `9e6339d7b3493ad4f0751c50de7da0a9a8e3e9f89fcbbf759c3d3fb26109a975` |

Los siete hashes históricos se comparan contra literales obtenidos de las ramas originales; las ocho configuraciones se exportan y restauran explícitamente. El hash nuevo incluye roster, perfiles, sinergias, tuning, economía, catálogo de objetos, ejecución de efectos y política de reparto.

## Capacidades conservadas

- DOLEA, VARGAS, JARAMILLO y FLORIN, además del roster provisional existente.
- FLORIN coste 3, alcance 1 y balance original. Suela reforzada, Pistón Demoledor, Mano de Obra y `unit_presence` conservados; Ruman Trinity y Perdidos por el Mundo con sus fixtures de niveles superiores.
- Ataques diferenciados 1/2/3★; Idle/Walk/Death mantienen fallback declarado y Ability reutiliza ataque. Atlas, anclajes y procedencia intactos. No se regeneraron originales.
- Cuatro splash WebP; Erik corresponde a JARAMILLO según el manifiesto aprobado. Encuadres, accesibilidad y fallbacks existentes; sin rediseñar Festival Pop × Neon Playground.
- Ocho componentes, 36 recetas y 36 objetos ejecutables, tres ranuras, combinaciones, ventas, pendientes y recibos.
- P8D sin cambios: rondas 3/6/9…, 2 o 3 componentes al 50/50, cantidad global compartida y tipos independientes uniformes con reposición. Solo supervivientes, incluso desconectados; sin fantasmas, eliminados ni ronda terminal. Stream RNG dedicado, journal e idempotencia originales.
- Prueba explícita de igualdad del sorteo P8D/integrado para misma identidad, semilla, ronda y elegibles.

## Matriz de regresión

| Área | Validación |
| --- | --- |
| Personajes y sinergias | Suites originales DOLEA, VARGAS, JARAMILLO, FLORIN, traits, habilidades, estadísticas y mecánicas |
| Objetos | Contratos, catálogo, 36 recetas/efectos, equipamiento, capacidad, fusiones, ventas, heridas, críticos, curación/escudo y efectos encadenados |
| FLORIN + objetos | Pruebas de motor y servidor con tres objetos; prueba integrada con dos equipados por FLORIN y JARAMILLO; presencia y progresión en replays |
| Multijugador | Salas, autenticación de fixture, pool, compras, 2/3/4 jugadores, fantasmas, eliminación, espectador, clasificación, reconexión |
| Persistencia | Ocho configuraciones, codec, CAS, liquidaciones, journal y reinicios reales |
| Cliente | Equipo rival con propietario correcto y sin filtración/mutación del inventario propio |
| Suites preservadas | Unión de 85 rutas de tests de ambas ramas, ninguna ausente; lista en `evidence/integration-p8d-florin/suite-preservation.json` |

## E2E de cuatro jugadores

Cuatro usuarios de fixture autenticados; sin cuentas reales. Nueva partida integrada, FLORIN reservado en tienda y comprado mediante el comando económico real, desplegado y equipado; JARAMILLO equipado. Se ejecutan rondas hasta la 6 y se compara con autoridad baseline sin interrupciones.

En ronda 3 se bloquea la transacción PostgreSQL y se aplica SIGKILL antes de confirmar; no se publica inventario sin commit. Tras restauración se confirma una sola distribución. Otro SIGKILL después del commit verifica reconexión autenticada y conservación del inventario privado sin semilla de distribución. La ronda 6 vuelve a repartir, seguida de otro reinicio. Se comparan duelos/replays, unidades, objetos, liquidaciones, journal y clasificación con la ejecución continua. Se exige observar `unit_presence` en los combates.

Evidencias versionadas: `round6-journal.json` y `round3-private-fixture-view.json` en `docs/evidence/integration-p8d-florin/`. Contienen únicamente identidades de diagnóstico.

## Revisión visual real

Chrome con perfil temporal; tienda en 1440×900, 1920×1080, 2560×1440 y 3840×2160: cinco cartas, cinco imágenes cargadas, cero errores de página y sin scroll vertical. Arena y encuadre conservados. La escala CSS limitada en 4K mantiene los controles pequeños respecto al escenario, conforme al comportamiento responsive previo.

Capturas locales en `artifacts/integration/`:

- `shop-1440.png`, `shop-1920.png`, `shop-2560.png`, `shop-3840.png`: cuatro splash y FLORIN comprable.
- `shop-disabled.png`: cero oro, estado «Falta oro» y controles económicos deshabilitados.
- `florin-1.png`, `florin-2.png`, `florin-3.png`: combate real pausado a 1800 ms en el laboratorio, ataques por estrellas. El laboratorio tiene scroll propio y las capturas son de página completa; no es el HUD de partida.
- `jaramillo.png`: tick 7, cigarro y estela entre lanzamiento tick 6 e impacto tick 8.
- `post-drop-round3.png`: HUD completo usando el snapshot real posterior al reparto y reconexión.
- `florin-inspector.png`: el mismo snapshot, FLORIN seleccionado, objetos 2/3 y estadísticas.

Las dos últimas capturas usan los componentes reales `RemoteCoordinator`, `LocalSession` y `LocalGame` sobre el snapshot capturado, con transporte inmóvil de diagnóstico. No representan una conexión viva ni una reproducción de resultado de combate: no se inyectó la traza y el rótulo de resultado no constituye evidencia del resultado autoritativo. La evidencia de resultado/replay está en el E2E. No existe presentación de componentes recibidos en el HUD actual; se verifica el reparto en los datos, sin inventar una bandeja ni notificación P8E.

## Quality gates y límites

Resultado final registrado al cerrar la integración: `pnpm check` con PostgreSQL de diagnóstico, `pnpm verify:public` y `git diff --check`. Suite final: **1286 pruebas en 85 archivos**, incluyendo 14 pruebas PostgreSQL; cero fallidas u omitidas en la ejecución completa. La repetición focalizada integrada omite por filtro las otras 13 pruebas del archivo, ya ejecutadas en la suite completa. Se conservan todos los umbrales de rendimiento y no se ejecutan navegadores activos durante esa suite.

Incidencias intermedias corregidas: selector de métricas de tienda, sincronización del diagnóstico y archivo temporal de captura dentro del alcance de TypeScript (retirado fuera de apps); fallo real de propietario rival cubierto por nueva prueba. No se presentan esas ejecuciones como PASS final. Vite mantiene la advertencia existente de tamaño de chunk.

Limitaciones: animaciones no suministradas siguen usando fallback; sin nuevos miembros reales para los umbrales superiores de sinergias; reparto automático sigue siendo autoritativo de servidor, no añadido a la partida local; sin validación contra cuentas reales de Supabase por restricción explícita. Originales y archivos personales continúan sin rastrear donde ya estaban. Capturas y harness son artefactos locales, no parte del bundle público.

La consolidación deja los contratos disponibles para una futura P8E. **P8E no se ha iniciado.**
