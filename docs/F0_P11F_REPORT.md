# F0-P11F — Consolidación local de la primera partida real

Estado: consolidación funcional local validada. P11C cierra sus correcciones visuales tras la ronda adicional autorizada. Se declaran las limitaciones de objetos y del proveedor de registro; no se afirma fidelidad completa de los 36 objetos. Se mantiene TFT **18.5**, conforme a la elección explícita del usuario, con seis efectos pendientes bloqueados.

## Entregas y trazabilidad

| Fase | Resultado local                                                                                                                    | Commit e informe                                                                     |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| P11A | 34 identidades y afiliaciones del Excel, 30 provisionales explícitos, pool y tarjetas multiafinidad                                | `1bf38cf`, `F0_P11A_REPORT.md`                                                       |
| P11B | 8 componentes, 36 recetas verificadas individualmente, 30 ejecutables y 6 pendientes, inventario vertical y removedor autoritativo | `3f19de5`, `F0_P11B_REPORT.md`                                                       |
| P11C | Venta de reservas y bloqueo en combate, contabilidad y panel de estadísticas; correcciones visuales cerradas                       | `5a4f674` + `2cff2a0` + `1671f82` + `c67d955`, `F0_P11C_REPORT.md` y revisión visual |
| P11D | Registro local sin invitación, contratos CAPTCHA y cuotas SQL; registro remoto cerrado                                             | `4ce55af`, `F0_P11D_REPORT.md`                                                       |
| P11E | Recuperación tras rechazos/pérdidas de confirmación y pruebas a través de LocalSession                                             | `283bde6` + `d61a68c`, `F0_P11E_RECOVERY_REPORT.md`                                  |
| P11F | Pruebas conjuntas, navegador con 2–4 participantes, reconexión sin recargar y aislamiento                                          | Este informe y commit de consolidación                                               |

Todos los commits son locales en `codex/f0-p11-local-corrections`, partiendo de `b5d93c47548060e75071a7b966206d07770d2347`. No se ha hecho push ni publicado una versión.

## Matriz conjunta

| Requisito                       | Evidencia y límite                                                                                                                                                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 34 personajes y Excel           | 544 afiliaciones reproducibles, Erik→JARAMILLO, Alfredo/AlfredoPocho distintos. 30 básicos provisionales por identidad, sin inventar habilidades o arte definitivo. MUS solo 2/4; sinergias sin diseño marcadas pendientes.                          |
| Sin personajes ficticios nuevos | Nuevas partidas usan roster P11; prototipos permanecen únicamente en catálogos históricos/Arena técnica.                                                                                                                                             |
| Objetos TFT 18.5                | Manifiesto de parámetros, recetas nativas y overrides oficiales; 36 casos individuales. Seis efectos bloqueados, no concedibles/combinables/equipables hasta disponer de pruebas suficientes. Diferencias del anfitrión y discretización declaradas. |
| Inventario y removedor          | Una bandeja vertical, arrastre/clic, combinación, pendientes, consumo idempotente y devolución intacta. Removedor solo emitido en DEV; propuesta competitiva separada, sin recompensa gratuita inventada.                                            |
| Economía en combate             | Propiedad, ubicación, exclusión de entrada congelada, revisión, secuencia y fase verificadas. Venta no fusiona ni altera unidades combatientes. Lock gratuito conserva reservas y persiste.                                                          |
| Estadísticas                    | Daño efectivo, escudo, mitigación y curación separados; corte por tiempo visible; última tabla persistida. No se presenta daño a escudos como pérdida de vida ni se anticipa el resultado de otro duelo.                                             |
| Registro sin invitación         | Preparado y probado mediante contratos y PostgreSQL local. Confirmación de correo y protección real de CAPTCHA/GoTrue siguen pendientes de E2E del proveedor; no se ha abierto online ni cambiado Auth remoto.                                       |
| Colocación sin recarga          | Fallos reproducidos corregidos; 29 pruebas de coordinador/LocalSession/recuperación, plazos, fases y sincronización repetida. Causa exacta del paquete de la primera partida no atribuida sin telemetría.                                            |
| 2–4 jugadores                   | Suite de autoridad/pool/combates/persistencia; navegador real con salas privadas de 2, 3 y 4, nueve compras y nueve despliegues por arrastre nativo confirmados por el servidor.                                                                     |
| Reconexión                      | Cuatro jugadores: corte de los sockets del juego, recuperación automática de lobby/partida y mismo documento del navegador. Sin recarga.                                                                                                             |
| Compatibilidad                  | Configuraciones y fingerprints registrados por catálogo; estados/replays antiguos no se reinterpretan. Restauración, reinicio, admisión, permisos y fencing mediante PostgreSQL/TLS locales.                                                         |
| DEV y aislamiento               | Bundle público sin controlador/panel/comandos/almacenamiento DEV. Lifecycle LOCAL opt-in aprobado. Sin lectura de claves operativas ni llamadas a Railway/Supabase remoto.                                                                           |

## Navegador y reproducción

`artifacts/p11/f/multiplayer.json` y `network-{1280,1440,1920,2560,3840}.png` corresponden a las pruebas reales del navegador contra el servidor local aislado. Las cinco resoluciones mantienen cinco ofertas, inventario vertical y dimensiones del documento iguales al viewport, sin errores de JavaScript. La captura de 1920 muestra los cuatro participantes en clasificación. El campo `legacyPlayerBannerNodes: 0` mide el selector antiguo; no es el número de participantes del HUD multijugador.

Al cerrar pestañas, el servidor conservó correctamente las partidas para reconexión. Las siguientes pruebas se limpiaron mediante «Salir de la partida»/«Abandonar sala» sobre las identidades diagnósticas, sin reset de base ni partidas reales.

