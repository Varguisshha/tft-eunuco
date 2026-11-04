# F0-P13T.1 — PEIBOL y Jew en LOCAL

## Base y aislamiento

Base exacta P13T: `95386e43d160fc78e1af6590031efdc1277d3d73`.
Rama: `codex/f0-p13t1-peibol-jew-fix`.
Worktree: `p13t1-peibol-jew/TFT EUNUCO`.
SHA de código validado: `570f82dfb7ad52bcdd1bd77b825f082e9c30b2e6`. El commit posterior cierra únicamente este informe; su SHA se entrega en la respuesta final.

P12J (`d38f18bb`), P13B B0/B1 (`88c06fb`) y P13S (`f80e614`) se conservan en sus ramas. No hay merge de P13S, push, GitHub, Railway ni Supabase remoto. No se inicia P13B B2 ni se modifican migraciones, recursos gráficos o estadísticas base.

## Diagnóstico reproducido antes de editar

Se inspeccionaron HEAD, el supervisor LOCAL y los snapshots persistidos exclusivamente en PostgreSQL loopback 55440. El servidor de 4173 apuntaba al worktree P13T correcto; las dos autoridades guardadas examinadas declaraban reglas y `characterPolicy` `f0p13t-1` y fingerprint `b6130bde76eb6182f642086310ebd89510ed2a2a3c4b2a1e92bccd2b3ffb1ed7`.

La ficha defectuosa se reprodujo en un puerto independiente, 4187, mediante los controles reales: Crear partida → Crear prueba DEV → generar PEIBOL 1★ en el tablero → inspeccionar. Aunque la URL tenía `?rules=p13t`, el diagnóstico DEV mostraba `f0p11h-1 / f0p11h-1`, alcance 1 y todos los mensajes descritos: especialización pendiente, parámetros temporales, solo básicos y ninguna habilidad. **DevelopmentAccess construía siempre P12F**, ignorando la selección usada al crear una partida normal. Además, la partida normal sin el parámetro de URL también usaba P12F. No era un problema de caché ni de assets.

El código P13T ya contenía la pasiva y activa completas de PEIBOL, el rol AD y rango 3, pero solo al resolver su política. La definición histórica del roster aún marcaba a PEIBOL provisional, sin IDs de habilidad. La nueva metadata lo clasifica desarrollado sin tocar la definición anterior.

Jew `1/1` se reprodujo en esa misma prueba. Tanto P12F como P13T conservaban la definición `pending_effects`, sin economía Jew. El panel calculaba correctamente la presencia, pero no podía declararla implementada. P13S sí tenía su fórmula de intereses; esa rama no estaba integrada y no se ha supuesto lo contrario.

Capturas previas: `artifacts/p13t1/before-peibol.jpg` y `before-jew.jpg`. No se ha afirmado disponer de las capturas originales del usuario: se han reproducido sus textos y estado mediante la interfaz real anterior. El fingerprint del supervisor identifica el árbol de fuentes; no se confunde con el fingerprint semántico del catálogo.

## Configuración efectiva única

`P13T1_ECONOMY_CONFIG` combina la política de combate intacta `characterPolicy: f0p13t-1` con la política económica acotada `jewPolicy: f0p13s-jew-1`. Es una configuración nueva, no una modificación de P13T. El schema rechaza Jew sin sus dependencias P13T/P12F.

El launcher selecciona el mismo preset para servidor y frontend. En este worktree su valor predeterminado es `p13t1`. La creación normal y Crear prueba DEV pasan por el mismo resolvedor. La URL no decide por separado las reglas del frontend. Los presets históricos explícitos `--characters=p13t` y `--characters=p12f` siguen disponibles; un worktree antiguo sin el módulo P13T.1 conserva su arranque anterior.

Recuperar una partida o prueba DEV nunca cambia su catálogo. Si es anterior, la interfaz avisa que conserva sus reglas y que para probar PEIBOL/Jew actualizados debe crearse una partida o prueba nueva. Las referencias históricas P11 siguen siendo referencias de sus versiones.

