# F0-P13T — TFPeru 2, personajes y ¡Me Fuí!

## Base y aislamiento

Base P12J: `d38f18bb8e0c4279c9ac92883942200225f0cb94`.
Rama: `codex/f0-p13t-tftperu2-character-assets`.
Worktree dedicado: `p13t-tftperu2-assets/TFT EUNUCO`.
Implementación: `c82380271de0c24778add226b8c79f7330d357f7`.
Commit de código validado: `3e044abbb177d96aa1fe3441ed6bd89e620e281c` (añade la regresión de anclaje del pack nuevo). El cierre posterior modifica únicamente este informe.

P13B B0/B1 (`88c06fb`) y P13S (`f80e614`) se han inspeccionado sin fusionarlos. Esta fase no incluye sus mecánicas ni inicia P13B B2–B4. No se ha utilizado una genealogía con iconos oficiales TFT. No hay push ni operaciones de Railway o Supabase remoto.

## Inventario real y procedencia

La carpeta suministrada se llama **`TFPeru 2`**, no `TFTPeru 2`. Está dentro del proyecto original y se conserva sin cambios. Una copia LOCAL ignorada permite reproducir el importador. Contiene 90 archivos relevantes: 84 PNG, cinco TXT y un XLSX; seis carpetas de personajes, incluida COSMIN vacía. No hay duplicados binarios entre esos 90 archivos.

`docs/TFTPERU2_INVENTORY.json` registra todos los nombres exactos, tamaños, dimensiones, transparencia y SHA-256. `docs/TFTPERU2_IMPORT_REPORT.json` registra los derivados, recortes, escalas y hashes originales. Ninguna ruta absoluta del ordenador se utiliza como URL de producción.

La correspondencia **Erik → JARAMILLO** ya estaba confirmada por el propietario en la documentación del proyecto del 26/10/2026. No se añade un personaje ERIK ni se altera el roster de 34 identidades. El Excel nuevo es una tabla parcial de afinidades con 18 personajes; no contiene alcance ni estadísticas y no sustituye el catálogo actual de 34.

La tabla cuenta archivos distintos **del paquete nuevo**, no fotogramas repetidos ni fallbacks:

| Personaje        | Nivel  | Idle | Walk | Attack | Death | Proyectil   | Impacto | Splash     | Estado                                                                           |
| ---------------- | ------ | ---: | ---: | -----: | ----: | ----------- | ------- | ---------- | -------------------------------------------------------------------------------- |
| DOLEA            | 1★     |    1 |    0 |      5 |     0 | —           | —       | Compartido | Idle y ataque integrados; resto conserva resolución/fallback del mismo personaje |
| DOLEA            | 2★     |    0 |    0 |      4 |     0 | —           | —       | Compartido | Recursos inventariados; conjunto anterior intacto por alcance del encargo        |
| DOLEA            | 3★     |    0 |    0 |      5 |     0 | —           | —       | Compartido | Recursos inventariados; conjunto anterior intacto                                |
| VARGAS           | 1★     |    0 |    0 |      4 |     0 | —           | —       | Compartido | Poncho nuevo integrado; idle/walk/death son poses estáticas de fallback          |
| VARGAS           | 2★     |    0 |    0 |      5 |     0 | —           | —       | Compartido | Conjunto anterior intacto                                                        |
| VARGAS           | 3★     |    0 |    0 |      0 |     0 | —           | —       | Compartido | Sin carpeta nativa; mantiene fallback histórico 2★                               |
| JARAMILLO (Erik) | 1★     |    0 |    0 |      4 |     0 | Piedra, 1   | Ausente | Compartido | Cuerpo y proyectil separados; impacto gráfico genérico existente                 |
| JARAMILLO (Erik) | 2★     |    0 |    0 |      4 |     0 | Cigarro, 1  | 1       | Compartido | Cuerpo, vuelo e impacto separados                                                |
| JARAMILLO (Erik) | 3★     |    0 |    0 |      4 |     0 | Mochila, 1  | 1       | Compartido | Cuerpo, vuelo e impacto separados                                                |
| PEIBOL           | 1★     |    0 |    0 |      6 |     0 | Teléfono, 1 | 1       | Compartido | Nuevo conjunto visual por estrellas                                              |
| PEIBOL           | 2★     |    0 |    0 |      5 |     0 | Dinero, 1   | 1       | Compartido | Nuevo conjunto visual por estrellas                                              |
| PEIBOL           | 3★     |    0 |    0 |      5 |     0 | Moneda, 1   | 1       | Compartido | Nuevo conjunto visual por estrellas                                              |
| FLORIN           | 1★     |    0 |    0 |      3 |     0 | —           | —       | Compartido | Animación anterior intacta                                                       |
| FLORIN           | 2★     |    0 |    0 |      6 |     0 | —           | —       | Compartido | Animación anterior intacta                                                       |
| FLORIN           | 3★     |    0 |    0 |      7 |     0 | —           | —       | Compartido | Animación anterior intacta                                                       |
| COSMIN           | 1/2/3★ |    0 |    0 |      0 |     0 | —           | —       | Ausente    | Carpeta vacía; fallback anterior                                                 |

