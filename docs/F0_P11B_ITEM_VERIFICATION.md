# F0-P11B · verificación individual de objetos TFT 18.5

Versión fija: **18.5 con actualización del 27-10-2026**. El usuario ha confirmado mantenerla con pendientes explícitos. **No se afirma fidelidad completa de los 36 objetos.** Hay 30 completos con ejecución de la especificación reconstruida y 6 bloqueados; los 8 componentes están disponibles. Los bloqueados no pueden crearse, equiparse ni consumirse como si sus efectos fueran correctos.

## Procedencia y límite de evidencia

Las 36 combinaciones se contrastan una por una con `DA_*` del set 18 en el archivo de mapa del cliente. Esos registros carecen de constantes de efectos: la fuente pública simplificada conserva datos Hextech anteriores. No se confunde ese contenido heredado con una exportación completa del motor Unreal nuevo. La transición de motor está descrita en las notas oficiales 18.1.

Se reconstruyen los parámetros desde la base pública congelada, aplicando expresamente los cambios oficiales 18.2 (Sanguinaria, Filo de la noche, Mano de la justicia), 18.4 (Regiaguardia, Rostro espiritual) y 18.5 del 27 de octubre (Mano de la justicia). Sin cambios estándar adicionales en las notas revisadas 18.1/18.3. Nombres localizados desde Data Dragon oficial; no se copian imágenes, iconos ni ilustraciones. Hashes completos y URLs en `packages/game-data/src/reference/tft-18.5-items.json`.

