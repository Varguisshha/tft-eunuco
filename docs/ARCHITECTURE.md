> **Estado actual F0-P7B.2 (24/10/2026):** salas privadas implementadas; partidas funcionales de dos. [Informe](F0_P7B2_REPORT.md). Los apartados anteriores de fases se conservan como histórico.

# Actualización F0-P7B.1

Supabase Auth y PostgreSQL incorporan identidad persistente. AccountPortal/AccountService/session.ts separan cuentas de la partida local. MatchRoom valida identidad y AuthoritativeMatch recibe UUID/nombre de perfil. El motor, balance, arena y HUD no cambian.

Ver [AUTH_SYSTEM.md](AUTH_SYSTEM.md), [PLAYER_PROFILES.md](PLAYER_PROFILES.md), [SUPABASE_SETUP.md](SUPABASE_SETUP.md) y [PRIVATE_REGISTRATION.md](PRIVATE_REGISTRATION.md). El contenido anterior se conserva como histórico.

---

# Actualización F0-P7A

F0-P7A incorpora apps/server con Colyseus0.18, AuthoritativeMatch y proyecciones privadas. LocalSession comparte presentación mediante authority, manteniendo coordinator local separado de RemoteCoordinator. No hay cambios artísticos ni de guardados.

Véase [arquitectura multijugador](MULTIPLAYER_ARCHITECTURE.md), [protocolo](SERVER_PROTOCOL.md) y [partida autoritativa](AUTHORITATIVE_MATCH.md). Las afirmaciones históricas «servidor no implementado» de las secciones inferiores quedan superadas por esta actualización.

---

# F0-P6B.5-B — frontera de presentación Neon

`LocalGame` compone la cabecera, clasificación, campo y dock de reclutamiento con `neonHud.css` y `neonTokens.css`. Shop/Bench/UnitInspector/PhaseClock siguen leyendo LocalSession; las acciones económicas y las fases permanecen en la autoridad existente. GameFrame admite geometría de carta/panel/control y un marco compacto; GameButton conserva onAction/onCue, coste y estado accesible, incorporando un rótulo visible opcional. ContentIcon mantiene el registro/fallback de iconos y adopta los glifos originales de la exploración aprobada.

Phaser solo cambia su color de fondo cuando hay arena. `GameCanvas.resize`, `fitArenaView`, homografía, coordenadas, selección y sprites no cambian. El tamaño/posición CSS del canvas participa en el encuadre existente, sin implementar otra cámara. El inspector tiene scroll propio y cierre fuera del contenedor desplazable.

`development/neonReference.ts` es un fixture comparativo aislado: restaura un snapshot validado, reserva copias reales del pool, fija 52 oro/nivel4/XP4/ronda3/18.4s y una formación rival diagnóstica equivalente. La fuente de tiempo fija pertenece solo a ese controlador DEV; una prueba DEV normal o partida normal usa su reloj habitual. El fixture no modifica catálogos de producción ni formatos. Continúa bajo `__DEVTOOLS__`, importación diferida y exclusión del bundle público. Su botón dice explícitamente que usa reloj fijo y permite avanzar fase. Guardados DEV siguen rechazados por la recuperación normal.

La lógica de paquetes y los assets originales no cambian. Se excluyen de lint únicamente los prototipos históricos de `design-exploration/**`, ajenos al bundle; las reglas de aplicación y las pruebas se conservan. [Informe técnico/visual](NEON_PLAYGROUND_IMPLEMENTATION.md).

---

## Arquitectura histórica previa

## F0-P6B.4 — actualización vigente

La capa de presentación añade combatCounters.ts (contrato v1), GameCounter, GameIconButton y visualScale.ts. BoardScene aplica escala1.4 a arte real en Mar de Cristal; visualAdapter conserva default legado1 y hitbounds originales. CombatRenderer solo consume snapshots/eventos, incluyendo estela de daño180ms. BoardSession incorpora fixtures visuales4v4/8v8 internos. No se alteran shared, game-core, game-data, schemas, guardado ni reglas f0p6b3-1.

Sistema y criterios completos: [GAME_VISUAL_SYSTEM.md](GAME_VISUAL_SYSTEM.md). Las secciones posteriores se conservan como historial; esta actualización prevalece en presentación.

---

## F0-P6B.1 — estadísticas y críticos

