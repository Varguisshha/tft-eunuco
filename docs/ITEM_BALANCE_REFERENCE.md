# Referencia de balance congelada · F0-P8B

## Versión y fuentes

Se toma **TFT 14.1, Set 10 (Remix Rumble)**. Las notas oficiales se publicaron el **9 de enero de 2024 a las 19:00 UTC**. Es una versión histórica publicada que conserva los ocho componentes estadísticos clásicos y sus 36 combinaciones; no se sigue el parche vigente ni se sincroniza contenido automáticamente.

- [Notas oficiales de Riot, parche 14.1](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-14-1-notes/): identifica el parche y contexto de balance. No pretende ser una tabla exhaustiva de objetos.
- [Datos de cliente archivados, 14.1](https://raw.communitydragon.org/14.1/cdragon/tft/en_us.json): parámetros y composición de los objetos de esa versión. CommunityDragon es una extracción comunitaria de datos del cliente de Riot, **no una API oficial de Riot**.
- [Documentación de extracción de CommunityDragon](https://www.communitydragon.org/docs/assets): procedencia y organización de datos.

La selección usa solo las ocho categorías estadísticas. Se filtran resultados con exactamente dos ingredientes dentro de esas categorías: **8 componentes + 36 objetos**. Se excluyen emblemas, espátula, sartén, objetos radiantes, artefactos y variantes de set. No se deduce el catálogo a partir de nombres actuales: algunos identificadores históricos del cliente corresponden a mecánicas diferentes en 14.1.

## Evidencia local y trazabilidad

`packages/game-data/src/reference/tft-14.1-items.json` conserva solo hechos numéricos, composiciones, identificadores de procedencia y restricciones de unicidad. No incorpora descripciones oficiales, imágenes, rutas de iconos ni ilustraciones. Las descripciones en español son propias y se generan desde operaciones tipadas.

SHA-256 del JSON completo descargado para estudiar la referencia:

`ae6d4bde7f591194b599caa120ca36ccc592bb5d9942ae703a47bd0cd0f7cb56`

La prueba `standard.test.ts` fija también el SHA-256 de `JSON.stringify` de la selección de hechos; cambios de formato no lo alteran. Cada definición registra `sourceRecordId`, `usedParameters` y `uninterpretedParameters`. Las dos listas cubren exactamente las claves originales, sin pérdidas silenciosas. La descarga completa de investigación no forma parte del repositorio.

## Lectura de unidades

| Fuente                            | Interpretación EUNUCO                              |
| --------------------------------- | -------------------------------------------------- |
| AD = 0,10                         | +10 % relativo al AD preparado; 100 milésimas      |
| AS = 10                           | +10 % relativo a velocidad; 100 milésimas          |
| CritChance = 20                   | +20 puntos de probabilidad; 200 milésimas          |
| Mana = 15                         | +15 maná inicial, no regeneración                  |
| AP / Armor / MagicResist / Health | Valores planos                                     |
| Duración en segundos              | ×10 ticks de 100 ms                                |
| Daño/cura/escudo porcentual       | Ratio en milésimas; base explícita en la operación |

Se redondea al entero más cercano después de convertir la unidad; esto elimina ruido de representación float del cliente (por ejemplo 0,10000000149), sin alterar cifras de diseño. Estadísticas de objetos completos son sus totales, no el resultado de añadir además las estadísticas de ingredientes.

## Campos que no se convierten en efectos

El JSON contiene parámetros históricos sin uso en el texto de la mecánica de este parche. Se conservan, pero no se infiere una habilidad por el mero nombre de una clave:

- `IonicSpark.Damage = 250` no sustituye el castigo de 160 % del maná máximo descrito.
- `RapidFireCannon.HexRangeIncrease = 1` no añade alcance: en esta versión ese registro representa velocidad, amplificación y quemadura/herida.
- `Crownguard.ChillDuration / HexRange` no añaden ralentización o aura a su escudo y AP.
- Campos hash sin semántica verificada, límites de monstruos (sin PvE en esta fase) y otros parámetros no interpretados permanecen listados por objeto.

## Diferencias y decisiones explícitas frente a la referencia

1. El motor de personajes y sinergias sigue siendo EUNUCO P6C; no se importan mecánicas de set, campeones ni balance ajeno a los objetos.
2. Porcentajes de AD y vida se suman sobre el perfil preparado después de estrellas y Kilómetros, conforme al motor existente. No se modifica esa fórmula general para imitar detalles no documentados del cliente de TFT.
3. El objeto de vida en laboratorio calcula `HP preparado + 600 + floor(HP preparado × 0,08)`. No calcula `(HP + 600) × 1,08`. Es una adaptación declarada a las fuentes de modificadores de EUNUCO.
4. La velocidad conserva el máximo de 5 ataques/s. Crítico máximo 100 %, sin convertir exceso en daño crítico. La bonificación condicional de 10 puntos al multiplicador de habilidades que ya critican está reservada para P8C.
5. Maná inicial se limita al máximo al preparar el combate. No cambia el coste, la generación ni el consumo al lanzar. Reducción de máximo y regeneración permanecen operaciones reservadas.
6. Curación, escudos, aura, quemadura, herida, ataques secundarios, aleatoriedad y otras operaciones quedan definidas pero no ejecutadas. Sus casos ambiguos están en [compatibilidad](ITEM_EFFECT_COMPATIBILITY.md); no se rellenan probabilidades o límites ausentes.
7. Unicidad por objeto se conserva donde la fuente la declara. El objeto aleatorio consume tres ranuras y necesita integración especial antes de habilitarlo. Las estadísticas de copias válidas se suman; la política por efecto está separada.
8. No hay nombres visibles oficiales: IDs `item-forge-*`, claves `forge-*`, descripciones propias y etiquetas accesibles. No se han copiado recursos gráficos.
9. Los 36 objetos están desactivados en competitivo, incluso el de estadísticas puras. El laboratorio solo habilita ese objeto plenamente compatible. El reparto automático continúa apagado.

La referencia queda congelada. Cualquier ajuste futuro necesita versión, nueva huella, pruebas y documentación; nunca se reinterpretarán silenciosamente instancias persistidas.
