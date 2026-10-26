# Diseño de reparto futuro · F0-P8B

Contrato y configuración preparados en `ITEM_DROP_DESIGN`. **`enabled: false`** y el esquema exige ese valor. No hay temporizador, sorteo, entrega ni llamada de liquidación. En esta versión los registros de distribución deben estar vacíos.

## Regla acordada para la fase futura

- Al finalizar cada tercera ronda: 3, 6, 9, 12…
- Una cantidad común para todos los participantes vivos de esa ronda: 2 o 3 componentes, con peso inicial 50/50.
- Cada participante recibe tipos independientes, sorteados con semilla por la autoridad.
- Entrega directa al inventario; pendientes si no cabe según la política de inventario.
- Excluye eliminados; sin orbes, encuentros PvE, carruseles ni fuentes de azar del navegador.
- Registro deduplicado por partida, ronda y jugador.

## Frontera de implementación futura

La autoridad deberá fijar el conjunto de vivos después de la liquidación/eliminación de la ronda. Primero sorteará una sola cantidad compartida; después los tipos por UUID con un orden canónico. Deberá usar una corriente RNG de objetos separada de tienda, combate y emparejamientos, con semilla/versión persistentes. P8A no decide un algoritmo de sorteo nuevo ni consume RNG adicional.

`PlayerItemState.distributions` prepara ID de reparto, ronda, cantidad, semilla uint32 e IDs entregados. Se deberá añadir el estado común de sorteo por ronda a la autoridad cuando se active la mecánica. Cada entrega utilizará una concesión interna idempotente; cantidad, tipos, pendientes y registro se guardarán juntos mediante el commit P7D.2. Tras un reinicio se recuperará el sorteo confirmado, sin repetirlo.

Antes de activarlo hacen falta: versión de reparto nueva que acepte `enabled: true`, algoritmo y stream RNG fijados, integración de liquidación y jugadores vivos, validación del registro común/individual y pruebas de reinicio en mitad de una entrega. No basta con cambiar el booleano.

## Estado tras P8B

Sin cambios: reparto desactivado, ninguna llamada nueva de concesión al pasar de ronda, ningún consumo RNG adicional. El catálogo completo no activa la distribución. La implementación y sus pruebas de entrega/reinicio corresponden a P8D, después de P8C.
