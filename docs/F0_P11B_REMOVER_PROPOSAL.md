# P11B · propuesta de obtención del removedor (no implementada)

El catálogo competitivo no entrega removedores. No hay comando de red para generarlos ni botón de compra. La única emisión actual es un fixture DEV aislado; el servidor solo acepta consumir una instancia previamente emitida en su diario autoritativo.

Propuesta para evaluación posterior: una recompensa idéntica de **un removedor por participante vivo al comenzar la preparación de la ronda 4**, después del primer reparto de componentes de la ronda 3. No repetir la recompensa ni añadir el consumible al sorteo de componentes. Permitiría corregir una primera asignación de equipo sin convertir cada preparación en un reequipamiento gratuito ilimitado.

Esta cantidad y este momento son una propuesta, no reglas aprobadas ni una recomendación de equilibrio ya demostrada. Requieren decisión del propietario y pruebas de juego antes de añadirse a otro catálogo. Si se aprueba, la emisión debe tener ID partido/ronda/jugador, una transacción persistida, recuperación idempotente y elegibilidad basada en el estado posterior a la liquidación. Ni React ni Phaser concederían el recurso.

Reglas de uso ya implementadas en P11B: unidad propia con equipo, preparación, instancia no consumida, devolución intacta de todos los objetos a bolsa o pendientes, consumo solo tras éxito. Rechazo y repetición no consumen ni duplican. El input del combate nunca se edita retroactivamente.
