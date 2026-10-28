# Removedor competitivo · F0-P11K

## Obtención versionada

Las partidas nuevas de LOCAL y del servidor moderno preparado usan `P11K_ECONOMY_CONFIG`. Se deriva de `P11H_ECONOMY_CONFIG` sin cambiarlo y añade exclusivamente:

```json
{
  "removerPolicy": {
    "version": "f0p11k-remover-1",
    "initialQuantity": 1,
    "benchDuringCombat": true
  }
}
```

El catálogo de personajes/combate sigue en `f0p11h-1` y el de objetos en `f0p11h-18.5-1`. La variante económica tiene un fingerprint `P11K_CATALOG_HASH` distinto y se reconoce en snapshots y compresión de replays. Los 13 fingerprints previos permanecen idénticos. No se migran ni se añaden consumibles a partidas existentes.

`createMatch` concede el consumible desde el motor compartido al construir el inventario privado de cada jugador real. ID estable: `<owner>/remover/initial-p11k-0`. La cantidad está centralizada, no es aleatoria, no avanza RNG ni contador de instancias de objetos, no ocupa ranuras de personaje y no sustituye componentes del reparto 3/6/9. Los fantasmas son proyecciones de combate, no jugadores nuevos con inventario; no reciben concesiones. Las pruebas incluyen tres jugadores y duelos fantasma.

La restauración y reconexión cargan el diario persistido; no vuelven a conceder. Repetir la concesión interna del mismo ID es inocuo, incluso después de consumirlo. Para partidas normales de esta política, las invariantes exigen exactamente la concesión inicial configurada y su linaje. Los diagnósticos históricos mantienen sus concesiones DEV aisladas. No existe comando de red para concederse removedores.

## Uso y fases

| Destino propio                         | Preparación | Combate                                                      |
| -------------------------------------- | ----------- | ------------------------------------------------------------ |
| Tablero                                | Sí          | No                                                           |
| Banquillo                              | Sí          | Sí, si la unidad no figura en el input congelado del combate |
| Unidad ajena, inexistente o sin equipo | No          | No                                                           |
| Resolución o partida finalizada        | No          | No                                                           |

Se reutiliza `remove_unit_items`, `ItemInteraction`, el inventario y la devolución existente. El servidor comprueba identidad del jugador, unidad propia, fase/capacidad versionada, consumible disponible y equipo. Conserva IDs, orígenes, objetos completos y estrellas; no vende ni descompone. La devolución usa bolsa por tipo y luego pendientes. Se calcula el espacio pendiente necesario antes de mutar; si excede 4096, se rechaza sin consumo ni retirada parcial. El límite global previo de 4096 instancias implica que una partida válida no puede tener ya 4096 pendientes y además equipo; la regresión del límite usa un estado válido con 16 en bolsa, 4079 pendientes y una instancia equipada.

La autorización de economía en combate sigue congelando unidades participantes e inputs de fantasmas. No se vuelven a calcular perfiles, semillas, simulaciones ni replays ya iniciados. Los otros comandos de equipamiento continúan sujetos a preparación. Se conservan compras, venta del banquillo y bloqueo de tienda existentes.

## Confirmación y durabilidad

La selección por clic permite elegir una unidad y pulsar «Retirar equipo». El arrastre es una orden explícita equivalente y usa el mismo payload MIME y controlador. No se añade un modal con X. La interfaz muestra cantidad, selección, destinos válidos/inválidos, errores, espera y confirmación. Los errores conservan el consumible y la selección para reintentar; las desconexiones/solicitudes pendientes siguen bloqueando envíos no seguros.

La devolución completa, retirada y consumo se calculan en un candidato privado y se publican únicamente tras el commit del `DurableMatch` existente. RequestId, secuencia y revisión siguen siendo los del protocolo autoritativo. Un reintento del mismo RequestId devuelve el recibo confirmado; otro intento con el consumible ya usado se rechaza.

## Pruebas

- Motor sin DEV: concesión inicial determinista, históricos sin concesión, RNG/tienda/oro iguales a H, retorno intacto, bolsa llena/pendientes, límite global de 4096 instancias válidas (4079 pendientes antes de retirar, 4080 después; sin concesiones adicionales), rechazo sin mutación, fusión y venta posteriores, fases y protección de inputs congelados.
- UI: origen competitivo del consumible, cantidad, drag handle, envío desde el controlador existente, confirmación y rechazo de tablero en combate.
- Autoridad 2/3/4: propiedad, cantidad igual por jugador, recibos repetidos, retorno a pendientes, restauración/reconexión, venta posterior y replays reales/fantasmas idénticos.
- PostgreSQL aislado + sockets + SIGKILL antes del commit: ningún consumo o equipo parcial publicado; después del reinicio el mismo comando se aplica una vez.
- SIGKILL después del commit: se recupera el consumo y la devolución completos; repetir el RequestId no duplica instancias. Se usa el codec comprimido real y se compara todo el replay.
- Navegador: retirada de DOLEA de 2/3 a 0/3 y contador de 1 a 0 en cinco resoluciones. Arrastre sobre FLORIN del banquillo en combate, 1/3 a 0/3; tablero desplegado rechazado. Estas capturas complementan, no sustituyen, las pruebas de autoridad y persistencia.

Los escenarios visuales con equipamiento son DEV aislado, pero su removedor procede de la misma concesión inicial del motor, sin `grant_remover`. Las pruebas del motor/servidor usan estados competitivos sin marca DEV.
