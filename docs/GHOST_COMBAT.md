# Combate contra fantasma — F0-P7C.1

Con tres humanos se ejecutan un duelo humano y otro entre el tercero y una copia de la formación de uno de los primeros. El receptor se asigna al lado canónico south y la copia a north. No puede copiarse a sí mismo. El propietario conserva su duelo humano independiente.

## Copia y aislamiento

La formación se captura síncronamente al comenzar Combat. Se conservan definición, estrellas, perfil escalado, habilidades, pasivas y configuración de sinergias; el mismo motor calcula las activaciones de cada duelo. CombatInputSchema y runCombat crean los datos de la simulación independientes del inventario y de la otra traza. IDs de unidad se interpretan dentro del combatId; pueden aparecer en la copia y en el original sin compartir objetos mutables.

El fantasma no es un participante: no tiene cuenta, economía, tienda, banco, XP, HP de jugador ni inventario. No reserva ni devuelve copias del pool. No se usa como externalCopies en la contabilidad. El propietario puede recibir daño en su duelo humano; nada de lo ocurrido a la copia modifica ese daño, su victoria, su racha o sus recompensas.

## Resultado

El receptor cobra exactamente una vez mediante applySharedEconomy y la misma fórmula existente. Una victoria obtiene el bono normal; una derrota recibe el daño de etapa más supervivientes y estrellas reales de la copia. La copia no cobra nada. La vida del jugador nunca procede del HP de las unidades simuladas directamente, sino de calculateRoundDamage.

No se introduce un empate nuevo: motor existente `double_loss` para timeout, doble eliminación o ambos equipos vacíos. Frente a fantasma, el humano sufre su parte normal de doble derrota (base y supervivientes rivales cuando corresponda), con racha y premio de doble derrota existentes. La consecuencia de la copia se descarta; no se carga al propietario. Una formación vacía frente a una no vacía usa el resultado normal del motor.

## Equidad y desconexión

Se prioriza al humano con menos combates contra fantasma, después al propietario con menos préstamos; se minimiza exposición repetida/reciente y se desempata determinísticamente. Se cuenta historial, no selección aleatoria aislada. Ver [algoritmo](MATCHMAKING_2_TO_4.md).

Desconectar no elimina al jugador de los elegibles ni borra su formación. Su último tablero sigue participando y puede prestarse como fantasma; su economía avanza bajo la misma autoridad. No se pausa el reloj, no se aceptan sus comandos desconectados y no entra un sustituto. No se implementan recuperación ni reglas competitivas de abandono en esta fase.

## Evidencias

Tests de perfiles/estrellas/DOLEA/VARGAS/sinergias, independencia de objetos, conservación de pool, tres liquidaciones, resultados win/loss/double_loss, rotación y publicación de una traza por receptor. El escenario SDK de tres usa identidades ficticias verificadas por un verificador controlado y unidades reales del catálogo. No equivale a tres cuentas Supabase reales.
