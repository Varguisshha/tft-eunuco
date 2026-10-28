# Recetas de componentes · F0-P8B

Las ocho categorías generan `8 × 9 / 2 = 36` parejas no ordenadas con repetición: 28 distintas y ocho dobles. El catálogo enumera cada pareja una vez, en orden determinista. `recipeKey(A,B)` ordena los IDs y da la misma clave para B,A. A+A requiere dos instancias diferentes del mismo componente.

Cada receta declara ID canónico, dos IDs de componentes y `resultId`. El catálogo histórico P8A conserva `resultId: null`. El catálogo P8B asigna 36 resultados únicos `item-forge-*`, todos con definición completa y disponibilidad competitiva desactivada. [Matriz y definiciones](ITEM_CATALOG.md).

## Combinaciones

| Primer componente | Parejas con él y los siguientes                      |
| ----------------- | ---------------------------------------------------- |
| AD                | AD, velocidad, AP, maná, armadura, RM, vida, crítico |
| Velocidad         | velocidad, AP, maná, armadura, RM, vida, crítico     |
| AP                | AP, maná, armadura, RM, vida, crítico                |
| Maná              | maná, armadura, RM, vida, crítico                    |
| Armadura          | armadura, RM, vida, crítico                          |
| RM                | RM, vida, crítico                                    |
| Vida              | vida, crítico                                        |
| Crítico           | crítico                                              |

La matriz expresa categorías; la representación canónica interna ordena los IDs técnicos lexicográficamente. El orden no depende del idioma ni del icono.

## Validación

`validateItemCatalog` comprueba ocho categorías sin duplicados, IDs de definición únicos, 36 claves canónicas únicas, componentes conocidos, definición completa de cada resultado y correspondencia exacta entre sus ingredientes y la receta. Faltas, duplicados simétricos, versiones no soportadas y resultados desconocidos se rechazan.

La combinación trabaja sobre un candidato privado de partida: verifica instancias y resultado, crea un nuevo ID, retira exactamente los dos ingredientes, registra sus identidades consumidas y coloca el resultado en bandeja o pendientes. Un error conserva la entrada original, incluidas posiciones, contador y registros. No acepta inventarios del cliente.

## Catálogo de diagnóstico

Separado de `ITEM_CATALOG`, `f0p8a-diagnostic-1` contiene dos objetos técnicos:

- `diagnostic-double-ad`: AD + AD; +20 AD plano, acumulable dentro del límite de ranuras.
- `diagnostic-ad-speed`: AD + velocidad; +12 AD y +15 % velocidad, único por unidad.

Sus cifras verifican la infraestructura, no son balance propuesto ni contenido competitivo. Solo son utilizables con estado DEV explícito y no se pueden conceder por la autoridad normal. Las otras 34 recetas de ese catálogo también permanecen pendientes.

## Catálogo estándar P8B

`STANDARD_ITEM_CATALOG` contiene 44 definiciones y 36 recetas sin resultados nulos. `validateItemCatalog` exige la matriz completa y sus metadatos, y rechaza activar cualquier resultado competitivo en esta versión. El esquema impide habilitar efectos reservados también en laboratorio. Solo vida + vida se habilita en `STANDARD_LAB_ITEM_CATALOG`; las otras 35 combinaciones se rechazan sin consumir materiales.

Las 36 parejas se prueban individualmente, además de las 64 búsquedas ordenadas A+B, ocho dobles, concesión de resultados bloqueados y combinación automática sobre unidades. El catálogo P8A y su diagnóstico mantienen su contenido y huellas históricas.


## F0-P8E · 26-10-2026

El HUD resuelve la versión activa del inventario (en la integración, `f0p8d-1`) y ofrece ocho recetas por componente. No altera las 36 parejas. Distingue instancias para A+A y habilita Combinar solo con materiales disponibles, sesión editable y resultado disponible. Consultar no fabrica; el motor valida el comando final. Los textos históricos P8B de disponibilidad desactivada no describen P8D. Véanse [HUD](ITEM_HUD.md) y [contrato](ITEM_INTERACTION_CONTRACT.md).
