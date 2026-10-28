# Escalados visibles de habilidades · publicación supervisada

Base: P11I `3ac854b`, rama `codex/f0-p11i-synergy-presentation`. El propietario solicita valores calculados con AD/AP actual y publicar la versión actual para su próxima partida. Autoriza una ventana de hasta 30 minutos para publicar, verificar HTTPS/WSS y apagar, sin aumentar recursos ni cambiar otros servicios.

## Lectura de las mecánicas actuales

- VARGAS: Blackhaus 280/420/700 % AD físico; Resaca cura 5 % de vida máxima. La curación de Blackhaus depende del daño realmente aplicado a vida, por lo que no se presenta como una curación garantizada antes de tener objetivo.
- JARAMILLO: Cortina de Humo 160/240/400 % AD físico. Trotamundos aumenta un porcentaje de AD base por victoria; no es daño mágico.
- FLORIN: principal 180/260/400 % AD y secundarios 90/156/300 % AD. Suela añade 50/60/75 % AD al básico reforzado. Se etiqueta como daño adicional sin atribuirle un tipo que pueda cambiar por la segunda vuelta de Mano de Obra.
- DOLEA: daño físico fijo 100/180/324 por estrellas; escudo 12 % de vida máxima. No se le inventa un escalado de AD o AP.

Tipo de daño y escalado son datos independientes. Tener AP no aumenta automáticamente una habilidad que no declara un coeficiente AP. Los cuatro actuales no tienen coeficientes AP en sus activas; el componente admite efectos futuros de AP y combinados.

