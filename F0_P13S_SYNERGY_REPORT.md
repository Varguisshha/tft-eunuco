# F0-P13S — Mecánicas de sinergias en LOCAL

Base: P12J `d38f18bb8e0c4279c9ac92883942200225f0cb94`.
Rama: `codex/f0-p13s-synergy-mechanics`. P13B permanece separado e intacto.
No push, Railway ni Supabase remoto.

## Auditoría previa y decisiones declarativas

P12J contiene 34 personajes, 12 integrantes de Hortaleza y 13 UPM. UPM activa actualmente Créditos, no una invocación. No existe perfil base, habilidad ni estadísticas verificables para CARRASCO. La política P13S sustituye Créditos exclusivamente en partidas nuevas y registra el umbral acumulado; la invocación competitiva permanece bloqueada. No se inventan parámetros definitivos.

Hortaleza antes concede vida/armadura a miembros en 2/4; la nueva política sustituye esto por aportaciones a todo el equipo en 2/3/4/5/6. Asignaciones antes de habilitar:

| Integrante    | Aportación                   | Justificación              |
| ------------- | ---------------------------- | -------------------------- |
| JARAMILLO     | +5 % AD                      | Aprobada; tirador de apoyo |
| COSMIN        | +5 % AP                      | Aprobada                   |
| DOLEA         | +8 armadura                  | Tanque                     |
| EMANUEL       | +100 vida                    | Gym/Pancho                 |
| HENLLER       | +5 % velocidad de ataque     | Valo/cadencia              |
| ALVARO        | +5 puntos crítico            | Valo/precisión             |
| MANUEL        | +8 resistencia mágica        | Pancho/protección          |
| ALFREDO POCHO | +5 % curación y escudos      | UPM/apoyo                  |
| ALEX          | +5 AD plano                  | Extensión tipada           |
| DANIGM        | +5 AP plano                  | Extensión tipada           |
| TITI          | +5 % vida                    | Gym/Pancho                 |
| ALFREDO       | +5 % velocidad de movimiento | Extensión tipada           |

Estas aportaciones no crean habilidades individuales ni convierten los roles provisionales en definitivos. Solo cuentan identidades distintas desplegadas. ×1/1,2/1,4/1,6/1,8; enteros milli, un floor por aportación antes del selector central de estadísticas. AP porcentual sobre AP base cero da cero, igual que el contrato de modificadores existente.

Fantasy y Shisheros estaban pendientes de efectos en P12J. Se implementan en P13S. Fantasy ofrece tres tipos distintos uniformemente sin reemplazo, elegidos por RNG propio del servidor. Capacidad 1/2/3 según 2/4/6 miembros. Cuesta 1 oro y paga premio bruto. Una selección que deja de ser válida al congelar la formación se anula y devuelve su coste antes de emparejar. No revela rival durante la selección.

Fuerza pública inicial: suma por unidad de vida efectiva inicial + 10 × AD + 10 × AP + 5 × (armadura positiva + resistencia positiva). Estrictamente menor para contra pronóstico; igualdad no cumple. No usa resultados futuros.

El muro: daño efectivo enemigo a vida + escudos; no incluye autosacrificio ni daño aliado. El umbral requiere total mayor que cero. Remontada individual exige atribución de eliminación, no daño visual. Supervivientes y bajas solo entre unidades iniciales, no invocaciones nuevas.

Jew y Todo al Rojo estaban pendientes. Interés adicional sobre oro actual antes de cualquier ingreso de cierre; mayor estrella de Peibol si hay duplicados. Se suma al interés normal, que conserva su banco congelado y límite. No hay liquidación del dueño por el duelo de su clon.

Ruleta al comienzo de ronda con DaniGM desplegado en ese momento; mayor estrella si hay duplicados. Inicio de ronda 1 tiene formación vacía. Subresultados uniformes y cantidades inclusivas. Tabla de pérdidas 3★ aplicada literalmente; contradice la frase anterior «pérdidas reducidas» y queda pendiente decisión de balance. Jackpot usa dos tiradas positivas independientes y secuenciales.

Transformación mantiene ID, posición, estrellas y equipo; limpia progreso específico de la identidad anterior. Reserva exactamente 1/3/9 copias de un destino disponible del coste adyacente y devuelve las anteriores. Coste 4/5 ausente, pool insuficiente o frontera: no-op por unidad con causa. No se inventan campeones. Regalos con banquillo lleno se reservan en cola persistente; componentes usan la cola de inventario existente. Pérdida de componente solo afecta componentes sin equipar; pérdida de personaje solo al banquillo, devolviendo sus objetos. No se retiran objetos equipados al azar.

## Contrato nuevo y alcance implementado

Código validado: `82cd59911792797e6f0d50103bca24caa6d7ec82`.
Implementación principal: `3e04629a8714e5280edbe96d0cf663818ab1bb00`.
El commit de cierre documental se registra por separado; no altera ese código.

