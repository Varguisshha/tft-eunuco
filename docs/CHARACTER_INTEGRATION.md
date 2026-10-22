# Integración de personajes

## DOLEA, primer caso F0-P4.1

DOLEA (`dolea`) se añade al `CHARACTER_ROSTER`; las cuatro definiciones ficticias siguen disponibles. `UNIT_DEFINITIONS` conserva el catálogo histórico de cuatro para las partidas y fixtures originales. `getUnitDefinition` consulta el roster completo. No se modifica el motor de combate.

Ficha exclusivamente provisional: coste2, vanguardia/tanque cuerpo a cuerpo, alcance1, etiqueta `prototype-neutral` mostrada como «Provisional», sin bonificaciones. Vida600, ataque40, armadura45, RM35, velocidad0,8 ataques/s, maná50, movimiento4ticks, preparación de ataque2ticks. Reutiliza Bastión de prueba y Blindaje inicial de K-01. No describe características personales ni constituye balance final.

El pool nuevo aporta22 copias de DOLEA. Probabilidades por coste, oro, compras, ventas, XP, 1/3/9 copias y multiplicadores de estrellas permanecen intactos. La fusión conserva el ID y ubicación del superviviente según la regla existente. `starsFor` transmite las estrellas a la vista, que cambia textura/origen/escala sin recrear unidades lógicas. 3★ conserva estadísticas escaladas y tres indicadores aunque reutilice el traje de2★.

## Contrato y resolver

`CharacterManifestSchema` (v2, independiente de React/Phaser/core) exige las evoluciones `star1|star2|star3` y los cinco estados lógicos `idle|walk|attack|ability|death`. Cada recurso es opcional mediante `null`. Un recurso disponible describe hoja/celdas/índices/FPS/escala/apoyo/orientación/espejo/impacto, estado provisional/final y fuentes con hashes.

`resolveAnimation` devuelve solicitud y estrella solicitada, estado/estrella seleccionados, recurso y cobertura (`available`, `fallback`, `absent`). Busca el estado solicitado, después Attack de esa misma evolución; recorre las evoluciones anteriores en orden descendente con la misma prioridad; finalmente entrega `null` para el placeholder genérico. No busca evoluciones superiores ni fabrica animaciones.

DOLEA tiene dos clips Attack reales de8frames. Cada evolución1/2 tiene cuatro fallbacks a su Attack; los cinco estados de3★ recurren a2★. Los demás personajes conservan el arte genérico. Ver [cobertura generada](ANIMATION_COVERAGE.md).

## Reproducción

BoardScene precarga todos los recursos declarados, sin rutas DOLEA dentro del adaptador. PhaserUnitVisual resuelve por `spriteId`, estrellas y estado; una textura que no cargue cae al placeholder. `sampleAnimationFrame` calcula el frame desde tiempo explícito. No se usan callbacks Phaser, temporizadores de daño o animaciones autónomas que ignoren la pausa.

`CombatPlayback` calcula las señales visuales desde el historial completo. `unitAnimationCue` prioriza muerte, aturdimiento, movimiento y habilidad; Attack conserva recuperación hasta el siguiente inicio/cancelación/aturdimiento. El tramo anterior al impacto y el posterior se ajustan al `releaseTick` y a la siguiente acción real. Para cuerpo a cuerpo, release coincide con daño; para ataques a distancia es lanzamiento, mientras los proyectiles siguen el impacto autoritativo existente. Pausa y×2 comparten el mismo reloj que las barras y VFX.

Los ocho frames se muestrean en orden; una interrupción real puede truncar el clip. El siguiente estado se resuelve de nuevo. Death reproduce una sola secuencia en550ms con desvanecimiento; no vuelve a Idle. Idle/Walk provisionales repiten Attack, pero no producen eventos. Los sprites reales omiten los antiguos impulsos/balanceos/giros del placeholder para conservar el apoyo. Preparación usa únicamente el reloj visual de escena. Con movimiento reducido se congela la pose de los loops Idle/Walk de sprites reales; ataques y desaparición siguen indicando lo que sucede.

## Añadir otro personaje

1. Añadir una definición a `CHARACTER_ROSTER` con ID único, `spriteId`, coste/rol y etiqueta informativa; preservar catálogos históricos.
2. Añadir su perfil validado a `COMBAT_PROFILES`, reutilizando efectos existentes o diseñando cambios de reglas en una fase explícita.
3. Registrar sus fuentes/configuración en `scripts/sprites/config.json`; colocar los PNG por evolución/estado y ejecutar `pnpm sprites:import`.
4. Revisar hashes/anomalías/cobertura, ajustar impacto y escala, verificar los cinco estados en el inspector de Arena. No hace falta completar todos los clips.
5. Para una nueva versión del roster de tienda, añadir un discriminante de catálogo y su lista congelada. No ampliar un catálogo ya persistido: cambiaría sorteos y replay. Ajustar únicamente catálogo/pool, no probabilidades por coste.
6. Añadir tests de manifiesto, selección visual, tienda/pool/fusión/venta y recuperación; comprobar interacción y combate reales.

## Añadir Walk a DOLEA después

Crear `Sprites/dolea/star1/walk/frame-1.png` y sucesivos. Ejecutar `pnpm sprites:import`, revisar el informe y recargar. El slot Walk ahora tendrá recurso y prevalecerá sobre Attack; los demás estados quedan intactos. No hay cambios en CombatEngine, economía ni reproductor. El test de pipeline ejecuta precisamente este caso en una copia temporal.

## Arena y guardados

La reserva permite colocar DOLEA libremente. «Duelo de DOLEA» prepara1/2/3★ sin tienda; las opciones de overtime y muerte utilizan perfiles sintéticos exclusivamente diagnósticos. El inspector inferior permite recorrer cada frame y cada fallback. «+1 tick» avanza100ms en pausa para inspeccionar impacto/interrupción/muerte.

Las partidas nuevas usan `CURRENT_ECONOMY_CONFIG.catalog='f0p4.1'`. Ausencia de catálogo conserva las cuatro definiciones P3.1 y el mismo RNG. Los guardados anteriores se validan y reproducen exactamente; siguen sin DOLEA hasta iniciar una nueva partida. La clave `tft-eunuco-local-f0p3.1-1` permanece: el campo opcional es una extensión compatible. No hay migración silenciosa, borrado o recompensas al cargar. Un catálogo desconocido se rechaza. La UI ya avisa de que una nueva partida sustituye el guardado actual.

Los participantes visibles son Vargas (jade) y Florin (ámbar), a petición del usuario; son etiquetas de presentación, no IDs ni perfiles personales.