Se toma como referencia de terminología la [documentación oficial de Riot con escalados separados AD/AP](https://teamfighttactics.leagueoflegends.com/en-gb/news/game-updates/teamfight-tactics-patch-16-1/). La interfaz y sus recursos siguen siendo propios; no se afirma reproducir literalmente un tooltip actual del cliente de Riot.

## Implementación

El inspector muestra importe actual destacado y fórmula, por ejemplo **Daño físico 218 (280% AD)** con 78 AD a 1 estrella. `abilityPowerValues.ts` utiliza `effectAmount` del motor, sobre las estadísticas efectivas que ya proporciona el inspector. No aplica objetos ni modificadores una segunda vez. Se reutilizan selección de estrella, sumas enteras, límites y redondeo del motor.

La única modificación de `effectAmount` es ampliar su tipo de entrada a `Pick<CombatUnit, 'profile' | 'statuses'>`: su implementación matemática no cambia. Los catálogos, descripciones originales persistidas, balance, hashes y eventos permanecen intactos. En presentación se sustituye el prefijo redundante de daño de las cuatro activas; permanecen condiciones, curaciones, aturdimientos, radios y duraciones. Las recompensas numéricas de pasivas se derivan de sus efectos y umbrales declarados.

Las cifras de daño son previas a resistencias, críticos y otros multiplicadores, como indica la ficha. Los efectos dependientes de una estadística del objetivo muestran su fórmula sin inventar una cantidad. No se garantizan impactos ni curación efectiva. El diseño conserva Festival Pop, arena y arte, cinco ofertas y scroll interno de habilidades.

## Validación local

72 pruebas dirigidas pasan: cuatro personajes, tres estrellas, AD/AP/vida efectivos, suma mixta y redondeo, efectos dependientes de objetivo, coincidencia con motor, inmutabilidad e inspector normal. Capturas a 1280×720 y 1920×1080: cinco cartas, sin scroll de documento y fórmulas legibles. Evidencias en `artifacts/ability-scaling/`.

Batería completa: `pnpm check` correcto: TypeScript y ESLint sin errores, **1684 pruebas pasan, 1 opt-in omitida; 126 archivos pasan y 1 omitido**, 527,69 s; PostgreSQL aislado y HTTPS/WSS incluidos. La prueba LOCAL opt-in pasa por separado (1/1). Builds público, servidor y LOCAL correctos; `verify:public`, `verify:railway` y `git diff --check` correctos. Persiste el aviso conocido de paquetes superiores a 500 kB, sin relajar límites. La compilación ONLINE con la configuración pública canónica se verifica adicionalmente antes de subir.

Publicación completada del commit `039ae132bb130905cd68aa9243f39bc03545c81a`, catálogo `f0p11h-1` para nuevas partidas (incluye P11A–I y los valores calculados de esta entrega). Deployment/build `f1b8c326-1548-43b0-9154-6475ef307242`, etiqueta `P11I + dynamic ability values 039ae13`. Alcanzó SUCCESS y luego se retiró con estado final **REMOVED**, cero deployments activos y `/readyz` externo 404 tras apagar. Se conserva la imagen construida para una futura reactivación autorizada.

Durante la ventana: `/`, `/healthz`, `/readyz` = HTTPS 200; handshake WSS del origen canónico = 101; origen ajeno HTTP 403 y WSS 401. Los tres archivos JS/CSS principales coinciden byte por byte con la compilación ONLINE canónica local. Acceso a la pantalla de salas privadas comprobado en navegador, sin DEV público; no se crearon cuentas, salas ni partidas. Esto valida infraestructura y paquete; **no se afirma una partida remota autenticada de dos jugadores en esta ventana**.

Supervisión total de subida/verificación/parada: 4.6 minutos, dentro de los 30 autorizados. Recursos conservados: 1 réplica, 2 GiB, 2 vCPU, sin serverless ni servicios nuevos. Coste incremental observado: 0 USD en la lectura del proveedor, sujeto a retraso de facturación; no significa coste final cero. Se mantuvieron observación de consumo, aviso 3 USD y retirada a 5 USD observados como medidas orientativas, además del plazo y del cierre en `finally`. No hay autodeploy, push, cambios de variables ni modificaciones de seguridad. La parada se verifica por estado REMOVED y ausencia de deployments activos; no se ha consultado directamente el propietario privado de la concesión SQL.

Las 13 huellas históricas siguen siendo idénticas. Informe de operación, snapshots de estado (sin credenciales), hashes, costes y capturas se conservan exclusivamente en `artifacts/ability-scaling/`. La copia acotada de autoridad es vacía y no hubo ninguna restauración remota.

## Preflight y alcance remoto

Railway: proyecto TFT EUNUCO `80f46bb2-efc2-449d-adfe-1c387acb7a96`, entorno private `8e819935-1601-4579-abb5-293d8beecef8`, servicio `fafc4774-f71a-4726-ae2a-48fec33d7e2d`, dominio `tfteunuco.up.railway.app`. Último despliegue `8356e5fb-dbe1-456f-aad4-eeb696ca0304` retirado. Configuración observada: 1 réplica Amsterdam, 2 GiB / 2 vCPU, sin suspensión ni origen GitHub. Se conservan esos valores.

Supabase revalidado: `qiombjvkaolllnjqzspz`. La variable histórica `SUPABASE_SERVICE_ROLE_KEY` contiene una clave moderna `sb_secret_`; su valor no se imprime ni se guarda en este informe. `authority_health` y `authority_lease_health` correctos. `authority_load` devuelve cero partidas. Copia acotada protegida (0600), igualdad tras lectura y hash registrados localmente; no hay partidas que restaurar. No se ejecutan migraciones ni modificaciones de Auth, registro remoto, usuarios, SMTP, SQL, permisos o variables.

El registro abierto de P11D continúa siendo exclusivamente LOCAL; publicar el juego no cambia esa política. El commit conserva compatibilidad de catálogos históricos, sin incorporar trabajo concurrente de otros worktrees. La subida utiliza exclusivamente el archivo Git limpio, sin push. La ventana empieza al subir, con parada en `finally` y plazo máximo de 30 minutos; no se deja el servidor funcionando para la próxima partida sin otro encendido autorizado.

## 28-10-2026 · Texto integrado según la referencia visual

Ajuste **LOCAL**, posterior a la publicación anterior. Las cantidades calculadas pasan al interior de las frases de las cuatro habilidades y pasivas, con iconos SVG propios de AD, AP, vida máxima o valor fijo y color semántico. Desaparece la lista de cantidades que antes precedía al párrafo. La fórmula completa permanece en el nombre accesible del valor.

Debajo se muestra el desglose de las tres estrellas, con el nivel actual señalado mediante color, peso y subrayado. Para escalados se muestran los coeficientes AD/AP/vida; para el daño fijo de DOLEA se usan los importes reales 100/180/324. No se confunden con predicciones de daño final contra un enemigo ni con estadísticas hipotéticas de otro nivel. Los perfiles base de las tres estrellas se consultan de forma memorizada; los importes dentro del texto siguen usando las estadísticas efectivas actuales y el cálculo compartido del motor.

Se conservan condiciones, restricciones y estado esencial de las pasivas. VARGAS mantiene curación sobre daño aplicado a vida, exclusión de escudos y exceso y ausencia de crítico; JARAMILLO conserva la reducción de armadura; FLORIN muestra importes principal/secundario separados, su aturdimiento actual y el básico reforzado; DOLEA mantiene su umbral de escudo y bonificación defensiva. No se modifica ninguna cifra, regla, catálogo ni snapshot. Las plantillas de texto integrado están definidas para los cuatro personajes actuales; una habilidad nueva debe incorporar su presentación correspondiente. Los perfiles históricos y el puente de descripción genérico continúan disponibles.

Verificación de este ajuste: **336 pruebas web pasan en 45 archivos**, incluidas 48 pruebas dirigidas y siete casos nuevos de texto integrado para las tres estrellas, coincidencia con importes del motor, metadatos accesibles, fijos frente a escalado y preservación de condiciones. Se adapta una expectativa histórica de «12 %» al nuevo desglose «12% vida máxima», conservando y ampliando la comprobación del escudo. TypeScript, ESLint, builds público/servidor/LOCAL, verify:public, verify:railway y git diff --check correctos. No se repite la batería de PostgreSQL de la entrega anterior: este ajuste afecta únicamente a presentación web y sus pruebas, sin cambios de servidor o simulación. Persiste el aviso de tamaño de chunks ya documentado.

Revisión en navegador de las cuatro fichas a 1280×720 y 1920×1080: sin scroll de documento, cantidades integradas, desglose visible mediante scroll interno y nivel actual destacado. Ocho capturas y métricas en `artifacts/inline-abilities/`; referencia de VARGAS en `vargas-1920.png`. El inspector largo conserva desplazamiento interno, especialmente a 720p. No se presenta esto como una certificación global de accesibilidad.

Sin push, nueva publicación ni cambios en Supabase. Railway no se ha reactivado: readiness externo 404 comprobado al cerrar. La versión publicada anterior continúa siendo `039ae13`; el formato integrado de esta sección se entrega en un commit local posterior.
