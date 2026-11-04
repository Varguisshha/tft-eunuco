# P13U — revisión después de la partida de tres jugadores

Estado: cambios locales; no publicados. Base pública conservada: `b18f8a1c70a8add6137744284ae86d655c65554a`.

## Fuente y alcance

La guía tiene SHA-256 `9ee0adfe1583f8e29d24e0e80ac3c556b2804e85fbc846700e71a907b7af96b8`. La matriz aprobada de 34 personajes se volvió a validar contra `TFPeru/Copia de TFPeru.xlsx`. El Excel de 18 personajes incluido en el paquete de arte TFPeru 2 no sustituye esa matriz.

Se contrastaron las 20 definiciones del catálogo con `TFT_EUNUCO_Todas_las_Sinergias.txt`, guía fechada el 30/10/2026, y con las decisiones posteriores de P13S. La guía advertía que incluía propuestas todavía sin implementar. P13S había actualizado seis sistemas y el texto narrativo de las demás sinergias; conservaba expresamente los efectos anteriores. Por eso Fumón seguía reduciendo armadura y otros escalones seguían pendientes.

El propietario autorizó en este encargo diseñar reglas provisionales para los huecos de la guía. No se presentan como balance definitivo. Se conservan las aportaciones de Hortaleza y las decisiones ya aprobadas para Fantasy, Jew y la ruleta.

## Auditoría completa

| Sinergia | Resultado en P13U |
| --- | --- |
| Fumón | Sustituye el humo de la sinergia por sacrificio inicial de vida máxima de 10/18/25 % y +20/40/60 % AD con 2/4/6 identidades. Una sola aplicación, sin daño letal ni activación de procs por el sacrificio. El humo propio de JARAMILLO sigue siendo su habilidad. |
| Gym | +10/20/30 % vida; +0/10/20 armadura con 2/4/6. |
| Ruman Trinity | +15/30 % daño con 2/3; con 3 reparte el 10 % del daño entre los otros miembros vivos. |
| UPM | Activa CARRASCO al perder acumuladamente 50/40/30/25 % de vida conjunta con 2/4/6/8. Invocación y perfil provisional descritos abajo. |
| Pardillo | 10/20/30 % de probabilidad por básico recibido de reducirlo a la mitad. Con 6, cura 5 % de vida si sobrevive al impacto afortunado. |
| Hortaleza | Conserva las doce aportaciones aprobadas y los multiplicadores 1/1,2/1,4/1,6/1,8 para 2/3/4/5/6 vecinos distintos. |
| Rata | Tirada por eliminación propia: 20/40/50 % de generar 1/1/2 oro. El resultado queda en el replay y se acredita al cierre, antes del cálculo de Jew y del ingreso base, una sola vez. No se expone oro de eliminaciones futuras al comenzar la reproducción. |
| Fantasy | Conserva las ocho predicciones, tres ofertas distintas, precio 1 y cupos 1/2/3 con 2/4/6. Control permanente bajo el marcador, resaltado cuando falta elegir. |
| Perdidos por el mundo | 2: un beneficio aleatorio compartido por sus miembros, de daño o resistencia; 3: ambos; 5: tercer beneficio provisional de +15 % vida y +10 % velocidad de ataque. Resistencia se concreta como −15 % daño recibido. |
| Pancho | 2/3/4/5: desvía 10/15/20/25 % al protector del aliado más cercano. Desempate estable; selección vuelve a considerar únicamente aliados presentes. El daño transferido se calcula después de las defensas originales, es verdadero, está limitado por la vida restante del protector y no vuelve a redirigirse. |
| Valo | +10/20/30 puntos de crítico, +20/40/60 puntos de multiplicador crítico y 10/20/30 % de Headshot sobre un básico crítico. Headshot multiplica ese crítico por 1,5. |
| Blackhaus | No seleccionable durante 2/3/4 s; primer básico que impacta +0/50/100 % daño. Representación translúcida durante el efecto. |
| Shisheros | Conserva canalización 6/4/3 s, reducción 30 %, bloqueo de acciones y recompensas aprobadas. |
| Mus | Mecánica e integrantes provisionales descritos abajo. |
| PSOE | Selecciona una vez por combate 1/2/3 medidas distintas de las seis descritas en la guía. Recompensas de oro reproducibles y liquidadas sin duplicación. La curación inicial respeta el límite de vida; puede curar cero si el equipo empieza sano. |
| Lencería | Escudo inicial provisional para todo el equipo. Conserva sus dos miembros del Excel. |
| Jew | Conserva Peibol desplegado, 10/15/20 % y máximos 2/4/8, con base previa a las recompensas de cierre. Indicador visible con estrellas, porcentaje, tope y estimación según el saldo actual. |
| Todo al Rojo | Conserva la ruleta aprobada y su journal. Sigue aplicando la tabla numérica de pérdidas a 3★, tal como se resolvió en P13S. |
| El Depredador | Conserva el contrato canónico de VARGAS y sus acumulaciones/eliminaciones/saltos. |
| Mano de Obra / ¡Me Fuí! | Conserva el contrato canónico de FLORIN, recuperación fuera del tablero y regreso. |

