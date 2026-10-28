# F0-P11G — Inventario, banquillo, fusiones y economía local

## Alcance y base

Base `379be90239458cfd899e0af43535fe308d11f459`, rama `codex/f0-p11-local-corrections`. Trabajo exclusivamente local: sin push, sin Railway, sin Supabase remoto. Catálogo económico nuevo `f0p11g-1`, combate conservado `f0p11c-1`, objetos `f0p11b-18.5-1`. No se cambia el roster, sus cifras ni las habilidades.

## Inventario y banquillo

La barra pasa de 58 a 112 px: dos columnas de 44 px, cantidades visibles, inventario y pendientes en el mismo recorrido. La scrollbar se oculta visualmente; el contenedor conserva overflow, rueda, trackpad, foco y teclado. Flechas recorren la cuadrícula, Inicio/Fin saltan a sus extremos. No hay pestañas. Los detalles permanecen fuera del área que se desplaza.

Nueve posiciones. El sprite pasa de 69 a 85 unidades de alto (+23,2 %) y de 80 a 98 de ancho (+22,5 %). La bandeja gana altura para reservar una franja a estrellas y los tres iconos de equipamiento. Imagen contenida, proporciones conservadas y anclaje inferior estable entre fotogramas. No se estrechan las cinco cartas.

## Fusiones

`purchasePreviews` ejecuta sobre una copia la misma transacción que valida una compra. Incluye tablero, banquillo, estrellas, equipamiento, espacio, oro, reservas y cascadas; no suma unidades rivales. En multijugador el servidor transmite únicamente las previsualizaciones propias asociadas a cada `offerId`. El cliente no reconstruye el pool privado.

El indicador se oculta durante restricciones o comandos pendientes. Dos o tres estrellas distinguen los ascensos sin depender del color. El pulso se desactiva con movimiento reducido. La confirmación procede de `lastUpgrades` confirmado, no de un clic optimista.

## Oro de cierre

Recibo opcional versionado `f0p11g-1`: identidad de partida/ronda/liquidación y desglose de cantidades realmente acreditadas por base, interés, victoria y racha. Los importes respetan el límite de oro; no se obtiene el premio restando saldos. Las partidas históricas no reciben el nuevo campo.

Panel central no modal, `pointer-events: none`, anuncio accesible y retirada a los 6,5 segundos. Las identidades consumidas se conservan de forma acotada (256) en almacenamiento local, con alternativa en memoria. Montar una partida restaurada consume su recibo actual sin reproducir el aviso. No se almacenan credenciales ni datos de cuenta en ese registro.

## Probabilidades y pool

Tabla de referencia extraída mediante `scripts/economy/import_shop_odds.py`; procedencia, SHA256, ruta del set y diez filas constan en `packages/game-data/src/reference/tft-18.5-shop.json`.

- Datos numéricos del cliente de Riot extraídos de CommunityDragon, fichero versionado 16.21, nodo `Maps/Shipping/Map22/Sets/TFTSet18`, referencia de tienda `{1ee21754}`. Se excluye la fila 11.
- [Parche oficial 16.1](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-16-1/) confirma las modificaciones de niveles 8/9.
- [Parche oficial 17.1](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-17-1/) confirma nivel 7.
- [Parche oficial 18.5](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-18-5/) no publica un cambio posterior de estas probabilidades.

Las diez filas coinciden con las solicitadas y tienen una prueba exacta. El juego conserva niveles 2–7; 1 y 8–10 se muestran como referencia. El pool sigue en 30/25/18/10/9 copias según coste.

Cada hueco sortea primero entre los cinco costes nominales; después elige uniformemente entre copias disponibles del coste. Ambos sorteos usan rechazo de valores fuera del múltiplo válido de 2^32, sin sesgo de módulo. Los streams son deterministas y el servidor reserva cada copia.

**Fallback explícito:** coste sin catálogo o agotado → hueco vacío; no se vuelve a sortear ni se redistribuye peso. El roster de 34 personajes solo contiene costes 1–3. En nivel 5 existe al menos un 2 % de hueco vacío, en 6 un 5 % y en 7 un 11 %, antes de agotamiento adicional. Las cinco posiciones permanecen visibles y explican la causa del hueco. La tabla abierta desde el nivel distingue probabilidades nominales de disponibilidad real.

