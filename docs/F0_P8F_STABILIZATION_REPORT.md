# F0-P8F — Consolidación y estabilización

Fecha: 26/10/2026. Rama `codex/f0-p8f-stabilization`. Sin push, despliegue ni acceso a Supabase real.

## Base exacta y preservación

- P8E completo: `e9f0687`, rama `codex/f0-p8e-item-hud`, worktree `/Users/vargas/.codex/worktrees/p8e-item-hud/TFT EUNUCO`.
- Integración anterior: `8a6850b2bfa5064e44b9eba765bcf991c24b4d1e`, ancestro de P8E, con P8D y FLORIN ya unidos.
- Ambos worktrees anteriores tenían sus archivos rastreados limpios y 79 originales no rastreados. No se modificaron. Sus originales Sprites/TFPeru se copiaron al nuevo worktree para ejecutar el importador; permanecen fuera del commit.
- Nuevo worktree: `/Users/vargas/.codex/worktrees/p8f-stabilization/TFT EUNUCO`.
- Auditoría SHA-256: 61 archivos rastreados de recursos públicos y game-data coinciden con P8E; cero diferencias. Evidencia `artifacts/p8f/asset-catalog-audit.json`.
- Se revisaron los 18 documentos solicitados, sus actualizaciones históricas y los contratos efectivos. Las cabeceras históricas anteriores no sustituyen el estado consolidado de esta fase.

## Catálogo consolidado

Partida `f0p8d-florin-1`, combate `florin-1`, objetos `f0p8d-1`. Fingerprint integrado `9e6339d7b3493ad4f0751c50de7da0a9a8e3e9f89fcbbf759c3d3fb26109a975`.

DOLEA, VARGAS, JARAMILLO y FLORIN conviven con los personajes provisionales. Se conservan ocho componentes, 36 recetas, 36 efectos ejecutables y reparto P8D. `integration-p8d-florin.test.ts` vuelve a comprobar siete fingerprints históricos literales y la restauración de ocho configuraciones sin migración implícita. No se conceden recompensas retroactivas.

## Baseline y cambios

Baseline fresco antes de editar: `pnpm check` con PostgreSQL aislado, **1.301/1.301 pruebas, 86 archivos, cero fallidas y cero omitidas**. TypeScript, ESLint y ambas compilaciones correctos. `artifacts/p8f/baseline.log` conserva la ejecución.

No se encontró un defecto reproducido del producto que justificase cambiar reglas, balance, HUD o assets. Se corrigió el hueco de validación: los recorridos anteriores hasta eliminación usaban vida reducida de fixture; ahora hay campañas completas con economía y vida normales. Se añaden seis pruebas: tres campañas SDK, estrés integrado y dos escenarios PostgreSQL/SIGKILL. Ninguna prueba previa se elimina ni se relaja un límite.

Los errores durante la construcción de los nuevos diagnósticos (nombres accesibles, coordenadas axiales, versión de recuperación, revisión adicional por reconexión y sincronización del reloj artificial) pertenecían al arnés. Se corrigieron en él, sin presentar esos errores como defectos del juego. La revisión de publicación aumenta con cada reconexión; las comparaciones preservan todas las cifras económicas y verifican explícitamente las cuatro revisiones adicionales del escenario.

## Matriz de escenarios ejecutados

