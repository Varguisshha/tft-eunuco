# F0-P12B — Removedores periódicos y clones PvP

## 1. Base Git

Base exacta `53156e1ecce84b452f05f3651cd3fb3c41d0fa4d`, release pública P12A-R3/P11K. Baseline previo a los cambios: 133 archivos aprobados, 1 opt-in omitido; 1.724 pruebas aprobadas, 1 omitida; TypeScript, ESLint y builds correctos. `verify:release` sin hallazgos, 1.007 blobs auditados.

## 2. Rama y preservación

Rama `codex/f0-p12b-removers-ghosts`, worktree aislado `p12b-removers-ghosts`. No se reconstruye ni modifica `release/p11k-public-safe`. Se inspeccionaron los worktrees: LOCAL con arte de referencia conserva `codex/f0-p12a-release-preflight` en `caf02f6`; sus archivos y genealogía no se incorporaron. No se modifican roster, estadísticas, habilidades, sinergias, recetas, costes, probabilidades ni pool. No hay cambios en recursos gráficos.

## 3. Política versionada

`P12B_ECONOMY_CONFIG` envuelve P11K con `f0p12b-remover-1` y `pvpPolicy/f0p12b-1`, factor fijo 800 milésimas. Conserva un removedor inicial. Las nuevas partidas LOCAL/DEV y las nuevas salas modernas usan esta configuración; las partidas restauradas seleccionan la suya por fingerprint.

Fingerprint P12B: `0948310d6132a43cf03607ab356c12120357473863ff75c87cdde6fe7b45e72f`.

Las reglas base de combate siguen siendo P11H; el contrato opcional `ghost.version` identifica inequívocamente la extensión de combate. Su presencia se vincula a P12B en la restauración autoritativa.

## 4. Reparto autoritativo

Al cerrar 3/6/9/12/15… se calcula la lista de supervivientes reales después del daño. `planItemDrop` conserva los streams y sorteos originales: una cantidad común 2/3 al 50/50 y tipos independientes entre los ocho componentes. No hay otro sorteo ni consumo de RNG para el removedor.

El evento nuevo lleva `version: f0p12b-1` y `removerIds` dentro del mismo recibo de componentes. La entrega se prepara en las mismas copias de economía, se valida y se confirma junto con resultados, inventarios y diario. El identificador de consumible incorpora propietario y una abreviatura determinista del recibo SHA-256; el recibo completo permanece en la distribución y su linaje se verifica al cargar.

Los no utilizados se acumulan sin caducidad, sin ocupar la bolsa de componentes. Se conservan límites de bolsa/Pendientes, 4.096 instancias, 1.000 repartos y 1.024 entradas del diario de removedores. Eliminados y clones no reciben entregas. En P12B el único ganador superviviente también recibe el evento si la última ronda es múltiplo de tres; una eliminación simultánea total no tiene destinatarios. Las políticas antiguas conservan su exclusión de la ronda final.

No se concede nada al cargar. Cargas, reintentos y recibos consumidos se validan sin reconstruir entregas históricas. El coordinador LOCAL usa el mismo grant dentro de su cierre de ronda y guarda su diario conjuntamente.

## 5. Sistema previo y emparejamientos

Ya existía un ghost con tres vivos: un duelo humano más el tercer jugador contra el ejército de otro participante del duelo humano. El propietario solo liquidaba su duelo real. El ghost era de fuerza completa, reutilizaba identificadores originales y no permitía progresión persistente al jugador real que lo vencía.

Se reutilizan `Pairing`, `Duel`, `duelFor`, liquidación, eliminaciones y replays. La política `balanced-history-v2` enumera emparejamientos completos de los supervivientes ordenados. Con impares enumera cada destinatario y cada propietario distinto, añadiendo exactamente un clon; con pares solo hay duelos humanos. Con uno vivo termina la partida mediante la resolución existente.

## 6. Rotación

La puntuación prioriza recuento de veces como destinatario del clon y como fuente, y después máximo/suma de repeticiones de rivales y peso de encuentros recientes, incluyendo humanos y clones. Desempate mediante hash determinista del seed, ronda y candidato. No avanza RNG económico ni depende de reloj o conexión.

Pruebas de 3/5/7 participantes durante tres ciclos completos comprueban exactamente tres asignaciones de clon por participante con el roster fijo. No se promete alternancia perfecta ante eliminaciones o restricciones cambiantes.

## 7. Snapshot del ejército

Se congela desde las unidades desplegadas al comenzar el combate, usando posiciones, estrellas, perfiles efectivos, equipo, habilidades y pertenencias a sinergias existentes. `withGhostArmy` hace copia profunda solo del contrato de combate, crea IDs independientes derivados del combate/propietario/índice y conserva el mapa de procedencia `unitId → sourceUnitId`.

