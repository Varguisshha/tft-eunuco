# F0-P7C.2 — Integración multijugador de 2–4 participantes

Fecha: 25/10/2026. Alcance: conectar lobby, autoridad existente y HUD; no iniciar F0-P7C.3.

## 1. Lobby de tres y cuatro

LobbyHub admite inicio con capacidad 2, 3 o 4 exactamente cubierta por participantes conectados y Listo. Solo el anfitrión puede iniciar. El bloqueo de transición se adquiere antes de esperar la fábrica; una segunda solicitud no crea otro destino. Se conservan límites, códigos privados y recuperación ante fallo.

## 2. Transición a partida

El permiso interno copia UUID, nombre y avatar verificados. private_match deriva su capacidad del roster; rechaza uniones fuera de whitelist y opciones de identidad falsas. Los perfiles congelados prevalecen sobre opciones del cliente. Espera todas las conexiones, sync y credenciales válidas antes de comenzar automáticamente. El mensaje start no permite saltarse esta espera. Se mantienen timeout de 25 segundos y cancelación de destinos fallidos/tardíos.

## 3. Reproducción de duelos

RemoteCoordinator acepta snapshots y trazas f0p7c1-1. Cada cliente conserva únicamente su replay autorizado; comprueba partida, combate, ronda, emparejamiento y lado. La traza puede llegar antes o después del snapshot. Revisiones posteriores conservan la misma referencia del replay y no reinician la animación. Cuatro participantes ven dos duelos, nunca cuatro equipos en un tablero.

## 4. Perspectiva

El servidor conserva coordenadas canónicas. El cliente asignado al norte usa reversePerspective solo para presentación; cada humano ve su equipo abajo. En un duelo fantasma, el propietario del equipo copiado no se considera participante receptor de esa traza. Se reutilizan sprites y reproductor existentes.

## 5. Espera y reloj

La introducción de rival muestra nombres, avatares, HP, ronda y marca de fantasma durante 2,2 segundos del reloj de combate, sin añadir tiempo. Tras terminar el duelo propio, awaiting_round informa del resultado y espera al resto con el contador global. No permite acciones económicas ni aplica ingresos anticipados. Se conservan 30 s de preparación, hasta 45 s de combate, cola de 600 ms y 5 s de resolución, sin depender de ACK de clientes.

## 6. Clasificación

Dos a cuatro entradas compactas con avatar, nombre, HP, nivel, conexión, jugador propio y rival actual. El orden y los puestos proceden del servidor; los empates comparten puesto. Se rotula provisional. En 720p/768p la columna se compacta y aprovecha 180 px del margen izquierdo para mostrar los cuatro participantes y las cuatro sinergias de referencia simultáneamente, sin scroll del documento. La columna conserva overflow interno para listas futuras más largas. No se introduce clasificación definitiva.

## 7. Economía y pool

Se mantiene AuthoritativeMatch y el algoritmo de emparejamiento sin cambios. Cada cuenta tiene tienda, oro, XP, racha, banquillo y formación propios; el pool interno es único. La liquidación global aplica daño e ingresos una sola vez. El fantasma no posee economía ni recibe una recompensa adicional. Los eventos visuales no ejecutan transacciones.

## 8. Seguridad

La autenticación Supabase de producción permanece intacta. Se conservan comprobaciones de JWT, caducidad, UUID, propiedad de unidades, fase, idempotencia y rechazo de comandos DEV. La integración añade protección de inicio completo y perfiles congelados. Las proyecciones no envían tiendas ajenas, pool interno ni RNG económico. La prueba de navegador utiliza un verificador fixture explícito y aislado, no modifica el verificador de producción.

## 9. Pruebas automatizadas

- Baseline confirmado: **745 pruebas / 54 archivos**.
- Resultado final: **760 pruebas / 56 archivos**, `pnpm check` correcto (tipos, lint, tests, compilación).
- `pnpm verify:public`: correcto; controlador/panel/comandos/almacenamiento DEV ausentes del bundle público.
- `git diff --check`: correcto.
- Dos pruebas antiguas que exigían bloquear 3/4 evolucionan a inicio funcional con roster completo; no se eliminan las comprobaciones negativas de seguridad.
- Nuevos casos: lobby 3/4 incompleto, no listo, desconectado, doble inicio, roster congelado, fallo y recuperación; SDK 2/3/4; proyección, perspectiva, trazas ajenas y desordenadas, replay estable, espera y empates.
- Se mantiene el aviso previo de tamaño de bundles; no impide la compilación.

Los registros de esta ejecución están en `/tmp/tft-p7c2-baseline.log` y `/tmp/tft-p7c2-final.log` (temporales, no forman parte del repositorio).

## 10. Clientes independientes

El test `apps/server/src/lobby-multiplayer.test.ts` abre clientes Colyseus independientes para salas de 2/3/4 y recorre tres rondas completas en cada caso. Comprueba whitelist, inicio, trazas por receptor, rotación, fantasma, reloj, privacidad, espera sin ingresos, liquidación e idempotencia/conservación del pool.

