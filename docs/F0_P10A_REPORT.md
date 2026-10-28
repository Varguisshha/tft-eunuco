# F0-P10A · informe final

## 1. Base y rama

Base estable F0-P9A.1: `4e17a218ca93906278f75c38328ca7e929adda64`. Rama local `codex/f0-p10a-roster-synergies`, worktree `/Users/vargas/.codex/worktrees/p10a-roster-synergies/TFT EUNUCO`. La preparación Railway queda fuera del cambio.

## 2. Excel y huella

Archivo localizado realmente en `/Users/vargas/Downloads/Copia de TFPeru.xlsx`. Copia de auditoría idéntica en `TFPeru/Copia de TFPeru.xlsx`. SHA-256: `101728c60d45312cd98776087ba17f3636e798ab2e0265ed0f65b26ece6791eb`. Se lee toda Hoja1 y se conservan 544 celdas Si/No y coordenadas. [Origen y reproducción](ROSTER_EXCEL_SOURCE.md).

## 3. Personajes

34 identidades verificadas. Cuatro jugables existentes, treinta borradores. Erik se resuelve exclusivamente a JARAMILLO / `jaramillo`. Alfredo y Alfredo Pocho son distintos. Las cuatro identidades existentes conservan estadísticas, costes, activa, pasiva, sprites y splash arts.

## 4. Colectivas

16, exactamente las del Excel. Fumón 13, Gym 9, Ruman Trinity 3, UPM 13, Pardillo 10, Hortaleza 12, Rata 6, Fantasy 9, Perdidos por el mundo 9, Pancho 9, Valo 11, BlackHaus 7, Shisheros 9, Mus 0, PSOE 7 y Lenceria 2.

## 5. Atributos únicos

Cuatro: Jew→Peibol, El Depredador→VARGAS, Mano de Obra→FLORIN y Todo al rojo→DaniGM. Todos 1/1, con tipo propio. Las dos mecánicas existentes se conservan. Las dos nuevas quedan sin efectos.

## 6. Matriz completa

[ROSTER_MEMBERSHIP_MATRIX.md](ROSTER_MEMBERSHIP_MATRIX.md) contiene las 34 listas completas y la matriz colectiva transpuesta, con las únicas separadas. Manifiesto reproducible en `packages/game-data/src/roster-excel-source.json`. DOLEA 5, VARGAS 6, FLORIN 4, JARAMILLO 7, Agus 7, Ruben 7 y Peibol 8. No hay límite estructural de ocho: contratos prueban 32/64 afiliaciones, conservando validación de unicidad.

## 7. Sinergias retiradas

Llama de Pádel desaparece del catálogo y afiliaciones P10A, incluidos iconos/contadores del HUD moderno. Permanece en los catálogos históricos necesarios. No se traslada su recompensa a otra afiliación. Los cuatro perfiles de prueba heredados quedan fuera del pool/tienda modernos y sin afiliaciones P10A; la IA local heredada sigue disponible.

## 8. Sinergias añadidas

Gym, Pardillo, Rata, Fantasy, Pancho, Valo, BlackHaus, Shisheros, Mus, PSOE y Lenceria. Se registran con miembros exactos, umbrales, estado y glifos SVG originales provisionales. Jew y Todo al rojo son atributos únicos nuevos, no colectivas.

## 9. Umbrales

Se implementan todos los escalones propuestos por el usuario, sin atribuirlos al Excel. [TRAIT_PROGRESSION_REVIEW.md](TRAIT_PROGRESSION_REVIEW.md) enumera miembros, jugables, progresiones y reservas. Capacidad máxima 7 intacta; 8/10 reservados, así como niveles que requieren borradores o miembros inexistentes. No se expande el tablero.

## 10. MUS

Solo 2/4, sin escalón 3, cero miembros asignados y cero efectos. Las pruebas de diagnóstico con tres identidades conservan el progreso 2; cuatro llegan a 4. No se inventa ningún miembro ni recompensa para hacerlo competitivo.