Se encontró y corrigió un defecto de cierre durante la validación: eliminar al jugador liberaba las reservas de tienda sin actualizar su registro de ofertas. El nuevo estado `released` mantiene coherencia al devolver el pool y permite restaurar la clasificación definitiva. Una regresión recorre partidas de 2/3/4 jugadores hasta el final.

## Causa del inventario vacío y laboratorio

La Arena DEV antigua utilizaba `LocalMatchCoordinator`. El reparto P8D vivía en `AuthoritativeMatch`, no en la liquidación local: pasar por ronda 11 no había ejecutado ese distribuidor. No era un premio oculto ni una cola pendiente en la interfaz.

El planificador puro se comparte ahora entre servidor y núcleo: mismas identidades SHA256, semillas separadas, cantidad común de 2 o 3 y tipos independientes por participante. El servidor conserva los resultados históricos bit a bit. Se añade una dependencia portable y fijada, `@noble/hashes` 2.0.1, para SHA256 compartido; no se modifica criptografía de autenticación.

Solo el catálogo local nuevo activa `localDrops`, journal `f0p11g-local-1`. En cada cierre elegible 3/6/9… entrega al inventario humano, desborda a pendientes y guarda premio y journal en el mismo borrador antes de publicar. Restaurar valida semilla, cobertura de rondas, tipos, instancias y grants; no añade premios retroactivos.

El laboratorio usa el planificador común con propietario humano y rival simulado. Registra exclusivamente lo entregado al humano: no pretende implementar una economía multijugador completa para la IA. La referencia DEV de reloj fijo utiliza 1000 de vida de laboratorio para poder recorrer 3/6/9, sin cambiar estadísticas de personajes ni la configuración competitiva de 100 de vida. En modo Desarrollador: «Laboratorio P11G · reparto 3/6/9», avanzar preparación/combate/resolución. También hay referencias de inventario lleno y fusión 2/3 estrellas.

Los guardados anteriores conservan catálogo y ausencia de reparto local; hay que crear un laboratorio P11G nuevo para probar esta regla. La partida acaba su reparto al eliminarse cualquiera de los dos participantes locales. No hay regalos competitivos ni concesión automática del removedor.

## Compatibilidad y límites

Se conservan 34 identidades y afiliaciones, Mar de Cristal, cuatro splash arts, Festival Pop × Neon Playground, inventario vertical, removedor, registro local sin invitación, venta del banquillo y bloqueo en combate, estadísticas, recuperación y persistencia. Los seis objetos de P11B pendientes siguen bloqueados. No se afirma fidelidad completa de esos objetos.

El nuevo fingerprint se deriva del hash P11C más configuración, política y referencia G. Los fingerprints históricos no se recalculan con reglas nuevas. No se incorpora trabajo del worktree P10A.

## Validación

Antes de modificar: suite completa con 1581 aprobadas, una omitida opt-in y un fallo de comparación temporal en el fixture SIGKILL de pool a cuatro jugadores. El mismo caso aislado aprobó sin modificar código. Se conserva el resultado original en `artifacts/p11g/baseline.log`; no se presenta como una base verde.

La primera suite G encontró el defecto real de eliminación ya corregido, además de timeouts y colisiones posteriores con un fixture huérfano. Ese proceso se identificó por PID, comando y directorio, y se cerró exclusivamente ese fixture local. No se relajaron límites ni se borraron pruebas. Una repetición TLS posterior sufrió plazos de ejecución; el gate final se repite sin navegador ni supervisor local simultáneos.

### Cierre de los gates

