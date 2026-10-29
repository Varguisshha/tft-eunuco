# F0-P12F — Inventario e interacción

Fecha: 29 de octubre de 2026. Trabajo exclusivamente LOCAL.

## 1. Base y rama

- Base pública: `2b3030562e2c38e128886fc6d1cbf5a159dbe96f` (`release/p12d-public-safe`).
- Rama aislada: `codex/f0-p12f-interactions`.
- Worktree: `/Users/vargas/.codex/worktrees/p12f-interactions/TFT EUNUCO`.
- Implementación: `9351905`; controles comunes de cámara en replay: `4ed0ba2`; protección frente a soltar touch sobre el HUD: `070a6c105344a5a590d672c490f432b676b38b1e`.
- Ajuste de dos pruebas históricas: `a2b5dc6` (sin cambios de aplicación).
- Espera del inicio confirmado en el laboratorio SIGKILL: `68ba9c3` (sin cambios de aplicación).
- No se reconstruye la genealogía pública ni se modifican otros worktrees.

## 2. Iconos LOCAL / Railway

La diferencia es deliberada y verificable en código: `ItemIcon.tsx` habilita el manifiesto de referencias oficiales únicamente con `__DEVTOOLS__`. Vite activa esa constante al servir desarrollo y en `local-test`. El plugin `localItemArt.ts` suministra referencias locales y las excluye del build público. El `iconKey` conserva la correspondencia; en producción resuelve al recurso EUNUCO. No se ha sustituido el sistema de overrides ni su fallback.

La comprobación HTTPS conservada de P12E (`artifacts/p12e/remote-verification.json`, en su worktree) documenta 44 iconos originales, rutas de referencias oficiales ausentes y bundles iguales a su candidata. Es evidencia de aquel despliegue, no una lectura actual del último contenedor.

Consulta actual del proveedor: último deployment `a9bb6c57-117c-447d-bcee-4c4b51326f3e`, estado `REMOVED`; también está retirado el deployment base `6e5c38ec-aaab-441d-bbd0-79682740ab1d`. Los digests difieren; no se afirma que sus imágenes sean idénticas por compartir etiqueta. Cero deployments activos; `/readyz` devuelve 404 con el servicio apagado. No existe ahora un manifiesto servido que permita verificar su contenido en vivo.

No ha sido necesario reactivar el servicio para confirmar la exclusión del build. No hay evidencia que justifique atribuirlo a caché o a una versión antigua. Para mostrar online los 44 binarios oficiales hace falta autorización adecuada para su distribución y una decisión de publicación que cambie la política actual. Esta entrega no incorpora esos binarios a Git, Railway ni otro alojamiento.

Evidencias: `artifacts/p12f/railway-diagnostic.json`, `railway-final.json`, verificadores de assets públicos e historial.

## 3. Removedores

Una única casilla con contador y cantidad accesible agrupa visualmente el stock. Conserva todos los IDs de instancias; cada comando consume uno concreto. Al recibir el premio de ronda 3 se observa ×2; tras retirar el equipo de una unidad pasa a ×1 y el objeto vuelve al inventario. Las recetas, componentes, objetos completos y objetos pendientes continúan en casillas individuales.

Las pruebas conservan las políticas históricas y añaden la política nueva a las recompensas periódicas, con SIGKILL antes/después de confirmar. No se modifica el calendario 3/6/9/12.

## 4. Fabricación y equipo en combate

Nueva política versionada `combatItemPolicy: bench-crafting-1`, contenida en `P12F_ECONOMY_CONFIG`. Autoriza combinar inventario propio y equipar componentes/completos a una unidad propia del banquillo cuyo ID no figure en el input congelado. La combinación sobre un componente equipado usa la receta existente.