`shared/advanced-stats.ts` declara reglas `f0p6b1-1`, límites/valores neutrales, ratios de AD/AP por estrellas y modos/orígenes de modificador. Los contratos existentes añaden campos opcionales para conservar sus registros históricos; las entradas avanzadas exigen datos explícitos y las anteriores rechazan esa semántica nueva.

`combat/stats.ts` resuelve potencia, tiradas críticas y la vista de estadísticas; `math.effectiveStat` compone fuentes identificadas. En reglas avanzadas `prepareTraitProfiles` devuelve modificadores permanentes sin alterar los valores base. El motor inicializa HP efectivo, mantiene carga/windup y transporta el crítico comprometido hasta su impacto. Toda resolución sigue fuera de React/Phaser.

`ADVANCED_COMBAT_PROFILES` y `ADVANCED_ECONOMY_CONFIG` permiten nuevas partidas con AP0/crítico0 y multiplicador1500; los catálogos anteriores permanecen disponibles. El inspector comparte `combatStatsView` y la representación de críticos deriva del evento `damage`. Arena incorpora escenarios sintéticos separados del juego normal. [Contrato y fórmulas](ADVANCED_STATS.md), [validación](F0_P6B1_REPORT.md).

## F0-P6A — habilidades y sinergias deterministas

Shared valida ChampionAbility v1 (activa/pasiva/mixta), desencadenantes, condiciones, efectos y TraitDefinition v1. Game-data conserva perfiles históricos y publica catálogo `f0p6a`/reglas `f0p6a-1`. Protocolo v3 admite ambas reglas sin reinterpretar guardados. Los perfiles modernos no mezclan campos de habilidad históricos.

Pipeline lógico: formación → perfiles escalados por estrellas → `prepareTraitProfiles` sobre copia → vida y estado de pasivas nuevo → simulación por ticks → eventos/snapshots → reproducción. `analyzeTraits`/`matchTraits` son puros y cuentan definiciones desplegadas distintas. El motor procesa pasivas después de los lotes de efectos comprometidos, con límites de activación y cooldown. Las activas consumen maná al inicio y resuelven en tick lógico.

Presentación: `TraitRail` muestra composición calculada por core; `ContentIcon` resuelve archivos visuales; `UnitInspector` representa una identidad con componentes; `LocalSession.inspection` entrega estadísticas efectivas, incluidos estados y velocidad de Overtime. Phaser solo lee eventos y solicita `ability` al resolver de animaciones. Diagnósticos de Arena están fuera del catálogo/pool. No se cambian geometría de Mar de Cristal, temporizadores ni fórmulas económicas.

Contratos y ampliación: [ABILITY_SYSTEM](ABILITY_SYSTEM.md), [TRAIT_SYSTEM](TRAIT_SYSTEM.md), [CHARACTER_DESIGN_CONTRACT](CHARACTER_DESIGN_CONTRACT.md). Evidencia y límites: [informe P6A](F0_P6A_REPORT.md).

## F0-P5.2 — arenas visuales configurables

`apps/web/src/arenas` incorpora contrato v1, geometría proyectiva, cámara y calibración. LocalGame pasa Mar de Cristal a GameCanvas; BoardScene proyecta centros/polígonos y usa la inversa para input. Imagen y suelo comparten cámara uniforme. CombatRenderer interpola en plano lógico antes de proyectar; PhaserUnitVisual ancla pies y escala uniformemente por profundidad. Arena técnica conserva su proyección afín y terreno. Sin cambios de core, economía, reloj, guardados ni sprites. Detalle en [ARENA_SYSTEM.md](ARENA_SYSTEM.md) y [calibración](MAR_DE_CRISTAL_CALIBRATION.md).

## F0-P5.1 — presentación e interacción

`LocalGame` compone battlefield relativo y dock inferior. `UnitInspector` se superpone sin participar en el layout de canvas. `LocalSession.inspection()` expone lectura combinada de unidades propias/rivales y snapshot vivo, sin alterar MatchState. `BoardPort.pointerActivate?` opta por deselect local; Arena conserva activate y selección originales. La selección durante arrastre se difiere al soltar para evitar fichas que intercepten el gesto.

`fitLocalBoardView` envuelve el encuadre existente con márgenes CSS convertidos a densidad de render. Proyección0,32 solo local. Coordenadas, pathfinding y motor intactos. El pequeño timeout de salida del inspector no controla fases. Sin cambios de contratos, persistencia ni módulos de reglas. Tests HUD usan autoridad real y SSR para estados; browser valida interacciones/Phaser.

# Arquitectura F0-P3

## Límites

