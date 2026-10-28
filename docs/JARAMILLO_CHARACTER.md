# JARAMILLO · F0-P6C

Tercer personaje propio. ID `jaramillo`, coste 2, tirador de apoyo a distancia, alcance 3. Catálogo `f0p6c`, reglas `f0p6c-1`. Definición ejecutable: `packages/game-data/src/jaramillo.ts`; estadísticas y roster en `combat.ts` y `economy.ts`.

| Estadística 1★                |        Valor |
| ----------------------------- | -----------: |
| Vida                          |          550 |
| AD / AP                       |       48 / 0 |
| Ataques por segundo           |         0,75 |
| Armadura / resistencia mágica |      20 / 20 |
| Crítico / daño crítico        | 10 % / 150 % |
| Maná inicial / máximo         |       0 / 70 |
| Alcance                       |            3 |

Se aplica el escalado general por estrellas antes del modificador de Kilómetros. No se cambia el balance de DOLEA, VARGAS ni la economía.

## Habilidad mixta: Cortina de Humo

**Trotamundos.** Cada instancia desplegada en una victoria competitiva gana un Kilómetro: +3 % AD, máximo 8 (+24 %). No cuenta banquillo, derrota, empate, diagnóstico DEV ni victoria contra fantasma. Conserva progreso entre rondas y al volver al banquillo. La fusión conserva el máximo, nunca suma. Se borra al finalizar la partida. El inspector obtiene el contador del estado de la instancia poseída; no fabrica un contador rival desconocido.

**Activa.** 70 maná, preparación de 3 ticks; lanzamiento dirigido al enemigo actual. El daño físico se fija con el AD efectivo al liberar: 160 / 240 / 400 % según estrellas. No hace crítico; los básicos mantienen el sistema normal de críticos. La mitigación y Overtime siguen en el motor general. Al impactar aplica una reducción de armadura de 15 / 20 / 30 % durante 40 ticks, después del daño. No hay daño desde Phaser.

## Sinergias

Hortaleza conserva sus valores: 2 personajes distintos +100 vida; 3 +220 vida y +15 armadura. JARAMILLO con DOLEA activa el primer umbral. El HUD muestra 2/3 porque indica el siguiente umbral, con «Nivel 1 · Activa».

FUMÓN: 2 miembros distintos hacen que sus básicos reduzcan 8 % armadura durante 30 ticks. Con 3, 15 % y un golpe adicional del 60 % AD en la primera aplicación a cada enemigo, una sola vez en todo el combate. El registro `receivedEffects` es por objetivo y compartido entre atacantes; el golpe no inicia otra cadena de procs. Por ahora solo JARAMILLO pertenece al roster real FUMÓN: los umbrales 2 y 3 se prueban con miembros sintéticos, no con personajes inventados en la tienda.

Las reducciones de igual fuerza refrescan una única entrada global. Fuerzas distintas conviven con su vencimiento propio; solo actúa la mayor vigente. Al caducar, puede reaparecer una inferior aún vigente. Se aplica después de los modificadores normales y solo reduce armadura positiva.

## Arte y límites explícitos

Cuatro Idle, cuatro Walk y cuatro Death originales; tres poses corporales de ataque recibidas y limpiadas, recuperación desde `ataque_08`, vuelo desde 05–06 e impacto desde 07. No existe una cuarta pose corporal nueva: no se inventó. La limpieza generativa autorizada de las tres fotos alteró detalles de píxeles; los derivados no son copias exactas. Originales, ediciones y normalizados están separados bajo `Sprites/jaramillo`.

La evolución nativa no está confirmada (`sourceStarLevel: null`, `nativeAppearance: pending`). `star1` es almacenamiento de la apariencia compartida; 2★/3★ hacen fallback explícito. Ability usa temporalmente el ataque compuesto. No hay audio ni animación exclusiva de habilidad.

Véanse [animación compuesta](COMPOSITE_ATTACK_ANIMATIONS.md), [progreso persistente](MATCH_PERSISTENT_UNIT_STACKS.md) y [informe de validación](F0_P6C_REPORT.md).