Fuentes: [18.1](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-18-1/), [18.2](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-18-2/), [18.3](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-18-3/), [18.4](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-18-4/), [18.5](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-18-5/), [Precisión](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-17-1/), [roles y maná](https://teamfighttactics.leagueoflegends.com/en-sg/news/game-updates/roles-revamped-and-item-changes/), [Sunfire: prioridad de no quemados](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-12-11-notes/).

## Componentes

| Componente | Estadísticas |
| --- | --- |
| Espadón | 10% AD |
| Chaleco de cadenas | 20 armadura |
| Cinturón de gigante | 150 vida |
| Vara innecesariamente grande | 10 AP |
| Capa negatrón | 20 RM |
| Arco curvo | 10% velocidad de ataque |
| Guantes de combate | 20% probabilidad crítica |
| Lágrima de la diosa | 1 maná/s |

## 36 recetas revisadas

| Objeto | Receta | Estadísticas directas | Efecto/condiciones | Estado |
| --- | --- | --- | --- | --- |
| Yelmo adaptable | Capa negatrón + Lágrima de la diosa | 20 RM; 3 maná/s | 15% maná adicional de todas las fuentes. Tanque/luchador: 30 armadura/RM. Otros roles: 10% AD y 10 AP. | Ejecución de especificación probada; ver límites comunes |
| Bastón del arcángel | Vara innecesariamente grande + Lágrima de la diosa | 30 AP; 1 maná/s | Cada 5 s acumula 20 AP. | Ejecución de especificación probada; ver límites comunes |
| Sanguinaria | Espadón + Capa negatrón | 18% AD; 18 AP; 20 RM | 20% omnivampirismo. Una vez al 50% de vida: escudo de 30% vida máxima durante 5 s. | Ejecución de especificación probada; ver límites comunes |
| Mejora azul | Lágrima de la diosa + Lágrima de la diosa | 15% AD; 15 AP; 5 maná/s | 10% adicional de AD y AP de todas las fuentes; no reduce maná máximo. | Ejecución de especificación probada; ver límites comunes |
| Chaleco de zarzas | Chaleco de cadenas + Chaleco de cadenas | 50 armadura; 6% vida máxima | 5% reducción de daño de ataques; represalia de 100 mágico a adyacentes con 2 s de enfriamiento. | Ejecución de especificación probada; ver límites comunes |
| Regiaguardia | Vara innecesariamente grande + Chaleco de cadenas | 20 AP; 20 armadura; 100 vida | Escudo inicial de 25% vida máxima durante 8 s; al terminar o romperse, 20 AP una sola vez. | Ejecución de especificación probada; ver límites comunes |
| Filo mortal | Espadón + Espadón | 55% AD | 10% de amplificación de daño. | Ejecución de especificación probada; ver límites comunes |
| Garra de dragón | Capa negatrón + Capa negatrón | 60 RM; 6% vida máxima | Cada 2 s cura 2,5% de vida máxima. | Ejecución de especificación probada; ver límites comunes |
| Promesa del protector | Lágrima de la diosa + Chaleco de cadenas | 25 armadura; 25 RM; 1 maná/s | Inicio: 20 maná. Una vez al 40% de vida: 15 maná y escudo de 20% vida máxima durante 60 s (el combate tiene duración menor). | Ejecución de especificación probada; ver límites comunes |
| Protector pétreo de gárgola | Chaleco de cadenas + Capa negatrón | 25 armadura; 25 RM; 100 vida | 10 armadura y RM por enemigo vivo que apunta al portador; recalculado al cambiar objetivos. | Ejecución de especificación probada; ver límites comunes |
| Filo de la noche | Espadón + Chaleco de cadenas | 10% AD; 10 AP; 15% velocidad de ataque; 20 armadura | Una vez al 40% de vida: limpia efectos negativos, 1 s sin ser objetivo y cura 15% de vida faltante. | Ejecución de especificación probada; ver límites comunes |
| Hoja de furia de Guinsoo | Arco curvo + Vara innecesariamente grande | 10 AP; 10% velocidad de ataque | 7% velocidad de ataque acumulable cada segundo, independientemente de ataques. | Ejecución de especificación probada; ver límites comunes |
| Sable-pistola hextech | Espadón + Vara innecesariamente grande | 20% AD; 20 AP; 1 maná/s | Cura al aliado de menor porcentaje de vida por 20% del daño; omnivampirismo pendiente de contraste. | BLOQUEADO: Omnivampirismo contradictorio (15/18) |
| Filo infinito | Espadón + Guantes de combate | 35% AD; 35% probabilidad crítica | Precisión; fuentes adicionales: 10% de amplificación, no daño crítico adicional. | Ejecución de especificación probada; ver límites comunes |
| Chispa iónica | Vara innecesariamente grande + Capa negatrón | 15 AP; 35 RM; 250 vida | 30% reducción de RM en radio 2. Al lanzar un enemigo: daño mágico por 150% del maná del lanzamiento. | Ejecución de especificación probada; ver límites comunes |
| Guantelete enjoyado | Vara innecesariamente grande + Guantes de combate | 35 AP; 35% probabilidad crítica | Precisión; fuentes adicionales: 10% de amplificación. | Ejecución de especificación probada; ver límites comunes |
| Últimas palabras | Arco curvo + Guantes de combate | 15% AD; 20% velocidad de ataque; 20% probabilidad crítica | Daño de ataques y habilidades: 30% reducción de armadura durante 3 s; no suma intensidad. | Ejecución de especificación probada; ver límites comunes |
| Diente de Nashor | Arco curvo + Cinturón de gigante | 15 AP; 10% velocidad de ataque; 150 vida; 20% probabilidad crítica | Cada ataque añade 2 maná, o 4 si es crítico; no usa el antiguo aumento al lanzar habilidad. | Ejecución de especificación probada; ver límites comunes |
| Verdugo de gigantes | Espadón + Arco curvo | 15% AD; 15 AP; 15% velocidad de ataque | Amplificación adicional del 15% contra tanques; amplificación base pendiente. | BLOQUEADO: Amplificación base y parámetros opacos heredados |
| Morellonomicón | Vara innecesariamente grande + Cinturón de gigante | 20 AP; 150 vida; 1 maná/s | Daño de ataques y habilidades: 1% quemadura verdadera y 33% herida durante 10 s; no acumula intensidad. | Ejecución de especificación probada; ver límites comunes |
| Corazón resuelto | Chaleco de cadenas + Guantes de combate | 20 armadura; 250 vida; 20% probabilidad crítica | 5% durabilidad, sustituida por 15% mientras está por encima de 50% vida. | Ejecución de especificación probada; ver límites comunes |
| Mangual del guerrero | Cinturón de gigante + Guantes de combate | 10% velocidad de ataque; 150 vida; 20% probabilidad crítica | Cada crítico: 5% amplificación durante 5 s, hasta 4; renovación pendiente. | BLOQUEADO: Amplificación base y renovación exacta de acumulaciones |
| Fajín de mercurio | Guantes de combate + Capa negatrón | 15% velocidad de ataque; 20 RM; 20% probabilidad crítica | 18 s de inmunidad a control; 3% velocidad de ataque acumulable cada segundo. | Ejecución de especificación probada; ver límites comunes |
| Sombrero mortal de Rabadon | Vara innecesariamente grande + Vara innecesariamente grande | 55 AP | 15% de amplificación de daño. | Ejecución de especificación probada; ver límites comunes |
| Mejora roja | Arco curvo + Arco curvo | 45% velocidad de ataque | 45% velocidad de ataque; quemadura 1% y herida 33% durante 5 s. Amplificación pendiente. | BLOQUEADO: Amplificación contradictoria (3/6) |
| Capa de fuego solar | Chaleco de cadenas + Cinturón de gigante | 20 armadura; 150 vida; 8% vida máxima | Cada 2 s: 1% quemadura verdadera y 33% herida en radio 2 durante 10 s; selecciona al azar con prioridad de enemigos no quemados. | Ejecución de especificación probada; ver límites comunes |
| Rostro espiritual | Lágrima de la diosa + Cinturón de gigante | 300 vida; 2 maná/s | 10% durabilidad; cada 1 s cura 2% de vida faltante, con tope 250. | Ejecución de especificación probada; ver límites comunes |
| Furia del kraken | Capa negatrón + Arco curvo | 10% AD; 10% velocidad de ataque; 20 RM | Cada ataque acumula 3,5% AD hasta 15; después concede 15% velocidad de ataque. | Ejecución de especificación probada; ver límites comunes |
| Lanza de Shojin | Espadón + Lágrima de la diosa | 15% AD; 15 AP; 1 maná/s | Cada ataque añade 5 maná. | Ejecución de especificación probada; ver límites comunes |
| Mortaja de la quietud | Capa negatrón + Cinturón de gigante | 20 RM; 250 vida | 30% reducción de armadura en radio 2; 15 armadura y RM durante los primeros 15 s. | Ejecución de especificación probada; ver límites comunes |
| Bastón del Vacío | Arco curvo + Lágrima de la diosa | 35 AP; 15% velocidad de ataque; 1 maná/s | Daño de ataques y habilidades: 30% reducción de RM durante 5 s; no suma intensidad. | Ejecución de especificación probada; ver límites comunes |
| Calibrador de Sterak | Espadón + Cinturón de gigante | 45% AD; 300 vida | Al 60% vida: escudo de 40% vida máxima, desaparece durante 4 s; curva no probada. | BLOQUEADO: Curva exacta de desaparición del escudo |
| Guantes de ladrón | Guantes de combate + Guantes de combate | 150 vida; 20% probabilidad crítica | 2 objetos aleatorios por ronda; ocupa 3 huecos. No se aproxima el sorteo. | BLOQUEADO: Distribución y exclusiones del sorteo oficial |
| Resolución titánica | Chaleco de cadenas + Arco curvo | 10% velocidad de ataque; 20 armadura | Al atacar o recibir daño: 2% AD y 2 AP, máximo 25; al máximo 10% amplificación e inmunidad a control. | Ejecución de especificación probada; ver límites comunes |
| Mano de la justicia | Lágrima de la diosa + Guantes de combate | 1 maná/s; 20% probabilidad crítica | 18% AD y 18 AP, duplicados por encima del 50% vida; 12% omnivampirismo, duplicado por debajo. En 50% exacto, ninguno se duplica. | Ejecución de especificación probada; ver límites comunes |
| Armadura de Warmog | Cinturón de gigante + Cinturón de gigante | 500 vida; 18% vida máxima | 18% vida máxima; porcentajes de vida sumados después de bonificaciones planas. | Ejecución de especificación probada; ver límites comunes |

## Límites comunes y compatibilidad

- Esta comprobación valida parámetros publicados y ejecución determinista en EUNUCO; no es una comparación binaria contra el servidor propietario de Riot. Los nombres y descripciones pueden sustituirse en `tft185-presentation.json`; null utiliza la explicación original generada desde operaciones.
- Simulación de 100 ms, reglas de overtime y habilidades propias de EUNUCO. Se conservan sus costes y prohibiciones personales de crítico (por ejemplo, activas declaradas `canCrit:false`); Precisión no las borra. No se afirma igualdad global de ambos motores.
- Roles para las condiciones del equipo se asignan mediante política versionada: DOLEA tanque, VARGAS asesino, JARAMILLO lanzador, FLORIN luchador; provisionales según su rol temporal. No se inventan habilidades personales.
- Las recetas bloqueadas conservan componentes si se intenta combinarlas; tampoco entran en sorteos ejecutables. No se ha sustituido el comportamiento desconocido por una aproximación.
- Catálogo de equipo nuevo `f0p11b-18.5-1`; contenido/reglas de partidas nuevas `f0p11b-1`. P11A y todos los catálogos previos permanecen registrados.
- Las pruebas individuales de las 36 recetas distinguen éxito o rechazo por falta de verificación, conservación, nombres y ejecución repetible. Pruebas adicionales comprueban cantidades, disparadores, límites, duraciones y condiciones compartidas. El rechazo de un pendiente no cuenta como prueba de su efecto.