```text
web ──> game-core ──> game-data ──> shared
 │          └────────────────────> shared
 ├────> shared
 ├────> game-data
 └────> sprite-contract
```

`shared` y `sprite-contract` solo dependen de Zod. Ningún paquete importa React, Phaser, DOM, reloj de pared, física ni red. ESLint impide importar React/Phaser/apps desde los paquetes y evita dependencias hacia core/data desde shared/sprite-contract. El servidor está reservado, no es un workspace vacío: no tiene manifest ni dependencias hasta que haya trabajo real.

- **shared:** schemas estrictos en runtime y tipos inferidos; formato JSON versionado. BoardState almacena únicamente unidades, sin duplicar un mapa de ocupación. Rechaza IDs duplicados, superposición y posiciones fuera de límites; GameState además valida la mitad durante preparación. Las definiciones desconocidas se rechazan en `placeUnit`; el contrato serializado no consulta un catálogo de contenido. Una futura carga autoritativa deberá validar también las referencias del catálogo.
- **game-data:** IDs ficticios, roles y costes de referencia; perfiles de combate validados y efectos declarativos. `createCombatInput` adjunta perfiles al tablero, con validación de referencias.
- **game-core:** motor de combate sin dependencias gráficas (`combat/engine.ts`, `math.ts`, `pathfinding.ts`), geometría unitaria, búsqueda de ocupantes y transiciones inmutables `placeUnit`/`moveUnit`, con errores discriminados. Requieren un estado previamente validado. El argumento actor comprueba propiedad local; no autentica a nadie.
- **sprite-contract:** metadatos independientes del motor, puerto `UnitVisual` y cálculo de anclaje. No interpreta daño ni toma decisiones de juego.
- **web:** React representa herramientas e inspector; `BoardSession` es un almacén local observable mediante `useSyncExternalStore`; Phaser escucha el mismo almacén. La escena convierte el puntero a mundo y después a hexágono; los comandos pasan siempre por core. El arrastre solo desplaza el visual hasta que se suelta: un error restaura su posición desde el estado.

## Geometría

Axial `(q,r)` con tercer eje implícito `s=-q-r`. Hexágonos pointy-top de radio lógico 1:

```text
x = √3 · (q + r/2)
y = 3r/2
q = x/√3 − y/3
r = 2y/3
```

La inversa usa redondeo cúbico, no redondeos independientes. La distancia es `(abs(dq)+abs(dr)+abs(dq+dr))/2`.

Los límites forman un rectángulo odd-r de 7 columnas × 8 filas: `q = column − floor(row/2)`, `r = row`. Se valida la columna reconstruida, **no** `0 <= q < 7`. Ejemplos independientes: esquina superior izquierda `(0,0)`; inferior izquierda `(-3,7)`; inferior derecha `(3,7)`. Filas 0–3 ámbar/north; 4–7 jade/south. El inspector presenta columnas/filas desde 1; q/r se muestran sin convertir.

`hexNeighbors` da los seis vecinos infinitos; `boardNeighbors` filtra límites; `walkableNeighbors` también filtra ocupación. El A\* de combate utiliza esta misma topología y añade reservas y posiciones de ataque; no cambia las coordenadas.

## Proyección y cámara

En web, `projection.ts` aplica rotación de 30°, compresión Y de 0,64 y escala de 45 píxeles por unidad lógica. Centra la huella completa en un mundo de 1000 × 650. Es una **proyección isométrica estilizada 2D**, no una cámara 3D ni una cuadrícula rectangular rotada.

Phaser usa WebGL, `Scale.FIT`, cámara centrada y zoom independiente. `camera.getWorldPoint(pointer.x, pointer.y)` elimina la transformación de cámara; la inversa afín elimina la proyección; `cartesianToAxial` identifica la celda. Los sprites se ordenan por su apoyo Y para oclusión. `pixelArt`, antialias desactivado y `roundPixels` están explícitos; el escalado responsivo fraccional puede alterar la regularidad de píxeles, aunque conserva nearest-neighbor. Los rectángulos originales de sprites se pintan en un canvas de textura; esto no usa el renderer Canvas obsoleto de Phaser.

No se usa Arcade Physics ni hitboxes físicas para ocupación. La selección sobre un sprite usa sus bounds visuales; la colocación siempre usa casillas lógicas. Un drop fuera de canvas cancela el arrastre; un drop dentro de canvas y fuera del tablero se rechaza. Las suscripciones se retiran al desmontar React, al apagar o al destruir la escena, para evitar escenas antiguas durante HMR.

