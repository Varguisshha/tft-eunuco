# TFT EUNUCO — F0-P12D: correcciones de partida real

Fecha: 29 de octubre de 2026. Trabajo LOCAL; sin push, despliegue ni escrituras en Supabase remoto. Railway permanece apagado.

## 1. Base Git y rama

- Base pública: `release/p12b-public-safe`, `623ad92d16545b7118d3d8e807ac375253df6796`.
- Rama aislada: `codex/f0-p12d-real-match-fixes`.
- Worktree: `/Users/vargas/.codex/worktrees/p12d-real-match-fixes/TFT EUNUCO`.
- Implementación: `636afc13da6e3ca3716a2af2674d638d587ce666`.
- Regresión de desconexión antes del primer snapshot: `adac2eb`.
- Instancias independientes de consumibles: `c7a015005bcbf2553d6704e18080183c00156f8d`, código sometido al gate final.
- El informe se añade después en un commit exclusivamente documental. No se han reconstruido ramas saneadas ni incorporado genealogías LOCAL.

## 2. Incidente de conexión: evidencia y límites

Se consultaron los logs del deployment ya detenido `d49e7671-2463-4737-a2da-97a206dcf706`, sin encender Railway. Se realizó una lectura acotada y `read_only` del checkpoint de la sesión, conservada fuera de Git con permisos privados. No se ejecutaron acciones sobre esa partida.

Secuencia registrada en UTC:

| Evento | Hora |
|---|---|
| Primer `storage_failed` | 12:03:15.322 |
| Segundo `storage_failed` | 12:03:21.509 |
| Tercer `storage_failed` | 12:03:28.686 |
| `fatal` | 12:03:32.411 |
| Restauración de una partida | 12:04:36.295 |
| Nuevo `started` | 12:04:37.271 |

Hubo 967 checkpoints antes del evento fatal y siete tras el reinicio. La latencia máxima registrada antes del fallo fue 4.422 ms, próxima al timeout de transporte de 5.000 ms. Esto demuestra una incidencia del servidor y sus dependencias; no justifica atribuirla a Internet del jugador.

El checkpoint recuperado está **finalizado en ronda 14**, con dos posiciones válidas, un superviviente con 89 de vida y un eliminado con cero. Se verificaron localmente su decodificación, restauración, conservación y round-trip de compresión. El resultado sobrevivió al reinicio.

**Límite de evidencia:** la telemetría antigua solo conservaba `fatal` y `storage_failed`, sin causa interna. No permite distinguir de forma concluyente timeout de RPC, rechazo de lease u otra excepción. No se afirma haber demostrado una excepción de liquidación, un OOM o un defecto del algoritmo de clones en aquella sesión.

Defectos demostrados en laboratorio:

- Un error transitorio de transporte en la renovación del lease provocaba un cierre inmediato, aunque su plazo local todavía fuese válido.
- Cinco reintentos de reconexión cubrían aproximadamente 20–27 segundos; el reinicio observado tardó unos 65 segundos.
- La ausencia temporal de una sala se clasificaba como definitiva, impidiendo esperar a su restauración.

Evidencia: `artifacts/p12d/session-timeline.json`, `checkpoint-inspection.json` y copia privada de los logs. El informe no contiene IDs de usuarios, credenciales ni contenido privado de sus inventarios.

## 3. Cierre de partida y recuperación

- La renovación tolera fallos de transporte únicamente dentro del plazo local ya concedido: no prolonga el vencimiento ni vuelve a adquirir autoridad. Un rechazo explícito sigue deteniendo la autoridad inmediatamente.
- Un watchdog invalida una renovación bloqueada; los asserts locales y el fence SQL continúan comprobando la autoridad. Una respuesta tardía no revive una autoridad vencida o liberada. Se mantienen 40 segundos de plazo local y 60 segundos de fence en base de datos.
- La recuperación usa doce intentos acotados, con el mismo backoff y credenciales verificadas; puede cubrir el reinicio registrado. La sala temporalmente ausente se reintenta. Caducidad, falta de pertenencia y conexión sustituida siguen siendo terminales.
- Una vez recibido el resultado final, el cliente lo conserva aunque se cierre el socket y no inicia una recuperación innecesaria. También se prueba una desconexión antes de recibir el primer snapshot.
- Se añaden causas numéricas/booleanas seguras para fallos de persistencia y eventos fatales. No se serializan respuestas del proveedor, excepciones, tokens o peticiones en los logs.
- No se han alterado el cálculo de daño, eliminaciones, puestos, recompensas, overtime, resolución de empates ni retención histórica.

Pruebas: dos clientes SDK reales con `RemoteCoordinator` y permisos del HUD contra una sala durable; reconexión en resolución y después del final; finales durables de 2/3/4 jugadores; rechazo de otra autoridad, vencimiento, RPC bloqueada y respuestas tardías. El gate incluye PostgreSQL y SIGKILL antes/después del commit, con una variante P12D de tres participantes y clon.

