# F0-P6A.1 — Pasivas, escudos y validación de sinergias

23 de octubre de 2026. Implementación exclusivamente de F0-P6A.1. F0-P6B no iniciado.

## 1. Diagnóstico de la pasiva original

Volumen eterno ya funcionaba en F0-P6A. La falta de un aviso de activación y una representación suficiente del escudo impedía percibirlo con claridad. La auditoría inspeccionó motor, contratos, renderer, reproductor e inspector y ejecutó la suite inicial: 314 pruebas en 29 archivos, tipos/lint/build correctos.

Con semilla42, «Volumen Sucio · 1★»: DOLEA cruza por debajo de300HP en tick75. Recibe primero el daño, queda en281HP y activa la pasiva una vez. Obtiene72 de escudo, el12% de600HP máximos. No se produce una curación. Los ataques posteriores absorben35 y37, dejando37 y0 de escudo con281HP constantes.

Las pruebas recorren la traza completa y confirman una única activación, orden de eventos, ausencia de activación con daño letal y disponibilidad nueva al comenzar otro combate. En el diagnóstico de Overtime la activación ocurre en tick316 y concede54, ya reducido por el modificador aplicable.

## 2. Cambios del motor

Ninguno. No se cambian mitigación, estadísticas de catálogo, pasivas, sinergias, economía, Overtime ni temporizadores. Tampoco se alteran contratos de transporte. Se amplían las entradas de diagnóstico de game-data y la presentación del cliente.

## 3. Visualización de escudos

La barra conserva vida en jade/ámbar y añade un segmento cian contiguo con el valor exacto `ESC`. Se suman los estados de escudo vigentes. Capacidad visual: `max(vida máxima efectiva, HP + escudo)`, manteniendo proporciones sin colorear escudo como vida. La cantidad y el contorno defensivo desaparecen al llegar a cero, expirar o morir.

La lectura sirve para cualquier unidad y no depende del nombre DOLEA. No hay interpolación que deje escudo inexistente ni una anchura mínima que falsee la cantidad. Los escudos muy pequeños se leen mediante el número.

## 4. Feedback de pasivas

`combatFeedback.ts` deriva el nombre de `passive_trigger` y la concesión de `shield_apply`. Muestra «Volumen eterno» y «+72 escudo», con remates defensivos pixelados. Dura1600ms de reproducción; el desvanecimiento final ocupa200ms y el destello240ms. Pausa, rebobinado y saltos reconstruyen la misma presentación; no hay callbacks gráficos que produzcan daño o escudo.

Para varias unidades se reservan tres alturas y hasta seis grupos simultáneos, priorizando selección. Los nombres largos se abrevian sobre el tablero y permanecen completos en el inspector. Los grupos que no caben omiten su ráfaga transitoria, conservando barras y cantidad actuales. Reducción de movimiento: destello tenue sin variación de intensidad y cifras de daño sin desplazamiento. Sin audio.

## 5. Estados del inspector

El componente compartido usa contadores autoritativos `passiveState`, no una inferencia desde HP:

| Lectura                  | Significado                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| Disponible               | Quedan activaciones y la regla puede esperar su condición.                                    |
| Activada                 | Activación registrada durante los últimos1600ms lógicos.                                      |
| Consumida                | Se agotó el número de activaciones de este combate. No significa necesariamente escudo vacío. |
| Inactiva                 | Unidad eliminada o en banquillo.                                                              |
| En recarga               | Quedan activaciones, pero sus reglas esperan cooldown.                                        |
| Disponible al iniciar    | Preparación; disponibilidad futura, sin evento confirmado.                                    |
| Sin datos / No aplicable | Registro sin contadores modernos / perfil sin pasiva moderna.                                 |

El escudo actual se muestra por separado. La Arena aclara «Estado de unidad» para evitar confundirlo con el de la pasiva. El inspector flotante de partida local mantiene su ubicación y estructura.

## 6. Hortaleza

| Miembros distintos | Vida máxima DOLEA1★ | Armadura base efectiva |
| ------------------ | ------------------: | ---------------------: |
| 1                  |                 600 |                     45 |
| 2                  |                 700 |                     45 |
| 3                  |                 820 |                     60 |

Sin cambios de valores. Verificados conteo único, duplicados, banquillo y retirada de miembros3→2→1. El mayor umbral reemplaza el menor; no suma100+220. Pruebas de repetición y no mutación impiden acumular las bonificaciones al preparar otra ronda.

## 7. Llama de Pádel

| Miembros distintos | Ataques/s | Primeros ticks de inicio |
| ------------------ | --------: | ------------------------ |
| 1                  |       0,8 | 1,14,26,39               |
| 2                  |     0,896 | 1,13,24,35               |
| 3                  |         1 | 1,11,21,31               |

Los eventos demuestran el cambio real de cadencia. La carga sobrante se conserva: no se redondea cada intervalo de manera independiente. Las expectativas iniciales de los tests nuevos se corrigieron para representar esa regla existente; no se modificó el motor ni los tests anteriores. Overtime reduce el intervalo medio en los tres escenarios y la Arena muestra ataques/s efectivos con su modificador. Se comprueban retirada, duplicados y reconstrucción desde base.

## 8. Escenarios reproducibles

