# Rondas automáticas — F0-P5

## Uso normal

1. Crear partida desde el lobby (semilla opcional). La tienda está visible y cerrada.
2. Pulsar **Iniciar partida**. Se abre la preparación de 30 s.
3. Comprar, fusionar, vender, colocar, retirar, intercambiar, bloquear/renovar y comprar XP durante el plazo.
4. El combate comienza automáticamente, se reproduce y se liquida una vez.
5. Ver resultado, daño, oro, XP y racha durante 5 s; empieza la próxima preparación sin pulsar nada.
6. Cuando Vargas llega a 0 HP, el coordinador finaliza tras pagar esa ronda. **Nueva partida** vuelve al lobby. Florin sigue siendo un rival de prueba, incluso si su vida llega a cero.

Los botones normales de iniciar combate, siguiente ronda, pausa y velocidad se han retirado de Partida local. La Arena conserva sus controles manuales independientes.

## Máquina de estados

```text
crear → not_started --inicio explícito--> preparation (30 s)
                                            |
                                         deadline
                                            v
                                         combat
                                            |
                              combat_end reproducido + 600 ms
                                            v
                                   liquidación atómica
                                  /                  \
                         Vargas HP > 0           Vargas HP = 0
                               |                       |
                         resolution (5 s)           finished
                               |
                            deadline
                               |
                         preparation siguiente
```

El estado temporal externo es la autoridad de ciclo. El `MatchState` económico histórico conserva sus tres fases operativas: durante `not_started` sigue en preparación sin aceptar comandos; durante `finished` normalmente conserva la resolución final. Así no se reescriben los 200 tests ni los guardados anteriores. La migración de una preparación histórica ya a cero mantiene su estado económico y detiene el envoltorio.

## Inicio, combate y pago

`LocalMatchCoordinator` está en `game-core`, sin React ni Phaser. `RoundAuthority.begin` congela formación/banco/semilla mediante el motor económico y ejecuta **una sola** llamada a `runCombat`. La traza queda en memoria y en el guardado. `LocalSession` adapta selección y tablero; su `advanceCombat` de Phaser es inoperante en automático. `CombatPlayback.seek` muestrea la posición del coordinador, incluidos cues y ocho frames de DOLEA.

El inicio automático permite tablero vacío: el motor existente dicta derrota frente al rival; no se compran ni despliegan unidades a escondidas y no se bloquea el ciclo. Las acciones ordinarias siguen impidiendo exceso de despliegue y posiciones ilegales.

Al alcanzar el final visual, `RoundAuthority.settle` usa su traza retenida en la **misma función de liquidación económica existente**. Pago, salud, racha y XP se publican junto con el ID de liquidación y la fase posterior. El deadline de combate no liquida. Secuencia de fase, revisión, número de ronda e IDs impiden transiciones y pagos duplicados. Repetir un callback no vuelve a simular ni cobrar.

`applyMatchAction` manual y `restoreMatch` histórico conservan la ruta de replay/resimulación para compatibilidad. La aplicación normal P5 usa la ruta automática con resultado retenido. No hay segundo simulador ni copia de las fórmulas de economía.

## Herramientas de desarrollo

En el lobby, desplegar **Herramientas de desarrollo local** y crear una prueba. Su guardado es independiente. El botón **Depuración** permite:

- Pausar/reanudar reloj y reproducción. La edición también queda congelada.
- Avanzar una fase, incluyendo saltar una reproducción: este salto solo existe en desarrollo.
- Elegir próximas fases normales (30/5 s) o cortas (8/2 s). No altera un plazo que ya empezó.
- Repetir desde el checkpoint anterior al combate, con formación, banco y RNG idénticos. Crea una rama técnica y revierte solo esa prueba, no el guardado normal.
- Simular recarga mediante serialización/validación y consultar timestamps, IDs y posición.

El checkpoint de repetición vive en memoria y no se conserva al recargar. El guardado de reproducción sí. No hay controles de desarrollo en la partida normal ni en el contrato de intención remota.

## Prueba reproducible

Semilla **360**, catálogo actual: DOLEA aparece en ofertas 2, 4 y 5. Comprar las tres cuesta 6, fusiona a 2★ y deja 4 de oro. Colocar en columna 3/fila 5. La primera ronda vence temprano; oro posterior 7. La segunda deja 12; la tercera observada acaba en doble derrota al tick450, entrega5 y deja17. El registro permite comprobar cada liquidación. Los resultados siguen dependiendo de la formación; no son reglas especiales para esta semilla.

Para validar recarga sin carreras entre llamadas de prueba, pausar mediante Depuración y comparar reproducción, saldo, restante y IDs antes/después. La prueba normal nunca requiere esta pausa. Para eliminación, avanzar fases técnicas sin cambiar la formación; no editar HP ni inyectar estado por el navegador.

## Alcance y continuidad

Economía, probabilidades, pool, venta, estrellas, perfiles, Overtime, sprites y cámara preservados. No se ha ejecutado ni cambiado el importador de sprites. Los recursos originales siguen fuera de Git. Ver `MATCH_CLOCK_SPEC.md` para guardados antiguos, política de pestaña suspendida y autoridad futura; `VALIDATION.md` para pruebas efectivamente ejecutadas. F0-P6 no se ha iniciado.