El servidor deniega unidades desplegadas, extranjeras, clones y falsas unidades de banquillo que contribuyeron al combate. Conserva límites de ranuras, disponibilidad de recetas, fusiones diferidas, receipts, revisión y transacciones. No cambia el input congelado, el simulador ni el balance. Resolución continúa restringida. La política P12D sigue rechazando las operaciones nuevas.

Pruebas de dominio y red: compra durante combate, equipo posterior, fabricación, combinación automática, reintento del mismo command ID, rechazo sin mutación, restore/reconexión. PostgreSQL verifica fabricación y equipo con SIGKILL antes y después de cada commit y reintento exactamente una vez.

## 5. Destinos y drag-and-drop

`dropGeometry.ts` separa la geometría de las reglas y comandos. Puntúa distancias normalizadas a áreas ampliadas; el orden DOM no decide. Si dos candidatos quedan demasiado próximos, no elige ninguno. El origen se conserva y aparece una indicación para apuntar al centro.

Banquillo usa sus rectángulos reales; Phaser transforma coordenadas de cliente a mundo y evalúa límites de sprites/celdas proyectadas. El halo marca un único candidato, con color válido/inválido. El servidor sigue validando destino, ocupación, fase, pertenencia y capacidad.

Ratón mantiene el drag nativo. Un adaptador de Pointer Events ofrece touch/pen con umbral de movimiento, limpieza al cancelar/perder foco y supresión del clic posterior. Reutiliza geometría y comandos. Las fuentes pendientes no pueden arrastrarse. No se afirma validación física de touch/pen: este equipo no proporciona un dispositivo táctil controlable en la campaña.

La comprobación del elemento superior impide que un gesto touch terminado sobre tienda, inspector o portal atraviese el HUD y se aplique al canvas que ocupa el fondo. Esta protección se añadió en la revisión final y se incluyó en el commit del gate definitivo; las capturas anteriores a ella verifican el camino de ratón.

## 6. Barra de receta

Vista previa antes de confirmar: dos iconos de componentes, símbolos +/=, icono y nombre del resultado, disponibilidad y motivo de rechazo. Usa el catálogo efectivo y `ItemIcon`. No captura eventos del destino y desaparece al salir/terminar el arrastre. También se puede enfocar el segundo componente con teclado y confirmar con Intro.

La fabricación se envía al servidor; el cliente no crea el resultado de forma optimista. Los cuatro objetos bloqueados siguen bloqueados y no consumen componentes.

## 7. Sinergias y retratos: aclaraciones incorporadas

Los personajes aparecen **al final del tooltip de descripción** de cada sinergia. No se añaden filas permanentes al lateral. El tooltip se abre al pasar el cursor o enfocar y permite fijarlo mediante clic para consultar personajes.

DOLEA, VARGAS, JARAMILLO y FLORIN usan sus splash arts propios existentes, recortados mediante presentación CSS para ampliar el rostro sin deformar la proporción ni modificar los archivos originales. Cada retrato tiene el nombre debajo. No se utiliza el muñeco provisional ni un símbolo como retrato. Los otros 30 muestran nombre y «Sin retrato»; no se generan imágenes nuevas.

Verde indica desplegado; oro, banquillo; atenuado, no poseído. Hover, foco y clic muestran nombre, coste, rol, tipo principal de daño y estado. Para los provisionales se indica especialización pendiente y daño sin definir. El roster real decide las pertenencias. Orden, umbrales y efectos de sinergias permanecen intactos. El portal tiene límites de pantalla y overflow interno.

## 8. Cámara

Zoom de presentación 80–180 %, pasos de 10 %, botones +/−/restablecer, teclado +/−/0 al enfocar la arena y Ctrl+rueda delimitado al canvas. El zoom se centra en la arena; no hay anclaje al cursor ni pinch.

El encuadre base y la proyección se calculan antes del multiplicador de cámara. La calibración conserva su encuadre. No cambia coordenadas autoritativas, tamaño del HUD ni resultado del combate. Los cambios de fase no recrean la cámara. Arena de pruebas/replays usa los mismos límites y controles. Se verificó reproducción ×1 y ×2 con 110 % y colocación desde banquillo con 110/120 %.