Los cuatro splash arts existentes coinciden por SHA con sus fuentes anteriores: se reutilizan sus WebP exactos. Solo PEIBOL añade un splash derivado nuevo. Se ha añadido su retrato al componente de miembros de sinergias. Las demás identidades sin arte mantienen sus fallbacks; no reciben imágenes prestadas.

La procedencia acreditada aquí es el paquete facilitado por el propietario y la correspondencia histórica documentada. Esto no constituye una certificación independiente de derechos de terceros. No se han descargado recursos de Riot ni se han copiado iconos oficiales a la rama o al artefacto público. Cualquier publicación futura mantiene su revisión de procedencia habitual; esta entrega es exclusivamente LOCAL.

## Importación, calidad y fallbacks

Importador reproducible: `node scripts/sprites/tftperu2.mjs`.
Genera 20 atlas transparentes y sus retratos, más el splash nuevo. Los originales permanecen intactos. Se recorta únicamente transparencia exterior, preservando la relación de aspecto; se usa nearest-neighbour y lienzos de dimensiones variables, con silueta de referencia de 384 píxeles y escala de presentación 1/6. No se fuerza 96×96 ni se deforma el personaje. Las referencias de altura de las poses de JARAMILLO 2★ excluyen el humo elevado para evitar que encoja el cuerpo.

El anclaje al apoyo se alinea por fotograma y se registra en el manifest. El tamaño de lienzo se obtiene de la unión de extensiones respecto a ese apoyo; no añade suelo ni fondo. No se generan fotogramas ni se duplican archivos para rellenar clips incompletos. Los nombres como `1y4` se importan una vez en los clips nuevos.

`characters.json` conserva el pack anterior. `characters-p13t.json` es el pack actual separado; el contrato admite `composites` por estrellas y conserva el composite histórico. Phaser precarga sus recursos con deduplicación y sigue usando el mismo renderer. El alias visual `provisional-peibol → peibol` no modifica IDs de unidades ni el catálogo histórico.

VARGAS 1★ utiliza sus cuatro ataques nuevos. Los estados ausentes sostienen una pose del nuevo diseño, evitando alternar poncho y camiseta antigua. VARGAS 2★/3★ quedan intactos. DOLEA 1★ incorpora el idle nuevo de una sola imagen y sus cinco archivos de ataque disponibles; no cambia 2★/3★. La transición de apoyo y escala se revisa en el laboratorio. Los recursos originales que tocan los bordes de imagen se inventarían tal como llegaron; no se reconstruyen extremidades ni se completan recortes.

JARAMILLO y PEIBOL no tienen idle/walk/death nuevos independientes. Su fallback sostiene el cuerpo de esa evolución; no afirma disponer de una animación de caminar o morir completa. Las animaciones anteriores de JARAMILLO siguen conservadas en el pack histórico, pero no se mezclan con sus nuevos atuendos en el pack P13T.

## Proyectiles y reproducción

| Personaje | Estrellas | Objeto   | Pose de liberación (índice 0) | Origen visual relativo al apoyo |
| --------- | --------- | -------- | ----------------------------: | ------------------------------- |
| JARAMILLO | 1★        | Piedra   |                             2 | (32, −38)                       |
| JARAMILLO | 2★        | Cigarro  |                             2 | (29, −37)                       |
| JARAMILLO | 3★        | Mochila  |                             2 | (37, −37)                       |
| PEIBOL    | 1★        | Teléfono |                             3 | (29, −46)                       |
| PEIBOL    | 2★        | Dinero   |                             3 | (25, −44)                       |
| PEIBOL    | 3★        | Moneda   |                             4 | (22, −38)                       |