## 11. Borradores

Los treinta registros nuevos usan `CharacterDraftSchema`: coste, rol, alcance, estadísticas, activa, pasiva, sprite y splash art son null. No hay habilidades noop. `ROSTER_PLAYABLE` contiene exclusivamente los cuatro originales completos. Los borradores no consumen pool, no se venden/compran ni pueden generarse desde el selector DEV competitivo.

## 12. Efectos pendientes

Las once colectivas nuevas, Jew y Todo al rojo no aplican efectos. Los escalones superiores nuevos de colectivas existentes tampoco. El contrato rechaza recompensas en escalones pending_effects. El motor separa progreso de efectos y conserva la última recompensa implementada al llegar a un escalón superior pendiente, sin fingir nuevas ventajas.

## 13. Migración provisional

Fumón, Hortaleza y Perdidos: antiguo 2→2 y antiguo 3→4, explícitamente por número de umbral. UPM mantiene 2/4/6 acumulativos y Ruman 2/3 sustitutivos. Las cifras originales no cambian. Fumón evita ejecutar simultáneamente las reglas sustitutivas baja/alta en P10A. Hay pruebas del combate real a 2, 3, 4 y 6 miembros de diagnóstico, además de comparaciones exactas de recompensas.

## 14. Tarjetas

Cinco splash arts originales, nombre abajo izquierda y coste derecha. Banda medida por ancho, sin máximo fijo de afinidades. Colectivas turquesas y únicas doradas. Tooltip por hover/foco/clic y +N con acceso a las restantes. El botón de compra es hermano de los botones de afinidad; cero botones anidados. Escape devuelve el foco al cerrar la lista. [Diseño y reproducción](MULTI_TRAIT_CARD_DESIGN.md).

## 15. Inspector y galería

Lista completa con tipo, miembros, umbral alcanzado, siguiente, efectos, mecánicas y motivo de reserva. Scroll interno. El recuento corresponde al bando seleccionado y usa el estado autoritativo. Los rivales locales heredados sin afiliaciones se inspeccionan con seguridad. La galería DEV muestra 34 entradas, estado, número de afinidades y cero errores de asignación, sin acceso de borradores al combate. No se incluye en el bundle público.

## 16. Capturas

Evidencia local en `artifacts/p10a/`, ignorada por Git. Todas las capturas están identificadas como referencia **DEV**, con reloj fijo, autoridad existente y reservas reales del pool. No son partidas competitivas presentadas como reales.

| Archivo                        | Evidencia                                                    |
| ------------------------------ | ------------------------------------------------------------ |
| `shop-1280.png`                | 1280×720, cinco imágenes, banda con overflow, HUD sin scroll |
| `shop-1440.png`                | 1440×900                                                     |
| `shop-1920.png`                | 1920×1080                                                    |
| `shop-2560.png`                | 2560×1440                                                    |
| `shop-3840.png`                | 3840×2160                                                    |
| `overflow-unique.png`          | +N revela El Depredador sin comprar                          |
| `tooltip-florin.png`           | Tooltip y distinción de Mano de Obra                         |
| `inspector-all-affinities.png` | Lista de las siete afinidades de JARAMILLO                   |
| `inspector-jaramillo.png`      | Detalle de escalones y reserva, con estado de compra         |
| `pending-trait-progress.png`   | Gym muestra progreso y efectos pendientes                    |
| `roster-drafts.png`            | Personajes nuevos sin parámetros jugables inventados         |
| `eight-affinity-overflow.png`  | Peibol, ocho afinidades, banda de estrés de 130 px           |

`browser-metrics.json` verifica tamaños, límites, imágenes cargadas, interacción y ausencia de errores de página. Script reproducible: `scripts/roster/verify_ui.mjs`.

## 17. Compatibilidad histórica