## 4. Compra y venta durante combate

Las reglas P11C/P11H/P11K están presentes en P12C, tanto en cliente como en servidor. El checkpoint real conserva una compra y una venta **aceptadas en fase de combate**. No se ha reproducido una prohibición general del servidor ni una ausencia de esas reglas en el bundle.

Se verificaron por sockets reales y navegador:

- Compra con oro y espacio: entra al banquillo.
- Venta de una unidad propia del banquillo: confirma el ingreso y devuelve copias.
- Venta de una unidad desplegada: rechazada.
- El input y replay congelados permanecen idénticos.
- Fusiones de banquillo y diferidas siguen las reglas existentes.
- Confirmación, rechazo, secuencia y recuperación se conservan después de reconectar.

El HUD ahora muestra motivos concretos de indisponibilidad: conexión, persistencia pausada, confirmación pendiente, transición de ronda o unidad no vendible. Los rechazos recibidos siguen mostrando el motivo del servidor. No se han abierto acciones de preparación durante combate.

**Límite:** no existe una traza del navegador de la partida original que permita atribuir el bloqueo intermitente a un estado concreto. La recuperación ampliada y los motivos visibles evitan ocultar el siguiente caso, pero no se presenta una causa inventada como demostrada.

## 5. Política de bloqueo de tienda

Nueva configuración `P12D_ECONOMY_CONFIG`, derivada de P12B, con `shopLockPolicy: consume-on-auto-refresh-1`.

En el siguiente refresco automático se consulta primero la reserva: conserva las cinco ofertas, incluidos huecos comprados; después consume el bloqueo. El siguiente refresco automático renueva normalmente, salvo que el jugador vuelva a bloquear. Un refresco manual permitido mantiene la reserva pendiente; renovar durante combate continúa deshabilitado.

La operación ocurre en la transición autoritativa y se persiste con la misma transacción. Se prueban ofertas completas, compra parcial, tienda vacía, reservas consecutivas, refresco manual y restauración del estado consumido. Las partidas P12B o anteriores conservan su política original.

## 6. Inventario individualizado

Cada componente, objeto completo y recompensa pendiente se renderiza con su ID real, sin agrupar por definición ni expandir cantidades ficticias. También cada removedor disponible tiene su casilla e identidad propias; el marcador vacío no representa una emisión.

Se mantienen claves estables por instancia, selección, combinación entre dos componentes concretos, equipamiento, drag-and-drop, estados pendientes y consumo del removedor confirmado por el servidor. Se conserva la barra de 112 px, dos columnas y scroll interno sin barra visible, con navegación por teclado. No se introduce virtualización para estas cantidades.

Regresiones: dos espadones, tres arcos, dos objetos completos iguales, desbordamiento pendiente, selección del segundo duplicado y dos consumibles distintos. El navegador confirmó el equipamiento de un espadón concreto y su devolución mediante removedor durante combate, sin consumir el otro espadón.

## 7. Representación de FLORIN

La presentación usa únicamente snapshots y eventos `unit_presence` ya liberados por la autoridad.

- Salida: desplazamiento y desvanecimiento de 450 ms hacia el borde.
- Ausencia: indicador discreto de recuperación y porcentaje de vida; el sprite deja libre el espacio visual de combate.
- Regreso: interpolación de 400 ms desde el borde hasta la posición autoritativa de retorno.
- Movimiento reducido: transición de opacidad de 120 ms, sin recorrido espacial.
- Reproducción y búsqueda temporal: muestreo puro, compatible con ×1/×2 y sin consultar eventos futuros.

No se muestra un tiempo de regreso ficticio: depende de curación y supervivencia de aliados. No se modifican inmunidad, daño, curación, celda de retorno, assets ni reglas de la pasiva. Se reutilizan los sprites de caminar existentes; no se inventan fotogramas.

Evidencia: `florin-away.png`, `three-combat-c.png` y `recoveryVisual.test.ts`. Las pruebas comprueban inicio, final, movimiento reducido, velocidades y ausencia de mutaciones del replay.

## 8. Probabilidades de tienda

Cinco columnas con coste, porcentaje tabular exacto, color semántico y contraste sobre la superficie existente. Los porcentajes proceden de `levelRule`; se actualizan al subir de nivel y no cambian la tabla ni los sorteos.

Los costes 4 y 5 tienen distinción discontinua y aviso de ausencia de personajes en este catálogo. El texto accesible y los tooltips distinguen probabilidad teórica de disponibilidad. El display permanece junto a la tienda.

Se limitó la fila de la tienda para impedir que el display más alto expandiese las cartas fuera del dock. Las cinco ofertas caben completas sin scroll exterior en las cinco resoluciones solicitadas. Se mantienen arena, splash arts, nueve plazas y Festival Pop × Neon Playground.