La primera simulación de desconexión cerraba también el WebSocket de Vite y provocaba su recarga de desarrollo. Se corrigió el **instrumento de prueba** para cortar solo `/__game/`; no se modificó el juego para ocultar ese resultado. La comprobación final utiliza un marcador en memoria del documento y la recuperación visible del HUD. Los casos de 2/3 jugadores no repiten esta prueba de corte; sus campos false no significan fallo de reconexión, sino prueba no ejecutada en ese grupo.

Mar de Cristal, letrero Carrefour, splash arts de los cuatro personajes y Festival Pop × Neon Playground se conservan. Los 30 personajes restantes usan marcadores provisionales propios claramente identificados.

## Pruebas de proyecto

- P11A: 1.492 pruebas; P11B: 1.559; P11C final: 1.569; P11D: 1.581. Cada gate incluye tipos, lint, suite y builds. Una prueba de lifecycle está opt-in en la suite general y se ejecuta aparte.
- P11E: 29 pruebas dirigidas, incluidas cuatro nuevas a través de LocalSession. Tipos y lint aprobados para su ampliación.
- P11D SQL: alta cerrada histórica antes de la preparación, alta local abierta después, normalización, privacidad, cuotas por ventanas fijas, rollback y ocho solicitudes concurrentes. Se aceptan exactamente cinco. Script local reproducible, sin credenciales.
- Gate F final y verificaciones locales de bundle/configuración: resultados consignados al terminar en el apartado de cierre siguiente.

No se han ampliado límites de rendimiento para pasar pruebas. Una ejecución previa de C excedió el p95 histórico por 0,14 ms; repetición aislada p95 7,12 ms y posteriores suites completas aprobadas.

## Estado, limitaciones y criterios de salida

1. **P11C visual cerrado:** el usuario autorizó la ronda adicional. Cuatro correcciones originales resueltas y SHIP limitado a las dos regresiones restantes: botón/panel separados y barras asentadas coherentes. Primera fila completa en 720p; separación 10–17,4 px, Escape y foco comprobados. Véase `F0_P11C_VISUAL_REVIEW.md`.
2. **Seis objetos sin evidencia completa:** Calibrador de Sterak, Guantes de ladrón, Mangual del guerrero, Sable-pistola hextech, Mejora roja y Verdugo de gigantes. Bloqueo explícito aceptado por el usuario al mantener 18.5; no cuentan como efectos fieles implementados.
3. **Apertura de registro online:** requiere autorización y prueba real de GoTrue/correo/CAPTCHA, límites del proveedor y revisión de CSP. No se modifica la configuración remota como parte de esta consolidación.
4. **Obtención competitiva del removedor:** propuesta separada, sin distribución implementada. El consumible y su seguridad sí están probados mediante fixture DEV.

Esta rama no es un despliegue aprobado ni una afirmación de equivalencia completa con TFT. El alcance de cada revisión visual y las limitaciones funcionales están separados de los resultados comprobados.

## Integridad y corrección de consolidación

Se revalidaron los 66 archivos de origen P10A frente a la toma de P11A: hashes idénticos y mismo HEAD `4e17a218ca93906278f75c38328ca7e929adda64`. El Excel conserva su SHA256 original. No se escribió en ese worktree ni se incorporaron nuevos desarrollos de allí.

La auditoría final encontró una omisión real: el resumen de estadísticas se persistía pero no estaba seleccionado en el snapshot privado. Se añadió su transmisión solo al propietario; la clave sigue ausente en versiones anteriores y antes del primer resultado. Las pruebas comprueban restauración y que las fichas públicas de otros participantes no incluyen ese resumen. No cambia el combate ni sus cifras.

La primera suite F con cuatro workers tuvo fallos de tiempo en sprites/reproducción y un timeout en una prueba SIGKILL que provocó conflictos posteriores del fixture en 2582. No se alteraron plazos ni umbrales para ocultarlos. Una ejecución serial quedó cancelada al descubrir la omisión del snapshot; no cuenta como gate aprobado. La suite completa nueva con dos workers sobre el código corregido, sin navegador ni supervisor LOCAL simultáneos, terminó aprobada.

## Cierre de validación

- **1.582 pruebas aprobadas en 115 archivos**, una opt-in omitida en 116 archivos totales; tipos, lint y ambos builds aprobados. Registro `artifacts/p11/audit/check-f-bounded.log`, 367,45 s, misma colección y umbrales con `--maxWorkers=2`.
- Lifecycle LOCAL opt-in: 1/1 aprobado (`lifecycle-f.log`). Bundle público y definición IaC verificados localmente, sin aprovisionamiento o llamadas a Railway. Tras el CSS final se repitieron build y verificación de bundle público, ambos aprobados.
- 29 pruebas dirigidas de recuperación; 25 adicionales en el conjunto dirigido de transmisión/resumen/recuperación pasan, sin duplicar su cómputo en el total global.
- P11C: los dos puntos revisados en la ronda autorizada están resueltos; no se presenta ese veredicto acotado como una auditoría nueva de toda la pantalla. P11D: SHIP visual del formulario local, sin afirmar E2E de proveedor.
- LOCAL está disponible en `http://127.0.0.1:4173/` con la rama actual y base diagnóstica aislada. Formulario preparado en `/__local/auth-preview`, sin creación de cuentas ni correos. No se han usado credenciales operativas.
- Railway y Supabase remoto no se han operado. Sin push. Los archivos de seguridad y recursos gráficos del usuario que ya estaban sin seguimiento permanecen fuera de estos commits.