| Área | Prueba y resultado | Evidencia reproducible |
| --- | --- | --- |
| 4 jugadores | Cuatro UUID fixture autenticados por un verificador limitado al laboratorio, sala privada, código, Listo, inicio, compra/despliegue/XP, fusiones, repartos 3/6, combinación/equipamiento, eliminación, espectador y clasificación coincidente | `apps/server/src/stabilization-network.test.ts`; `campaign-4.json` |
| 2 jugadores | Misma campaña con economía normal, pool compartido y recursos privados, duelo directo, reparto y final; salida del lobby y creación posterior comprobadas en la secuencia 2→3→4 | `campaign-2.json` |
| 3 jugadores | Campaña completa con fantasma, sin participante económico adicional. Reparto y conservación pasan por la autoridad normal | `campaign-3.json`; suites de pairings, parallel, competition e item-drops |
| Navegador normal | LocalGame/RemoteCoordinator reales, cuatro conexiones, compras por ratón, XP, renovación, despliegue por clic y arrastre y recolocación dentro del tablero validados contra ubicación autoritativa, DOLEA/JARAMILLO, Hortaleza activa, combate, rondas 3/6, recetas, combinación, equipo, pérdida de socket, recuperación, final y vista del ganador | `browser-actions.json`, `final-snapshot.json`, `final.png`, `victory.png` |
| Objetos en bordes | Tres objetos, rechazo del cuarto, devolución al vender, arrastre a JARAMILLO, Escape, fusión y excedentes mediante fixtures aisladas ya existentes | `interactions.json`, `fourth-rejected.png`, `sold-returned.png`, `fusion-returned.png` |
| Capacidad y pendientes | Bandejas completas, reclamación rechazada sin espacio, avisos 2/3 componentes, ocho combinaciones por componente | `browser.json`, `full-pending.png`, `round3.png`, `round6.png`; inventory/item-drops tests |
| Retardo e idempotencia | Intenciones retrasadas 75 ms, desconexión inmediatamente después de enviar compra/equipo, antes de esperar confirmación, reentrada y reenvío de la misma intención: estado económico idéntico a un control que la aplica una sola vez. Todos los sockets desconectados en combate y resolución de ronda 3 | `campaign-4.json` campo faults; recovery-network y RemoteCoordinator tests |
| PostgreSQL | Compras, equipo, fusión, rollback antes del commit de reparto, reparto confirmado 3/6, combate, liquidación, estados FLORIN y progreso JARAMILLO: suite real completa | `apps/server/src/persistence/crash.test.ts` |
| Nuevos SIGKILL | Overtime a 31 s; continuación contra control sin interrupción hasta final; reinicio final conserva resultados, inventarios, journal, liquidaciones y replays. Eliminado con supervivientes: reinicio mantiene puesto, estado y trazas | Dos pruebas P8F en crash.test.ts |
| Seguridad | Propiedad, UUID, inventarios privados, semillas y journal fuera de la proyección pública, equipo rival público, payloads inválidos, revocación y aislamiento DEV | auth/lobby/network/items/drop tests; `verify:public` |
| Estrés | 7v7, cuatro personajes, tres objetos por unidad, 450 ticks, replay idéntico dos veces, validación de todos los snapshots, límites originales conservados | `packages/game-core/src/items/stabilization.test.ts`; `integrated-stress.json` |

Las campañas SDK solo adelantan el tiempo. No conceden oro, objetos ni unidades, ni modifican vida o tablas. Las políticas de compra son distintas por participante; en las campañas de 3/4, el primero vende legalmente su formación desde ronda 7 para garantizar la observación de eliminación antes del final. Semillas de autoridad 80126 y de reparto 80626; cada evidencia guarda además el snapshot inicial y el ID de partida, que participa en la derivación de reparto.

Los diagnósticos específicos de persistencia/estrés sí usan formaciones controladas separadas; no se presentan como campañas normales. El laboratorio HTTP solo escucha en loopback 2593 y permite adelantar tiempo o leer snapshots; nunca lo importa el servidor público. El servidor de navegador escucha en 2592; Vite en 4188. Los servicios habituales 4173/2567 no se reiniciaron.

## Personajes y sinergias

Se reejecutan las pruebas de DOLEA (pasiva, escudos y activa), VARGAS (Resaca, activa, eliminaciones/progreso/saltos), JARAMILLO (proyectil, reducción de armadura, Kilómetros/fusión/exclusiones) y FLORIN (pasiva/activa por 1★/2★/3★, recuperación, retorno y objetos). El estrés integrado incluye eventos `unit_presence`, curación, escudos, pasivas, acumulaciones, proyectiles, Overtime y muertes. La batería previa mantiene los escenarios de auras, quemaduras y saltos específicos.

**JARAMILLO visual:** `jaramillo-flight.png` y `jaramillo-visual.json` capturan simultáneamente un sprite corporal visible con alpha 1 y `jaramillo:shared:projectile` visible. Se muestrea un fotograma de la traza real calculada por el servidor; congelar ese fotograma solo afecta a la presentación diagnóstica. El cuerpo no se sustituye por el cigarro.

Hortaleza se observa activa con DOLEA + JARAMILLO en navegador normal. El Depredador y Mano de Obra son rasgos reales únicos. Llama de Pádel, UPM, FUMÓN, Ruman Trinity y Perdidos por el Mundo mantienen sus miembros y umbrales; los niveles que el roster actual no puede alcanzar se comprueban únicamente con las fixtures sintéticas existentes. No se inventan miembros en el catálogo competitivo.

## Revisión visual y accesibilidad

Chrome real a 1280×720, 1440×900, 1920×1080, 2560×1440 y 3840×2160: cinco cartas, cero scroll global, arena continua, banquillo y tienda accesibles, inspector y recetas con desplazamiento interno. Dos familias de capturas: `hud-*` para partida remota normal e `inventory-*` para bordes de inventario de laboratorio. Los cuatro splash arts están presentes en `inventory-1280.png`; la partida normal conserva el mismo componente de tienda.