- Suite completa final: **1600 aprobadas, una omitida opt-in; 118 archivos aprobados y uno omitido**, 591,29 s, un worker, sin navegador ni supervisor simultáneos. Incluye PostgreSQL aislado 55439, HTTPS/WSS, SIGKILL, restauración, retención, fencing y fingerprints históricos. `artifacts/p11g/full-tests-final.log`.
- La prueba opcional de lifecycle se ejecutó aparte: **1/1 aprobada**, arranque y parada solo de recursos locales propios. `lifecycle-final.log`.
- Tras la última corrección de presentación se ejecutaron otras **27 pruebas dirigidas**, 4 archivos: núcleo G, servidor G, deduplicación de recibos y Game HUD. `targeted-final.log`.
- TypeScript y ESLint: aprobados. Build público, servidor y build LOCAL: aprobados. `verify:public` confirma exclusión de controlador/panel DEV y almacenamiento aislado; `verify:railway` valida IaC sin operaciones remotas. `git diff --check` aprobado. Los logs `*-final.log` están en `artifacts/p11g`.
- Persiste el aviso conocido del tamaño del chunk Phaser superior a 500 kB; no se amplió ese umbral.

### Navegador y capturas

Chrome real, cinco viewports: **1280×720, 1440×900, 1920×1080, 2560×1440 y 3840×2160**. `artifacts/p11g/visual/metrics.json` registra cinco cartas y nueve plazas, documento igual al viewport, cero botones anidados y cero errores JS. La barra mide 112 px en los cinco tamaños. Rueda y Fin desplazan su contenido con scrollbar oculta.

- `visual/hud-{1280,1440,1920,2560,3840}.png`: composición completa y fusión próxima a 3★.
- `visual/fusion-two.png`, `fusion-confirmed.png`: 2★ y confirmación de cascada real 2→3★.
- `visual/inventory-scroll.png`, `bench-equipment.png`, `pending-round-three.png`: barra llena, dos objetos equipados visibles en banquillo y tres pendientes tras reparto con bolsa llena.
- `visual/odds.png`: diez filas nominales, nivel actual, cap 7 y límites del catálogo.
- `visual/round-{3,6,9}.png`: premios reales y entrega de componentes. Esta ejecución entregó dos por ronda: inventario acumulado 2/4/6; otras semillas/identidades pueden entregar tres. La prueba de bolsa llena obtuvo tres pendientes.
- Victoria de ronda 3: +11, fuentes 4/5/1/1. Victoria de ronda 6: +14, fuentes 5/5/3/1. Derrota de ronda 9: +11, fuentes 5/5/1/0.

`functional.json` confirma aviso no interceptable por `elementFromPoint`, retirada automática, cero avisos repetidos al recuperar DEV, conservación de 31 objetos con tres pendientes, Escape en probabilidades y animación `none` con movimiento reducido. `network/multiplayer.json` registra compra y drag-and-drop con **250 ms de latencia saliente**, 2/3/4 jugadores, y recuperación sin recarga en cuatro. En dos y tres no se repite el corte de conexión; su campo false significa no ejecutado. El instrumento clona los buffers antes de demorarlos para no corromper los paquetes reutilizados del SDK.

La revisión independiente detectó un único problema visual material: un hueco sin catálogo mostraba un check y nombre de una compra anterior. Se corrigió usando el estado autoritativo de la oferta, se recapturó la misma matriz y la revisión final declaró **SHIP, hallazgo resuelto**. Véase `F0_P11G_VISUAL_REVIEW.md` y `P11G_DESIGN_EXTENSION.md`.

### Integridad y estado de entrega

Se comprobaron de nuevo los 66 archivos del worktree P10A: sin diferencias respecto a P11F, mismo HEAD `4e17a218ca93906278f75c38328ca7e929adda64`. No se escribió allí. Los sprites, TFPeru y documentos SEC preexistentes del usuario quedan sin incorporar al commit de esta fase. No se modificaron sus contenidos.

Commit de fase: el commit local titulado `feat(p11g): refine inventory and deterministic economy feedback`; el hash se entrega en el cierre del chat. Las capturas y logs completos permanecen en `artifacts/p11g`, sin incorporar 52 MB de imágenes de diagnóstico al código. No se hizo push, despliegue ni cambio de Supabase. El servidor disponible al terminar es exclusivamente LOCAL en 127.0.0.1:4173.

**F0-P11G validada y cerrada en LOCAL.** Costes 4/5 ausentes, seis efectos de objetos pendientes y guardados antiguos sin reparto local siguen siendo limitaciones explícitas, no equivalencias inventadas.
