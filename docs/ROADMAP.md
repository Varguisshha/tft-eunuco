# Roadmap

## F0-P1 — alcance de esta entrega

Fundación del workspace, separación de paquetes, geometría axial, arena isométrica con colocación y arrastre, definiciones ficticias, contratos compartidos y de sprites, pruebas y documentación. La evidencia y las limitaciones se registran en VALIDATION.md.

## F0-P2 — propuesta pendiente de autorización

No iniciado. El alcance exacto debe confirmarse en el siguiente encargo. Secuencia sugerida:

1. Acordar especificación mínima de combate: estadísticas, orden de eventos, selección de objetivos, desempates y criterios de determinismo.
2. Elegir PRNG con semilla y políticas de aritmética; pruebas de replay/snapshot antes de conectar visuales.
3. Definir pathfinding y movimiento determinista sobre la adyacencia ya disponible.
4. Construir una pequeña simulación de referencia con eventos reales, solo cuando se aprueben sus reglas; nunca sustituirla por una animación que aparente resolver combate.
5. Diseñar el reproductor visual separado de la autoridad y probar el adaptador con un spritesheet original de muestra cuando se disponga de él.

## Fases posteriores sin implementar

Servidor Node/Colyseus, identidad de cuatro jugadores y emparejamientos, sincronización/reconexión, economía, roster/arte definitivo, cuentas y persistencia Supabase, despliegue y observabilidad. No hay compromisos de calendario ni integración de servicios en esta entrega.
