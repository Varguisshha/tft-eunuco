# Sistema universal de objetos · F0-P8A

Infraestructura versionada, separada del catálogo de personajes y del balance. Las nuevas partidas locales, DEV y privadas optan a `EconomyConfig.itemCatalog = f0p8a-1` mediante `ITEMS_ECONOMY_CONFIG`. La economía y las reglas de combate continúan en P6C. Los guardados anteriores omiten este campo y `MatchState.items`; no se rellenan con inventarios al restaurarlos.

## Contratos y registros

| Capa        | Fuente                                       | Responsabilidad                                                                  |
| ----------- | -------------------------------------------- | -------------------------------------------------------------------------------- |
| Contratos   | `packages/shared/src/items.ts`               | Definiciones, instancias, inventario, acciones, presentación y diseño de reparto |
| Catálogo    | `packages/game-data/src/items.ts`            | Ocho componentes, 36 parejas, políticas y descripción desde estadísticas         |
| Diagnóstico | `packages/game-data/src/items-diagnostic.ts` | Dos objetos técnicos ajenos al catálogo competitivo                              |
| Núcleo      | `packages/game-core/src/items/inventory.ts`  | Operaciones, propiedad, conservación, equipamiento y validación                  |
| Autoridad   | `AuthoritativeMatch` + `DurableMatch`        | Identidad autenticada, acciones, recibos y commit antes de publicar              |

Un componente tiene ID técnico, categoría, icono sustituible, versión, disponibilidad, ámbito y lista de bonificaciones. No requiere un nombre visible. Categorías: AD, velocidad de ataque, AP, maná, armadura, resistencia mágica, vida y crítico. Los ocho componentes de fundación tienen `bonuses: []`: sus cifras definitivas están pendientes, no se asigna balance provisional silencioso. No se reparten durante las rondas.

Un objeto completo declara receta de dos componentes, estadísticas, efectos reservados, restricciones (estrellas mínimas y personajes excluidos), política `stack | unique` y metadatos visuales. La versión de la definición y la versión del catálogo se persisten por separado. Iconos son identificadores propios `item-*`, preparados para recursos originales futuros; no se añade arte oficial ni iconografía al HUD.

La descripción se genera desde las bonificaciones, con unidades para porcentajes y velocidad; una lista vacía informa de valores pendientes. `ItemPresentationSchema` prepara tooltip, receta, estadísticas y ubicación, y `inspectItem` produce esa vista a partir del estado real.

## Estadísticas y capacidades

Los objetos se convierten en `initialItemModifiers` sobre una copia del perfil. Cada modificador tiene un ID derivado de la instancia y `sourceId` del objeto. `prepareTraitProfiles` los incorpora a la lista de modificadores permanentes antes de iniciar el combate; el bucle de simulación, las tiradas, la mitigación y Overtime no cambian. Reiniciar un combate construye nuevas fuentes, sin acumular las del anterior.

Orden adaptado a lo existente:

1. Perfil base y escalado general por estrellas.
2. Kilómetros de JARAMILLO, que ya pertenecían al AD del perfil preparado en P6C.
3. Fuentes de objetos y sinergias como modificadores identificados; los planos se suman y los porcentajes se suman sobre la misma base preparada, sin multiplicar fuentes entre sí.
4. Efectos/pasivas y modificadores de combate conforme al motor vigente.
5. Overtime mediante el cálculo existente.

Una bonificación plana de objeto no recibe otro multiplicador por estrellas. Ejemplo: JARAMILLO 2★ tiene AD base 86; dos Kilómetros producen 91; un objeto técnico +20 AD da 111. Hortaleza sigue añadiendo vida por su fuente habitual. El inspector de banquillo utiliza una vista efectiva sin aplicar sinergias de despliegue.

| Capacidad                                                       | Estado P8A                                                                                          |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Modificadores de HP, AD, AP, velocidad, armadura, RM y críticos | Integrados con las fuentes existentes; probados con objetos técnicos                                |
| Escudo, cura, daño adicional                                    | Efectos core tipables, ejecución de objetos reservada                                               |
| Al atacar o lanzar habilidad                                    | Desencadenantes declarables; sin conexión de objetos a las señales todavía                          |
| Periódicos                                                      | Contrato con intervalo en ticks; ejecución futura                                                   |
| Auras                                                           | Contrato reservado y objetivos/radio de efectos core; receptor/vida útil futuros                    |
| Condicionales                                                   | Predicados tipados; ejecución futura                                                                |
| Maná inicial/regeneración                                       | Categoría registrada; requiere ampliar la política de maná y su composición antes de asignar cifras |

Un objeto con efectos reservados no puede marcarse `available`. Así se evita admitir un objeto que prometa efectos sin ejecutarlos. No se implementan todavía los 36 objetos definitivos.

## Aislamiento DEV

`applyDevelopmentItems`, exportado solo desde el subpath de desarrollo, permite activar el catálogo técnico, generar componentes/objetos y vaciar el equipo e inventario con retiro registrado. Exige estado DEV, inventario habilitado y preparación. Las acciones ordinarias de equipar/combinar sirven después para las pruebas. No hay panel nuevo ni protocolo de generación online. La autoridad normal rechaza estados DEV y definiciones de diagnóstico.

Véanse [inventario](ITEM_INVENTORY.md), [recetas](ITEM_RECIPES.md), [reparto futuro](ITEM_DROP_DESIGN.md) e [informe](F0_P8A_REPORT.md).