Los orígenes son puntos visuales ajustados a las poses inspeccionadas, no posiciones de juego. Todos los vuelos tienen una imagen independiente; no se simula una secuencia inexistente. La fase visual de liberación dura 80 ms, recuperación 220 ms e impacto 250 ms. El cuerpo siempre procede del atlas corporal, incluso después de lanzar y antes de recibir el siguiente ataque. La piedra carece de arte de impacto y usa el feedback gráfico genérico, sin tomar el cigarro de 2★.

Lanzamiento, destino, tick de impacto y daño siguen siendo autoritativos. La duración real del vuelo procede del motor, no de esos milisegundos de presentación. El renderer únicamente interpola. Un proyectil dirigido a un objetivo que muere se descarta sin un segundo impacto; uno ya lanzado puede sobrevivir a su lanzador si el combate sigue abierto. Se conserva el modelo dirigido existente, sin inventar ancho de onda, área o nuevas colisiones no especificadas. Se comprueban velocidades ×1/×2, pausa, seek y replay sin mutación.

## JARAMILLO: comparación mecánica versionada

| Aspecto            | Histórico P12J                                                      | Partidas P13T nuevas                                                             |
| ------------------ | ------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Pasiva             | Trotamundos / Kilómetros                                            | Barras que duelen                                                                |
| Trigger            | Victoria competitiva desplegado, según la política histórica        | Básico confirmado sobre un enemigo                                               |
| Acumulaciones      | +1 por victoria, máximo 8; +3 % AD cada una                         | 1 Barra por impacto; consume 4 sobre ese enemigo                                 |
| Beneficio          | Hasta +24 % AD persistente en la partida                            | 40/60/80 % AD físico adicional                                                   |
| Duración           | Hasta fin de partida; fusión por máximo                             | Contador por enemigo hasta consumo/fin de combate                                |
| Activa             | Cortina de Humo: 160/240/400 % AD; reducción 15/20/30 % durante 4 s | Te dejo en bragas: 100/125/150 % AD; reducción 15/20/25 % durante 4 s            |
| Maná/preparación   | 70 / 3 ticks                                                        | 70 / 3 ticks conservados donde el documento nuevo no fija otros valores          |
| Críticos de activa | Prohibición explícita histórica                                     | Sin crítico inherente; aplica la política general de objetos de la versión nueva |

El documento de Erik contiene una definición suficiente de pasiva y ratios de activa. Se implementa mediante acumuladores genéricos por enemigo dentro del ejecutor actual. El cambio de objetivo no transfiere Barras: se conserva un contador independiente por enemigo. Los contadores no son progreso de partida; P13T no concede Kilómetros. Los guardados antiguos siguen leyendo su pasiva, acumulaciones y reglas anteriores.

## PEIBOL: AD, alcance y equipamiento

Fuente: `Peibol/Habilidad_pasiva.txt`. Antes solo tenía parámetros provisionales de melee, sin habilidad personal. Ahora, exclusivamente bajo la política P13T:

- PLATITA LOW ELO: cada básico confirmado al objetivo actual añade +4 % velocidad de ataque, máximo 5 (+20 %). Cambiar de objetivo reinicia el contador en la decisión autoritativa. Un proyectil tardío de otro objetivo no reconstruye ni transfiere ese contador.
- Eliminar a ese mismo enemigo con cinco cargas concede +20 % AD durante 40 ticks. Reaplicaciones refrescan el mismo efecto; no crean copias acumulables de Modo Smurf.
- HEADSHOT: 70 maná, 220/330/500 % AD físico; +25 % de daño si al impacto el enemigo está estrictamente por debajo de 35 % de vida máxima. Si ese disparo es letal, restaura 25 maná mediante la vía central y su límite; no entrega maná a un lanzador muerto.
- Rol justificado: **tirador AD**, no mago por lanzar objetos ni por la sinergia económica Jew. No tiene ratio AP. El rol de objetos también pasa explícitamente a `marksman` solo en P13T.
- Alcance 3: decisión declarativa de esta fase, calibrada contra JARAMILLO, el tirador de referencia ya existente. El archivo no fija distancia. El resto de estadísticas base sigue provisional y sin cambios; se conserva preparación de activa de tres ticks, coherente con el proyectil dirigido existente.

El inspector y la tienda distinguen estadísticas provisionales de habilidades disponibles; no anuncian que solo tenga básicos cuando la habilidad está implementada. COSMIN y otros personajes sin diseño conservan su especialización pendiente. Inventario, recetas, equipamiento y removedores no cambian.

## FLORIN, VARGAS y DOLEA: límites respetados