## Autoridad y reproducción

- `CombatEngine`: instancia aislada, PRNG Mulberry32 uint32, ticks de 100 ms, máximo 300. Entrada validada/clonada y orden de decisiones explícito. `runCombat` ejecuta sin reloj ni navegador. Las reglas exactas están en [COMBAT_SPEC](COMBAT_SPEC.md).
- `shared/combat.ts`: protocolo 2, reglas f0p2-1, entradas, estados, resultados, eventos y lotes validados. Los contratos históricos P1 se conservan en board-contracts; no se usan para la nueva simulación.
- `BoardSession`: mantiene la formación de preparación y una reproducción independiente. Al iniciar calcula la traza local completa. No modifica la formación mientras observa el combate.
- `CombatPlayback`: reloj visual, pausa, velocidad, muestreo de snapshots y eventos recientes. No elige objetivos ni resuelve daño. Probado con distintas particiones de deltas de render.
- `CombatRenderer`: convierte acción/posición/tick a movimiento, ataque, proyectil, habilidad y muerte; pinta barras desde snapshots. No usa colisiones ni callbacks de animación como autoridad.
- React: controles e inspector; ninguna fórmula de daño ni decisión de combate.

Para online, un adaptador de servidor podrá validar la entrada, crear `CombatEngine` y publicar `step()`+snapshot en lotes del contrato. Un adaptador cliente deberá validar versión/orden, gestionar retrasos y alimentar al reproductor. Ese transporte no está implementado. Tampoco hay reconexión ni carga de un motor desde snapshot; repetir entrada+semilla sí está soportado. [COMBAT_EVENTS](COMBAT_EVENTS.md) detalla lo que el schema garantiza y lo que pertenece al transporte.

## Arena interna y futura partida

La Arena se conserva permanentemente como herramienta para preparar formaciones, diagnosticar combate, inspeccionar unidades y validar sprites. Mantiene selección, teclado, arrastre en preparación y zoom. No es la dirección artística final. Solo se añaden controles de simulación, barras/efectos y ajuste funcional de altura del canvas.

F0-P3 añade Partida local como vista independiente: reutiliza BoardPort, GameCanvas, BoardScene, proyección, adaptador y reproducción. Arena se extrae a Arena.tsx y conserva BoardSession. Tienda/banquillo/economía funcionan en la nueva vista; clasificación, profundidad visual y producción artística siguen pendientes.

`owner: north|south` identifica los dos lados de este tablero local, no a los cuatro participantes de una partida futura. La asociación partida/jugador/duelo pertenece a la futura capa de servidor y requerirá evolución explícita del contrato.

## Dependencias y extensión

Phaser 4.2.1 está fijado; todos los paquetes quedan resueltos en pnpm-lock.yaml. React no llama a APIs internas del renderer. Fuentes servidas localmente. No hay CDN, peticiones de juego, credenciales ni servicios externos.

El core puede ejecutarse en Node sin canvas. Antes de añadir Colyseus/Supabase, crear adaptadores fuera de los paquetes puros. No hace falta distribuir paquetes compilados todavía; si se publican o consumen fuera de este monorepo, añadir salidas ESM y declaraciones de tipos en esa fase.

## Autoridad económica F0-P3

`shared/match.ts` define configuración, propiedad con ubicación única, ofertas, ledger, estado y acciones estrictas versionadas f0p3-1. `game-data/economy.ts` es la única tabla económica. `game-core/match` separa transacciones, extracción, selectores/escalado e invariantes. `applyMatchAction` clona, valida, ejecuta y publica atómicamente; rechazos conservan el original. `replayMatch` reconstruye desde seed/config/historial.

LocalSession implementa el mismo puerto visual que BoardSession. React despacha comandos; Phaser convierte input a ubicaciones y reproduce combate. La propiedad y el pool no dependen de sprites. Al construir combate se escalan perfiles por estrellas sin cambiar el motor P2. `resolve_round` deriva su resultado ejecutando la entrada congelada; no acepta ganador de UI.

Guardado local tras acciones aceptadas, validación semántica y reproducción del historial al continuar. Ningún acceso a localStorage en core. Separación de RNG tienda/combate. Secuencia/revisión preparan el procesador de comandos futuro; no implementan autenticación ni transporte. El pool incluye un propietario local y sus cinco reservas; cuatro propietarios exigirán agregar inventarios/tiendas en el contrato, no crear clientes falsos.

