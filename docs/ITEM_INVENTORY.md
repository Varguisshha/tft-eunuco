> **Contrato vigente P11H:** contenido/economía `f0p11h-1`, combate `f0p11h-1`, objetos `f0p11h-18.5-1`. 32 completos disponibles y cuatro bloqueados. [Auditoría y límites](ITEM_FIDELITY_AUDIT.md), [arte individual](ITEM_ICON_ASSET_MANIFEST.md), [entrega y tooltips/compras](F0_P11H_REPORT.md). El cuerpo siguiente es histórico y conserva las reglas de su versión; no describe por sí solo el catálogo vigente.

# Inventario y equipamiento · F0-P8B

## Propiedad e identidad

`MatchState.items` es opcional para compatibilidad histórica; en partidas nuevas contiene `PlayerItemState` versión 1, catálogo, UUID propietario, contador de instancia, dos bandejas, pendientes y registros de concesión/combinación. El UUID es el participante autenticado online. La partida local sin cuentas usa un UUID sintético determinista derivado de su semilla. Un identificador de instancia es `ownerUUID/item/N`, único dentro de la partida; el sobre de comandos siempre incluye también la identidad de partida.

`OwnedUnit.equipment` guarda las instancias equipadas, en orden de ranura. Las bandejas no guardan otra copia. No hay cantidades mutables: cada componente u objeto es una instancia individual con versión de definición y origen.

- Capacidad: 16 componentes sueltos y 16 objetos completos, en listas de orden estable.
- Pendientes: devolución o concesión que no cabe en su bandeja, sin pérdida silenciosa. Se reclama con `move_item` cuando hay sitio.
- Máximo agregado de instancias vivas: 4096. Registro de concesiones: 2048 entradas de hasta 32 instancias; combinaciones: 4096; límites explícitos de serialización y el límite SQL existente de 16 MiB.
- Una concesión nueva que exceda límites se rechaza entera. Una venta/fusión mueve recursos existentes y no necesita crear instancias.

## Operaciones

| Acción                                  | Validación y resultado                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `equip_item(itemId, unitId)`            | Instancia en bandeja propia, unidad propia, preparación, máximo tres ranuras y restricciones                             |
| `unequip_item(itemId, unitId)`          | Política de catálogo: prohibido en normal, permitido en diagnóstico; devolución con pendientes si no cabe                |
| `combine_components(firstId, secondId)` | Dos instancias distintas en componentes, receta disponible y creación atómica de un resultado                            |
| `move_item(itemId, toIndex)`            | Reordenación en la bandeja del mismo tipo o reclamación de pendientes; no permite retirar equipo por otra vía            |
| `inspect_item(itemId)`                  | Valida la instancia poseída; recibo normal de acción. La vista de presentación también se puede leer sin mutar el estado |

Los comandos normales solo llevan IDs y posición, nunca propietario, estadísticas, cantidades ni inventarios completos. El servidor usa el participante asociado al socket, fase, revisión y secuencia existentes. Los últimos 128 recibos por jugador conservan la idempotencia tras reconexión; repetir una solicitud con distinto contenido falla. Las acciones locales repetidas son rechazadas por secuencia/revisión sin aplicar otra vez sus efectos.

`grantItemInstances` y `AuthoritativeMatch.grantItems` son capacidades internas de autoridad, sin mensaje ni endpoint público. La concesión usa un identificador propio idempotente; el mismo ID con otras definiciones falla. Debe ejecutarse dentro de `MatchRoom.mutate`/`DurableMatch` para hacer duradero el candidato antes de publicarlo. En P8A solo la invocan los diagnósticos.

## Componentes sobre unidades

Un componente puede ocupar una ranura. Al equipar un segundo componente, se intenta combinarlo con el componente ya equipado. Si la receta está disponible, ambos se consumen y un único objeto ocupa esa ranura, incluso si la unidad tenía las tres ranuras ocupadas. Una receta pendiente rechaza la acción completa. No se permite dejar dos componentes sin combinar en una unidad. Estas operaciones no tienen controles nuevos en el HUD.

## Fusiones

Se conserva exactamente la selección previa de superviviente: desplegadas primero y luego ID estable. Se recorren su equipo y el de las copias consumidas en ese orden. Se conservan hasta tres instancias compatibles; duplicados prohibidos por política `unique`, componentes adicionales y excedentes vuelven a bandeja o pendientes. No se combinan componentes automáticamente entre copias durante la fusión. Las identidades, propietarios y orden de los objetos retenidos se conservan. El progreso de Kilómetros sigue su política de máximo.