## 9. Iconos TFT: distribución intencional

No es un fallo de carga de Railway.

- LOCAL habilita el tema `tft-reference` mediante `__DEVTOOLS__` y usa los 44 archivos del pack local, con fallback al arte EUNUCO.
- La release pública compila sin esa capacidad. El build elimina `assets/items/tft-reference`; la auditoría de historial rechaza rutas o hashes de esos archivos.
- Inventario, equipamiento, recetas, tooltips y fichas reutilizan `ItemIcon` y el mismo resolver. No se elige el arte solamente por el nombre visible: se valida la asociación de definición, receta e ID del contenido.
- Los manifiestos de correspondencia y procedencia no son los binarios oficiales. Los recursos EUNUCO continúan disponibles en público.

Opciones: mantener esta separación; continuar la revisión de los oficiales solo en LOCAL; o preparar una distribución distinta una vez resueltos y autorizados los permisos correspondientes. No se han insertado los oficiales en GitHub ni Railway ni se ha iniciado una gestión de permisos.

## 10. Evidencias visuales

Carpeta local, excluida de Git y del build: `artifacts/p12d/`.

| Evidencia | Resultado observado |
|---|---|
| `hud-1280.png` | 1280×720, cinco ofertas completas e inventario independiente |
| `hud-1440.png` | 1440×900, tercer cliente y cinco ofertas |
| `hud-1920.png` | 1920×1080, HUD acotado y arena dominante |
| `hud-2560.png` | 2560×1440, escala limitada del HUD |
| `hud-3840.png` | 3840×2160, el HUD no crece con todo el monitor |
| `layout-checks.json` | Altura del documento igual al viewport en los cinco tamaños |
| `combat-purchase.png`, `combat-sale.png` | Compra/venta confirmadas durante combate |
| `individual-equipment.png`, `combat-remover.png` | Una instancia equipada y devuelta |
| `florin-away.png` | Recuperación fuera del hexágono con indicador de vida |
| `three-combat-*.png` | Duelo humano y clon simultáneos |
| `final-two-*.png`, `final-reconnected.png` | Final de dos y recuperación |
| `final-three-*.png` | Tres posiciones y un superviviente |
| `final-four-*.png`, `four-final-tables.json` | Mismo final en los cuatro clientes |

Las capturas de campaña preceden a la ampliación final que individualiza también los consumibles; esa ampliación tiene su regresión de renderizado y selección específica. No se presentan como capturas nuevas de una variante que no muestran.

El detector visual registró avisos sobre tamaños compactos de 13/15 px y estilos de texto de Phaser ya existentes. Se revisaron manualmente las cinco resoluciones; no se cambió la dirección visual ni se amplió el encargo para reparar metadatos antiguos de la skill.

## 11. Campaña multicliente

Servidor y entradas explícitos de laboratorio, vinculados únicamente a loopback: `p12d-visual-fixture.ts`, `p12d-lab.html` y `p12dLab.tsx`. No se importan desde la entrada pública ni registran accesos en producción. Usan cuatro identidades sintéticas, sin crear cuentas reales ni enviar correos.

- Dos navegadores: creación/unión por código, preparación, compras, combate, venta, bloqueo, avance, reparto periódico, final compartido y reconexión al resultado.
- Tres navegadores: sala completa, clon al 80 %, duelos simultáneos, selección/equipamiento de instancia, removedor en banquillo durante combate y final con un superviviente.
- Cuatro navegadores: sala completa y cuatro conexiones, compra/venta en combate, bloqueo consumido, eliminaciones simultáneas, transición a menos participantes y mismo final en los cuatro.
- Campaña final de cuatro con código fijado: cero errores de consola desde su inicio; evidencia `four-stable-errors.json`.

Para acelerar finales se utilizaron exclusivamente controles del laboratorio: avance de fase y reducción de vida mediante un ledger válido de un perdedor. Los replays y liquidaciones posteriores se ejecutaron por el motor real. No se aplicaron a partidas remotas ni se copiaron esos controles al servidor público.

Las primeras iteraciones en Vite registraron avisos de hot reload de la entrada de laboratorio y un objeto de sesión sintética incompleto, corregido antes de la campaña estable. Se conservan esas trazas separadas; no se atribuyen al juego publicado. Se recargaron los clientes tras fijar el código. El final de tres se validó recuperándolo; el de cuatro llegó directamente a todos los clientes.

## 12. Pruebas y quality gates

Gate completo ejecutado sobre `c7a015005bcbf2553d6704e18080183c00156f8d`: **PASS**.