## 9. Evidencia visual

Capturas finales y métricas en `artifacts/p12f/` (artefactos locales ignorados por Git):

- `portraits-final.png`: rostros DOLEA/FLORIN y fallback nominal Cosmin al final de la descripción.
- `final-1280.png`, `final-1440.png`, `final-1920.png`, `final-2560.png`, `final-3840.png`: tooltip y cinco ofertas simultáneas; `layout-final.json` confirma los tamaños reales, sin scroll vertical y rail de objetos de 112 px.
- `recipe-combat.png`, `combat-buy-autocraft.png`, `combat-equip-new-unit-zoom.png`: campaña de dos clientes.
- `ambiguous-drop.png`, `bench-to-board-zoom120.png`: rechazo conservando origen y despliegue con zoom.
- `removers-x2.png`, `removers-x1.png`: stock y consumo.
- `four-client-combat-equipped.png`, `four-client-deployed-rejection.png`: equipo confirmado y motivo explícito de denegación.
- `replay-x1-zoom.png`, `replay-x2-zoom.png`: cámara y velocidades.
- `final-2-client.png`, `final-4-Vargas.png`, `final-4-Florin.png`, `final-4-Nora.png`, `final-4-Alex.png`: cierres de partida.

Las capturas `initial-*` son anteriores a las aclaraciones del usuario; no representan el diseño final. La primera medición de cinco tamaños se descartó porque el override afectaba a otra pestaña; `layout-final.json` contiene la repetición con dimensiones efectivamente comprobadas.

## 10. Campaña multicliente

Servidor loopback de laboratorio 2592 y control 2593; UI 4188. Identidades sintéticas, sin Supabase ni cuentas remotas. Dos clientes y luego cuatro pestañas reales usan el flujo normal de crear sala, unirse, listo e iniciar. La llegada de participantes invalida correctamente los listos anteriores.

El fixture prepara la formación y entrega componentes mediante APIs de dominio. Extiende las fases sin alterar el tiempo transcurrido para permitir inspecciones, fuerza transiciones conservando la simulación y acerca legalmente la vida a eliminación para comprobar el final. Es una campaña controlada, no una partida con tiempos naturales. No se importa desde la entrada de producción.

Verificados: removedor inicial y premio, ×2→×1, componentes idénticos separados, compra/fabricación/equipo durante combate, rechazo de desplegado, destino ambiguo, despliegue desde banquillo, consulta de receta y retratos, zoom, recuperación al reconectar y pantalla final. Dos clientes verifican además combinación automática de un componente sobre unidad; las pruebas SDK repiten mecánicas con 2 y 4 conexiones, persistence codec y reintentos.

La recarga de laboratorio exige pulsar de nuevo la identidad sintética; después recupera inventario y formación por el flujo de recuperación normal. La primera campaña de dos pestañas incluyó HMR durante implementación y caducidad de su identidad temporal. La campaña posterior de cuatro clientes y el replay muestran cero errores de consola capturados. La velocidad multijugador sigue gobernada por autoridad; ×1/×2 se comprueba en el replay local.

Trazas: `browser-interactions.jsonl` registra eventos reales de entrada sin credenciales; `campaign-receipts.json` guarda acciones aceptadas de servidor e inventarios; `browser-final-clients.json` conserva clasificación y errores de los cuatro clientes. Algunos arrastres rápidos del automatizador no generaron drop sobre destinos pequeños y distantes; se verificó la alternativa por selección accesible sin atribuir ese hecho al juego.

## 11. Validación

Node 24.22.1, pnpm del proyecto y configuración serial existente del runner. No se relajan aserciones, cobertura ni límites de rendimiento.