## Venta, eliminación y DEV

Vender devuelve todo el equipo al propietario antes de retirar la unidad dentro del mismo candidato transaccional. El precio sigue siendo el normal; los objetos no se venden. También se devuelve el equipo al retirar unidades por eliminación competitiva, sin afectar su devolución al pool. Los comandos locales DEV de retirar/cambiar formación utilizan la misma devolución.

Vaciar objetos en DEV retira las instancias vivas con IDs registrados en `retired`, conservando la trazabilidad y la idempotencia de las concesiones. No existe destrucción ni transferencia a otro jugador en el protocolo competitivo.

## Conservación y recuperación

`validateItemState` se ejecuta al cargar y antes/después de cada acción. Reconstruye todas las instancias emitidas desde las concesiones y los resultados de recetas; comprueba que cada componente se consume una vez y que toda instancia no consumida ocupa exactamente una ubicación. Detecta duplicados, pérdidas, propietario incorrecto, secuencias corruptas, recetas inventadas y restricciones de ranura.

El inventario, el equipo, los pendientes, los registros y la versión viajan dentro del snapshot JSONB P7D.2 y de los guardados locales. No se añade tabla ni backend paralelo. Un fallo de commit deja sin publicar la mutación y no produce confirmación de éxito. Solo el propietario recibe bandejas y registros; otros jugadores y espectadores ven el equipo de la formación pública, no sus recursos sueltos.

## Versionado P8B

La versión del inventario se inicializa desde la configuración de la partida. Las definiciones `version: 1` se resuelven siempre dentro de ese catálogo, no por ID aislado. Los mismos IDs de componente en P8A y P8B no tienen la misma cifra: no se reinterpretan entre generaciones. Un cruce de familia o catálogo desconocido se rechaza.

No cambian bandejas, IDs, concesiones, componentes consumidos, fusiones, ventas, pendientes, journal ni recibos. P8B completa `resultId`, pero `availability: planned` impide conceder o combinar los 36 objetos en normal. El intento de completar un componente equipado también se rechaza entero. El único resultado funcional del laboratorio es vida + vida, con trazabilidad y devolución al vender.

Los objetos de tres ranuras permanecen pendientes; `content.slotCost` declara el coste futuro, sin fingir que el contador P8A de instancias ya ejecuta esa mecánica. No existe acceso público para cambiar catálogos o conceder objetos.


## Actualización F0-P8C · 26-10-2026

La capacidad usa suma de `slotCost`, no longitud del array: Guantes ocupa tres ranuras, bloquea otras y genera dos hijos solo en el runtime. Fusión devuelve excedentes y venta conserva instancias; los hijos aleatorios nunca entran en el inventario ni se venden.

Detalle: [ejecutor](ITEM_EFFECT_EXECUTOR.md), [decisiones](ITEM_EFFECT_EVENT_ORDER.md) y [matriz de pruebas](ITEM_EFFECT_TEST_MATRIX.md).


## F0-P8D · 26-10-2026

Los repartos conceden 2 o 3 componentes por el ledger existente, con excedentes a pendientes. `distributions` enlaza concesión e instancias. La semilla individual solo se conserva en autoridad; red envía cero como marcador. El propietario obtiene tipos desde su concesión, sin acceso a inventarios rivales.

Contrato, recuperación y límites: [ITEM_DROP_DESIGN](ITEM_DROP_DESIGN.md).


## Consolidación P8D + FLORIN — 2026-10-26

Inventarios y journal conservados al recuperar rondas 3 y 6 con FLORIN equipado.

Versiones, fingerprints, conflictos, pruebas, capturas y límites: [INTEGRATION_P8D_FLORIN.md](INTEGRATION_P8D_FLORIN.md).


## F0-P8E · 26-10-2026

La bandeja del HUD expone componentes 16, completos 16 y pendientes consultables. Recuperar usa `move_item` con la capacidad existente. Clic/confirmación y arrastre usan los mismos comandos; una petición pendiente no retira ni duplica visualmente instancias. El inspector y los indicadores suman `slotCost`, incluido coste tres. Venta y fusión se reflejan desde el snapshot confirmado. Las referencias anteriores a ausencia de controles corresponden a P8A/B. Véase [contrato P8E](ITEM_INTERACTION_CONTRACT.md).
