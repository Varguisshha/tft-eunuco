# P13B — Plan de migración incremental de personajes

**Diseño únicamente. No iniciado en P13A.** Base de comparación: F0-P12J, `d38f18bb8e0c4279c9ac92883942200225f0cb94`.

Referencias: [auditoría real](F0_P13A_ARCHITECTURE_AUDIT.md) y [arquitectura recomendada](CHAMPION_ABILITY_ARCHITECTURE.md). Este plan no autoriza despliegues, cambios remotos ni desarrollo de los 30 personajes pendientes.

## 1. Objetivo y límites

Cambiar organización y reutilización de código conservando el comportamiento exacto. No reescribir el motor, migrar 34 unidades a la vez, cambiar estadísticas, reglas, objetos, economía, arte, interfaz ni sinergias. No corregir diferencias entre descripciones y comportamiento junto a una extracción. Ninguna migración SQL está justificada por estos movimientos internos.

El contrato de equivalencia incluye input resuelto, perfiles, RNG, eventos, estados por tick, replay, progreso y datos persistidos. No basta el mismo ganador, daño total o imagen final.

## 2. Orden propuesto y riesgo

| Orden | Unidad/capacidad                                   | Motivo observado                                                                                 | Riesgo que debe quedar cubierto                                                                             |
| ----- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 0     | Baseline, vista de autoría y gates                 | No cambia resolución; permite detectar divergencias antes de extraer                             | No sustituir el registro actual de 34 por el histórico de cuatro                                            |
| 1     | DOLEA                                              | Definición compacta: umbral de HP, escudo, daño de área y refresh de armadura ya comunes         | Orden soporte/daño; escalado stat; umbral exacto y una activación                                           |
| 2     | VARGAS                                             | Habilidad y stacks ya declarativos; valida composición de reglas sin inventar handlers           | Impacto confirmado, consumo antes de cura, pérdida real de HP, prelectura de contador de bajas, cadenas/RNG |
| 3     | JARAMILLO                                          | Introduce entrega compuesta y frontera partida/combate persistente                               | Snapshot de potencia al lanzamiento, Humo, máximos de fusión, política histórica/actual de clones           |
| 4     | FLORIN                                             | Mayor acoplamiento: hooks en potencia y daño, presencia en targeting, victoria, acciones y auras | Dos salidas con triggers distintos, recuperación, casilla de retorno, verdadero y animación                 |
| 5     | Consolidación de los cuatro y los 30 provisionales | Demuestra que la extracción no excluyó a los demás                                               | Compatibilidad de todos los catálogos, simulación, replays y estado económico                               |

VARGAS tiene cadenas complejas, pero sus primitivas ya están centralizadas; su paso consiste primero en composición de datos. No extraer a la vez el scheduler de saltos y sus reglas. JARAMILLO va después por su doble dominio de persistencia y proyectiles. FLORIN queda al final para no mezclar el caso más delicado con cambios básicos del registro.

## 3. Baseline y arnés de comparación antes del primer cambio

1. Conservar P12J como referencia de solo lectura en su worktree y el SHA indicado. Nada de reset, rebase ni actualización automática de goldens para hacer pasar la candidata.
2. Construir dos entradas de laboratorio separadas que expongan las mismas funciones públicas: `runCombat`, perfiles escalados, funciones de progreso y codec/autoridad. Una se compila desde P12J, otra desde el commit candidato. No incluir dos motores ni un flag de desarrollo en el bundle público.
3. Exportar fixtures/seeds no sensibles con los schemas actuales. Compartir las mismas entradas entre versiones mediante copias profundas; nunca dejar que una ejecución contamine a la otra.
4. Comparar primero `JSON.stringify` de input, perfiles, eventos, snapshots y result. Si difiere, diagnosticar por ruta/campo y primer `(tick,order)`; conservar ambos fragmentos en el laboratorio. No eliminar campos, ordenar eventos ni redondear floats para ocultar diferencias.
5. Para autoridad, inyectar el mismo `TimeSource`, IDs de match/usuarios sintéticos y comandos. El `commitId` aleatorio de una nueva operación durable no es daño ni decisión de campeón: fijarlo en el arnés o comparar documentos con el mismo ID suministrado, no normalizar estados del combate.
6. Registrar hashes del baseline, versiones de Node/runner, catalog/rules/item policy y lista de fixtures. Conservar las 19 huellas actuales e históricas de la auditoría y comprobar también definición serializada de los 34 perfiles.
7. Validar el comparador con una **mutación solo de laboratorio** que cambie un daño en un tick intermedio sin variar ganador: debe detectar la primera divergencia. El arnés no debe limitarse a igualdad del resultado final.

