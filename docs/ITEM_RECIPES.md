# Recetas de componentes · F0-P8A

Las ocho categorías generan `8 × 9 / 2 = 36` parejas no ordenadas con repetición: 28 distintas y ocho dobles. El catálogo enumera cada pareja una vez, en orden determinista. `recipeKey(A,B)` ordena los IDs y da la misma clave para B,A. A+A requiere dos instancias diferentes del mismo componente.

Cada receta declara ID canónico, dos IDs de componentes y `resultId`. Las 36 recetas competitivas tienen `resultId: null` en esta fase. No se crea un objeto ficticio para completar la matriz.

## Matriz preparada

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

Para F0-P8B: definir contenido original, iconografía y estadísticas, completar cada receta autorizada, conectar únicamente efectos implementados, crear una nueva versión/huella y conservar las reglas históricas. P8A no inicia esa fase.