La definición nueva de PEIBOL conserva ID, coste, las ocho sinergias y todos los recursos por estrellas. Usa rol `ranger`, principal `headshot-p13t` y presentación Tirador AD/Físico. Su ficha y tienda nuevas dejan de marcarlo como personaje pendiente. COSMIN y los demás provisionales siguen conservando esos estados. No se han inventado estadísticas adicionales: la base numérica continúa siendo la de P13T y su alcance provisional sigue en 3.

## Pasiva y activa: semántica comprobada

La implementación de combate P13T se reutiliza sin modificar el motor, sus perfiles ni el consumo de RNG:

- Cada básico **confirmado al impacto** sobre el objetivo actual gana una carga de Ego; +4 % AS por carga, máximo cinco (+20 %). Un ataque cancelado no concede carga. Se confirma un impacto absorbido por escudo; no se equipara a un lanzamiento.
- El cambio de objetivo autoritativo consume las cargas. Un proyectil válido del objetivo anterior que aterriza después del cambio no reconstruye el contador.
- La atribución central de eliminación decide el responsable; no se concede Smurf por una baja de otro personaje. La quinta carga puede entrar con el básico letal: confirmación precede a la señal de eliminación.
- Una eliminación del objetivo con cinco cargas concede +20 % AD durante 40 ticks. Otra eliminación que cumple de nuevo la condición **refresca** un único buff, sin acumular copias. Se comprueba expiración y renovación. La conservación del rango, preparación de 3 ticks y política de refresh son decisiones de implementación heredadas y documentadas, no parámetros adicionales del TXT.
- HEADSHOT consume 70 maná y aplica 220/330/500 % AD físico. Lee la vida al **impacto**, con comparación estricta `<35 %`; exactamente 35 % no recibe +25 %. Se comprueba un cambio de vida durante el vuelo y absorción por escudos.
- Solo el daño letal de ese disparo devuelve 25 maná, mediante el mecanismo central y su límite; una reproducción no ejecuta liquidaciones ni devuelve maná. Se preserva la exclusión de lanzadores muertos y la cancelación ante objetivo desaparecido. No se asigna daño desde React/Phaser.

Las descripciones usan el componente existente de cifras inline y desglose 1★/2★/3★, con AD actual e icono propio. Ejemplo real 1★: 40 AD → 88 físico antes de mitigación, críticos y multiplicadores; la condición de vida y +25 % se explican aparte. No se retocan imágenes, IDs de recursos ni animaciones.

## Jew: extracción acotada de P13S

Se trasladan la fórmula, tabla, selección del PEIBOL desplegado y momento del banco elegible de P13S `f80e614`, junto con sus contratos necesarios. No se copia su ejecutor entero de predicciones, ruleta, UPM, Hortaleza o Shisheros. No se crea un segundo motor ni un nuevo RNG.

| Estrellas | Porcentaje | Límite solicitado |
| --------- | ---------- | ----------------- |
| 1★        | 10 %       | 2 oro             |
| 2★        | 15 %       | 4 oro             |
| 3★        | 20 %       | 8 oro             |

`solicitado = min(floor(oroElegible × rateMilli / 1000), límite)`.

El oro elegible es el saldo al cierre **antes de todos los ingresos de recompensa**, como en P13S. Puede diferir del banco congelado al inicio del combate que utiliza el interés normal; una venta permitida durante combate queda contemplada. Se paga después del ingreso normal y se aplica el límite global de oro existente, distinguiendo solicitado/acreditado/exceso.

La presencia y estrellas se congelan desde el ejército propio del input de combate. PEIBOL solo en banquillo no activa Jew. Si hay varias copias desplegadas se usa una sola, la de más estrellas, con desempate por ID. Su muerte en combate no deshace la elegibilidad ya congelada. El panel utiliza la misma definición efectiva: Jew activa, `1/1`, color activo existente, lore, porcentajes/límites y retrato de PEIBOL.