| Control | Resultado |
|---|---|
| `pnpm check` | TypeScript, ESLint, suite completa y builds públicos/servidor correctos |
| Suite completa | 141 archivos aprobados; 1.774 pruebas aprobadas; una prueba opt-in omitida en esta ejecución |
| Duración de la suite | 536,89 segundos |
| PostgreSQL / HTTPS / WSS / SIGKILL | Ejecutados dentro del gate con las variables de laboratorio habilitadas; correctos |
| `pnpm build:local` | Correcto |
| Lifecycle opt-in separado | Un archivo y una prueba aprobados, 1,32 segundos |
| `verify:public` | Correcto; distribución sin herramientas DEV ni pack TFT |
| `verify:railway` | Correcto; configuración de recursos y despliegue conservada |
| `verify:release` | 1.081 blobs revisados en el commit de código; cero hallazgos |
| `git diff --check` | Correcto |
| Fingerprints anteriores | Los 17 conservados sin cambios |

Logs completos: `artifacts/p12d/full-gate.log`, `build-local.log`, `lifecycle.log`, `verify-public-final.log`, `verify-railway-final.log` y `verify-release-final.log`. La prueba opt-in omitida en la suite se ejecutó expresamente después; no queda pendiente por esa razón.

El build conserva avisos conocidos de tamaño de chunks y compatibilidad futura del cargador de configuración Vite. No son errores de compilación y no se han silenciado.

Los primeros intentos de gate interrumpidos no cuentan como aprobados. Una ejecución completa encontró seis fallos por fixtures ausentes: dos del importador de sprites y cuatro del proxy TLS. Se incorporaron copias locales de solo los originales de prueba que faltaban y los certificados del laboratorio, siempre fuera de Git. También se construyó el cliente público que sirve el proxy. No se cambiaron aserciones, umbrales ni tests para ocultar esos fallos.

La raíz de arte TFT oficial se proporcionó por variable de proceso para las pruebas de procedencia; los binarios no se incorporaron al historial publicable. PostgreSQL se limitó a las tres bases desechables de loopback en el puerto 55439.

Se mantienen los umbrales existentes de 5.000 ms y 16,7 ms y la planificación serial de R2. No se ha suprimido cobertura.

## 13. Compatibilidad histórica y seguridad

- Los 17 fingerprints anteriores, incluido P12B, son idénticos a la release de base.
- Nuevo fingerprint P12D: `f72149712af1870e65b35765e34b7c063b947e2f96cd469412fb68d8219bc02f`.
- Se conserva P12B: `0948310d6132a43cf03607ab356c12120357473863ff75c87cdde6fe7b45e72f`.
- 34 personajes; cuatro completos y 30 provisionales. Ocho componentes, 36 recetas, 32 objetos disponibles y cuatro bloqueados.
- Removedor inicial y periodicidad P12B, clones al 80 %, progresión, economía, pool y recompensas sin cambios.
- El nuevo fingerprint se reconoce en exportación, restauración y codec comprimido. No se reinterpretan ni migran snapshots antiguos.
- No se han modificado Auth, SMTP, usuarios, contraseñas, migraciones, RLS o permisos de Supabase. Seguridad ES256 y autoridad única conservadas.
- La consulta remota fue solo de lectura. El material privado de diagnóstico permanece fuera de Git; no se han impreso secretos.
- Ramas y arte LOCAL conservados. GitHub sigue en P12C; Railway sigue `REMOVED`, sin nuevo despliegue ni recursos.

## 14. Limitaciones

1. No se puede reconstruir la causa interna exacta del `fatal` antiguo con una telemetría que no la registró. Se documentan los hechos y las correcciones demostradas, sin declarar una causalidad no probada.
2. No se reprodujo el bloqueo intermitente original de compra/venta. Hay confirmaciones reales en el checkpoint, regresiones por red y navegador y motivos de bloqueo más claros.
3. Las pruebas de HTTPS/WSS y reinicio se hacen en laboratorio equivalente. No se ha abierto Railway para probar esta versión con usuarios reales.
4. La lectura de progreso de FLORIN muestra vida, no una cuenta atrás de regreso que el motor no puede garantizar.
5. Los cuatro objetos bloqueados y los personajes provisionales siguen pendientes de sus fases correspondientes.
6. La distribución pública de iconos oficiales TFT sigue fuera de alcance y sin autorización nueva.
7. Las herramientas de laboratorio son de desarrollo; tras editar sus entradas en Vite debe recargarse el cliente. El código público no incluye esas entradas.

## 15. Commit local y estado final

Código validado: `c7a015005bcbf2553d6704e18080183c00156f8d`, sobre los commits `636afc1` y `adac2eb`. El commit documental posterior no modifica código, assets ni reglas.

No se ha hecho push ni desplegado. No se inicia P13. Para una futura publicación deberá autorizarse y ejecutarse una fase de release sobre esta rama saneada; el servicio remoto permanece apagado.