El nombre visible exacto es **¡Me Fuí!**. Una capa de presentación lo aplica a las afinidades, ficha, tooltips, selección, rótulos y contadores; el ID interno sigue siendo **`mano_de_obra`**. Las definiciones históricas congeladas conservan su texto anterior para no recalcular fingerprints. No cambia salida/regreso, curación, buffs, daño verdadero ni animaciones de FLORIN.

Los TXT nuevos de FLORIN, VARGAS y DOLEA contienen otros nombres o propuestas mecánicas. No se han adoptado: el encargo limita FLORIN al nombre visible, VARGAS al arte de 1★ y DOLEA al arte parcial de 1★. VARGAS conserva El Depredador. Las regresiones comparan los perfiles completos de estas tres identidades y COSMIN, a todas las estrellas, entre P12J y P13T.

## Versionado y compatibilidad

Política opt-in `characterPolicy: f0p13t-1`, reglas de combate `f0p13t-1` y fingerprint nuevo. No se sustituye el catálogo histórico `f0p11h-1` ni el contrato de objetos. El nuevo hash encadena P12F, configuración P13T, perfiles y decisiones declarativas, más `p13t-runtime-1`: `b6130bde76eb6182f642086310ebd89510ed2a2a3c4b2a1e92bccd2b3ffb1ed7`.

Los contadores por enemigo tienen un bloque persistido anidado con versión explícita; las reglas antiguas rechazan estos perfiles nuevos mediante su política explícita. El sobre SQL sigue en versión 1, con discriminación por reglas/configuración/hash. No hay migraciones nuevas. El codec y restaurador admiten P13T sin recatalogar guardados antiguos. Clones siguen al 80 %, con una autoridad y liquidación por jugador real.

Los diecinueve fingerprints de P12J se contrastan con un fixture independiente congelado y con un laboratorio A/B reconstruido por `git archive` de la base exacta. Este laboratorio usa motores separados y compara eventos/snapshots íntegros sin normalizar. El fingerprint nuevo se evalúa aparte, no sustituyendo uno histórico.

La integración futura con P13S deberá componer ambas políticas en un fingerprint y reglas explícitos, y repetir las campañas. La futura abstracción P13B deberá resolver estos perfiles mediante su adaptador sin perder equivalencia. Ninguna de esas integraciones se ha adelantado aquí.

## Evidencia visual y ejecución LOCAL

Laboratorio: `p13t-lab.html`, solo desarrollo. Las capturas están en `artifacts/p13t/` (ignoradas por Git) y cubren Mar de Cristal/Cafetería a 1280×720, 1440×900, 1920×1080, 2560×1440 y 3840×2160. Las diez mediciones de DOM no muestran scroll general ni imágenes fallidas. Los tres niveles aparecen en la matriz y tienen además pruebas de sampling corporal y vuelo real.

En 4K la captura de viewport de IAB recortaba el contenido respecto al DOM; se contrastó geometría/hit testing y se guardaron capturas completas con `fullPage`, donde la tienda y banquillo sí quedan dentro del encuadre. No se alteró el HUD para compensar un fallo de captura. El override de viewport y la pestaña temporal se cerraron después.

Captura de detalle: `artifacts/p13t/peibol-3-inspector.jpg`. Matriz: `artifacts/p13t/visual-matrix.json`. El ajuste final de orígenes se valida además por el contrato tipado de cada evolución y pruebas de reproducción.

Para probar partidas nuevas offline: arrancar la web de desarrollo y abrir `/?rules=p13t`. Para el entorno multijugador LOCAL: `pnpm dev:local -- --characters=p13t`; apagado: `pnpm stop:local`. El launcher separa su identidad de datos del modo anterior. El modo público/ONLINE no se activa mediante ese parámetro de URL.

## Validación y cierre

Campaña completa sobre `3e044abbb177d96aa1fe3441ed6bd89e620e281c`, sin cambios durante su ejecución:

