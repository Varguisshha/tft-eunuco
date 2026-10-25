# Clasificación definitiva — F0-P7C.3

Los puestos los calcula el servidor. Para el grupo eliminado en una misma ronda se comparan HP al inicio del combate (mayor mejor) y daño efectivo aplicado (menor mejor). Igualdad completa comparte puesto; no desempatan UUID, nombre, orden de conexión, latencia ni azar.

Puesto = supervivientes tras el cierre + 1 + número de eliminados de ese grupo estrictamente mejores. Se usa clasificación de competición con huecos, no ranking denso.

Ejemplos con cuatro participantes:

| Situación                                                          | Puestos                                  |
| ------------------------------------------------------------------ | ---------------------------------------- |
| Sobreviven dos; los eliminados tenían 8 y 3 HP                     | 3.º y 4.º                                |
| Sobreviven dos; ambos eliminados tenían 3 HP y reciben 3 efectivos | 3.º compartido; no hay 4.º               |
| Sobrevive uno; dos eliminados de 8 HP y otro de 3 HP               | 1.º, 2.º compartido, 2.º compartido, 4.º |
| Mueren los cuatro con igual HP/daño                                | 1.º compartido por los cuatro            |
| Mueren los dos últimos con HP anterior 9 y 4                       | 1.º y 2.º, ambos con HP final cero       |

Con el daño actual limitado por HP, un eliminado normalmente recibe exactamente su HP previo como daño efectivo. Por ello el segundo criterio suele ser redundante; está explicitado y probado como comparador, sin utilizar daño excedente para inventar un desempate.

Durante la partida se ordenan vivos por HP con puesto provisional compartido si empatan, seguidos de los eliminados por puesto definitivo. El método anterior conserva de forma implícita la prioridad de las rondas más recientes. La interfaz presenta el puesto recibido, nunca lo decide.

Al acabar, `FinalResults` contiene el ID estable de finalización, ronda, secuencia, todos los puestos y `winnerIds`. Si hay un superviviente ocupa el primer puesto. Si no hay ninguno, ganan competitivamente los de mejor clasificación; una igualdad exacta usa `sharedFirst`. El orden visual dentro de un puesto compartido no concede ventaja ni rompe el empate.
