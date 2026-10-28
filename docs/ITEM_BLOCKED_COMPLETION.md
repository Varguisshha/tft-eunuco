# Cierre investigado de cuatro objetos · F0-P11K

Referencia mantenida: **TFT 18.5**, set 18, cliente Data Dragon 16.21.1. El archivo congelado `tft-18.5-items.json`, las 36 recetas, los 32 objetos ejecutables y su política de combate no se modifican.

**Resultado: 32/36 jugables; cuatro continúan bloqueados.** La condición del encargo permite conservar bloqueos cuando falte evidencia decisiva. No se implementan curvas, sorteos o acumulaciones aproximadas para anunciar 36/36. Los cuatro iconos TFT siguen visibles en la galería LOCAL y las recetas bloqueadas rechazan sin consumir componentes.

## Decisiones individuales

| Objeto                | Información contrastada                                                                                                                                                                                    | Falta decisiva                                                                                                                                                                                                                                                                                                                                                             | Estado    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Calibrador de Sterak  | Extracción 18.5: umbral 60 %, escudo 40 % de vida máxima, 4 s; notas oficiales anteriores describen otras magnitudes y duraciones                                                                          | Función matemática de decaimiento y actualización de la reserva restante después de absorción. Una curva lineal no está probada. Por ello no se puede certificar absorción/expiración/combinación con otros escudos, heridas o muerte como ejecución de Sterak                                                                                                             | Bloqueado |
| Guantes de ladrón     | Dos objetos temporales, restricción de ranuras; la nota 16.5 elimina combinaciones de doble quemadura y cambia su fuerza en etapa 4                                                                        | Tabla elegible completa 18.5, exclusiones y pesos/selección por etapa/nivel/estrellas. No equivale a dos sorteos uniformes del catálogo. Tampoco se convierten objetos temporales en propiedad permanente                                                                                                                                                                  | Bloqueado |
| Mangual del guerrero  | Nota final 14.5: 10 % base, 5 % por crítico durante 5 s, máximo cuatro; la extracción congelada coincide con esos parámetros. El anuncio previo indicaba tres acumulaciones y no es el dato de lanzamiento | Caducidad individual frente a refresco conjunto, comportamiento al alcanzar el máximo y orden de múltiples críticos de habilidad dentro del mismo tick. Sin ello no se pueden probar sus activaciones/expiraciones exactas ni asegurar ausencia de amplificación recursiva específica                                                                                      | Bloqueado |
| Sable-pistola hextech | Nueva evidencia primaria: nota 14.1 (2025) cambia omnivampirismo de 15 a 18 % y curación al aliado de 25 a 20 %. Nota 10.7 confirma curación al dañar escudos; 11.22 elimina el escudo por sobrecura       | El registro congelado conserva `Omnivamp:18` y `StatOmnivamp:0.15`, y el registro nuevo DA no cierra qué campo ejecuta el motor 18.5. Las notas apoyan 18 %, pero la continuidad/binding concreto y el cálculo para los dos receptores, escudos y fuentes derivadas/periódicas no están certificados conjuntamente. No se activa una cifra ni una base de daño provisional | Bloqueado |

## Método y límites

Se contrastaron documentos oficiales con la extracción cliente congelada y se renovó el JSON oficial es_ES de 16.21.1. Sus IDs/rutas resuelven arte e identidad, pero no contienen los scripts de combate ni las tablas necesarias. Se revisó también 18.5 (20 de octubre, con actualización del 27). Las notas históricas son evidencia de cambios publicados, no acceso al servidor de Riot ni demostración automática de su continuidad completa.

No se usan wikis o agregadores como prueba primaria. El hecho de que el motor propio ya tenga escudos, heridas, curación efectiva, daño periódico y límites de eventos no demuestra las políticas desconocidas de estos objetos. Implementar ahora mecanismos genéricos con valores inferidos no cumpliría la condición de fidelidad exacta.

## Evidencia de no desbloqueo falso

Cuatro regresiones en P11K intentan fabricar cada receta y comprueban rechazo sin consumir componentes ni removedor. Las pruebas previas de P11H siguen verificando sus disponibilidades y los otros 32 objetos. Los fingerprints históricos y el catálogo P11H permanecen idénticos. No se presentan capturas de «cuatro objetos desbloqueados» porque no se ha producido ese resultado.

Para desbloquearlos después se necesita una fuente versionada del comportamiento o tabla ausentes; después, una variante de catálogo y mecanismos genéricos deterministas con pruebas de combate, interacción, ticks, replays, restauración y reconexión. No se cambia de parche ni se modifica el balance de los otros 32.

## Fuentes primarias recuperadas

Copias acotadas de trabajo y manifiesto SHA en `artifacts/p11k/sources/`, no publicadas. Los siguientes hashes identifican las respuestas consultadas el 28-10-2026; se distingue el anuncio preliminar de la nota final.

| Documento                                                                                                                            | SHA-256                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| [items-announcement](https://teamfighttactics.leagueoflegends.com/en-ph/news/game-updates/patch-14-5-items-update/)                  | `4c14d6bc8ff4038f2e500760b724b8608215068cb2d4e641598c9324daef403e` |
| [final-14-5](https://teamfighttactics.leagueoflegends.com/id-id/news/game-updates/teamfight-tactics-patch-14-5-notes-2025/)          | `dece9bbe332e7a601e73b37dcac515f7d7cdcad0889a8fe7b39fa4325d929542` |
| [gunblade-14-1-2025](https://teamfighttactics.leagueoflegends.com/en-sg/news/game-updates/teamfight-tactics-patch-14-1-notes-2025/)  | `cf581265dfa8ee8d2058b0356b5c49f9486cd2b546d6e85e7ac6200a9d2166b9` |
| [gloves-16-5](https://teamfighttactics.leagueoflegends.com/en-sg/news/game-updates/teamfight-tactics-patch-16-5/)                    | `7f075389a3bf58dafa91c027f97bd121209cfccf1d3eb767505b7f6dbfe743c4` |
| [current-18-5](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-18-5/)                   | `1eee6b18b2cfe971d2897874f0986e79451c18f9adb3eac68e4c9e669c32d21a` |
| [gunblade-shields-10-7](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/tft-patch-10-7-notes/)                  | `08f8d43082bc28119790b354b8291d224fa83017dfcef175d556e35bf58fdb87` |
| [gunblade-overheal-11-22](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-11-22-notes/) | `8017236a91dc2618ce388ee0556caa6102d16fae1a1123c4f534b3c04c7fb906` |
| [client-data-dragon](https://ddragon.leagueoflegends.com/cdn/16.21.1/data/es_ES/tft-item.json)                                       | `003afdea52a1b57b7abcf63d7270ff9cd894e07780039cc4e5db09131346bb6c` |