La primera tentativa coincidió con los clientes visuales abiertos y falló el presupuesto de reproducción; se interrumpió y no se cuenta como gate aprobado. Se observó carga externa de CPU, pero no se atribuye a un único proceso una causa que no se ha aislado. Se cerraron únicamente los clientes/servidores propios del laboratorio. Otra ejecución se interrumpió al añadir la protección touch sobre HUD; tampoco cuenta como validación final.

El primer gate completo terminó con 1792 pruebas correctas y dos fallos. Ambos se investigaron:

1. `abilitiesIntegration.test.ts` esperaba dos `role="tooltip"`. La sinergia ahora es un popover interactivo con `role="region"` para permitir foco y consulta de sus miembros. Se actualiza esa aserción; se conservan la cantidad, los textos, `aria-describedby`, las reglas de recuento y la exclusión del banquillo.
2. `p12d-network.test.ts` esperaba final tras exactamente tres transiciones. La instrumentación registra que su participante bajado a 1 HP gana la ronda siguiente: termina legítimamente en resolución, no en final. `DurableMatch` restaura el RNG persistido; el callback de semilla del constructor no fija los combates después de cada restore. El arnés ahora contempla como máximo dos rondas adicionales y vuelve a acercar al perdedor actual a eliminación solo en resolución. Conserva el timeout de 5000 ms, añade una aserción explícita de final y mantiene compra, venta, input congelado, reconnect, resultado y recuperación final. No se toca la persistencia ni el simulador para ajustar el resultado de una prueba.

Regresiones conjuntas tras la corrección: 3 archivos, 13 pruebas correctas (`regressions-final.log`). La traza diagnóstica temporal se retiró del árbol de trabajo; sus salidas quedan ignoradas en `artifacts/p12f/diagnose-p12d-*.log`.

La siguiente ejecución completa encontró además una carrera de preparación en tres pruebas SIGKILL: el primer snapshot puede seguir en `not_started` mientras el start gate autenticado confirma su transacción. La sonda devuelve explícitamente `wrong-phase; not_started`. Las pruebas P11K/P12F ahora esperan el snapshot de preparación confirmado antes de preparar objetos o adelantar fases. Se mantienen los bloqueos SQL reales, SIGKILL antes/después de commit, límites de tiempo y aserciones de identidad, atomicidad y reintento. Las tres regresiones juntas pasan en `start-gate-regressions.log`.

En esa ejecución se suspendió el Mac: el muestreador independiente presenta huecos de 245,61 y 41,51 segundos, corroborados por el registro de energía (Idle Sleep y Maintenance Sleep). Coinciden con el timeout de la campaña histórica de tres clientes y el de importación de sprites; el siguiente caso de cuatro clientes recibe la sala sin cerrar del caso interrumpido. No se ampliaron sus límites ni se alteraron esos escenarios. Los diagnósticos focalizados lanzados después de terminar el archivo SIGKILL no convierten esa ejecución en un gate válido; la repetición definitiva es secuencial, sin campañas ni diagnósticos concurrentes y con `caffeinate -i` limitado al proceso de validación. La aserción de energía se libera al terminar, sin cambios permanentes del sistema. Evidencia: `suspension-diagnostic.json` y muestreo `process-p12f-gate.jsonl`.

**Gate definitivo correcto**, sobre `68ba9c3df565207aac4fd681a94a508c187cc984`:

| Comprobación          | Resultado                                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`          | Código de salida 0; TypeScript, ESLint, suite y builds públicos correctos                                              |
| Suite completa        | 145 archivos correctos, 1794 pruebas correctas, cero fallos; un caso opt-in omitido por diseño                         |
| PostgreSQL / SIGKILL  | 28 pruebas correctas en el archivo de crash, incluidas recompensas P12F y fabricación/equipo antes/después de commit   |
| HTTPS/WSS local       | Campañas y rechazo TLS no confiable correctos dentro de la suite                                                       |
| Reproducción equipada | 240 muestras, p95 7,35 ms; límite conservado 16,7 ms                                                                   |
| Estrés 7v7            | 1,63 s para el caso completo; límite conservado 5000 ms; simulación 408 ms                                             |
| Build LOCAL           | Correcto, incluido el circuito local de referencias                                                                    |
| `verify:public`       | Correcto; sin controlador DEV, panel, esquema de comandos DEV ni código de almacenamiento aislado en el bundle público |
| `verify:railway`      | Correcto, únicamente inspección local de IaC; sin operaciones de proveedor                                             |
| Lifecycle opt-in      | Ejecutado aparte: una prueba correcta, cero fallos; arranque y cierre de hijos propios, rechazo de puerto ocupado      |
| `git diff --check`    | Correcto                                                                                                               |

Duración de la suite: 680,32 s. Muestreo final sin pausas de suspensión: hueco máximo 2,18 s frente a su intervalo de 2 s. Se conservan los avisos preexistentes del bundler sobre chunks grandes y de Vitest sobre el futuro cargador nativo; no son errores de compilación.

Salidas: `artifacts/p12a-r2/p12f-supervised.log`, `artifacts/p12f/final-metrics.json`, `build-local-final.log`, `verify-public-final.log`, `verify-railway-final.log`, `lifecycle-final.log`. La auditoría de release se repite después del commit documental final; no se hace pasar una repetición focalizada por una suite completa.

## 12. Compatibilidad

`artifacts/p12f/compatibility.json` compara los **18 fingerprints históricos**, todos sin cambios, e incorpora:

`2efe29720393226ccefb0c26f74ebcbb3f2733cc8b0a8e6cba7e831e5fb40adc`

La nueva versión conserva 34 personajes (30 provisionales), ocho componentes, 36 recetas, 32 objetos disponibles y cuatro bloqueados. Snapshot, codec y exportación reconocen el nuevo fingerprint; históricos resuelven sus propias políticas. Pruebas durables de final, overtime, desconexión y restore cubren P12D y P12F para 2/3/4 jugadores.

## 13. Git y alcance

Commits exclusivamente locales. Sin push, publicación, cambios en otros worktrees, nuevas migraciones ni integración de P13. No se modifica Supabase remoto. Mar de Cristal, splash arts propios y Festival Pop × Neon Playground se conservan. El informe se añade después del gate como documentación, sin cambios de aplicación.

El enlace temporal `TFPeru` utilizado por las pruebas se retiró después de la validación; las fuentes originales se leyeron sin modificarlas. Los artefactos y referencias privadas siguen ignorados por Git. Los servidores de la campaña 2592/2593/4188 y sus pestañas se cerraron antes de los gates. Se deja únicamente la web de revisión en 4173, sin reactivar el backend remoto.

## 14. Railway

Permanece apagado, cero deployments activos según consulta final. No se ejecuta reactivación, build remoto, despliegue ni modificación de variables. El diagnóstico es de solo lectura y no imprime secretos. La nueva funcionalidad no está online.

## 15. Límites y próximos pasos

- Faltan retratos reales de 30 personajes; el fallback es explícito y nominal.
- No se ha validado con hardware touch/pen ni un gesto físico Ctrl+rueda; el adaptador y los controles de teclado/rueda están implementados. La campaña automatizada demuestra botones y geometría, no una prueba física de todos los dispositivos.
- No se afirma contenido servido del último contenedor apagado ni una causa de caché. Sigue pendiente resolver permisos de distribución antes de publicar referencias oficiales.
- No hay nuevos efectos para los cuatro objetos bloqueados ni roles inventados.
- La publicación de P12F requiere autorización posterior. No se reactiva Railway al concluir.
- Impeccable informó deriva de su contexto de diseño (ruta de build sin definir y referencia de superficie huérfana). Se preservó el diseño existente; no se reparó su configuración fuera del alcance.