Los miembros se cuentan por identidad distinta desplegada, no por copias, estrellas o unidades del banquillo. No quedan escalones con `pending_effects` en el catálogo P13U. Los escalones superiores a la capacidad actual siguen indicando su reserva; no se confunden con efectos sin implementar.

## Diseños provisionales autorizados

- **CARRASCO I/II/III/IV:** 700/1100/1600/2200 vida, 55/85/120/160 AD y 30/40/50/60 armadura y resistencia mágica. Alcance 1, 0,7 ataques/s, movimiento de 4 ticks y preparación de básico de 3 ticks; no hereda las velocidades personales del invocador. Recibe las aportaciones de equipo de Hortaleza y las medidas de PSOE que sigan vigentes al aparecer. Por 60 maná lanza un golpe mágico de 140/220/320/450 en radio 1. Por cada estrella media UPM superior a una, escala +12 % vida, +8 % daño y +5 % defensas. Aparece una vez por bando, en la casilla libre más cercana, sin ocupar pool, banquillo ni tienda. Su representación es provisional y lleva el nombre CARRASCO.
- **Perdidos, tercer beneficio:** +15 % vida máxima. No sustituye los otros dos beneficios del escalón cinco.
- **Mus:** VARGAS, PEIBOL, ALFREDO POCHO y DANIGM se asignan provisionalmente. Con 2/4 distintos, +10/20 AD y AP. Cada cuarto básico confirmado concede al miembro un escudo de 8/12 % de su vida máxima durante 4 s. Una acción con varios impactos no aumenta varias veces el contador.
- **Lencería:** con 2 miembros, escudo inicial de 8 % de vida máxima durante 4 s para todo el equipo.

Los cuatro casos se identifican como provisionales en sus tooltips. El roster conserva las 34 identidades, estadísticas base, costes, habilidades personales y recursos. La única incorporación provisional a la matriz de afiliaciones es Mus.

## Incidencia del servidor

El usuario precisó que veía un aviso durante el combate, sin desconexión de los jugadores. Ese aviso corresponde a `service_status`: un guardado rechazado o sin confirmación pausa la partida para no publicar cambios sin persistencia.

La muestra de 500 líneas del proveedor contiene 16 `storage_failed`, nueve recuperaciones y una salida de protección `leaseLost`. Las operaciones fallidas de guardado duran aproximadamente 5005–5135 ms. El código cortaba todas las peticiones de persistencia a los 5000 ms.

Las estadísticas agregadas de PostgreSQL registran máximos de 7606,9 ms en `authority_fenced_commit` y 7904,81 ms en renovación de autoridad. No son una traza individual de cada petición fallida, pero demuestran que el presupuesto de cinco segundos era inferior a latencias que el sistema real ya había alcanzado. No se observaron deadlocks. Los snapshots almacenados medían aproximadamente 1–2 MiB en las partidas terminadas consultadas.

En las muestras de la partida, RSS máximo de aproximadamente 402 MiB frente al límite de 2 GiB. Los incrementos de CPU entre muestras tampoco demuestran saturación sostenida de los dos vCPU. Hubo picos del bucle de eventos de hasta 1,35 s. No hay evidencia suficiente para atribuir el fallo al plan Hobby.

**Corrección:** presupuesto de petición de 15 s para commits y operaciones de lease, con petición independiente para cada renovación. Las comprobaciones de salud mantienen cinco segundos. Se conserva el plazo local de autoridad de 40 s, el TTL de base de datos de 60 s, la exclusión de escritores, CAS, idempotencia, recuperación de commits ambiguos y la pausa ante fallos reales. No se reintentan escrituras a ciegas ni se publican operaciones sin confirmar.

La regresión reproduce una respuesta de guardado a 7900 ms con reloj y cancelación controlados. Comprueba una sola petición y confirmación correcta; también verifica que una denegación de persistencia no se convierte en éxito.

**Límite del diagnóstico:** aún no se ha hecho una nueva partida real online con este código. La mejora cubre las latencias observadas; no garantiza disponibilidad si la base de datos o la red siguen sin responder durante más de 15 s. La causa de fondo de cada pico de base de datos requeriría correlacionar métricas de I/O y espera durante otra sesión.

## Recomendación operativa