La recompensa tiene un recibo anidado explícito `f0p13s-jew-1`, ID por ronda, ID de liquidación, banco, unidad/estrellas, solicitado y acreditado. Reutiliza la transacción y registro económico autoritativos; no se añade un contador paralelo. Los invariantes rechazan duplicación por ronda, recibos inconsistentes, pagos en catálogos históricos y divergencias de conservación. La UI de recompensa y el registro de partida muestran Jew por separado. La autoridad liquida cada jugador real una vez: los clones no crean otro beneficiario.

## Persistencia y compatibilidad

Fingerprint nuevo: `9587f836dfdfb1e77763232e84f89edd014599d4a486b061535a7e98af88ff09`. Encadena el hash P13T, la configuración nueva, metadata del roster, definición efectiva de rasgos, política Jew y revisión del recibo. Las reglas ejecutoras de combate siguen en `f0p13t-1` porque no cambia su semántica; el nuevo catálogo/configuración y los rasgos embebidos distinguen la partida inequívocamente.

P13T conserva exactamente `b6130bde76eb6182f642086310ebd89510ed2a2a3c4b2a1e92bccd2b3ffb1ed7`. P12J conserva sus 19 hashes. El sobre persistido sigue en versión 1 y codec gzip existente, con nuevo hash permitido y campos opcionales solo bajo la nueva política. No se reinterpretan guardados anteriores ni se migra SQL.

P13S completo continúa en su rama independiente, con sus contratos intactos. Esta rama no pretende restaurar snapshots completos de P13S que contienen las otras cinco mecánicas: hacerlo requeriría integrar precisamente el motor completo que este encargo excluye. El subconjunto Jew tiene versión propia y no se anuncia como el catálogo P13S completo. P13B B0/B1 queda separado.

## Evidencia y gates

Pasan las regresiones de desarrollo de habilidades, compra/fusión/despliegue/equipamiento, activación, pagos y límites, red 2–4, clones, restauración y fin de partida. Se añaden doce escenarios de SIGKILL antes/después de commit en combate/resolución para 2/3/4 jugadores.

La entrada DEV real corregida muestra `f0p13t-1 / f0p11h-1 · P13T.1 · Jew`. Se ha contrastado con el diagnóstico anterior. Capturas `after-dev-peibol-role.jpg`, `after-dev-peibol-abilities.jpg`, `after-dev-jew.jpg` y matriz de las tres evoluciones en ambas arenas, en `artifacts/p13t1/`. Las seis mediciones son 1280×720, sin scroll general ni imágenes visibles fallidas; los retratos ocultos de tooltips pueden ser diferidos y no se confunden con errores de carga. Los cuerpos siguen visibles durante el vuelo en pausa de 400 ms. No se modifica el diseño general del HUD.

Campaña completa sobre `570f82dfb7ad52bcdd1bd77b825f082e9c30b2e6`, con árbol limpio durante la ejecución:

| Control                                                    | Resultado                                                                                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `pnpm check`                                               | PASS: TypeScript, ESLint, 161 archivos y 1.908 pruebas ordinarias; builds web y servidor correctos (336,6 s)             |
| Opt-in, ejecutadas separadamente                           | PASS: seis archivos, 58 pruebas, ninguna omitida (378,4 s)                                                               |
| `pnpm build:local`                                         | PASS                                                                                                                     |
| `pnpm verify:public`                                       | PASS: 44 originales EUNUCO, cero recursos oficiales TFT en el artefacto público y sin herramientas DEV expuestas         |
| `pnpm verify:release`                                      | PASS: 1.425 blobs históricos revisados, cero hallazgos de secretos detectables o binarios oficiales TFT                  |
| `pnpm verify:railway`                                      | PASS: solo inspección LOCAL de IaC, sin consultar/provisionar el proveedor                                               |
| Comparación histórica contra P12J exacto                   | PASS: 603 A/A, 603 A/B, 19 restauraciones, tres casos de progresión y dos controles de sensibilidad (21,6 s)             |
| Launcher real con copia por `git archive` del SHA validado | PASS: dos clientes SDK, lobby privado, política de personajes/Jew y fingerprint persistido correctos, apagado confirmado |
| `git diff --check`                                         | PASS                                                                                                                     |

