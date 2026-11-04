# F0-P13B — B0: autoría y base de equivalencia

Fecha: 30/10/2026. Referencia inmutable: `d38f18bb8e0c4279c9ac92883942200225f0cb94` (P12J). Rama: `codex/f0-p13b-champion-abstraction`, creada en worktree propio desde P13A `73949bfff1d4c68baa19687fd5a3318b97dd5cdc`.

## Resultado del checkpoint

B0 aprobado **antes de comenzar B1**. No cambia ninguna definición serializada ni el motor. Los SHAs locales de ambos checkpoints se registran en la sección de cierre, una vez creados; no se hace push.

## Archivos y contratos

- `packages/game-data/src/champions/authoring.ts`: vista derivada `ChampionAuthoringDefinition`, DeepReadonly, capacidades y estados provisional/implemented/validated. Usa UnitDefinitionSchema/CombatProfileSchema y referencias tipadas de ChampionAbility, PassiveRule, CombatEffect y CharacterPresentation.
- `packages/game-data/src/champions/authoring.test.ts`: identidad, alias FLORIN, nulls, referencias inválidas y promoción de revisión explícita.
- `packages/game-data/src/index.ts`: exporta esa API; no cambia cómo se ensambla o consume el catálogo de combate.
- `scripts/champion-equivalence/{entry.ts,run.mjs,compare.mjs,compare.test.mjs,tsconfig.json,README.md}`: laboratorio local, oráculo inmutable y comparación estricta.

La vista devuelve referencias a P11_ROSTER/P11_COMBAT_PROFILES; no almacena otro catálogo ni congela/muta objetos compartidos. Conserva orden, 34 IDs, cuatro completos, treinta provisionales, sinergias y nulls. La pasiva `suela-reforzada` de FLORIN se vincula explícitamente a su paquete `pisoton-carmesi`. Las capacidades son metadata del motor ya existente, sin handlers nuevos ni nueva ejecución para VARGAS/JARAMILLO/FLORIN. Los cuatro comienzan implemented/pending respecto a esta migración; `withChampionValidation` exige SHA/evidencia para producir una vista revisada sin modificar perfiles ni snapshots.

Sprites/splash se vinculan por claves existentes. Una prueba cruza las cuatro referencias reales con manifests y SPLASH_ARTS y comprueba los treinta fallbacks nominales. Ningún asset fue creado o alterado.

## Independencia de A y B

A se reconstruye siempre con git archive del SHA P12J en un directorio ignorado propio. A/B se compilan en bundles distintos con fuentes de juego, shared y autoridad de sus respectivas raíces; el runner verifica límites de genealogía y registra hashes de módulos/bundle. Ambos usan el mismo fixture de laboratorio y bibliotecas instaladas del lock sin cambios. No importan un motor común de candidato para fingir A/A.

El snapshot sintético inicial de autoridad fija RNG/seed de drops antes de entregarlo a ambos lectores. Las salidas no se normalizan. No se usan cuentas, guardados o datos de partidas reales.

## Corpus y resultado

- **603 A/A y 603 A/B idénticos**, con inputs completos, snapshots iniciales/por tick, eventos y payload/order, RNG, estados, escudos/curas/daño, resultados y replay completo.
- 91 casos dirigidos + 512 del barrido: cuatro completos × seeds enteras 1–128, alternando estrellas/lado. Los dirigidos cubren los cuatro a 1/2/3★ en ambos lados, composiciones con Cosmin provisional, equipo, clones 80 %, cuatro situaciones DOLEA, recovery FLORIN y overtime.
- Los 34 perfiles y **102 perfiles escalados**, identidades/afinidades y presentación son idénticos.
- **19 fingerprints iguales** a P12J.
- **19 configuraciones de autoridad**: compra/despliegue, combate, serialización/codec, recuperación y liquidación tras reintento de recibo. Incluye configuraciones históricas y actual P12F.
- **Tres casos de progreso**: elegibilidad, premio una vez/ronda, fusión máxima, perfil efectivo, serialización y limpieza al cierre. También restauración y replay de los fixtures históricos P6 existentes.

Eventos realmente ejercitados en el corpus incluyen shield_apply, heal, projectile_launch, unit_presence, stack_gain/threshold/consume, overtime_start, status_expire y unit_death; el runner falla si falta una de las capacidades esenciales exigidas. Evidencias privadas ignoradas: `artifacts/p13b/b0-equivalence.json` y `b0-provenance.json`.

## Sensibilidad y divergencias

A/A no muestra diferencias. Mutación deliberada de laboratorio, sin cambiar result/ganador:

- Evento: detectado `$.events[6].payload.amount`, tick 3.
- Estado: detectado `$.snapshots[1].units[0].hp`, tick 1.

Pruebas adicionales detectan ausencia/null/undefined, huecos y orden de arrays, orden de propiedades y 0 frente a -0. No se actualizaron expectativas del motor para ocultar divergencias. No apareció una divergencia real A/B.

Durante la preparación se corrigieron fallos exclusivos del arnés: delimitador de ruta en el guard de fuentes, aliases TypeScript del laboratorio y dos expectativas sintéticas (daño insuficiente para el umbral a 3★; overtime es interpolación entera entre ticks 300 y 449, no dos escalones). Se corrigió el fixture/aserción contrastando la referencia; ningún cálculo de juego cambió.

## Gates y rendimiento

- TypeScript del proyecto y del laboratorio: correctos.
- ESLint completo: correcto.
- Registro, contratos, fuente Excel, comparador y assets: **27 pruebas en cinco archivos**, correctas.
- Corpus completo: aproximadamente **20 s**, incluyendo tres simulaciones/caso, comparación, hashes y restauraciones; no es una medición de latencia por tick ni de frame p95.
- `git diff --check`: correcto.

El primer gate de fuente Excel falló por faltar el workbook ignorado en este worktree nuevo. Se copió solo el archivo original desde el worktree de origen, verificando SHA-256 `101728c60d45312cd98776087ba17f3636e798ab2e0265ed0f65b26ece6791eb`; la prueba completa volvió a pasar. No se incluye ese archivo en Git ni se copiaron iconos oficiales.

No se repitieron campañas remotas ni SQL. Los builds público/LOCAL y los demás gates de integración se ejecutan al cerrar B1.

## Cierre y límites

SHA B0: `a500280f2553b583a00877b704ff2da56e02938c`.
SHA B1 posterior: `43bd6408b890f9619e933f134000ee6254eaa2de`. Al aprobar y guardar B0 todavía no se había iniciado esa migración. Los informes se completan en un commit documental de cierre posterior.

B0 conserva todas las rutas de combate, reglas, red, codec, persistencia, economía y assets de P12J. La nueva API de autoría no habilita habilidades de los provisionales ni etiqueta automáticamente como validada una migración no revisada. El corpus es finito y no sustituye pruebas dirigidas de capacidades futuras. No se ha iniciado B2/B3/B4 ni se han usado servicios remotos.
