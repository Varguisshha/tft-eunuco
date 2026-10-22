# Economía local — f0p3.1-1

Configuración única: `packages/game-data/src/economy.ts`, validada por `EconomyConfigSchema`. Contratos/actions: `shared/match.ts`. Autoridad: `game-core/src/match`. Todas las cifras son provisionales de TFT EUNUCO; ninguna tabla se presenta como balance oficial vigente de TFT.

## Oro y liquidación

- Inicial: **10**, una sola entrada de registro al crear partida. La primera tienda no cobra renovación.
- Oro entero entre **0 y 999**. No se permite deuda. Todos los gastos fallan atómicamente si falta oro.
- Ingreso base al completar rondas 1, 2, 3, 4 y posteriores: **2, 3, 4, 5, 5…**. Tabla configurable, se repite su último valor. No hay PvE ni calendario de etapas.
- Victoria: **+1**. Derrota/doble derrota: **0** de victoria.
- Intereses: `min(5, floor(oroAlIniciarCombate / 10))`. Se congela el banco al cerrar preparación, antes de base, victoria y racha. No se compra ni vende durante combate.
- Racha firmada: positivo victorias, negativo derrotas. Resultado igual al anterior incrementa magnitud; cambio de signo comienza en1. Doble derrota restablece a0, sin iniciar racha negativa ni otorgar bonus de racha.

| Longitud de racha, victoria o derrota | Oro |
| ------------------------------------- | --: |
| 0–1                                   |   0 |
| 2–3                                   |   1 |
| 4–5                                   |   2 |
| 6+                                    |   3 |

Orden de `resolve_round`: resolver motor desde entrada almacenada; actualizar racha; calcular base/interés/victoria/racha; acreditar esas cuatro partidas en ese orden; añadir XP pasiva; pasar a `resolution`. La racha recién actualizada se usa en esa liquidación. Ejemplo: banco19, segunda victoria, ronda2 →3 base+1 interés+1 victoria+1 racha=6; saldo25. La victoria no eleva previamente el banco a20 para intereses.

Cada entrada de ledger tiene secuencia, ronda, motivo, referencia, cantidad solicitada, cambio real y saldo. Los ingresos se topan a999 por entrada; `overflow` en recompensa registra lo no acreditado. El total real del ledger debe coincidir exactamente con el oro. No se ocultan pérdidas por límite. El UI enseña el registro y el desglose de recompensa.

La ronda avanza al pulsar **Siguiente ronda**, después de liquidar; ese botón no vuelve a pagar. Las acciones llevan `seq` y `expectedRevision`, ambos coinciden con la siguiente acción aceptable. Repetir un payload se rechaza sin cambios. Repetir `resolve_round` con nueva secuencia también se rechaza por fase. El resultado no se recibe desde React: core ejecuta el motor F0-P2 sobre la entrada congelada.

## Gastos y ventas

- Comprar: coste de definición **1, 2 o 3**, cobrado una sola vez por offerId. Compra envía al banquillo y puede combinar inmediatamente.
- Renovar: **2**, incluso con tienda bloqueada. Mantiene el bloqueo; es una renovación explícita, no la automática de ronda. Si las categorías elegibles están agotadas, puede dejar huecos y cobra igualmente: no garantiza cinco copias cuando no existen.
- XP: **4 oro por 4 XP**. No comprable a nivel máximo.
- Venta: `coste × [1,3,9][estrellas−1]`. Esta adaptación local reembolsa el coste íntegro de las copias; no aplica la depreciación de determinadas versiones de TFT. No da beneficio por comprar/fusionar/vender. Configuración rechaza multiplicadores de venta superiores a las copias invertidas.

| Coste |  1★ |  2★ |  3★ |
| ----- | --: | --: | --: |
| 1     |   1 |   3 |   9 |
| 2     |   2 |   6 |  18 |
| 3     |   3 |   9 |  27 |

Vender devuelve al pool 1,3 o9 copias, tanto desde tablero como desde banquillo. Si el oro llega al límite se registra el crédito real. Ninguna acción inválida consume RNG, oro, copia, secuencia o identidad de oferta.

## Referencia y adaptación