Mantener por ahora Hobby y los límites de una réplica, 2 vCPU y 2 GiB. Railway explica que subir de plan no acelera una aplicación que no está consumiendo sus recursos y recomienda comprobar región, CPU y memoria: [diagnóstico oficial](https://docs.railway.com/deployments/troubleshooting/slow-deployments).

La región observada del servicio es Amsterdam y Supabase está en `eu-west-1`. No se ha movido ninguno. Primero debe probarse el presupuesto corregido y medir guardados, pausas, CPU e I/O en una sesión supervisada de tres o cuatro jugadores. Si persisten los picos, priorizar el coste de enviar snapshots repetidos y el rendimiento de la base de datos; un cambio de cómputo Supabase solo debe decidirse con esas métricas y autorización del propietario. [Cómputo e I/O de Supabase](https://supabase.com/docs/guides/platform/compute-and-disk).

## Compatibilidad y publicación

Nueva configuración y reglas `f0p13u-1`, con fingerprint propio. P13, P13S, P13T, P13T.1 y todas las versiones anteriores conservan sus objetos de configuración y lectores de snapshots. Se amplía el lector para la nueva versión, sin migraciones SQL. Las partidas antiguas no se recatalogan al restaurarlas.

No se han cambiado credenciales, Auth, SMTP, RLS, tablas remotas, recursos Railway ni otros proyectos. No se ha hecho push ni despliegue. La consulta final al proveedor durante esta revisión mostró cero deployments activos; esta revisión no ejecutó la parada ni el encendido.

Las capturas y registros de laboratorio se guardan bajo `artifacts/postmatch-audit/`, excluidos de Git. Los iconos y demás recursos gráficos conservan el límite público saneado.

## Validación final

- `pnpm check`: TypeScript, ESLint, 2.036 pruebas normales y builds web/servidor correctos. Conserva los presupuestos de rendimiento existentes.
- La suite normal separa 94 casos opt-in. En esta fase se ejecutaron aparte los 12 casos P13U de SIGKILL antes/después del commit en combate/resolución para 2/3/4 jugadores y cinco casos de exclusión de autoridad, HTTPS/WSS, CORS, reinicio y recuperación: 17/17 correctos. Los otros 77 casos opt-in históricos no se reejecutaron en esta revisión.
- Las regresiones nuevas comprueban sacrificio no acumulativo de Fumón, bonificaciones por escalón, daños transferidos sin multiplicación, invisibilidad y primer impacto, Headshot, curación reactiva, escudos, invocación única con estadísticas propias y bonos de equipo, afiliaciones Mus, azar reproducible, crédito de oro antes de Jew y liquidación única. La red se probó con clientes SDK de 2/3/4 jugadores y reconexión.
- `python3 scripts/roster/import_excel.py --check`: matriz aprobada de 34 personajes, 16 colectivas y cuatro atributos únicos correcta. Los perfiles históricos no se modifican.
- `pnpm build:local` correcto. El nuevo preset `p13u` está disponible en el lanzador y es el predeterminado de esta versión. Los presets anteriores siguen disponibles; los guardados anteriores conservan sus reglas y muestran un aviso.
- `verify:public`: 44 iconos originales EUNUCO, cero paquetes externos activados, cero iconos oficiales LOCAL en el bundle público; sin controlador ni herramientas DEV expuestos.
- `verify:railway`: configuración local verificada; no aprovisiona recursos ni llama al proveedor.
- Comparador histórico completo contra `d38f18bb8e0c4279c9ac92883942200225f0cb94`: 603 casos A/A, 603 A/B, 19 restauraciones y tres recorridos de progreso correctos; las dos mutaciones de sensibilidad se detectan. Se compararon los fuentes actuales, registrados por digest, aunque la etiqueta del candidato mostraba todavía el HEAD anterior al commit. El manifiesto sigue exigiendo los 19 fingerprints históricos: solo se excluye la nueva clave P13U de esa lista anterior, como ya se hacía con las otras ampliaciones P13.
- Sonda local representativa de tres jugadores, siete unidades de dos estrellas por jugador y dos duelos: simulación 214,4 ms, CPU 355,6 ms, serialización 184,4 ms, snapshot de 2.098.874 bytes y RSS de 367,8 MiB. El p95 del recorrido de reproducción en Node fue 0,45 ms. Son medidas de una ejecución local, no una garantía de latencia del servidor remoto ni de renderizado en navegador; confirman que conviene medir el coste de snapshots antes de comprar más recursos.
- Auditoría visual en 1280×720 y 1920×1080: controles Fantasy/Jew bajo el marcador, lista de sinergias con su espacio conservado y sin scroll de página. Se verificó una apuesta, descuento 50→49, cupo 1/1 y bloqueo del resto. La estimación de Jew responde al saldo. Se conserva la arena dominante.

Vista de prueba: `http://127.0.0.1:4189/p13-online-lab.html?stars=2` (laboratorio offline, no una sala online).

No se ha publicado una release durante este encargo. GitHub conserva la rama pública anterior. La puesta en producción y la nueva partida real supervisada son posteriores a esta revisión local.
