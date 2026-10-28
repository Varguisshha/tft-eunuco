# F0-P11K · Tooltips y removedor competitivo; auditoría de bloqueos

## Base y alcance

Base Git exacta `dc55cca886521dd354dddef6a8081d3407e38474`; rama `codex/f0-p11k-tooltip-remover-items`. Se verificaron worktrees y ausencia de cambios tracked antes de empezar. Se conserva P11H, P11I, la mejora de habilidades `077748c` y P11J. Los originales no relacionados de `Sprites/` y `TFPeru/` no se incorporan ni eliminan.

Baseline antes de editar: `pnpm check`, 128 archivos / 1696 pruebas correctas, una optativa omitida; TypeScript, ESLint y builds pasan con PostgreSQL aislado y TLS. Evidencia `artifacts/p11k/baseline.log`.

Exclusivamente LOCAL: no push, publicación/reactivación de Railway, migración SQL ni modificación Supabase remoto. La verificación Railway es estática y local.

## A · Tooltips

Se reprodujo exactamente inventario izquierdo con JARAMILLO a la derecha. El algoritmo resolvía empates de colisión según orden DOM y podía escoger el borde lejano del inspector. Se añade política por origen y proximidad real, sin elevar el z-index ni rehacer el HUD. Inventario: 10 px a la derecha de su barra; equipo del inspector: 10 px a su izquierda; Ruman Trinity sigue evitando la barra.

[Reglas, cálculo geométrico y detalle del defecto](TOOLTIP_POSITIONING_RULES.md).

| Ancho | Distancia icono → tooltip antes | Después  | Distancia barra → tooltip después |
| ----- | ------------------------------- | -------- | --------------------------------- |
| 1280  | 366.34 px                       | 69.00 px | 10.00 px                          |
| 1440  | 487.50 px                       | 69.00 px | 10.00 px                          |
| 1920  | 948.33 px                       | 69.00 px | 10.00 px                          |
| 2560  | 1588.33 px                      | 69.00 px | 10.00 px                          |
| 3840  | 2868.33 px                      | 69.00 px | 10.00 px                          |

Comparación medida icono → tooltip, antes: 366,34 / 487,50 / 948,33 / 1588,33 / 2868,33 px para las cinco resoluciones. Después: margen barra → tooltip de 10 px en todas, con alineación vertical ajustada al viewport. 30 casos de navegador sin errores geométricos, una sola superficie activa y Escape verificado. Capturas y JSON en `artifacts/p11k`.

## B · Removedor

Las partidas nuevas de la variante P11K reciben **un removedor por jugador real**, desde la construcción autoritativa del inventario. Cantidad y fase centralizadas en la política `f0p11k-remover-1`; no aleatorio, no modifica RNG ni componentes 3/6/9, no ocupa ranuras y no se concede a fantasmas ni al restaurar. Catálogos H de combate/objetos conservados; fingerprint económico nuevo sin alterar ninguno de los 13 históricos.

Preparación: unidad propia en tablero o banquillo. Combate: solo banquillo y nunca una unidad presente en el input congelado. Rechazo de unidad ajena, inexistente, vacía, fase incorrecta, consumible usado o pendientes sin capacidad. Se devuelve todo intacto y se consume una vez dentro de la transacción durable existente.

Se reutilizan comando, journal, inventario, controlador UI y protocolo. Clic + confirmación «Retirar equipo» o arrastre equivalente. La UI muestra selección, espera, error y confirmación. Se corrige además la ocultación parcial del último icono al aparecer los controles: el scroll interno conserva visible el elemento seleccionado.

[Política completa, seguridad, idempotencia y pruebas](ITEM_REMOVER_COMPETITIVE.md).

Pruebas 2/3/4 jugadores: propiedad, overflow, restauración y reintentos; todos los replays y simulaciones congelados permanecen idénticos. SIGKILL real antes y después del commit en PostgreSQL aislado, mediante sockets y codec de persistencia: ningún consumo parcial y ninguna duplicación al reintentar. La evidencia estática de navegador no se usa como sustituto de estos tests.

## C · Cuatro objetos