Especificaciones: ECONOMY_SPEC.md, SHOP_POOL_SPEC.md, PROGRESSION_SPEC.md y ROUND_FLOW.md. Sin nuevas dependencias, servicios o infraestructura.

## Actualización F0-P3.1

`shared/combat.ts` define protocolo3 y configuración de overtime; `combat-v2.ts` preserva schemas históricos aislados. `game-core/combat/overtime.ts` calcula multiplicadores enteros, consumidos en efectos y carga; no depende de presentación. `match/roundDamage.ts` calcula daño puro por participante; la misma transacción resolve_round actualiza vida/ledger, oro, racha y XP. Configuración de vida en game-data/economy; sin cliente rival ni servicios nuevos.

CombatPlayback aporta overtime/remainingTicks/transición a GameCanvas y CombatRenderer. Un objeto Phaser por escena y una línea temporal nueva al repetir; la UI no decide finales. Arena puede cargar perfiles sintéticos legales desde game-data/combatScenarios únicamente para diagnóstico; Partida local mantiene su rival original. Los guardados f0p3.1-1 usan clave distinta y validación+replay; no se reproducen historiales P3 con reglas cambiadas.

## Presentación F0-P4

Partida local dispone de un HUD de viewport con participantes, tablero, inspector, banquillo y tienda. `Bench`, `Shop`, `UnitInspector`, `PhaseClock`, `purchaseAvailability` y `gameHud.css` separan responsabilidades visuales. La disponibilidad de compra procede de una transacción de core sobre copia, memorizada por MatchState. No existe una segunda implementación de economía.

GameCanvas ofrece encuadre adaptativo exclusivo de Partida: ResizeObserver, render buffer según DPR limitado a2, cámara calculada por `viewport.ts` y proyección vertical0,38. El drop usa dimensiones reales del render, no constantes de mundo. Arena conserva Scale.FIT/proyección0,64 y su decoración de overtime. Compartir renderer no obliga a compartir disposición o cámara. La selección ya no impone zoom1 a cada sincronización.

El contrato de reloj admite un tiempo autoritativo futuro; hoy los cambios de fase siguen manuales y el contador de combate deriva del reproductor. Protocolos, configuración, game-core, game-data y guardados P3.1 permanecen intactos. Estructura, adaptación, accesibilidad y límites en [GAME_UI_SPEC](GAME_UI_SPEC.md).

## F0-P4.1: recursos y catálogo versionado

El contrato v2 y su resolver viven en sprite-contract. El importador Node/sharp produce hojas y metadatos; web precarga el registro y muestrea frames con el reloj de CombatPlayback. Señales visuales derivadas de eventos no conceden autoridad al renderer. Nuevos personajes se registran sin rutas específicas en PhaserUnitVisual. Catálogo opcional f0p4.1 en EconomyConfig selecciona cinco definiciones; configuración histórica mantiene cuatro y replay idéntico. DOLEA comparte motor, economía, habilidades y escalado existentes. Arena incorpora evoluciones, inspector de frames y avance manual de un tick. Detalles en CHARACTER_INTEGRATION.md y SPRITE_PIPELINE.md.

## Extensión vigente F0-P5: coordinación automática

El ciclo normal ahora lo gobierna `packages/game-core/src/match/coordinator.ts`, sobre `clock.ts` y los contratos de `packages/shared/src/match-clock.ts`. Es código puro con `TimeSource` inyectable. `RoundAuthority` conserva la traza de una única simulación y reutiliza la liquidación del motor económico. `apps/web/src/match/automaticHost.ts` conecta pulsos y persistencia al ciclo de vida de la sesión; no depende de montar Phaser. `LocalSession` es el adaptador visual y `CombatPlayback.seek` solo muestrea. La Arena sigue con su sesión manual independiente.

El nuevo guardado versionado contiene el envoltorio temporal, el estado histórico, IDs de liquidación y traza comprimida por diferencias de snapshots. No se vuelve a simular al recuperar P5. La migración histórica conserva reglas/catálogo y la clave previa. `MatchCoordinator` define el puerto sustituible para una autoridad remota futura; los métodos técnicos son específicos del adaptador local. No se ha instalado red ni servidor. Véanse MATCH_CLOCK_SPEC y AUTOMATIC_ROUNDS para estados, cuatro dominios temporales y límites.

Las secciones anteriores relativas a botones manuales o a la segunda simulación describen los hitos históricos y la ruta de compatibilidad, no el flujo normal vigente.

