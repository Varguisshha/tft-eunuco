# Acumulaciones persistentes por unidad

Contrato compartido `MatchUnitProgressSchema`, versión 1, opcional en `OwnedUnit.progress`:

```json
{ "version": 1, "stacks": [{ "id": "kilometros", "count": 6, "lastRound": 4 }] }
```

La definición de la pasiva declara `matchProgress`: identificador, máximo, bonus AD, victoria competitiva, política de fusión máximo y reset al final. Los valores están versionados con el catálogo, no proporcionados por el cliente. Ausencia del campo equivale a cero para una unidad poseída.

## Responsabilidad

`awardRoundProgress` se llama en liquidación, después de un resultado real, no desde el render. Solo acredita participantes `south` en su entrada individual y victoria propia, con permiso competitivo y sin `development`. El servidor excluye duelos fantasma. `lastRound` impide recompensar otra vez la misma ronda. Cada instancia es independiente.

La progresión se conserva al mover la unidad. `mergeUnitProgress` mantiene la identidad superviviente y el mayor contador, no suma copias. `scaledOwnedProfile` escala estrellas primero y aplica el porcentaje una vez sobre ese AD. Se usa en formación, combate e inspección de banquillo; no se vuelve a sumar en Phaser. `clearMatchProgress` limpia el progreso al terminar local u online.

## Durabilidad P7D.2

P7D.2 ya estaba integrado en el punto estable `4b67386`. Se reutiliza su snapshot autoritativo y transacción JSONB CAS. No se crea tabla, servicio ni guardado paralelo. `OwnedUnit.progress` viaja en el mismo estado privado de cada jugador y permanece en la recuperación autenticada. El catálogo nuevo tiene fingerprint propio; los snapshots anteriores conservan su catálogo y reglas y no se reinterpretan como P6C.

La prueba `persistence/jaramillo.test.ts` restaura el snapshot serializado y rechaza catálogo cruzado. La prueba PostgreSQL adicional de `crash.test.ts` guarda seis Kilómetros en una instancia, cierra la conexión, abre un repositorio nuevo, restaura y reanuda con identidad autenticada. Las pruebas SIGKILL existentes verifican recuperación en preparación, combate y liquidación con 2–4 participantes. La prueba específica de seis Kilómetros valida almacenamiento y nueva conexión, no un SIGKILL particular de esa instancia.

## Añadir otra progresión

Añadir definición tipada y versionar catálogo/reglas si cambia comportamiento competitivo. Implementar su liquidación en el núcleo autoritativo, fijar identidad, tope, fusión y reset. Cubrir exclusiones, idempotencia, pool, restauración y reglas históricas. No reutilizar acumulaciones temporales de combate ni habilitar comandos de cliente que asignen progreso competitivo.