En [la web local](http://127.0.0.1:4173/), abrir **Arena de pruebas**. Semilla **42**. En «Sinergias y habilidades» seleccionar el diagnóstico y pulsar «Iniciar combate».

- **Volumen Sucio · 1★**: elegir en «Revisar escudo · unidad seleccionada» Inicio, Activación, Primera absorción o Escudo agotado. Salta y pausa en ticks0/75/85/95 de la misma traza.
- **Hortaleza · 2/3 miembros**: muestra700/820HP y45/60 de armadura al inicio.
- **Llama de Pádel · 1/2/3 miembros**: muestra0,8/0,896/1 ataques por segundo.
- **2/3 miembros · diagnóstico**: combinación de ambas sinergias. Tres da820HP,60 de armadura y1 ataque/s.
- **Pasiva durante overtime**: activación en tick316 y54 de escudo.

Para cambiar de escenario, volver a preparación. El salto a expiración temporal avisa si ese evento no existe en la traza: la duración normal de Volumen eterno no expira antes del final. La expiración se prueba con una entrada sintética de test de duración corta.

Los miembros adicionales son perfiles ficticios de diagnóstico fuera del catálogo jugable. En pruebas aisladas no infligen daño, ni lo hace el rival, para observar cadencia. El escenario de Overtime conserva sus ajustes sintéticos previos, sin modificar DOLEA del juego normal.

## 9. Tests y resultados

`pnpm check`: **332 pruebas en30 archivos**, tipos, lint y compilación correctos. 314 casos anteriores conservados,18 nuevos casos en `apps/web/src/game/combatFeedback.test.ts`. Sin dependencias nuevas. Permanece el aviso conocido del tamaño del chunk de Phaser.

Cobertura nueva: cruce/orden/activación única, concesión, absorción parcial/completa, expiración, letal, Overtime, escudos acumulados, validación de eventos previos, repetición determinista, estados desconocidos, inspector React real, pausa/salto/rebobinado, límite de rótulos, navegación de Arena, formación y cadencia real1/2/3.

## 10. Capturas y navegador real

Capturas locales en `artifacts/p6a1/` (ignoradas por Git):

| Evidencia      | Archivo                                                | Resultado                                        |
| -------------- | ------------------------------------------------------ | ------------------------------------------------ |
| Disponible     | `available.png`                                        | Tick0;600HP,0escudo.                             |
| Activación     | `activation.png`                                       | Tick75;Volumen eterno,+72,281HP,estado Activada. |
| Escudo parcial | `shield-partial.png`                                   | Tick85;37ESC,281HP.                              |
| Agotado        | `shield-consumed.png`                                  | Tick95;0escudo,281HP,Consumida.                  |
| Overtime       | `passive-overtime.png`                                 | Tick316;54escudo.                                |
| Sinergias      | `hortaleza-2/3.png`, `padel-1/2/3.png`, `traits-3.png` | Estadísticas efectivas esperadas.                |
| Rondas         | `automatic-rounds.png`                                 | Liquidaciones1–7; preparación de ronda8.         |
| Partida local  | `local-1280/1366/1440/1920/2560/390.png`               | HUD y nuevo estado de pasiva.                    |

Se utilizó navegador IAB real. La primera revisión visual comprobó activación/absorción/agotamiento, HUD1280×720 y móvil390×844. Las cinco medidas de escritorio comprobaron ausencia de scroll de página; móvil tiene scroll vertical y carece de desbordamiento horizontal. La Arena técnica conserva scroll por su estructura de laboratorio. Pasada final tras corregir las insignias de fase y aclarar «Estado de unidad».

La partida de desarrollo avanzó automáticamente de ronda1 a preparación8; se observaron las siete liquidaciones y el reinicio de disponibilidad. Después se pausó. La demostración final queda en Arena, activación de Volumen eterno, sin tocar el guardado normal.

## 11. Replays y guardados

Protocolo3 y reglas `f0p6a-1` conservados; parsers, schemas y guardados sin cambios. Se reproduce desde snapshots/eventos existentes. `feedbackEvents` es una propiedad opcional de presentación y no se persiste; `recentEvents` conserva su ventana anterior. Tests nuevos prueban entrada histórica `f0p3.1-1`; las suites históricas de guardado/replay siguen pasando. Los registros sin contadores no reciben estados inventados. No se promete resimular versiones que el motor ya no admitía.

## 12. Limitaciones conocidas

- Navegador IAB, sin matriz multinavegador, dispositivo táctil físico ni medición GPU exhaustiva.
- Expiración temporal, daño letal y activación única en toda la traza verificados por tests; no se afirma recorrido manual completo de todos ellos.
- Reducción de movimiento implementada y revisada en código; no validada en dispositivo físico con esa preferencia.
- La prevención de solapamientos limita rótulos transitorios, no garantiza legibilidad perfecta de todas las barras con56unidades superpuestas. No se hizo esa prueba visual de carga máxima.
- El objetivo sigue siendo PC. El inspector móvil conserva scroll interno; no se rediseñó el HUD.
- Sinergias todavía provisionales y DOLEA único miembro del roster real. Los escenarios sintéticos no certifican balance de juego.

## 13. Estado Git

Base F0-P6A validada y preservada en **`d3ddc8d` — `feat: preserve validated F0-P6A abilities and traits`**. P6A.1 se entrega como cambios locales revisables sobre esa base, sin commit adicional ni push. No se modificaron los PNG originales ni `Sprites/`, que continúan sin seguimiento. No hay cambios de paquetes/dependencias, game-core, shared ni estadísticas de catálogo. F0-P6B no iniciado.
