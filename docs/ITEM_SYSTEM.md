> **P11K (partidas nuevas):** variante `P11K_ECONOMY_CONFIG` con `removerPolicy.version=f0p11k-remover-1`, un removedor inicial por jugador real y uso sobre banquillo en combate. Catálogos H de combate/objetos intactos, 32/36 disponibles y cuatro bloqueados. [Removedor](ITEM_REMOVER_COMPETITIVE.md), [investigación de bloqueos](ITEM_BLOCKED_COMPLETION.md), [informe](F0_P11K_REPORT.md).

> **Presentación P11J (solo LOCAL):** los 44 iconos oficiales se resuelven por iconKey y tupla exacta de identidad/receta. Sin cambios de datos o mecánica. [Matriz](TFT_OFFICIAL_ICON_MAPPING.md), [procedencia y límites](TFT_ICON_PROVENANCE.md), [informe](F0_P11J_REPORT.md).

> **Contrato vigente P11H:** contenido/economía `f0p11h-1`, combate `f0p11h-1`, objetos `f0p11h-18.5-1`. 32 completos disponibles y cuatro bloqueados. [Auditoría y límites](ITEM_FIDELITY_AUDIT.md), [arte individual](ITEM_ICON_ASSET_MANIFEST.md), [entrega y tooltips/compras](F0_P11H_REPORT.md). El cuerpo siguiente es histórico y conserva las reglas de su versión; no describe por sí solo el catálogo vigente.

# Sistema universal de objetos · F0-P8B

Infraestructura versionada, separada del catálogo de personajes y del balance. Las nuevas partidas locales, DEV y privadas optan a `EconomyConfig.itemCatalog = f0p8b-14.1-1` mediante `STANDARD_ITEMS_ECONOMY_CONFIG`. La economía y las reglas de combate continúan en P6C. Los guardados anteriores omiten este campo y `MatchState.items`; no se rellenan con inventarios al restaurarlos.

## Contratos y registros

| Capa        | Fuente                                       | Responsabilidad                                                                  |
| ----------- | -------------------------------------------- | -------------------------------------------------------------------------------- |
| Contratos   | `packages/shared/src/items.ts`               | Definiciones, instancias, inventario, acciones, presentación y diseño de reparto |
| Catálogo    | `packages/game-data/src/items.ts`            | Ocho componentes, 36 parejas, políticas y descripción desde estadísticas         |
| Diagnóstico | `packages/game-data/src/items-diagnostic.ts` | Dos objetos técnicos ajenos al catálogo competitivo                              |
| Núcleo      | `packages/game-core/src/items/inventory.ts`  | Operaciones, propiedad, conservación, equipamiento y validación                  |
| Autoridad   | `AuthoritativeMatch` + `DurableMatch`        | Identidad autenticada, acciones, recibos y commit antes de publicar              |

Un componente tiene ID técnico, categoría, icono sustituible, versión, disponibilidad, ámbito y lista de bonificaciones. No requiere un nombre visible. Categorías: AD, velocidad de ataque, AP, maná, armadura, resistencia mágica, vida y crítico. El catálogo histórico `f0p8a-1` conserva sus ocho componentes con `bonuses: []`. El nuevo catálogo tiene cifras congeladas: AD +10 %, velocidad +10 %, AP +10, maná inicial +15, armadura +20, RM +20, vida +150 y crítico +20 puntos. No se reparten durante las rondas.

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

| Capacidad                                                       | Estado P8A                                                                                       |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Modificadores de HP, AD, AP, velocidad, armadura, RM y críticos | Integrados con las fuentes existentes; probados con objetos técnicos                             |
| Escudo, cura, daño adicional                                    | Efectos core tipables, ejecución de objetos reservada                                            |
| Al atacar o lanzar habilidad                                    | Desencadenantes declarables; sin conexión de objetos a las señales todavía                       |
| Periódicos                                                      | Contrato con intervalo en ticks; ejecución futura                                                |
| Auras                                                           | Contrato reservado y objetivos/radio de efectos core; receptor/vida útil futuros                 |
| Condicionales                                                   | Predicados tipados; ejecución futura                                                             |
| Maná inicial / regeneración                                     | P8B aplica maná inicial una vez al preparar; regeneración y reducción del máximo quedan para P8C |

Un objeto con efectos reservados no puede marcarse `available`. Así se evita admitir un objeto que prometa efectos sin ejecutarlos. Las 36 definiciones y recetas están completas, pero no se ejecutan sus efectos especiales ni se habilitan competitivamente.