Referencia histórica primaria: [Riot, Galaxies Systems Update, 4 de marzo de 2020](https://teamfighttactics.leagueoflegends.com/en-us/news/dev/dev-teamfight-tactics-galaxies-systems-update/), que describe ingresos progresivos y rachas de victoria/derrota con umbrales2–3,4–5,6+. Se conserva esa decisión estratégica; ingresos iniciales, niveles, tres costes, límite y calendario son propios del prototipo. No se intenta copiar un set actual ni sus tablas completas.

## Persistencia y autoridad futura

Guardado local bajo `tft-eunuco-local-f0p3.1-1` después de cada acción aceptada. Incluye versión/configuración/seed/historial y estado. Al continuar se valida el estado y se reproduce el historial desde cero; debe coincidir exactamente. No se abonan ingresos al montar una pantalla. Recargar durante combate reinicia solo su reproducción visual; recargar en resolución conserva el pago ya realizado. Sin almacenamiento disponible, sigue en memoria con aviso.

Es un guardado local verificable, no protección antitrampas: el futuro servidor deberá poseer el estado/configuración y autenticar quién puede enviar comandos. No confiar en oro, configuración o resultados enviados por un cliente. No hay sincronización de varias pestañas; una partida activa por navegador es el uso previsto. Historial/ledger crecen durante la partida y no tienen compactación todavía.

## Overtime y doble derrota

El motor determina `double_loss` por eliminación mutua o tiempo agotado. No hay bonus de victoria. La racha firmada se fija a **0**, tanto si era positiva como negativa: racha de victorias 0 y racha de derrotas 0; no comienza una nueva racha negativa ni se paga bonus de racha en esa ronda. Se conservan base, intereses sobre banco congelado y XP pasiva. La siguiente derrota normal comenzará en −1; la siguiente victoria en +1.

La transacción `resolve_round` deriva resultado, vida, racha, oro y XP una sola vez y añade el comando a historial. Repetir payload, solicitar de nuevo la resolución o recargar no vuelve a cobrar ni a dañar. Toda la transacción se realiza sobre copia validada. Tienda, banquillo, formación y pool no cambian al resolver.

## Vida y daño de ronda

Configuración `economy.roundDamage`: **100 HP iniciales por participante**, `roundsPerStage:3`, `baseByStage:[2,3,4,5,6]`, `survivorByStars:[1,2,3]`. Parámetros propios del prototipo. Etapa de daño = `1 + floor((ronda−1)/3)`, sin introducir calendario PvE. Base: rondas1–3→2; 4–6→3; 7–9→4; 10–12→5; 13+→6.

Función pura `calculateRoundDamage`: el ganador recibe cero; cada perdedor recibe `baseEtapa + suma(pesoPorEstrella de supervivientes enemigos)`. En doble derrota ambos se consideran perdedores. Timeout: cada uno recibe daño según los supervivientes contrarios. Eliminación mutua: no quedan supervivientes, ambos reciben solo la base. Una unidad 2★ cuenta como peso2, no como tres copias; el pool conserva su equivalencia independiente.

`applied = min(hpAntes, dañoSolicitado)`, `hpDespués = hpAntes−applied`. Registro por ronda y participante: resultado win/loss, base, contribución de supervivientes, solicitado, aplicado, HP anterior y posterior. Dos entradas por ronda, incluso cuando el ganador recibe cero. Invariantes verifican secuencia, balances y ausencia de pagos dobles. `health.north/south` persiste entre rondas; UI muestra ambos saldos y registro.

Referencia conceptual primaria: [Riot, parche 14.8](https://teamfighttactics.leagueoflegends.com/en-sg/news/game-updates/teamfight-tactics-patch-14-8-notes/), daño de base por etapa más contribución de enemigos supervivientes. No se copian sus cifras ni se presentan pesos por estrellas o etapas locales como reglas oficiales actuales.

Al llegar a 0 HP **se permite continuar**: el mensaje lo indica y nunca se genera vida negativa. No hay clasificación, matchmaking, eliminación global ni final automático. El rival sigue siendo la formación de pruebas original, sin compras, oro, XP ni racha propios. Su vida y resultado sí están conectados; la economía de otros jugadores reales queda para la autoridad multijugador futura. No se crean clientes ficticios.

Guardado nuevo separado por versión. La clave P3 `tft-eunuco-local-f0p3-1` se deja intacta y el lobby informa de ella. No se migra ni reproduce ese historial con reglas distintas. La clave P3.1 guarda configuración, vida, ledger e historial; restore valida y reproduce exactamente. Para abrir un guardado histórico P3 hace falta su versión de código preservada, no el motor P3.1.