## F0-P6B.2 — operaciones de mecánicas

`shared/mechanics.ts` versiona stacks, atribuciones, contexto causal y acciones especiales. `game-core/combat/mechanics.ts` implementa las operaciones mediante un puente al estado exclusivo de `CombatEngine`. Las definiciones de stacks y progreso se ejecutan en la misma cola de pasivas; no existe un segundo motor por personaje. Cada evento visual procede de esa autoridad. Las partidas nuevas seleccionan `f0p6b2`; los catálogos anteriores conservan sus adaptadores. Véase [ADVANCED_MECHANICS.md](ADVANCED_MECHANICS.md).

## Integración F0-P6B.3

Nuevo contenido `f0p6b3` / `f0p6b3-1` conserva los catálogos y trazas anteriores. VARGAS se expresa en datos; el motor añade recuperación sobre daño a HP, efectos tras daño, modificadores por estrella y condiciones de stacks. La capacidad DEV tiene subpaths propios y borradores validados, sin ampliar el protocolo normal. `GameCanvas` usa identidad de escena preparada al cambiar de sesión. [Personaje](VARGAS_CHARACTER.md), [DEV](DEVELOPER_MODE.md), [validación](F0_P6B3_REPORT.md).

## F0-P7B.2 — Salas privadas

LobbyHub coordina salas en memoria y canales privados `lobby_gateway`; `private_match` reutiliza MatchRoom/AuthoritativeMatch con roster permitido. El frontend conserva RemoteCoordinator y LocalGame. No se modifica core, economía, arena ni DEV.

Contratos, operación y ciclo: [PRIVATE_LOBBIES.md](PRIVATE_LOBBIES.md). Seguridad y evidencias: [LOBBY_SECURITY.md](LOBBY_SECURITY.md). Transición: [LOBBY_TO_MATCH.md](LOBBY_TO_MATCH.md).

## F0-P6C · JARAMILLO

F0-P6C amplía datos, contratos compartidos y núcleo con JARAMILLO. La persistencia se incorpora a OwnedUnit dentro de snapshots P7D.2; Phaser consume la traza y un contrato visual compuesto. No se añade simulación de cliente, tabla ni subsistema de persistencia. Véanse los tres documentos de JARAMILLO, animaciones compuestas y acumulaciones persistentes.

## F0-P8A · Componentes y objetos (26/10/2026)

El catálogo de objetos tiene versión separada `f0p8a-1`, habilitada en nuevas configuraciones mediante `itemCatalog`. Shared define contratos; game-data registra ocho categorías y 36 recetas reservadas; core conserva inventarios y equipa sobre candidatos privados; DurableMatch persiste y confirma. No se reescribe la simulación. Documentación vigente: [ITEM_SYSTEM](ITEM_SYSTEM.md), [ITEM_INVENTORY](ITEM_INVENTORY.md).

## F0-P8B · Catálogo estándar versionado

`shared/item-design.ts` contiene operaciones declarativas reservadas; `game-data/items-standard.ts` transforma exclusivamente hechos congelados en 44 definiciones. `item-description.ts` deriva texto propio. `item-catalogs.ts` resuelve versiones y familia explícitas. El motor no ejecuta efectos nuevos; solo incorpora maná inicial al preparar una copia del perfil, excluyéndolo de modificadores de combate.

Las nuevas partidas usan `STANDARD_ITEMS_ECONOMY_CONFIG`; se conservan los contratos P8A y los guardados sin inventario. `STANDARD_ITEM_CATALOG_HASH` incluye configuración, personajes, catálogo completo y reparto apagado. Las tres huellas anteriores conservan exactamente sus bytes. P7D.2 guarda el mismo JSONB, sin tablas/migraciones nuevas. La autoridad valida versión, propiedad, recibos y disponibilidad antes de publicar. [Catálogo](ITEM_CATALOG.md), [P8C pendiente](ITEM_EFFECT_COMPATIBILITY.md).


## Actualización F0-P8C · 26-10-2026

El ejecutor universal vive en `game-core/combat/item-effects.ts`; la política y catálogo en game-data, contratos en shared. No depende de Phaser. App y salas modernas eligen P8C solo en partidas nuevas. Repositorios comprimen replays persistidos con un codec independiente del cálculo.

Detalle: [ejecutor](ITEM_EFFECT_EXECUTOR.md), [decisiones](ITEM_EFFECT_EVENT_ORDER.md) y [matriz de pruebas](ITEM_EFFECT_TEST_MATRIX.md).