No se crea Participant, cuenta, economía, tienda, banquillo, inventario económico, removedores, recibos ni autoridad adicionales. La restauración compara personajes, posiciones y perfiles con el duelo humano simultáneo de la fuente. No se admiten auto-clones ni alias de unidades originales.

## 8. Aplicación exacta del 80 %

Único factor físico de daño en `CombatEngine.damage`: después de amplificaciones, Overtime, reducciones y resistencias; antes de absorber escudos y restar vida. Se aplica `floor(daño × 800 / 1000)` cuando el propietario del emisor es el lado marcado como clon. Daño físico, mágico, verdadero, básicos, habilidades, impactos de proyectil, quemaduras y efectos de objetos convergen ahí. Los proyectiles no se escalan al lanzarse.

No se cambian AD, AP, vida, defensas ni velocidad. No afecta al daño entrante del clon ni escala directamente curaciones, escudos o control. La curación calculada sobre daño realmente causado conserva su fórmula existente, por lo que puede sanar menos al haberse causado menos daño. La contabilidad de defensa utiliza la solicitud proporcional para no registrar la reducción de clon como mitigación de armadura. El redondeo entero puede llevar un golpe de 1 a 0.

Es balance personalizado de EUNUCO, no equivalencia declarada con Riot.

## 9. Resultado y daño al jugador

`duelFor` sigue asignando cada participante real exactamente una liquidación. Si vence al clon obtiene su victoria y recompensas habituales; si pierde se calcula el daño con los supervivientes del clon en ese replay. El propietario del ejército clonado solo recibe el resultado de su propio duelo humano. No tiene segunda victoria, derrota, pérdida de salud ni recompensa del clon.

Los diarios existentes contienen resultado, supervivientes/replay, daño aplicado al jugador y recompensas. El resumen muestra tipo de rival, victoria/derrota/doble derrota, daño, oro y XP.

## 10. Pasivas y sinergias

Los perfiles del clon incluyen la progresión permanente ya ganada por la fuente antes de la ronda, por ejemplo el AD de JARAMILLO. Las acumulaciones y efectos temporales del combate viven solo en su motor y se descartan con él. Se recalculan sinergias sobre la composición copiada, sin consultar inventarios económicos de otros participantes.

Decisión explícita P12B: vencer un clon cuenta como victoria del jugador real para su progresión, una vez. El propietario original solo progresa según su propio duelo humano. P11K conserva su antigua exclusión de progresión contra ghost. Hay pruebas de las dos victorias simultáneas y de acumulaciones ganadas que aparecen congeladas en una ronda posterior.

## 11. Determinismo y replays

Seed y orden estables, sin reloj de pared para resolver. Cada replay puede reproducirse independientemente. El input identifica jugador real, fuente pública, lado clon, factor 800 y procedencia de unidades. Resultado, snapshot final y liquidación existentes completan supervivientes y daño al jugador. La inversión doble de perspectiva conserva el replay.

No se exponen oro, tienda, inventario libre ni recibos de la fuente. Los comandos económicos y de removedor siguen buscando unidades propias reales: los IDs de clon no pertenecen a ningún inventario.

## 12. Persistencia y SIGKILL

La nueva configuración se incorpora a la selección y a la lista de fingerprints del codec gzip existente. Sin SQL nuevo. Reutiliza la transacción y el lease actuales.

La prueba PostgreSQL P12B ejecuta tres clientes reales Colyseus, ejército equipado, bolsa llena y ghost; bloquea la escritura antes del commit, verifica que todavía no se publica el reparto, mata proceso/escritor, restaura, confirma una sola entrega, mata tras commit y restaura otra vez. Contrasta con una autoridad de control hasta ronda 6: dos repartos y tres removedores por superviviente, sin duplicados y con replay de clon idéntico.

Se conserva también la variante histórica P8D de cuatro participantes, el bloqueo SQL sincronizado de R2 y todas sus aserciones y tiempos límite.

## 13. Cobertura 2/3/4/5/7

Autoridad, economía y restauración completas con 2/3/4 jugadores; planificador genérico y simulaciones de sus duelos con 2/3/4/5/7. Pruebas de clon de una y siete unidades, equipo, escudos, curación, stun, proyectiles, daño verdadero, sinergias, progresión permanente, replay, Overtime y empate al límite de 450 ticks.

Regresiones de 4→3→2→1, eliminación contra clon, final en ronda 3, empate con eliminación total, recompensa solo a supervivientes, bolsa llena, restauración, reintentos y rotación. El caso de ataque sobre un ID de clon se rechaza. Los límites de 5.000 ms y 16,7 ms del laboratorio R2 permanecen intactos.

## 14. Evidencia visual

Capturas reales de navegador IAB, React/Phaser y cuatro clientes locales Colyseus, en `artifacts/p12b`:

