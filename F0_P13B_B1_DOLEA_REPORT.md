# F0-P13B — B1: primera migración de DOLEA

Fecha: 30/10/2026. Trabajo exclusivamente LOCAL. Rama `codex/f0-p13b-champion-abstraction`.

## Commits y resultado

- Referencia inmutable P12J: `d38f18bb8e0c4279c9ac92883942200225f0cb94`.
- Auditoría P13A: `73949bfff1d4c68baa19687fd5a3318b97dd5cdc`.
- Checkpoint B0 aprobado antes de B1: `a500280f2553b583a00877b704ff2da56e02938c`.
- Extracción B1: `43bd6408b890f9619e933f134000ee6254eaa2de`.

B0 y B1 superan sus gates. El cierre de informes es documental y posterior a esos dos commits técnicos; no altera el código validado. No se inició B2, B3 ni B4. No hay push, despliegue, SQL ni operaciones contra Supabase, Railway o GitHub.

## Cambios de B1

1. `packages/game-data/src/champions/dolea.ts`: contiene exactamente la definición DOLEA_ABILITY anterior, con ChampionAbilitySchema y los mismos efectos.
2. `packages/game-data/src/legacy-traits.ts`: conserva TRAIT_DEFINITIONS y reexporta DOLEA_ABILITY desde el módulo nuevo. Las importaciones públicas/históricas siguen resolviendo la misma instancia de definición.
3. `packages/game-data/src/champions/dolea.test.ts`: valida digest P12J, identidad de los exports, unión con la vista de autoría y metadatos de revisión explícitos sin mutación del perfil.

No se añadieron cálculos, handlers, cambios de targeting, orden de resolución, estadísticas, claves ni propiedades de snapshots. La vista B0 sigue derivándose de P11_ROSTER/P11_COMBAT_PROFILES. Su estado por defecto implemented/pending corresponde a la revisión de autoría; `withChampionValidation` permite obtener una vista validated con evidencia sin añadir ese estado al contrato de combate.

El digest JSON de la definición DOLEA, capturado del bundle independiente de P12J antes de extraerla, es:

`3734c11d209db8d4d074bc61ffdd3cb7f46f3bfe71be66abbbbcdb11f92bbfa7`.

La nueva ubicación produce exactamente ese digest. VARGAS, JARAMILLO y FLORIN, CombatEngine, CombatMechanics, AuthoritativeMatch, snapshot, codec y manifiestos de personajes se contrastaron además byte a byte con Git P12J: sin cambios.

## Equivalencia A/B y corpus

Se repitió el corpus B0 completo con la extracción y se vuelve a registrar contra el SHA B1 creado, sin reconstruir una referencia nueva:

- **603 comparaciones A/A y 603 A/B**, cero divergencias.
- **34 definiciones y perfiles**, 102 perfiles efectivos por estrella, presentación, orden, afinidades y nulls intactos.
- **19 fingerprints de autoridad**, todos idénticos a P12J.
- **19 recorridos de autoridad/codec/restauración** con compras/despliegue, reintento de recibo y liquidación, cubriendo configuraciones históricas y actual.
- **Tres recorridos de progreso persistente**, más los guardados históricos P6 y sus replays.
- Barrido fijo de seeds enteras **1–128** para cada uno de los cuatro completos, más escenarios dirigidos: equipos, sinergias, provisionales, proyectiles, clones 80 %, ausencia/retorno, escudos, estados y overtime.

A se compila desde git archive del SHA fijo. Su bundle no cambió entre los checkpoints B0 y B1. B tiene un bundle independiente; el manifiesto registra las fuentes de juego importadas y sus hashes. La comparación recorre inputs, snapshots completos por tick, RNG, eventos con payload/orden/IDs, resultado, serialización y estado restaurado; no normaliza los datos.

Las alteraciones deliberadas de sensibilidad siguen detectándose con result/ganador intactos: evento `$.events[6].payload.amount` en tick 3 y HP `$.snapshots[1].units[0].hp` en tick 1. No se detectó una divergencia de comportamiento real y no se actualizaron expectativas para ocultar ninguna.

## DOLEA comprobada contra el comportamiento efectivo

| Contrato                                                      | Resultado                                                                                       |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Identidad, coste 2, rol vanguard y presentación tanque/físico | Exactos; se conservan las cinco afinidades actuales del Excel                                   |
| HP, AD, defensas, maná y escalado 1/2/3★                      | Iguales en los perfiles completos; maná 0/70, cast de 3 ticks                                   |
| Cruce de HP                                                   | Se exige HP anterior ≥50 % y HP después <50 %, no simplemente estar por debajo                  |
| Pasiva                                                        | Una activación cuando corresponde, 12 % de HP máximo efectivo; duración de definición 450 ticks |
| Activa                                                        | Daño físico de área 100/180/324, dos víctimas adyacentes dirigidas, radio/centro conservados    |
| Armadura                                                      | +20 durante 40 ticks, refresh y expiración por duración, antes del daño en el mismo lote        |
| Escudos                                                       | Mismos grants, absorciones, consumo y expiración de registros; mismos IDs/razones/snapshots     |
| Overtime                                                      | Misma interpolación entera entre 300 y 449, incluido el escudo disparado durante overtime       |
| Muerte                                                        | Impacto letal no genera escudo póstumo; mismo cierre/atribución de bajas                        |
| Objetos, clones y replays                                     | Misma secuencia completa y estados intermedios en ambos lados y estrellas                       |

