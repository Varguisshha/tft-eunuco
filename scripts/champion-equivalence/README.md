# Laboratorio de equivalencia de personajes

Referencia fijada: P12J `d38f18bb8e0c4279c9ac92883942200225f0cb94`.

```sh
pnpm exec tsc --project scripts/champion-equivalence/tsconfig.json
node scripts/champion-equivalence/run.mjs
```

El runner reconstruye A con `git archive` del SHA local exacto en `artifacts/p13b/equivalence/reference/source`. Compila A y B de forma independiente con aliases absolutos de shared/game-data/game-core/autoridad/snapshot/codec. Las bibliotecas externas proceden del lock instalado. El manifiesto registra las fuentes importadas, su digest y ambos bundles; rechaza una mezcla de genealogías del código de juego. `entry.ts` es un fixture común, no una copia de un motor. No usa red ni datos personales.

Corpus completo: 91 casos dirigidos + 512 casos de barrido (cuatro completos × seeds enteras 1–128, alternando lado/estrella) = 603. Incluye 24 naturales, 24 con equipo disponible, 12 clones al 80 %, 24 escenarios DOLEA (área/umbral/overtime/muerte × tres estrellas × dos lados), seis recovery de FLORIN y un timeout overtime. Se derivan perfiles de los contratos públicos; las alteraciones para objetivos sintéticos están confinadas al laboratorio. Los 30 provisionales no reciben habilidades nuevas.

Cada caso contrasta inputs A/B, simulación A/A y A/B: estado inicial, todos los snapshots, eventos con orden/payload, RNG y resultado. El comparador no ordena arrays/keys ni reemplaza null/ausencias. Las pruebas de sensibilidad modifican un evento y un HP intermedio manteniendo el mismo resultado, y exigen ruta/tick concretos.

Además compara los 34 perfiles, 102 perfiles por estrellas, presentación, identidades/afinidades y 19 huellas; tres recorridos de progreso/fusión/idempotencia; los guardados legacy de P6; y 19 configuraciones de autoridad con compras/despliegue, replay, codec, restauración, reintento de recibo y liquidación. El RNG y seed de drops del snapshot sintético común se fijan antes de introducir ese mismo input en ambos lectores; no se normaliza ningún output.

Los escenarios DOLEA comprueban también daño 100/180/324, tipo físico, armadura +20/40 ticks y expiración, apoyo antes de daño, cruce real del 50 %, escudo de 12 %/450 ticks, reducción de overtime interpolada y muerte letal sin pasiva póstuma. Son assertions del comportamiento contrastado con A, no correcciones del motor.

`--quick` ejecuta 99 casos (seeds 1 y 42 en el barrido), solo para depurar el laboratorio. El checkpoint exige la ejecución completa: `quick:false`, 603 A/A, 603 A/B y cero divergencias. El JSON y los logs quedan ignorados en artifacts; nunca son recursos del servidor o del build público. El runner registra tiempos de laboratorio, que incluyen tres simulaciones y comparación, y no sustituye el benchmark 7v7 ni p95 de reproducción.

Prerrequisitos: Node/pnpm de la release y dependencias instaladas; el objeto Git de referencia debe existir localmente. No requiere PostgreSQL, credenciales, Railway ni Supabase. La prueba independiente de extracción del Excel necesita su workbook privado ignorado original; el laboratorio de equivalencia utiliza el catálogo público de P12J.