No se generan estos goldens ni se altera el engine en P13A. Se especifica qué tendrá que ejecutarse al comenzar una migración autorizada.

### 3.1 Cobertura de entradas

- Cuatro completos × tres estrellas × ambos lados; combinaciones de los cuatro y 30 provisionales, bench/deployed, duplicados y formaciones 7v7.
- Catálogo P12F/P12J efectivo, reglas P11H, objetos P11H y política PvP P12B; además todos los catálogos/rules históricos aceptados por snapshotConfig y los fixtures legacy existentes.
- Seeds existentes de regresiones y un barrido fijo documentado de al menos 128 seeds por escenario paramétrico seleccionado. No usar seeds aleatorias no registradas ni pretender que cubren todos los estados.
- Casos dirigidos obligatorios, independientemente del barrido: umbrales, simultaneidad, cancelaciones, reglas de proc, bloqueo de casillas y frontera temporal 299/300/449/450.
- Escenarios sin objetos y con objetos disponibles representativos de crítico, heridas, curación, escudos, daño periódico, antistun, targeting, maná y estadísticas. Preservar los cuatro objetos bloqueados, sin habilitarlos para la migración.

## 4. Checkpoints y commits locales propuestos

### B0 — Contratos y baseline

Añadir arnés de equivalencia, fixtures sintéticos y vista de autoría a partir de exports existentes. No cambiar schemas de red ni cambiar la fuente que usa el motor. Validar conjunto exacto de 34 IDs, orden, costes, afinidades, 4 completos/30 provisionales, nulls de habilidades y asociación explícita de referencias de FLORIN.

**Salida:** comparación A/A sin diferencias y prueba de sensibilidad del comparador; huellas y fuentes P12J guardadas; baseline reproducible. Commit local independiente. Si la vista obliga a modificar JSON de snapshots, detener este paso.

### B1 — DOLEA

Extraer la definición actual desde legacy-traits a un módulo de autoría, preservando el export y los catálogos antiguos. Conectar la vista nueva a la misma definición resuelta. No añadir handler ni nuevo cálculo de escudo/daño. Si hay cambios de orden de claves o propiedades opcionales, mantener la salida serializada exacta.

**Checkpoint:** umbral 50 %, escudo 12 %, 450 ticks, una activación, daño físico 100/180/324, armadura +20/40 ticks y refresh; igualdad de trazas y todos los demás personajes intactos. Commit local independiente.

### B2 — VARGAS

Mover/componer definiciones de habilidad/stacks/afinidad sin fusionar sus ámbitos. Reutilizar gain/consume/confirm y el pipeline común. Extraer factorías de datos solo si conservan valores, claves y versiones. No sustituir trigger attack_hit por attack ni implementar Blackhaus con un proyectil inexistente.

**Checkpoint:** Resaca 0→5→0, consumo previo a cura, refresh vs stacking, Blackhaus y robo de vida sobre HP, kill attribution y condiciones leídas antes del incremento (tercera/séptima), saltos reservados y límite de cadena. UPM: lanzamientos naturales/repetidos y Créditos separados de membresía. Commit local independiente.

### B3 — JARAMILLO

En subpasos separados, adoptar vista declarativa y luego un constructor común de proyectiles, si el beneficio medido lo justifica. Mantener wrappers actuales para proyectil básico vs de habilidad y no cambiar la ruta de repetición directa de efectos.

Conservar `progress.ts` como dueño del estado persistente. El registro de capacidad describe cómo conectar competitive-round-progress al settlement existente; no crear otro contador de victorias ni un proc en el motor.

**Checkpoint:** importe fijado al lanzamiento, distancia/impactTick y projectileId idénticos; Humo igual/fuerte/débil; 8 Kilómetros máximo, lastRound, fusión máximo y bonus AD aplicado una vez; victoria real contra clon actual vs exclusión histórica, sin premio al dueño por duelo ajeno. Commit local independiente por subpaso revisable.

