# Rondas y límites de autoridad — F0-P3.1

```text
preparation --start_combat--> combat --resolve_round--> resolution
     ^                                                   |
     +--------------------next_round----------------------+
finished: reservado, sin transición automática en P3
```

## Preparación

Comprar/vender, renovar/bloquear, comprar XP, mover/intercambiar. Avance manual sin temporizador ni presión artificial. `start_combat` exige al menos una unidad y no exceder nivel. Congela banco para intereses, perfiles escalados y formación; toma seed de la fuente de combate y cambia fase. Compras, colocaciones, etc. se rechazan fuera de preparación.

## Combate

LocalSession construye una reproducción con el motor de combate v3 y CombatPlayback/CombatRenderer existentes. Los perfiles de estrellas y el rival se preparan en core. React nunca aplica daño. Durante combate se permite inspección, pausa, velocidad y zoom; esas acciones visuales no son parte del historial económico.

Al terminar la reproducción, LocalSession envía `resolve_round` con número de ronda. Core vuelve a ejecutar el combate desde la entrada congelada y deriva resultado/recompensas: no acepta un ganador proporcionado por la interfaz. La segunda ejecución es deliberada para mantener el límite autoritativo simple; una futura capa de servidor puede retener el resultado autoritativo sin repetirlo. No hay validación de tiempo de pared en el núcleo local: un consumidor headless puede resolver inmediatamente; la UI espera al final visual.

## Resolución

Pago, racha, XP y daño de vida ya se han aplicado una sola vez. Se muestra resultado y desglose. El jugador pulsa **Siguiente ronda**: incrementa ronda, limpia combate activo, renueva tienda si no está bloqueada y vuelve a preparación. La formación poseída nunca se sustituyó por los supervivientes visuales. No se cobran nuevos intereses al avanzar ni al volver de otra pantalla.

## Acciones y transacciones

MatchActionSchema estricto: buy_unit(offerId), sell_unit(unitId), reroll_shop, lock_shop(locked), buy_xp, move_unit(unitId,to), swap_units(unitId,otherId), start_combat, resolve_round(round), next_round(round). Todas incluyen `seq` y `expectedRevision`, números consecutivos desde0 de acciones aceptadas.

Cada operación devuelve `{ok:true,state}` o `{ok:false,stateOriginal,error}`. Rechazos no avanzan revisión, RNG, IDs o balances. Un segundo click con una oferta caducada falla incluso con nueva secuencia. Un comando retransmitido con la misma secuencia se rechaza como stale-action. No equivale a impedir dos compras de XP intencionadas con dos secuencias diferentes.

Validación runtime: esquemas, catálogo, unicidad de IDs/posiciones, mitad válida, límites, conservación por definición, ledger y secuencia del historial. Los snapshots siguen siendo datos de una autoridad local; la validación estructural no autentica al remitente. Un futuro servidor conserva estado/configuración y aplica comandos autenticados, nunca sustituye autoridad por el guardado del navegador.

## Pantallas y componentes compartidos

- **Partida local**: lobby con seed/continuar guardado, economía, tablero, banquillo9, tienda5, XP, estrellas, recompensa y registro. Estado propio LocalSession.
- **Arena de pruebas**: componente Arena (pantalla anterior extraída), BoardSession, duelo4×4 seed42 y controles técnicos conservados. Sin economía.
- Compartidos: BoardPort, GameCanvas, BoardScene, proyección, PixelUnit, PhaserUnitVisual, CombatPlayback, CombatRenderer y motor game-core.
- `BoardPort` es un puerto de presentación; cada sesión implementa sus comandos y autoridad correspondiente. BoardScene no compra ni combina.

Cambiar de vista conserva ambas sesiones en App. Solo está montada una escena Phaser; al salir se libera. El reloj visual deja de avanzar mientras su vista no está montada, sin resolver ni pagar por navegación. Volver continúa desde el mismo punto. Recargar usa el guardado explícitamente mediante **Continuar partida guardada**; `restoreMatch` reproduce historial y rechaza discrepancias. No hay persistencia de la Arena de depuración.

## Límites del prototipo

Almacenamiento local, una partida guardada, sin coordinación multiventana. Nueva partida sustituye ese guardado con texto explícito. Historial completo en memoria/storage; no hay compactación, import/export, servidor, cuentas, economía online, objetos, aumentos, carrusel ni sinergias activas. Se conserva la estética jade/ámbar y sprites ficticios; la producción artística definitiva queda fuera de P3.

## Overtime y doble derrota

Overtime es una subfase lógica del combate, no una nueva fase económica. Preparación permanece bloqueada hasta terminar la reproducción. Al comenzar tick300, el motor emite overtime_start una sola vez; acciones hasta449 y cierre en450 sin acciones extra. Eliminación de ambos o timeout → double_loss; nunca se elige ganador por HP restante.

resolve_round ejecuta combate, calcula daño puro para north/south y añade dos entradas de vida, reinicia la racha a0 para double_loss, acredita base/interés y XP sin victoria/racha. Todo se publica como una sola transacción validada. El replay visual no recibe autorización para aplicar oro ni daño al jugador. La formación original permanece poseída.

En resolución se muestran motivo/resultado, recompensa y daño de ambos participantes. Siguiente ronda mantiene oro/vida, solo avanza y refresca tienda según bloqueo. Llegar a0HP no cambia a finished: sigue siendo un laboratorio de rondas abiertas. Estado mínimo de vida conectado; clasificación/eliminación y economía del rival quedan fuera de P3.1.

Guardado con reglas f0p3.1-1 y clave propia. Recargar en combate reinicia la reproducción, manteniendo la ronda aún sin liquidar; en resolución recupera tickfinal y ambos registros sin volver a resolver. Los guardados P3 no se sobrescriben ni se migran automáticamente.