Nueva pareja reglas/catálogo `f0p10a-1`; fingerprint moderno `9e0b5ff3ed81c653c8cc05ae2cfa72b50b9f8d7fc5d53850d37f07daeb5510f0`. Los ocho fingerprints históricos permanecen idénticos y se comprueban contra valores medidos en la base estable. No se migran ni reinterpretan snapshots antiguos. Codec mantiene los mismos límites y admite el nuevo catálogo. Evidencia: `artifacts/p10a/catalog-fingerprints.json` y `apps/server/src/persistence/roster.test.ts`.

## 18. Pruebas y quality gates

- Base previa: 1322 pruebas pasan, 20 optativas omitidas.
- `pnpm check`: TypeScript, ESLint, 1351 pruebas pasan; 21 optativas se ejecutan por separado; build de cliente y servidor correcto. 94 archivos pasan y dos suites optativas quedan fuera de este comando.
- PostgreSQL aislado: 17/17 pruebas pasan. Se reejecuta además el caso P10A con el fingerprint final: pasa, 16 casos ajenos al filtro no se repiten. Cubre cuatro clientes SDK, objetos reales, SIGKILL con commit bloqueado, recuperación, replays deterministas y repartos de rondas 3/6 exactamente una vez.
- TLS local final: 4/4 pasan: HTTPS/WSS, CORS, clientes 2/3/4, reconexión, cierre de partida, interrupción local de base y reinicio SIGKILL. Con las optativas ejecutadas por separado, pasan las 1372 pruebas distintas.
- `pnpm verify:public`, comprobación independiente del Excel y `git diff --check`: pasan.
- Navegador Chromium real: cinco resoluciones obligatorias, tooltips/teclado, overflow, inspector y galería: pasan; cero errores de página.

Las bases propias son `tft_persistence_test_p10a_20261026` y `tft_remote_test_p10a_20261026` en 127.0.0.1:55439. Solo se crean/truncan sus tablas; no se toca Supabase remoto ni otros servicios. Los diagnósticos TLS permiten el sufijo de nombre para evitar reutilizar la base de otro chat. No se reduce ninguna prueba ni se relaja ningún límite. El build mantiene el aviso preexistente de chunks grandes de cliente; no falla el build ni se cambia su umbral.

Logs en `artifacts/p10a/check.log`, `postgres-full.log`, `postgres-final-roster.log`, `public-bundle.log` y `tls-final.log`.

## 19. Riesgos y límites de esta fase

El roster está registrado, no balanceado para 34 personajes. Quedan treinta diseños jugables y trece afiliaciones sin mecánicas (once colectivas y dos únicas), además de escalones superiores pendientes. La concentración de afinidades requiere diseño futuro: los cuatro originales ya pueden activar seis efectos de afinidad simultáneos.

No hay jugable de coste 1 en el pool moderno. El algoritmo existente renormaliza buckets con stock; las probabilidades nominales mostradas no son la distribución efectiva de este roster incompleto. No se cambia la economía para ocultarlo. Los umbrales reservados no se hacen alcanzables inventando unidades o aumentando capacidad. Los glifos nuevos son provisionales. Las migraciones 3→4 siguen siendo decisiones provisionales explícitas, no balance definitivo.

## 20. Estado Git y alcance

Cambios locales revisables sobre la base indicada; sin commit nuevo, sin push y sin despliegue. Hay archivos nuevos de catálogo, contratos, pruebas, importador y documentación, además de copias de entrada sin modificar usadas para auditar/importar sprites y Excel. `artifacts/` y las evidencias están ignorados. No se modifican originales del usuario, assets existentes, objetos, reparto, Mar de Cristal ni la rama Railway. La edición accidental inicial en el checkout Florin fue revertida; el trabajo P10A queda exclusivamente en este worktree.

Esta entrega termina la reconciliación P10A. No inicia fases posteriores ni publica estos cambios en GitHub.