- `ghost-{1280,1440,1920,2560,3840}.jpg`: VS — Clon de [nombre] y marco azul discreto.
- `reward-{1280,1440,1920,2560,3840}.jpg`: componentes, +1 removedor, total disponible y Pendientes.
- `elimination-1280.jpg`: cuatro a tres supervivientes.
- `even-after-elimination-1920.jpg`: dos supervivientes y rival humano Nora.
- `resolution-1920.jpg`: resultado del clon, daño recibido y oro/XP.
- `visual-layout.json`: 1280×720, 1440×900, 1920×1080, 2560×1440 y 3840×2160 sin scroll de página.
- `browser-final-console.json`: comprobación de consola sin errores/avisos en un punto de la campaña. `visual-server-verified.log`: campaña final sin errores del servidor de laboratorio.

El aviso dura ocho segundos y registra silenciosamente las distribuciones que ya existían al montar la vista; no vuelve a animarlas al cargar o reconectar. Reutiliza el inventario, selección, arrastre, confirmación y consumo existentes. No hay cambios en sprites ni en el diseño global. Los controles pequeños superiores de las capturas son exclusivos del laboratorio.

Los primeros controles manuales de eliminación se corrigieron por introducir estados inválidos; no se relajó validación del juego. La última campaña prepara salud en una copia, valida reservas compartidas y vende unidades mediante comandos existentes antes del combate. El servidor de laboratorio está documentado separadamente. Las capturas no son imágenes generadas ni retocadas; el reloj manual no acredita tiempos de animación reales.

## 15. Compatibilidad histórica

Comparación en ejecución con la release base: 16 constantes de catálogo exportadas, todas idénticas, incluidas las 13 históricas solicitadas y P11K (`edd6bc4f87fba4e9d4724706c0e66c02cdf97a39a50884cf5f339aa3caf9e23e`). Detalle en `artifacts/p12b/fingerprints.json`. Los campos nuevos son opcionales y no se añaden por defecto a datos históricos. No se migran snapshots ni se ejecuta backfill. La nueva política de emparejamientos y el marcador ghost se vinculan al fingerprint al restaurar.

## 16. Quality gates

Gate completo `pnpm check`: **136 archivos aprobados + 1 opt-in omitido; 1.757 pruebas aprobadas + 1 opt-in omitida**, 528,26 s. TypeScript, ESLint, build público y build servidor correctos. Se ejecutó con Node 24.22.1, PostgreSQL aislado y `P9A_TLS_TESTS=1`, incluyendo HTTPS/WSS y campañas de 2/3/4 participantes.

Regresiones nuevas conjuntas: **32/32**. PostgreSQL/SIGKILL P12B dirigido: **1/1**, y la misma regresión se ejecutó además dentro de la suite completa. Lifecycle opt-in ejecutado separadamente: **1/1**, con comprobación de arranque, rechazo de puertos ocupados, apagado y liberación de puertos. Total de pruebas aprobadas entre gate y opt-in: **1.758**.

`build:local`, `verify:public`, `verify:railway` y `git diff --check`: correctos. `verify:railway` es una comprobación exclusivamente local y no contacta al proveedor. Auditoría del árbol de trabajo: 34 archivos, cero hallazgos de secretos o assets prohibidos. Auditoría posterior al commit registrada en `verify-release.log`.

Permanecen avisos previos de Vite sobre extensión de importación del secuenciador y chunks grandes; no son errores ni se han ocultado. No se relajaron tiempos ni aserciones.

Evidencia: `baseline.log`, `baseline-release.log`, `joint-regressions.log`, `pg-new.log`, `full-gate.log` y verificaciones finales en `artifacts/p12b`. El secuenciador R2, un worker y ausencia de paralelismo entre archivos se mantienen.

## 17. Estado Git y servicios

Cambio preparado para un único commit local de P12B. El SHA exacto y estado final se registran en `artifacts/p12b/final-state.json` después de crear ese commit; el informe no intenta incluir su propio hash recursivamente. La auditoría completa de ese historial queda en `artifacts/p12b/verify-release.log`.

No se ha hecho push, despliegue ni acceso/modificación a Railway o Supabase remoto. Los laboratorios visuales 2578/2579/4184 se han parado. La base pública y LOCAL no se han modificado. Los artefactos, fixtures originales ignorados, certificados de laboratorio y builds permanecen excluidos de Git.

## 18. Límites

Las salas, protocolo de participantes y autoridad desplegable continúan limitados a 2–4 jugadores. La extensión del planificador admite hasta ocho para escenarios 5/7; habilitar salas reales mayores necesita una fase de protocolo/capacidad y no se ha hecho aquí. No se inventan invocaciones: no hay invocadores disponibles que probar; futuros emisores atribuidos al lado clon pasan por el mismo cálculo central.

La versión anterior debe restaurarse con sus reglas previas, aunque ello mantenga el ghost histórico al 100 % y solo su removedor inicial. No hay actualización retroactiva. Los límites históricos de diarios siguen vigentes; no son recompensas infinitas. Esta validación es LOCAL, no una nueva sesión remota con amigos. Railway continúa sin ser reactivado.