La política de economía `synergyPolicy: f0p13s-1` y las reglas de combate `f0p13s-1` son opt-in. El catálogo de 34 personajes y el catálogo de objetos permanecen en sus versiones anteriores; no se modifican sus estadísticas, habilidades ni recetas. P12J continúa usando sus reglas anteriores por defecto.

Se han implementado Hortaleza, los ocho tipos de Fantasy, Shisheros, Jew y Todo al Rojo. Las quince frases narrativas aprobadas aparecen en los tooltips de P13S, junto a sus escalones y miembros. Las sinergias ajenas a estos cambios, incluida Lencería, mantienen sus mecánicas.

### UPM y bloqueo explícito de CARRASCO

Se congelan al inicio la suma de estrellas, número de cuerpos UPM desplegados, vida efectiva conjunta y multiplicadores. Las identidades distintas determinan el escalón; los cuerpos desplegados determinan la media de estrellas. El exceso sobre 1★ concede +12 % de vida, +8 % de daño y +5 % de armadura/resistencia por estrella media adicional. Con media 1/2/3★ los multiplicadores son, respectivamente, vida ×1/1,12/1,24; daño ×1/1,08/1,16; defensas ×1/1,05/1,10.

El motor acumula daño efectivo a vida: los escudos no lo incrementan y las curaciones no lo descuentan. Registra el tick exacto de activación y los umbrales 50/40/30/25 % para 2/4/6/8 identidades. La información queda en snapshots y replay, también con clones.

**Pendiente:** no existe un perfil base válido de CARRASCO ni sus cuatro habilidades. Se registra `missing-carrasco-base-profile` y no aparece una unidad ficticia. Invocación efectiva, targeting propio, muerte y resolución de victoria de esa invocación no se presentan como finalizados ni probados. El escalón 8 queda reservado: el límite actual de despliegue es 7. No se ha ampliado ese límite.

### Fantasy

| Predicción                 | Condición                                                               | Premio bruto |
| -------------------------- | ----------------------------------------------------------------------- | -----------: |
| Supervivencia ajustada     | Victoria con 1 o 2 supervivientes iniciales                             |            4 |
| La remontada               | Victoria perdiendo al menos la mitad de la formación inicial            |            5 |
| Victoria contra pronóstico | Victoria con fuerza inicial estrictamente menor                         |            5 |
| El intocable               | Unidad elegida viva y nunca por debajo de 50 % de vida máxima           |            3 |
| Doble eliminación          | Dos bajas enemigas iniciales separadas por un máximo de 10 ticks        |            4 |
| Último segundo             | Victoria tras alcanzar overtime                                         |            6 |
| El muro                    | Unidad elegida recibe al menos 30 % del daño efectivo enemigo al equipo |            3 |
| Remontada individual       | Unidad elegida baja de 25 %, sobrevive y tiene eliminación atribuida    |            4 |

Las ofertas y selecciones son privadas y persistentes. La selección cuesta 1 oro, respeta cuota y no admite repetir tipo. El servidor congela y valida las selecciones antes de emparejar. La evidencia procede de eventos lógicos y estados del combate: mínimos de vida, daño efectivo a vida/escudo, bajas atribuidas y overtime. No usa animaciones. Los recibos impiden cobrar/pagar dos veces tras reconexión o restauración.

### Shisheros

La canalización termina exactamente en 60/40/30 ticks. Mientras dura bloquea ataques, habilidades y carga normal, con 30 % de reducción tras mitigación y antes de escudos. Los supervivientes reciben +15/25/40 % AD/AP y +0/10/20 % velocidad de ataque hasta terminar. La muerte durante el canal impide recibir la mejora. Política de interrupción explícita: un stun no reinicia el reloj de canalización; cuando termina el canal el stun continúa impidiendo acciones mientras siga vigente. Hay regresión de este comportamiento y de overtime.

### Jew y cierre económico

Se usa Peibol desplegado en el input congelado; duplicados utilizan la mayor estrella. Fórmula exacta `min(floor(banco × porcentaje), límite)`, con 10/15/20 % y límites 2/4/8. El banco se captura antes de los ingresos de cierre. El interés normal mantiene su cálculo y límite históricos; Jew se añade mediante un recibo separado en el diario de sinergias y el ledger. No se reescribe el contrato histórico de recompensa normal. Cada jugador real liquida una vez; el combate de su clon no genera un segundo pago al propietario.

### Todo al Rojo

Probabilidades exactas por cada 100 resultados: 1★ y 2★ = 5 jackpot/45 éxito/50 fallo; 3★ = 10/50/40. Oro ganado o perdido: 1–3/4–8/9–15. Vida ganada o perdida: 1–7/8–14/15–25. La ganancia de vida permite superar 100 y la pérdida deja al menos 1. Los cinco subresultados de cada categoría son equiprobables. Dos recompensas de jackpot pueden coincidir y se aplican secuencialmente.