Las 58 pruebas de servicios incluyen las 46 anteriores y las doce nuevas de P13T.1. Se verifican PostgreSQL loopback aislado, bloqueo real observado antes de SIGKILL, rollback/commit atómico, reintentos sin segundo pago, conservación, recuperación de combate/resolución, clones y reconexión para 2–4 jugadores; también HTTPS/WSS con TLS validado, autoridad/lease y lifecycle de arranque/rechazo de puerto ocupado/apagado. La matriz no se declara aprobada mediante repeticiones individuales: todo pasó conjuntamente en el gate indicado.

La comparación A/B reconstruye `d38f18bb` mediante `git archive`, compila motores separados y contrasta eventos/snapshots completos, sin normalización. Se mantienen los 19 fingerprints históricos y el hash exacto adicional de P13T, con una regresión específica. Las fuentes P13T/P13S/P13B/P12J siguen en sus SHA originales y árboles limpios. No hay cambios en los PNG/WebP, manifests de personajes, ejecutor de combate P13T o migraciones SQL.

Los ensayos auxiliares iniciales corrigieron expectativas de temporización de los nuevos fixtures usando eventos reales (la primera carga de ataque ya está disponible en tick 1) y un import CJS de PostgreSQL en el script de laboratorio. No se modificó el motor para adaptar esas expectativas. Después se ejecutaron completas las regresiones, el gate y el smoke del launcher. Ninguna prueba existente se elimina ni se amplían los límites de 5.000 ms y p95 16,7 ms. ESLint termina sin advertencias; Vite mantiene sus avisos previos de loader futuro y tamaño de chunks.

Evidencias ignoradas: `artifacts/p13t1/final-gates.json`, logs `final-*`, `historical-equivalence/`, `local-mode.json`, `visual.json`, `final-preview.json` y capturas. Graphify se utilizó como índice estructural histórico, verificando después el código real; sin reconstrucción, llamadas externas ni tokens adicionales de extracción. Impeccable se aplicó a la claridad de la ficha y tooltips conservando el HUD existente.

## Límites y uso

Arranque: `pnpm dev:local` o `pnpm dev:local -- --characters=p13t1`. URL: `http://127.0.0.1:4173/`. Crear **una partida nueva** o **Crear prueba DEV**; recuperar un guardado antiguo conserva su comportamiento anterior deliberadamente. Parada: `pnpm stop:local` desde este worktree.

Los recursos incompletos y fallbacks de P13T, así como las estadísticas base y alcance provisional 3 de PEIBOL, no se han ampliado. El registro público/ONLINE y las configuraciones remotas permanecen sin cambios. No se hace push ni despliegue.

## Estado final de servicios y Git

El supervisor anterior P13T se apagó mediante su control de propiedad y conserva sus datos. El cluster de pruebas dedicado 55439 se cerró después de comprobar cero clientes. La prueba del launcher utilizó una copia `git archive` y su identidad de base propia; esas partidas no ocupan los jugadores de la vista final.

La vista final se ha arrancado expresamente con `--characters=p13t1` desde este worktree y se ha abierto en el navegador en `http://127.0.0.1:4173/`. Readiness web/servidor correcto; preset supervisor `p13t1`, base propia con cero partidas y jugadores de diagnóstico disponibles. Permanecen encendidos únicamente sus servicios LOCAL necesarios (web 4173, autoridad 2567, control 2559, PostgreSQL 55440) para la prueba solicitada por el usuario. El Vite de diagnóstico 4187 se cerró. Para detener la vista final: `pnpm stop:local` desde este worktree.

Sin push, despliegue ni consulta de estado de Railway/Supabase remoto. No se han creado cuentas reales, enviado correos ni alterado credenciales, RLS o Auth. El estado remoto se mantiene fuera del alcance; no se afirma una verificación remota que no se ha realizado.
