> **Contrato vigente P11H:** contenido/economía `f0p11h-1`, combate `f0p11h-1`, objetos `f0p11h-18.5-1`. 32 completos disponibles y cuatro bloqueados. [Auditoría y límites](ITEM_FIDELITY_AUDIT.md), [arte individual](ITEM_ICON_ASSET_MANIFEST.md), [entrega y tooltips/compras](F0_P11H_REPORT.md). El cuerpo siguiente es histórico y conserva las reglas de su versión; no describe por sí solo el catálogo vigente.

# Contrato de interacción de objetos · F0-P8E

## Flujo y comandos existentes

| Entrada                                        | Destino                                            | Operación                                                     |
| ---------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------- |
| Clic en objeto, selector de personaje, Equipar | Unidad propia en tablero o banquillo               | `equip_item`                                                  |
| Arrastre de inventario                         | Unidad del canvas, banquillo o ranura de inspector | `equip_item`                                                  |
| Arrastre de componente suelto                  | Otro componente suelto                             | `combine_components`                                          |
| Arrastre de componente equipado                | Componente suelto                                  | Equipar el segundo en la unidad del primero; el motor combina |
| Botón Combinar de receta                       | Dos instancias sueltas distintas                   | `combine_components`                                          |
| Recuperar pendiente                            | Bandeja correspondiente                            | `move_item(itemId, toIndex: 0)`                               |

El MIME de arrastre es `application/x-tft-item`; transporta un ID, nunca estadísticas ni inventarios. `previewItemCommand` aplica la regla a una copia para mostrar validez; no modifica el estado ni autoriza la operación. La receta doble requiere dos IDs diferentes. Consultar una receta no envía comandos. No hay retirada libre de objetos en el HUD normal.

## Estados y confirmación

`ItemInteraction` conserva únicamente selección, arrastre, mensaje, pending y outcome (`idle`, `pending`, `success`, `error`). `submit` exige sesión editable, comprueba la previsualización y despacha por `LocalSession`. Mientras hay petición pendiente impide un segundo envío y un nuevo arrastre desde la bandeja. Los objetos siguen en su ubicación confirmada; no existe inventario optimista.

En local la autoridad es el controlador local; online se espera `remote.requestPending` y el snapshot del servidor. El coordinador conserva el protocolo existente de versión, secuencia, revisión, `requestId` e idempotencia. La UI no crea un protocolo alternativo ni concede recursos.

La confirmación de equipamiento busca el ID en la unidad o en los componentes consumidos por su receta. Combinar busca ambos IDs en la trazabilidad del resultado; recuperar busca la instancia en bandejas. Si no se confirma, muestra el aviso de autoridad o un mensaje de reintento. Un rechazo conserva el inventario recibido. Los resultados del motor deciden capacidad, propietario, fase, disponibilidad, restricciones y consumo de ranuras.

Al perder conexión durante pending se mantiene «Esperando sincronización» sin duplicar el objeto. Al reconectar se comprueba el estado aceptado antes de anunciar éxito. No se reenvía desde una animación. Cancelar o Escape limpia la selección visual; no revoca una petición que ya salió. El reintento posterior recorre el coordinador y sus recibos existentes.

## Equipo, venta y fusión

Hay tres ranuras de coste, no necesariamente tres instancias. `content.slotCost: 3` llena las tres en inspector e indicadores. El segundo componente sobre una unidad combina automáticamente conforme al motor, incluso con las ranuras ocupadas cuando la sustitución es válida. Un cuarto objeto no se materializa visualmente si el motor lo rechaza.

Venta y fusión siguen la transacción del core: retienen equipo compatible y devuelven excedentes a bandejas o pendientes del propietario. La UI vuelve a leer el snapshot; no anima copias persistentes ni calcula devoluciones por separado.

## Privacidad y reparto

Solo el propietario aporta bandejas, pendientes y registros privados. El equipo rival procede de su perfil público; `RemoteCoordinator` calcula ese perfil con el propietario rival, sin usar el inventario privado local. La UI no incorpora semillas, recompensas futuras ni journals globales.

`DeliveryTracker` deduplica IDs durante el montaje. Un remontaje puede informar de registros existentes como «ya recibidos»; no vuelve a otorgarlos. Los iconos se resuelven por instancias actuales o por la concesión privada histórica, de modo que una venta o combinación no borra el contenido del aviso. El reparto sigue siendo P8D y sus IDs persistidos; la presentación nunca es autorización de concesión.

## Acceso alternativo y límites de evidencia

Botones, selector y detalles nativos permiten operar por teclado; Escape cancela contexto y los estados de error tienen texto. Foco interior visible evita perder el contorno en los biseles. No se exige arrastrar para equipar o combinar. Los cambios de pestaña limpian el detalle anterior.

Las pruebas y capturas de P8E se enumeran en [ITEM_HUD](ITEM_HUD.md). El cierre técnico, recuperación con servidor real y resultado exacto de suites se registran por separado en VALIDATION; este contrato describe implementación y no declara esos checks aprobados.