Cada unidad se transforma en orden estable, preservando ubicación, estrellas y objetos. Se verifica el pool antes de reservar destino. Las transformaciones y regalos pasan por las fusiones existentes al comenzar la ronda. Un regalo reservado por banquillo lleno se entrega cuando hay hueco; esa entrega posterior no fuerza por sí sola una fusión adicional: se incorpora a la siguiente operación normal de fusión. Esta política evita inventar copias o borrar equipamiento y queda documentada para su evaluación de balance.

## RNG, autoridad y persistencia

El diario de sinergias tiene versión explícita, RNG uint32 independiente y selección uniforme mediante rejection sampling. No utiliza `Math.random`. Almacena ronda, unidad disparadora y estrellas, resultado, cambios efectivos, RNG anterior/posterior, transformaciones y recibo aplicado. Predicciones, interés y ruleta disponen de claves de idempotencia por ronda y categoría.

El RNG completo solo se conserva en el snapshot autoritativo. La vista privada del cliente recibe cero en los campos RNG y la categoría de ruleta sin la tirada numérica. Las ofertas ya publicadas pueden verse; el cliente no decide ni consume azar. La autoridad conserva su única transacción de commit; no se ha añadido un segundo escritor.

La cola de campeones reserva sus copias en el pool. Se contabiliza al restaurar, validar conservación, eliminar jugadores y liberar copias. Los componentes destruidos sin equipar quedan registrados para conservar el balance de inventario. Los cambios de vida de ruleta se intercalan por índice en el ledger de salud, sin reescribir daños históricos.

El sobre SQL de snapshots sigue en versión 1; el contrato embebido nuevo está identificado por reglas, política, diario versionado y fingerprint nuevos. Un lector histórico que desconozca P13S no debe aceptar ese estado. Los lectores actuales conservan las 19 combinaciones históricas. No se han ejecutado migraciones remotas.

Fingerprint nuevo `P13S_CATALOG_HASH`:

`f738f224b56e374b9e8225f63e2744c0b34ef2da91a03f2bf3f82cbfb10156d8`

Incluye el hash P12F, configuración, traits nuevos, aportaciones y políticas declarativas, predicciones y marcador de ejecución `p13s-runtime-1`. Las 19 huellas de P12J están congeladas en `apps/server/src/persistence/fixtures/p12j-fingerprints.json` y se comprueban contra la base independiente. El hash P12F histórico sigue siendo `2efe29720393226ccefb0c26f74ebcbb3f2733cc8b0a8e6cba7e831e5fb40adc`.

## Uso y visualización LOCAL

- Partida offline: arrancar la web de desarrollo y abrir `/?rules=p13s`.
- Multijugador administrado: `pnpm dev:local -- --synergies=p13s`.
- Apagar ese laboratorio: `pnpm stop:local`.

El launcher separa la identidad de datos del modo por defecto y de P13S. Se verificó con una sala privada real LOCAL y dos clientes SDK: ambos recibieron la política nueva, sin RNG privado. El proceso administrado se cerró después de la prueba. El build público no habilita el selector DEV ni publica el laboratorio visual.

Se conservan Festival Pop × Neon Playground, retratos y ambas arenas. A 1280×720 se verificó ausencia de scroll general horizontal/vertical en Mar de Cristal y Cafetería. Los tooltips conservan lore, estadísticas, escalones y retratos de miembros; Hortaleza muestra sus doce aportaciones una vez. Fantasy permite elegir unidad, muestra las tres ofertas reales, cuota, estado y coste confirmado (50 → 49 oro, 0/2 → 1/2). UPM muestra pérdida, media congelada y bloqueo explícito.

Evidencias locales ignoradas por Git:

- `artifacts/p13s/mar-fantasy.png`.
- `artifacts/p13s/upm-hortaleza.png`.
- `artifacts/p13s/upm-hortaleza-members.png`.
- `artifacts/p13s/local-mode.json`.

Se reutilizaron componentes, tokens y tooltip existentes. La revisión de diseño detectó 34 avisos consultivos en estilos heredados, anteriores a las líneas nuevas; no se amplió el alcance para rediseñarlos.

## Validación final

Todos los gates siguientes terminaron con salida 0 sobre el código de `82cd59911792797e6f0d50103bca24caa6d7ec82`, ejecutados secuencialmente:

| Comprobación                        | Resultado                                                                                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                        | TypeScript y ESLint correctos; 1876 pruebas pasan y 46 opt-in se omiten aquí; builds web/servidor correctos. 155 archivos pasan y 5 se reservan para opt-in. Pruebas: 242,91 s. |
| Opt-in separados, cinco archivos    | 46/46 pasan en 349,97 s: persistencia y SIGKILL históricos/P13S, exclusión de autoridad PostgreSQL, HTTPS/WSS y lifecycle LOCAL.                                                |
| `pnpm build:local`                  | Correcto.                                                                                                                                                                       |
| `pnpm verify:public`                | Correcto: 44 iconos originales, cero oficiales LOCAL incluidos; sin controladores ni herramientas DEV en el bundle.                                                             |
| `pnpm verify:release`               | Correcto: 1351 blobs auditados, cero fallos detectados de secretos/assets prohibidos en el historial.                                                                           |
| `pnpm verify:railway`               | Correcto, inspección exclusivamente local de IaC, sin aprovisionar ni consultar el proveedor.                                                                                   |
| Laboratorio histórico independiente | 603 A/A y 603 A/B sin diferencias; 19 restauraciones y tres casos de progreso persistente; 20,24 s.                                                                             |
| `git diff --check`                  | Correcto.                                                                                                                                                                       |

Los 1922 tests de la suite quedan así ejecutados entre la campaña normal y la opt-in, sin omisiones pendientes. Los logs están en `artifacts/p13s/final-{check,opt-in,local-build,public,release,railway,historical,diff}.log`; el resultado y la procedencia A/B están en `artifacts/p13s/historical-equivalence/{result,provenance}.json`, con candidato `82cd599` y referencia `d38f18b`.

Las regresiones nuevas cubren escalado y bloqueo UPM, duplicados, umbrales, aportaciones, los ocho evaluadores de Fantasy, cuotas y cobros, canalización exacta, stun, muerte, Jew, distribución de ruleta, ambos signos de recompensa, jackpot, fronteras de coste, inventarios llenos, colas, pool, equipamiento, eliminación y fin de partida. No se atribuye cobertura de invocación real a la prueba del bloqueo.

Las campañas de autoridad y red usan 2/3/4 jugadores, clones, restauración y reconexión. Los doce escenarios SIGKILL de P13S cruzan esos tamaños con antes/después de commit tanto en cierre de combate como en comienzo de ronda/ruleta. PostgreSQL es un clúster desechable en loopback; HTTPS/WSS utilizan una CA local de prueba, sin desactivar validación TLS.

La equivalencia histórica usa motores separados: referencia reconstruida con `git archive` del SHA P12J exacto y candidato actual, con verificación de procedencia de módulos. Compara eventos y snapshots íntegros sin normalizar diferencias. No se basa únicamente en repetir el mismo motor. Las pruebas de sensibilidad modifican un evento y un estado para confirmar que el comparador los detecta.

Incidencia del laboratorio: una primera campaña se vio afectada por reposo/DarkWake del Mac y por fuentes originales de sprites ausentes en este worktree. Se comprobaron los registros del sistema, se prepararon fuentes LOCAL mediante SHA exactos y se repitió el gate completo con `caffeinate -dims` limitado al proceso. No se cambiaron ajustes persistentes del Mac, aserciones, cobertura ni límites existentes (estrés 5000 ms y reproducción 16,7 ms). Los recursos oficiales de referencia siguen fuera de Git y de los builds públicos.

## Pendientes y estrategia de integración

1. Definir y aprobar las cuatro bases/habilidades de CARRASCO antes de activar su invocación competitiva y probar su ciclo de vida real.
2. Resolver la contradicción de pérdidas a 3★. Se aplica la tabla solicitada; no se afirma que reduzca pérdidas.
3. Evaluar el balance de las doce aportaciones de Hortaleza, la métrica pública de fuerza y la política de regalos pendientes. Son reglas nuevas documentadas, no una equivalencia histórica.
4. Costes 4/5 no existen en el roster; las transformaciones sin destino registran no-op. No se han inventado personajes.
5. Los avisos heredados del build sobre tamaño de chunks y futura carga nativa de configuración Vite no impiden los gates actuales. No se han ocultado ni alterado dependencias para silenciarlos.

P13B B0/B1 se conserva separado. Una integración futura deberá trasladar el contrato P13S sobre la abstracción ya validada, resolver los puntos comunes de combate/datos y repetir equivalencia histórica y pruebas nuevas. No se ha iniciado B2–B4 ni mezclado genealogías durante esta fase.

**Estado externo:** no se ha hecho push ni consultado/modificado Railway o Supabase remoto durante P13S. No se afirma un estado actual del proveedor sin consulta. Ninguna publicación forma parte de esta entrega.

Cierre del laboratorio: PostgreSQL propio en 55439 detenido después de verificar cero conexiones ajenas; los servicios de prueba LOCAL, Vite y sus pestañas de validación se cerraron. Los worktrees P12J (`d38f18b`) y P13B (`88c06fb`) siguen limpios y en sus HEAD previos. Solo quedan commits locales de P13S.