### B4 — FLORIN

Primero trasladar datos sin mover hooks. Después extraer cálculo de ciclo como helper/handler tipado; finalmente mover la implementación de recovery dentro de CombatMechanics o módulo delegado, manteniendo su Host y puntos de entrada. No añadir un bus y no almacenar closures por unidad.

**Checkpoint:** ataques 6.º/5.º/4.º, mismo número de básicos y mismo daño/crítico; contador acumulativo y slow; área/stun/buffs antes del daño como hoy; primera salida por cruce 60 %, segunda por damage_received + HP <30 % tras etapa 1; curación por pulsos de 10 ticks; retorno por HP completo/último aliado/celda libre; básico verdadero solo tras etapa 2; mismos eventos y visual de regreso. Un commit local por extracción; no una mezcla de cambios de datos, UI y targeting.

### B5 — Consolidación

Eliminar exclusivamente wrappers/código de transición que hayan quedado sin uso tras demostrar equivalencia; conservar exports y lectores históricos necesarios. Revisar perfiles de los 34, ambos mapas visuales, inventario, recetario y equipo. Medir coste de inicialización separado del coste por tick para no atribuir al handler lo que proviene de compilación o arranque.

**Salida:** gates completos de P13B, informe de comparación y SHAs de checkpoints. Detenerse antes de publicar o iniciar habilidades nuevas salvo autorización expresa en ese futuro encargo.

## 5. Matriz de pruebas de equivalencia

«Base existente» identifica pruebas inspeccionadas que **no deben eliminarse**. La columna «Comparación adicional» es trabajo a implementar en P13B; no se declara ejecutado ahora.