También se ejecutaron **cuatro clientes de navegador** con identidades fixture distintas: Vargas, Florin, Nora y Alex. Crearon sala, entraron por código, marcaron Listo y pasaron al combate. La sesión observada llegó a ronda 9; se probó compra y siguiente ronda. En ronda 7, Vargas↔Florin y Nora↔Alex tenían relojes de 9,5/9,5/9,4/9,3 s en lecturas consecutivas. La prueba de tres recorrió duelo humano, fantasma y rondas posteriores (hasta ronda 11 durante la revisión). Una nueva sesión de cuatro permitió recapturar 2560×1440 completa.

Son fixtures explícitos locales, **no cuatro personas ni cuatro cuentas Supabase remotas**. No se crearon cuentas remotas adicionales.

### Repetir la prueba visual

Desde la raíz, en terminales separadas:

```sh
pnpm --filter @tft/server exec tsx src/lobby-visual-fixture.ts
VITE_GAME_SERVER_URL=http://127.0.0.1:2574 pnpm --filter @tft/web exec vite --host 127.0.0.1 --port 4174
```

Abrir cuatro pestañas de `http://127.0.0.1:4174/diagnostics.html?player=0`, cambiando player por 1, 2 y 3. Crear sala, compartir código, entrar, Listo e iniciar. Para tres, usar solo 0/1/2 y capacidad tres. El fixture equipa formaciones desiguales para observar espera y fantasma; no representa compras o balance inicial de producción. Sus entradas son separadas: el servidor normal no importa ese verificador y diagnostics.html no es entrada del build público. El frontend diagnóstico exige DEV, loopback y puerto 4174. No exponer estos servidores fuera de loopback.

## 11. Capturas y resoluciones

Evidencias locales en `.impeccable/review/p7c2/` (carpeta de revisión ignorada por Git):

| Evidencia                                | Archivo                                                        |
| ---------------------------------------- | -------------------------------------------------------------- |
| Lobby completo de cuatro                 | lobby-four-1920.jpg                                            |
| Introducción de rival                    | intro-four.jpg                                                 |
| Cuatro clientes / dos duelos simultáneos | combat-client-0.jpg a combat-client-3.jpg; combat-clients.json |
| Resultado propio esperando al resto      | waiting-four.jpg                                               |
| Nueva ronda con clasificación            | final-four-1440.jpg; clients.json                              |
| Fantasma de tres participantes           | ghost-three.jpg                                                |
| 1280×720                                 | final-four-1280.jpg                                            |
| 1366×768                                 | final-four-1366.jpg                                            |
| 1440×900                                 | final-four-1440.jpg                                            |
| Vista 1920×1080                          | final-four-1920.jpg                                            |
| 2560×1440 completa, cuatro participantes | final-four-2560.jpg                                            |
| Dimensiones DOM / ausencia de scroll     | viewports-final.json                                           |

La captura de la vista 1920 tiene 1912 píxeles de ancho por el borde del capturador; conserva la composición completa. La revisión independiente terminó con disposición **ship** tras corregir la visibilidad simultánea de las cuatro sinergias a 720p/768p; no señaló más correcciones materiales. La captura inicial recortada de 2560 se sustituyó por una captura fullPage de 2560×1440. No utilizar `three-2560-full.jpg` ni `match-four-1920.jpg`: son intentos descartados. Las medidas de los cinco viewports confirmaron cinco ofertas y altura del documento igual a la ventana. Las capturas son de partidas vivas y no necesariamente de la misma ronda.

## 12. Limitaciones

Sesiones y lobbies viven en memoria de un solo proceso. No hay recuperación de combate tras desconexión, espectadores, eliminación competitiva completa ni clasificación final. El criterio provisional de terminación del motor existente se conserva. El servidor local no permite jugar desde otros ordenadores sin trabajo de infraestructura posterior. No se repitió una prueba Supabase de cuatro cuentas reales; la integración de identidad se cubre con fixtures y regresiones existentes. No se cambian arte, escala, balance, combate ni fórmulas económicas.

## 13. Estado Git

La fase previa F0-P7C.1 quedó preservada en **d91016c**, `feat: preserve deterministic 2–4 player pairing and parallel combat foundation`, sobre `codex/f0-p7a-authoritative`. F0-P7C.2 queda como cambios locales revisables. No se incluyeron recursos gráficos ajenos, `.21st` ni sprites sueltos. No se configuró remoto, no hubo push ni despliegue.

## 14. Preparación para F0-P7C.3

La ruta de lobby a partida de 2–4, la proyección por duelo y la clasificación provisional quedan listas como base. F0-P7C.3 debe definir eliminación, fin competitivo y puestos finales en un encargo posterior. Esa fase no se ha iniciado.
