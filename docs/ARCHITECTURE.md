# Arquitectura F0-P2

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

Una futura pantalla de partida será una composición independiente en web que reutilice core, contratos, proyección, adaptador y reproducción; no deberá importar los controles de depuración ni duplicar reglas. Tienda, banquillo, economía, ranking y profundidad visual quedan documentados en diseño/roadmap, sin implementación ni routing ficticio.

`owner: north|south` identifica los dos lados de este tablero local, no a los cuatro participantes de una partida futura. La asociación partida/jugador/duelo pertenece a la futura capa de servidor y requerirá evolución explícita del contrato.

## Dependencias y extensión

Phaser 4.2.1 está fijado; todos los paquetes quedan resueltos en pnpm-lock.yaml. React no llama a APIs internas del renderer. Fuentes servidas localmente. No hay CDN, peticiones de juego, credenciales ni servicios externos.

El core puede ejecutarse en Node sin canvas. Antes de añadir Colyseus/Supabase, crear adaptadores fuera de los paquetes puros. No hace falta distribuir paquetes compilados todavía; si se publican o consumen fuera de este monorepo, añadir salidas ESM y declaraciones de tipos en esa fase.