| Área                         | Base existente                                                                                                                                                                                                                     | Comparación adicional obligatoria                                                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Daño por tick/AD/AP/críticos | [advancedStats.test.ts](../packages/game-core/src/combat/advancedStats.test.ts#L1), [vargas.test.ts](../packages/game-core/src/combat/vargas.test.ts#L1)                                                                           | requested/mitigated/absorbed/HP/overkill, tipo, responsibleId, RNG antes/después, cada evento y estado                                        |
| DOLEA/pasivas/escudos        | [passives.test.ts](../packages/game-core/src/combat/passives.test.ts#L1), [combatFeedback.test.ts](../apps/web/src/game/combatFeedback.test.ts#L1)                                                                                 | Cruzar vs permanecer debajo de 50 %, capa absorbida, expirar por duración/consumo/muerte y no duplicar activación                             |
| Curación                     | [vargas.test.ts](../packages/game-core/src/combat/vargas.test.ts#L1), [florin.test.ts](../packages/game-core/src/combat/florin.test.ts#L116)                                                                                       | Cura derivada de daño real, cero HP perdido, heridas, overheal/prevented, lote simultáneo y overtime                                          |
| Buff/debuff/estados          | [advancedMechanics.test.ts](../packages/game-core/src/combat/advancedMechanics.test.ts#L92), [jaramillo.test.ts](../packages/game-core/src/combat/jaramillo.test.ts#L146)                                                          | Identidades/keys/mode/origin, refresh vs stack, Humo más fuerte, último tick exacto y ajuste de máximo                                        |
| Stacks/contadores/umbrales   | [advancedMechanics.test.ts](../packages/game-core/src/combat/advancedMechanics.test.ts#L93), [vargas.test.ts](../packages/game-core/src/combat/vargas.test.ts#L1)                                                                  | Preadquisición de contador para reglas simultáneas, firedThresholds, seen/count/lastTick, consume antes de efectos                            |
| Ataque confirmado            | [advancedMechanics.test.ts](../packages/game-core/src/combat/advancedMechanics.test.ts#L220)                                                                                                                                       | Misma identidad desde windup a proyectil/impacto; cancelado no incrementa, absorbido sí confirma; proc flags                                  |
| Proyectiles                  | [jaramillo.test.ts](../packages/game-core/src/combat/jaramillo.test.ts#L59), [compositeVisuals.test.ts](../apps/web/src/game/compositeVisuals.test.ts#L1)                                                                          | Daño fijado al lanzar vs modificación posterior de AD, fuente muerta/ausente, objetivo muerto/ausente, impacto 299/300/449/450 y projectileId |
| Área/targeting               | [pathfinding.test.ts](../packages/game-core/src/combat/pathfinding.test.ts#L1), [abilities.test.ts](../packages/game-core/src/combat/abilities.test.ts#L1), [florin.test.ts](../packages/game-core/src/combat/florin.test.ts#L99)  | Orden de víctimas, centro source/target, radio por estrellas, excluir primario, obstáculos, empate de IDs, casilla reservada                  |
| Activas/maná/interrupción    | [abilities.test.ts](../packages/game-core/src/combat/abilities.test.ts#L1), [advancedMechanics.test.ts](../packages/game-core/src/combat/advancedMechanics.test.ts#L409)                                                           | Gasto al inicio, prioridad sobre básico, stun/muerte/rango, castCounts y repeats adicionales sin maná ni proc                                 |
| FLORIN/ciclo/presencia       | [florin.test.ts](../packages/game-core/src/combat/florin.test.ts#L275), [recoveryVisual.test.ts](../apps/web/src/game/recoveryVisual.test.ts#L59)                                                                                  | Tick exacto de salida/retorno, stage/away, nextHealTick, basicDamageTypeOnReturn, moveRemainder, último aliado y victoria sin presencia       |
| Afinidades                   | [roster.test.ts](../packages/game-core/src/combat/roster.test.ts#L1), [advancedMechanics.test.ts](../packages/game-core/src/combat/advancedMechanics.test.ts#L377)                                                                 | Miembros distintos, copias/estrellas/bench, escalones FUMÓN 2/4 y pendientes, unique vs shared, orden de reglas                               |
| Objetos                      | [p11h.test.ts](../packages/game-core/src/items/p11h.test.ts#L1), [execution-invariants.test.ts](../packages/game-core/src/items/execution-invariants.test.ts#L1), [p12f.test.ts](../packages/game-core/src/items/p12f.test.ts#L1)  | Procs raíz/secundario/periódico, canCrit:false P11H, ítems por rol, heridas/escudos/maná y combate congelado sin alteración por banquillo     |
| Replay/presentación          | [combatPlayback.test.ts](../apps/web/src/game/combatPlayback.test.ts#L1), [itemPlayback.test.ts](../apps/web/src/game/itemPlayback.test.ts#L1)                                                                                     | Arrays completos idénticos, muestreo a varias tasas/seek/speed, no adelantar eventos futuros y no recalcular daño                             |
| Overtime                     | [overtime.test.ts](../packages/game-core/src/combat/overtime.test.ts#L26), [overtimePlayback.test.ts](../apps/web/src/game/overtimePlayback.test.ts#L1)                                                                            | Tick 300 orden 0, 449 ejecuta/450 no, mismos multiplicadores, escudos existentes no se reducen retroactivamente                               |
| Clones                       | [ghost.test.ts](../packages/game-core/src/combat/ghost.test.ts#L108), [p12b.test.ts](../apps/server/src/p12b.test.ts#L156)                                                                                                         | Factor 800 una vez, perfil congelado, sin compartir progreso/equipo, dueño no recibe segunda victoria, restaura IDs/procedencia               |
| Progreso/fusión              | [jaramillo.test.ts](../packages/game-core/src/combat/jaramillo.test.ts#L202), [jaramilloEconomy.test.ts](../packages/game-core/src/match/jaramilloEconomy.test.ts#L1)                                                              | Deployed en input vs estado vivo al liquidar, lastRound, máximo/fusión, cierre de partida, reglas antiguas y actuales                         |
| Persistencia/codec           | [persistence.test.ts](../apps/server/src/persistence/persistence.test.ts#L1), [jaramillo.test.ts](../apps/server/src/persistence/jaramillo.test.ts#L1), [p11-roster.test.ts](../apps/server/src/persistence/p11-roster.test.ts#L1) | encode/decode, compactación de duelos, schema/rules/catalog, huellas y snapshots históricos; mismo replay después de restaurar                |
| Reconexión/idempotencia      | [florin.test.ts](../apps/server/src/florin.test.ts#L1), [parallel-network.test.ts](../apps/server/src/parallel-network.test.ts#L1)                                                                                                 | 2/3/4 clientes, ACK perdido, sequence/receipts, estado privado, espectadores, repetir comando no duplica progreso ni efectos                  |
| SIGKILL/autoridad            | [crash.test.ts](../apps/server/src/persistence/crash.test.ts#L1)                                                                                                                                                                   | Antes/después de commit/ACK, escritor exclusivo, mismo commitId ambiguo, misma liquidación y replay, sin mutar proveedor remoto               |
| Historia                     | [legacyCompatibility.test.ts](../packages/game-core/src/combat/legacyCompatibility.test.ts#L1), [p6b2Compatibility.test.ts](../packages/game-core/src/combat/p6b2Compatibility.test.ts#L1)                                         | Cada rules/catalog soportado sigue aceptando/reproduciendo sus fixtures; no reinterpretar snapshots con contenido nuevo                       |

No todos los casos nuevos requieren archivos separados. Se puede ampliar el arnés sobre fixtures existentes, pero preservar identidad y semántica de las pruebas originales. Los tests de mocks del handler no sustituyen simular el motor real y recorrer autoridad/persistencia.

### 5.1 Oráculo de comparación y diagnóstico

Para cada fixture, comparar en este orden:

1. Definición y perfil escalado/propiedad resuelto: objetos JSON completos, incluyendo optional ausente frente a null, traits/orden y itemRole.
2. `CombatInputSchema.parse` completo, seed, combatId, rulesVersion, overtime y ghost.
3. Snapshot inicial y todos los snapshots por tick: HP, maná, statuses, acciones, targeting, charge, counters, stacks, periodics, presence, pendingRepeats, items y RNG.
4. Eventos por índice y `(tick,order,type)` con payload íntegro; mismos causales, IDs, accounting y razones de cancelación.
5. Result y duración exacta; estadísticas calculadas desde eventos, incluidas curas, absorción, mitigación y subconjuntos de objetos/periódicos.
6. `OwnedUnit.progress` y equipo al liquidar/fusionar/vender/cerrar; no recomputar el progreso a partir de texto.
7. Snapshot de autoridad y roundtrip de codec; comandos reintentados y liquidación después de restaurar. Mismas revisiones/receipts con tiempo y entradas del arnés fijados.

El diagnóstico debe localizar el primer cambio, por ejemplo `snapshots[73].units[1].mechanics.basicAttacks`, y el evento previo. No aprobar porque los replays «se ven iguales». Hashes de JSON completos pueden acelerar la comparación, pero no reemplazan un diff explicable.

## 6. Gates por checkpoint y al consolidar

### Gate corto de cada extracción

- Diff limitado al módulo/capacidad previsto y sus pruebas; sin cambio de valores, IDs, descripciones, roles, arte ni políticas.
- TypeScript y lint del proyecto correctos.
- Definiciones/perfiles/huellas y fixtures A/B de la unidad exactos; personajes no migrados y casos legacy representativos sin diferencias.
- Pruebas dirigidas de sus dependencias (objetos/afinidades/persistencia si aplica).
- Evidencia de cobertura de cada riesgo del checkpoint, commit local y registro de primer/último SHA.

No ejecutar las pruebas pesadas contra CPU saturada ni atribuir un timeout a un handler sin medir. Separar coste de compilación, carga de módulos e inicialización de coste medido de simulación.

### Gate final P13B antes de declarar equivalencia

- Cero divergencias A/B en corpus dirigido y seeds fijas; 34 identidades intactas, 4 completas y 30 provisionales sin habilidades inventadas.
- Campañas reales de laboratorio con 2, 3 y 4 clientes hasta clasificación final, ambas arenas; compra/venta/combinar/equipar/remover durante combate y entrada congelada idéntica.
- PostgreSQL local, reconexión, ACK ambiguo, recuperación tras SIGKILL y autoridad exclusiva; fixture de ausencia de FLORIN y progreso de JARAMILLO al recuperar.
- `pnpm check`, `pnpm build:local`, `pnpm verify:public`, `pnpm verify:release`, `pnpm verify:railway`, `git diff --check`; lifecycle opt-in aparte según procedimiento actual. Ajustar solo admisión de la futura rama de trabajo al verificador si su whitelist lo exige, con diff explícito; no suprimir controles.
- Estrés 7v7 **<5000 ms** y playback p95 **<16,7 ms**, mismos límites y método. Medir escenarios con/sin capacidades y memoria/GC si una extracción añade asignaciones por tick.
- Revisión visual de los cuatro personajes en ambas arenas: proyectil/impacto JARAMILLO, salida/regreso FLORIN, pasivas/escudos, sprites y equipo originales, sin generar ni editar imágenes.
- Historial público libre de binarios oficiales Riot/secretos y fingerprints históricos sin alteración. Nuevo fingerprint solo si hay una extensión de contrato explícitamente aprobada, nunca para ocultar una diferencia de refactorización.

Esos gates corresponden al futuro trabajo ejecutable. P13A únicamente valida sus documentos y los contratos citados; no repite cientos de simulaciones para documentar el baseline.

## 7. Condiciones de parada y rollback

| Señal                                                        | Acción                                                                                                      |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Cambia un dato de balance, sinergia o nombre en el diff      | Separar el cambio funcional; no mezclarlo con la extracción                                                 |
| Un solo evento, tick, RNG o estado intermedio diverge        | Detener checkpoint, localizar primera diferencia y corregir; si no se explica, restaurar el camino anterior |
| Se necesita ampliar DTO/schema para una mera reorganización  | Detener y revisar diseño; no añadir campos por comodidad del handler                                        |
| Fingerprint histórico cambia                                 | Detener; restaurar definiciones/serialización y conservar histórico. No actualizar expected automáticamente |
| Comparador A/A no pasa o no detecta mutación dirigida        | Arreglar arnés antes de evaluar candidato                                                                   |
| Regresión de tiempo/memoria o bloqueo de pipeline            | Medir y eliminar asignaciones/planificación demostradas; no aumentar umbrales                               |
| Recovery/clone/progreso falla tras restore                   | Volver al checkpoint anterior y mantener contrato durable; no resetear tablas ni borrar snapshots           |
| Dependencias nuevas obligan a IO/Phaser/React dentro de core | Rechazar la dependencia, conservar separación                                                               |

Cada checkpoint deja un commit local revisable y su evidencia. Ante fallo, preferir un revert específico o mantener el camino original en una rama de comparación; no hacer reset destructivo sobre trabajo de otros ni force push. Como no se cambia formato persistido, el rollback de una extracción equivalente es de código. Si aparece una necesidad de formato nuevo, exigir estrategia de lectura vieja/nueva y autorización separada antes de continuar: no se puede prometer rollback automático del binario sobre datos nuevos.

No desplegar un checkpoint incompleto a usuarios ni activar dos autoridades para comparar. El A/B se realiza en laboratorio con datos sintéticos/copias acotadas autorizadas, nunca ejecutando doble liquidación en una partida remota real.

## 8. Criterios de aceptación de P13B

P13B solo podrá declararse terminada si:

1. El registro de autoría reúne identidad/perfil/referencias sin duplicar fuentes de verdad ni eliminar catálogos históricos.
2. Los cuatro recorridos migrados usan primitivas ya existentes; cualquier extracción nueva está justificada por repetición real y prueba de equivalencia.
3. DOLEA no necesita handler artificial; VARGAS conserva Resaca/Depredador/UPM; JARAMILLO conserva frontera de liquidación y política de clones por versión; FLORIN conserva ciclo y presencia.
4. Todos los campos persistidos y el modelo de autoridad/replay siguen siendo compatibles; no se requiere SQL por reorganizar código.
5. Mismos resultados, ticks, eventos y estados intermedios con los mismos inputs/seeds; pruebas de sensibilidad del arnés acreditadas.
6. Las 19 huellas de P12J no cambian, junto a sus datos serializados y fixtures históricos.
7. Rendimiento, gates completos, campañas multicliente y visualización pasan con límites originales.
8. Los 30 personajes provisionales conservan exactamente sus parámetros e inexistencia de habilidades, y existe una guía para añadir una futura habilidad sin copiar el motor.
9. Cada checkpoint tiene SHA local, evidencia, diff y criterio de rollback. Publicación/remotos requieren el alcance autorizado de una futura tarea.

**Estado actual:** P13A entrega este diseño; ninguno de los pasos B0–B5 ha comenzado.