Precisión sobre la expiración del escudo: su duración declarada es 450 ticks y el tick 450 del combate es terminal. No se inventó un caso de caducidad natural anterior al final ni se acortó su duración para conseguirlo. Se verifican el plazo calculado exacto, el consumo y las expiraciones observables; la caducidad de 40 ticks de armadura sí se observa en el escenario dirigido. El motor no se «corrigió» para ajustar texto del plan.

Los sprites, evoluciones/fallbacks, splash, arenas Mar de Cristal/UPM y zoom no se modificaron. Las cuatro referencias de arte y treinta fallbacks nominales se validaron con el catálogo real. No se generaron imágenes ni se copiaron iconos oficiales a Git.

## Gates ejecutados

| Gate                                                                                    | Resultado                                                                                                                  |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| TypeScript del proyecto                                                                 | Correcto                                                                                                                   |
| TypeScript del laboratorio (`tsc --project scripts/champion-equivalence/tsconfig.json`) | Correcto                                                                                                                   |
| ESLint completo                                                                         | Correcto                                                                                                                   |
| Regresiones dirigidas B1                                                                | **427 pruebas, 23 archivos, cero fallos; 14,13 s**                                                                         |
| Build público web + servidor                                                            | Correcto                                                                                                                   |
| Build LOCAL                                                                             | Correcto, salida separada dist-dev                                                                                         |
| verify:public                                                                           | 44 iconos originales; 0 paquetes autorizados externos; 0 imágenes oficiales en público; sin controlador/panel/comandos DEV |
| verify:release                                                                          | Correcto; auditoría del historial local completo sin secretos detectables ni binarios oficiales                            |
| git diff --check                                                                        | Correcto                                                                                                                   |

Las regresiones dirigidas incluyen registro/contratos, DOLEA, activas/pasivas, estadísticas/escudos/daño, VARGAS/JARAMILLO/FLORIN, objetos P11H/P12F, clones, overtime, compatibilidad legacy/P6B2, playback/feedback, persistencia de JARAMILLO y roster. No se ejecutó la suite completa de 1849 casos ni campañas remotas o PostgreSQL/SIGKILL ajenas a esta extracción; tampoco se presenta el gate antiguo como una ejecución nueva.

El build LOCAL accede por la configuración existente a los recursos de referencia ya disponibles en el worktree LOCAL anterior; solo su salida ignorada dist-dev puede incluirlos. El build público y el historial auditados mantienen la frontera de recursos. No se alteró la configuración de assets.

## Rendimiento

- Benchmark existente **7v7**, 42 objetos, 450 ticks y 9743 eventos: **406,60 ms**, límite original **5000 ms**. Preparación del escenario: 13,65 ms, separada de la simulación.
- Playback equipado a velocidades 1×/2×: **240 muestras**, p95 **7,176 ms**, p99 **9,099 ms**; límite original p95 **16,7 ms**. Construcción inicial del replay: 502,94 ms, fuera de la medida de muestreo.
- Corpus de equivalencia completo: alrededor de **20 s**, que incluye tres simulaciones por escenario, validación, hashes y recuperación; no equivale a tiempo por frame.

No se relajó ningún límite, timeout, cobertura o aserción. Son mediciones de esta ejecución local, no una garantía estadística de rendimiento en todos los equipos.

## Evidencias y reproducción

- [Procedimiento del laboratorio](scripts/champion-equivalence/README.md).
- Resultados B0: `artifacts/p13b/b0-equivalence.json`, `b0-provenance.json` y `b0-tests.log`.
- Escudos dirigidos: `artifacts/p13b/dolea-shield-evidence.json`, con importes/ticks, absorción y consumo realmente observados.
- Resultados B1 y corrida contra el commit técnico: `artifacts/p13b/b1-equivalence.json`, `b1-provenance.json`, `equivalence-b1-committed.log`.
- Regresiones: `artifacts/p13b/b1-tests.log`; métricas `b1-stress.json` y `b1-playback.json`.
- Builds y auditorías: `build-public.log`, `build-local.log`, `verify-public.log`, `verify-release-b1.log` y auditoría de cierre.

Los artefactos quedan ignorados y no se publican. La referencia no depende de otro worktree mutable: se extrae del objeto Git fijo en cada ejecución. Solo se utilizó el Excel privado original como prerrequisito de su prueba de fuente; no se incluyó en el historial.

## Riesgos pendientes y parada

El corpus es finito. Este paso no demuestra equivalencia de una migración futura de Resaca/Depredador, proyectiles/progreso de JARAMILLO o presencia de FLORIN; tendrán sus propios checkpoints. La vista readonly protege en tipos, no convierte los perfiles compartidos en objetos congelados; los consumidores no deben mutarlos. Los metadatos validated son una revisión explícita con referencias de evidencia, no una prueba criptográfica o automática de toda habilidad.

El build mantiene los avisos heredados de tamaño de chunks y configuración nativa futura de Vite; no impiden los gates. No se cambiaron infraestructura, registro, Auth, SMTP, RLS, migraciones ni servicios. P12J permanece en su SHA original y sin cambios locales. **Trabajo detenido después de B1, pendiente de revisión antes de B2/B3/B4.**