Impeccable se aplica como auditoría limitada a la estabilización, sin rediseño. Resultado: integridad de implementación coherente con Festival Pop × Neon Playground. Evaluación 16/20: accesibilidad 3, rendimiento 3, adaptación desktop 3, theming 3, integridad 4. No es una certificación WCAG ni una prueba de dispositivos táctiles.

El detector presenta cuatro avisos informativos: color morado de icono y tamaños 8/10 px de etiquetas auxiliares no registrados en DESIGN. Son recursos provisionales existentes con nombres accesibles y tamaños de interacción independientes, no defectos nuevos demostrados. Se conserva la estética. Persiste el aviso de bundle grande de Vite (P2 de rendimiento potencial en redes lentas); no impide jugar ni compilar. La configuración documental Impeccable tiene referencias antiguas; no se repara lateralmente en esta fase.

## Rendimiento

Ejecución final del estrés integrado: **455,8 ms**, 450 ticks, 9.743 eventos, replay 56.620.926 bytes y gzip 3.053.582 bytes. Sigue por debajo de los topes existentes de 5 s, doble replay <128 MiB y representación persistida <12 MiB. Estrés P8C conservado: 457 ms, 20.507 eventos, máximo 158 eventos/tick, 3.206 activaciones derivadas, ocho proyectiles y 34 estados de aura/reducción. Reproducción: 240 muestras, **p95 8,82 ms**, p99 10,01 ms, frente al límite existente de 16,7 ms. Evidencias `integrated-stress.json`, `p8c-stress.json` y `p8c-playback.json`; ningún umbral aumentado. Estos números miden esta máquina, no garantizan rendimiento GPU ni memoria en todos los equipos.

## Límites y preparación para amigos

- Identidades fixture autorizadas exclusivamente en laboratorio; no cuatro personas ni cuatro sesiones nuevas de Supabase remoto. No se tocaron cuentas ni datos reales.
- Retardo reproducible de intenciones y desconexiones reales de sockets; no emulación exhaustiva de una WAN con pérdida/reordenación arbitraria. WebSocket mantiene orden de entrega. No afirmar que el retardo artificial prueba todos los proveedores o redes.
- No hay prueba prolongada de horas, Safari/Firefox nueva, dispositivo físico adicional ni auditoría integral WCAG.
- Arte/fallbacks e iconos provisionales previamente documentados se conservan. Los componentes no reciben nombres o balance nuevos.
- Overflow, cuarto objeto, niveles altos de sinergia y evoluciones máximas se validan con escenarios aislados cuando la campaña normal no los produce.
- Conserva las limitaciones de persistencia existentes: un proceso autoritativo, congelación del tiempo durante caída y retención limitada. No es alta disponibilidad distribuida.

La validación local permite preparar una prueba supervisada con amigos. No equivale a autorización ni preparación de un despliegue público; URL accesible desde sus equipos, HTTPS/WSS y operación del servidor quedan fuera de esta fase.

## Reproducción

Desde el worktree P8F, con dependencias y originales disponibles:

```sh
PERSISTENCE_TEST_URL=postgresql://127.0.0.1:55439/tft_persistence_test P8C_METRICS=1 pnpm check
pnpm verify:public
git diff --check
```

No ejecutar dos campañas PostgreSQL a la vez. La URL exige la base local de diagnóstico; sus tablas de pruebas se vacían al iniciar cada caso. Nunca usar una URL Supabase en este procedimiento.

Los guiones de navegador quedan preservados como plantillas en `scripts/diagnostics/p8f/`, fuera de la aplicación. Copiar los `.fixture` a las rutas indicadas por `README.md`; Playwright/Chrome son herramientas locales de diagnóstico, no dependencias nuevas del producto. Capturas/trazas completas viven en `artifacts/p8f/` (ignoradas por Git).

## Validación final y Git

**Resultado final: 1.307/1.307 pruebas en 88 archivos, cero fallidas y cero omitidas, 101,52 s de suite.** Incluye las 16 pruebas PostgreSQL reales. TypeScript, ESLint, build cliente/servidor, `verify:public` y `git diff --check` correctos. Baseline 1.301; incremento seis casos, sin eliminar pruebas previas.

Campañas de la ejecución final: 2 jugadores: ronda 13; 3 jugadores: ronda 14; 4 jugadores: ronda 14. El recorrido de navegador llega a la ronda 16 y muestra la victoria de Florin, con cero errores de página.

Entrega en un commit local de estabilización sobre `e9f0687`, rama `codex/f0-p8f-stabilization`; consultar `git rev-parse HEAD` para su identificador exacto. Se incluyen únicamente pruebas, laboratorio reproducible y documentación. Los originales no rastreados y las evidencias ignoradas no forman parte del commit. Las ramas anteriores conservan HEAD y archivos rastreados intactos. Sin push, despliegue ni cambios en Supabase real.