**32/36 jugables. Sterak, Guantes de ladrón, Mangual y Sable-pistola siguen bloqueados.** Se investigaron nuevas fuentes oficiales y datos cliente; persisten reglas sin evidencia suficiente. Se registran resultados y diferencias individualmente en [ITEM_BLOCKED_COMPLETION.md](ITEM_BLOCKED_COMPLETION.md), incluidas la nota de 18 % de Sable-pistola y las exclusiones de Guantes. No se inventa una ejecución aproximada ni se afirma 36/36.

## Evidencia visual

Resoluciones: 1280×720, 1440×900, 1920×1080, 2560×1440 y 3840×2160. Capturas con `fullPage` para evitar recortes del capturador 4K.

- `before-{width}.jpg` frente a `after-jaramillo-{width}.jpg`: caso reportado.
- `after-closed-*`, `after-florin-*`, `after-long-scrolled-*`: inspector cerrado, FLORIN, objeto completo largo y lista desplazada.
- `after-equipped-*`, `after-synergy-*`: objeto equipado y Ruman Trinity, sin invasión de la barra.
- `remover-before-{width}.jpg` / `remover-after-{width}.jpg`: DOLEA 2/3 → 0/3, cantidad 1 → 0, inventario y pendientes actualizados, estrellas y unidad conservadas. Icono seleccionado completo en las cinco resoluciones.
- `combat-invalid-board.jpg`: retirada de DOLEA desplegada deshabilitada.
- `combat-drag-after.jpg`: arrastre real sobre FLORIN en banquillo durante combate, 1/3 → 0/3 y confirmación.
- `before-metrics.json`, `after-metrics.json`, `additional-metrics.json`, `geometry-verification.json`, `remover-visual.json`: medidas y resultados.

Las capturas de equipamiento usan una partida DEV aislada, con el removedor concedido por la política competitiva inicial. Las pruebas de autoridad y las del motor normal no usan concesión DEV para el consumible.

## Compatibilidad

Sin cambios de los 34 personajes, sinergias del Excel, roles/daños, habilidades inline, splash arts, Mar de Cristal, Festival Pop × Neon Playground, 36 recetas, 32 efectos ejecutables, compras/venta de banquillo/bloqueo en combate, panel estadístico, pool 30/25/18/10/9 ni reparto/odds. Barra 112 px y dos columnas conservadas. Iconos TFT únicamente LOCAL, EUNUCO en build público y fallback propio intacto. Snapshots y codec aceptan el nuevo fingerprint sin migrar históricos.

## Quality gates y estado Git

- `pnpm check`: **131 archivos / 1721 pruebas pasan**, una optativa omitida; TypeScript, ESLint y builds cliente/servidor correctos. PostgreSQL aislado 55439 y HTTPS/WSS de diagnóstico habilitados. Duración de tests: 522,45 s.
- Optativa `TFT_LOCAL_INTEGRATION=1`: **1/1 pasa** por separado (658 ms), incluidos puerto ocupado, control no autenticado rechazado y cierre de procesos/puertos propios.
- `build:local`, `verify:public`, `verify:railway`, `git diff --check`: correctos. Sin relajar timeouts o límites ni eliminar pruebas anteriores.
- 30 pruebas dirigidas de geometría/controlador/motor/autoridad y dos SIGKILL dirigidos pasaron. La prueba de capacidad se reforzó con un estado válido de 4096 instancias: 16 en bolsa, 4079 pendientes y una equipada; una concesión adicional falla sin mutación y la retirada deja 4080 pendientes sin duplicación. Suite específica final 11/11.
- Comparación de los 13 fingerprints históricos: todos idénticos; `P11K_CATALOG_HASH` distinto. Snapshot/codec, 32 efectos y recetas congeladas preservados.
- Se guarda un commit local de esta fase. No push. Solo cambios P11K en motor/política de consumibles, integración de autoridad/codec, UI de objetos/tooltips, fixtures/tests y documentación. Los archivos no relacionados preexistentes permanecen fuera del commit.

## Límites

La meta de 36/36 no se alcanza: los bloqueos se conservan por falta de evidencia decisiva, conforme al criterio del encargo. No se afirma fidelidad completa de TFT ni se modifican los límites documentados del motor EUNUCO. La política de un removedor inicial es balance solicitado para EUNUCO, no una afirmación sobre la entrega inicial oficial de TFT.

No se publica esta fase online. Los avisos de Vite existentes desde P11J (tamaño de chunks y futuro cargador nativo de configuración) se registran sin relajar ni silenciar comprobaciones.