## Aislamiento DEV

`applyDevelopmentItems`, exportado solo desde el subpath de desarrollo, permite activar el catálogo técnico, generar componentes/objetos y vaciar el equipo e inventario con retiro registrado. Exige estado DEV, inventario habilitado y preparación. Las acciones ordinarias de equipar/combinar sirven después para las pruebas. No hay panel nuevo ni protocolo de generación online. La autoridad normal rechaza estados DEV y definiciones de diagnóstico.

Véanse [inventario](ITEM_INVENTORY.md), [recetas](ITEM_RECIPES.md), [reparto futuro](ITEM_DROP_DESIGN.md) e [informe](F0_P8A_REPORT.md).

## Catálogo P8B y compatibilidad histórica

`items-standard.ts` define 8 componentes y 36 objetos desde hechos congelados de TFT 14.1. `item-design.ts` separa operaciones de diseño de `CoreEffect`: no hay ejecutor de objetos ni lógica de combate en Phaser. `item-description.ts` genera textos propios desde esas mismas operaciones y advierte disponibilidad pendiente. [Catálogo completo](ITEM_CATALOG.md), [fuente](ITEM_BALANCE_REFERENCE.md), [capacidades](ITEM_EFFECT_COMPATIBILITY.md).

`item-catalogs.ts` resuelve versiones explícitas, sin fallback de versiones desconocidas al diagnóstico. La familia del inventario debe coincidir con `config.itemCatalog`. La partida fija el catálogo al crear sus inventarios; no se migran los guardados existentes.

Maná inicial tiene contrato plano específico; se excluye de `initialItemModifiers`, se suma una vez y se limita al maná máximo. Se actualiza la copia del contrato de activa para conservar sus invariantes. Lanzar sigue consumiendo su coste habitual; no vuelve a entregar el maná inicial.

`standard_item_catalog` solo funciona en DEV local P8B. El catálogo de laboratorio `f0p8b-14.1-lab-1` permite únicamente componentes y el objeto estático de vida. El diagnóstico P8A sigue existiendo para partidas P8A; no se cruza entre familias. La distribución permanece apagada y el HUD no cambia.


## Actualización F0-P8C · 26-10-2026

El sistema universal ejecuta los 36 completos en `f0p8c-1`. La formación contiene loadout, ronda y semilla. `ItemEffectExecutor` delega al pipeline del motor; snapshots conservan su estado. Las versiones P8A/P8B anteriores mantienen su significado.

Detalle: [ejecutor](ITEM_EFFECT_EXECUTOR.md), [decisiones](ITEM_EFFECT_EVENT_ORDER.md) y [matriz de pruebas](ITEM_EFFECT_TEST_MATRIX.md).


## F0-P8D · 26-10-2026

Las partidas privadas modernas nuevas usan `f0p8d-1`: reparto al terminar cada tercera ronda, sin modificar los 36 efectos. La operación de concesión sigue siendo la de P8A.

Contrato, recuperación y límites: [ITEM_DROP_DESIGN](ITEM_DROP_DESIGN.md).

## FLORIN y splash arts — 26/10/2026

FLORIN admite tres objetos completos con el inventario P8A y ejecutores P8C intactos. Pruebas nuevas recorren los 36 objetos y verifican heridas durante recuperación y convivencia de escudos. No se cambian definiciones/recetas ni reparto de componentes.


## Consolidación P8D + FLORIN — 2026-10-26

La integración usa itemCatalog f0p8d-1: mismas 36 recetas y efectos, compatibles con FLORIN.

Versiones, fingerprints, conflictos, pruebas, capturas y límites: [INTEGRATION_P8D_FLORIN.md](INTEGRATION_P8D_FLORIN.md).


## F0-P8E · 26-10-2026

P8E añade presentación y comandos normales desde el HUD, sobre el catálogo de partida `f0p8d-florin-1` y objetos `f0p8d-1`. Los ocho componentes y 36 completos usan las definiciones existentes; iconografía y textos técnicos no cambian reglas. No hay inventario paralelo ni concesiones desde React. Arquitectura visual: [ITEM_HUD](ITEM_HUD.md); acciones: [ITEM_INTERACTION_CONTRACT](ITEM_INTERACTION_CONTRACT.md); recursos: [ITEM_ICON_MANIFEST](ITEM_ICON_MANIFEST.md).