| Control                               | Resultado                                                                                                                                                      |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                          | PASS: TypeScript, ESLint, 155 archivos / 1.874 pruebas ordinarias y builds web/servidor; 306,7 s                                                               |
| Pruebas opt-in, ejecutadas aparte     | PASS: cinco archivos / 46 pruebas, ninguna omitida; 373,0 s                                                                                                    |
| `pnpm build:local`                    | PASS                                                                                                                                                           |
| `pnpm verify:public`                  | PASS: 44 iconos originales EUNUCO, cero paquetes de terceros autorizados y cero iconos oficiales LOCAL en el artefacto público; sin herramientas DEV expuestas |
| `pnpm verify:release`                 | PASS: 1.387 blobs históricos revisados, cero hallazgos de secretos detectables o iconos oficiales TFT                                                          |
| `pnpm verify:railway`                 | PASS: inspección de configuración IaC exclusivamente LOCAL, sin llamadas al proveedor                                                                          |
| Laboratorio histórico A/A + A/B       | PASS: 603 + 603 reproducciones, 19 restauraciones, tres casos de progresión y dos controles positivos de sensibilidad; 24,3 s                                  |
| `git diff --check`                    | PASS                                                                                                                                                           |
| Arranque multijugador P13T gestionado | PASS: dos clientes SDK, lobby privado, política nueva comprobada y apagado confirmado                                                                          |
| Matriz visual                         | PASS: dos arenas × cinco resoluciones, sin scroll general ni imágenes fallidas                                                                                 |

Las 46 pruebas opt-in incluyen las 34 existentes y doce escenarios nuevos de SIGKILL: antes/después de commit, entrada en combate/resolución y 2/3/4 jugadores. Se verifica bloqueo PostgreSQL real antes de matar el proceso, rollback o commit íntegro, reintento idempotente, pool/equipamiento, replay y restauración. También pasan HTTPS/WSS local con CA propia y validación TLS habilitada, exclusión mediante lease y lifecycle LOCAL. Las bases aisladas usan únicamente loopback y puertos de laboratorio; no se han ejecutado contra Supabase.

Las pruebas nuevas cubren las tres evoluciones de JARAMILLO/PEIBOL, contadores independientes y reinicio por objetivo, daño/maná, rol de equipamiento, targeting/pathfinding, muerte del objetivo/lanzador, replay ×1/×2/pausa, cuerpos y proyectiles separados, identidad SHA de assets, fallbacks, DOLEA 1★ y evoluciones superiores intactas, nombre visible y perfiles completos sin cambios de DOLEA/VARGAS/FLORIN/COSMIN. La red real SDK y restauraciones cubren 2–4 jugadores, clones, fin de partida y reconexión.

El laboratorio A/B reconstruye P12J por `git archive`, compila ambos motores por separado y compara eventos y snapshots íntegros sin normalización. Conserva procedencia, hashes de módulos y resultados en `artifacts/p13t/historical-equivalence/`. Los 19 fingerprints, las 34 definiciones y los perfiles/presentación históricos coinciden con la base.

La primera campaña encontró cuatro fallos: dos arenas esperaban los ocho fotogramas antiguos de DOLEA 1★ y dos comprobaciones del importador no encontraban fuentes antiguas copiadas en una carpeta anidada del laboratorio. Se corrigió la expectativa a los cinco fotogramas suministrados, exigiendo además todos los índices físicos y el anclaje/escala de cada fallback; se repusieron las fuentes ignoradas tras comprobar sus SHA contra el informe original. No era un fallo de splash arts ni del motor. Las once regresiones afectadas pasan y después se repitió el gate completo. No se eliminaron pruebas ni se relajaron los umbrales de 5.000 ms y p95 de 16,7 ms.

Evidencias ignoradas: `artifacts/p13t/final-gates.json`, `final-check.log`, `final-optin.log`, `final-historical.log`, `local-mode.json` y capturas. Vite conserva sus avisos no bloqueantes sobre el futuro loader nativo y tamaño de chunks; ESLint termina con cero advertencias.

Pendientes de contenido: idle/walk/death nuevos donde el inventario marca cero; impacto específico de piedra; recursos de COSMIN y demás identidades sin arte; confirmación futura del alcance 3 y estadísticas base provisionales de PEIBOL si se decide un balance definitivo. No se presentan como animaciones o estadísticas finales. La sinergia Jew continúa como en P12J en esta rama; su nueva economía pertenece a P13S y no se ha fusionado.

Estado externo: sin push y sin consultar/modificar Railway ni Supabase remoto. El estado actual de los proveedores no se afirma sin consulta. P12J, P13B y P13S conservan sus SHA indicados y sus árboles limpios.

Cierre LOCAL confirmado: cero clientes PostgreSQL antes del apagado; cluster dedicado detenido. No quedan listeners de este laboratorio en 4173, 2567, 2559, 55440, 55439, 2596 o 4187. La pestaña temporal y el override de viewport se cerraron. Se conservan evidencias y datos de prueba ignorados, sin afectar recursos de otros worktrees.
