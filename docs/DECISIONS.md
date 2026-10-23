## F0-P6A.1 — pasivas visibles y escudos autoritativos

- Auditoría inicial y 314 pruebas correctas. P6A preservado en `d3ddc8d`; originales excluidos, sin push.
- El problema era visual: Volumen eterno se activaba y su escudo absorbía daño. No se cambian motor, contratos, balance, economía, Overtime ni reloj.
- Un adaptador puro comparte lectura de contadores/eventos entre Phaser, inspector local y Arena. Sin contadores se muestra «Sin datos»; preparación expresa disponibilidad futura.
- Escudo cian contiguo a vida, valor exacto y contorno defensivo; ninguna animación conserva cantidades agotadas. El indicador positivo representa la concesión real, no la variación de HP.
- Ventana de feedback separada de 1600 ms, prioridad visual para selección y límite de ráfagas para reducir saturación. Reducción de movimiento sin desplazamiento de cifras.
- Diagnósticos aislados de sinergias y navegación por eventos solo en Arena. Miembros ficticios fuera del roster. No se modifica el HUD general ni se añade audio.
- 332 pruebas en 30 archivos y controles de tipos/lint/build correctos. [Informe, capturas y límites](F0_P6A1_REPORT.md). P6B no iniciado.

## F0-P6A — decisiones de habilidades y sinergias

- Una habilidad principal activa, pasiva o mixta; una sola identidad visual. Pasiva pura sin maná ficticio.
- Contratos estrictos v1, listas acotadas, triggers tipados y estado serializable. Sin código arbitrario ni ramas por personaje.
- Una activación por regla/tick y máximo por combate. Daños simultáneos comprometidos preceden al escudo reactivo; muerto no activa pasiva.
- Sinergias por definiciones desplegadas distintas, umbral mayor por defecto y preparación sobre clones. Sin acumulación entre rondas.
- DOLEA: escudo12 % de vida efectiva una vez bajo50 %, activa0/70maná con100/180/324daño y20armadura4s renovable. Balance en datos, estrellas explícitas, fallback Ability→Attack.
- Nuevo catálogo `f0p6a` y reglas `f0p6a-1`, manteniendo wire v3 y perfiles históricos. No migrar automáticamente el balance de partidas anteriores.
- Iconos SVG originales pequeños en registro visual; lateral y tooltip propios preservan arena/dock. Las unidades de diagnóstico no entran al pool.
- P5.3 y banquillo flotante preservados en `335df32`; originales excluidos, sin remoto/push. F0-P6B no iniciado.

## F0-P5.2 — decisiones de arena

- Fuente exacta nueva de la raíz, identificada por SHA-256; WebP sin pérdida con igualdad de píxeles, original intacto.
- Homografía por convergencia del pavimento (residual afín aproximado 107 px tras ampliar la cuadrícula). Inversa + redondeo cúbico lógico; no nearest-center proyectado.
- Contrato visual independiente del motor, con 56 celdas y perímetro validado por todos sus vértices.
- Calibración exclusiva de desarrollo, persistencia separada, rechazo de propuestas inválidas y restauración oficial al cerrar.
- Fondo y mundo bajo una cámara uniforme; el cartel de Carrefour y el campo completo tienen prioridad sobre cover, según el ajuste solicitado. Se admite espacio lateral del color del HUD y zoom acotado.
- Escala uniforme suave por Y, pies del manifiesto, sombras bajo cuerpos y orden por apoyo; sin deformación de sprites.
- F0-P5.1 preservado en `7fc1ec6`; ningún original añadido a ese commit. Sin remoto/push, dependencias nuevas o cambios de autoridad. [Informe](F0_P52_REPORT.md).

## F0-P5.1 — decisiones de HUD V2

- Campo continuo con rail flotante y ficha contextual, eliminando espacio derecho reservado.
- Banquillo encima de tienda; economía y acciones frecuentes a sus extremos, siempre visibles en escritorio.
- Clic vacío deselecciona; arrastre y colocación por teclado/controles mantienen comandos existentes. Inspección rival y combate es lectura, nunca un comando de juego.
- Ajuste visual0,32 y márgenes de cámara mantienen cabezas y terreno fuera del rail. Inspector no modifica cámara y puede solapar su borde derecho.
- Se conserva borde inferior por coste solicitado en cartas pese al aviso estilístico del detector.
- Sin cambios de paquetes lógicos, sprites originales, pipeline, reloj ni persistencia; F0-P6 fuera de alcance.

# Decisiones técnicas

Fecha de consulta y ejecución: **22 de octubre de 2026**.

| Decisión                                          | Motivo                                                                | Estado                   |
| ------------------------------------------------- | --------------------------------------------------------------------- | ------------------------ |
| React + TS + Vite, pnpm y Vitest                  | Stack del encargo                                                     | Confirmada               |
| Phaser 4.2.1 fijado                               | Última estable publicada, verificada en sitio oficial y registro npm  | Verificada               |
| Renderer WebGL                                    | Canvas renderer está deprecado en v4                                  | Confirmada               |
| Axial + límites odd-r                             | Distancia/vecinos simples y rectángulo de 7 × 8                       | Técnica de esta fase     |
| Proyección en web, no en core                     | Cámara y resolución no alteran reglas                                 | Confirmada               |
| Array de unidades como única ocupación            | Máximo 56 casillas; evita dos fuentes de verdad                       | Técnica de esta fase     |
| Zod para contratos                                | Validación runtime además de TS                                       | Técnica de esta fase     |
| Store local observable                            | React y Phaser comparten snapshots sin frameworks de estado extra     | Técnica de esta fase     |
| Paquetes privados con exports TS fuente           | Build único; evita empaquetado innecesario                            | Técnica de esta fase     |
| apps/server solo README                           | Reservar frontera sin instalar un servidor ficticio                   | Ajuste menor documentado |
| Definiciones test-\*; habilidades ficticias en P2 | Sin personajes reales; efectos de prueba documentados                 | Provisional              |
| Mitades north/south                               | Lados del duelo, no IDs de jugadores multijugador                     | Provisional              |
| Copias ilimitadas y cuatro unidades iniciales     | Facilitar pruebas de tablero sin economía                             | Provisional              |
| Arena oscura jade/ámbar                           | Preferencia visual confirmada por el usuario                          | Confirmada               |
| Texturas por canvas 2D original                   | Arte provisional generado por código; Phaser sigue renderizando WebGL | Confirmada               |
| TICK_MS = 100, seed uint32                        | Ticks y PRNG deterministas implementados en P2                        | Confirmada               |
| ESLint 10 en lugar de 9                           | La instalación inicial advirtió que 9 ya no recibe soporte            | Verificada               |

## Fuentes primarias consultadas antes de implementar Phaser

- [Descarga oficial de Phaser](https://phaser.io/download): versión estable 4.2.1.
- [Releases oficiales](https://github.com/phaserjs/phaser/releases): v4.2.1, 9 de julio de 2026.
- [Guía de migración fijada a v4.2.1](https://github.com/phaserjs/phaser/blob/v4.2.1/changelog/v4/4.0/MIGRATION-GUIDE.md): renderer nuevo, Canvas deprecado, Vector2 en lugar de Point, cambios de cámara y utilidades retiradas.
- [InputPlugin, API v4](https://docs.phaser.io/api-documentation/class/input-inputplugin): eventos de puntero.
- [Pointer, API 4.0](https://docs.phaser.io/api-documentation/4.0.0/class/input-pointer): coordenadas de puntero.
- Registro npm consultado con `npm view phaser version`, resultado 4.2.1. La dependencia instalada y el lockfile fijan esa versión.

Se contrastaron las llamadas con los tipos distribuidos por Phaser 4.2.1. No se usan pipelines de v3, Geom.Point, TextureManager.generate, setTintFill, FX antiguos ni acceso directo a matrices internas. La primera comprobación de tipos detectó que Graphics exige Vector2[]; se corrigió con conversiones en el adaptador de render, conservando Point puro en core.

## Decisiones F0-P2

| Decisión                                                       | Motivo / alcance                                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Protocolo 2 separado del contrato P1                           | Preserva compatibilidad de preparación y pruebas; versiones desconocidas se rechazan |
| Mulberry32, orden por ID y rotación por tick                   | Reproducibilidad sin idioma, reloj o FPS; conflictos de reserva explícitos           |
| Carga entera de ataque conservando resto                       | Cadencia fraccionaria sin deriva por redondear cada intervalo                        |
| Apoyo antes de daño, muertes después de impactos comprometidos | Define escudos/stuns simultáneos y permite muertes mutuas                            |
| A\* hacia posiciones de ataque, origen y destino reservados    | Sin superposición, swaps ni atravesar aliados; espera acotada por 300 ticks          |
| Habilidades como datos y perfiles completos en entrada         | Extensión por efectos; replay conserva datos aunque cambie catálogo                  |
| Traza local precomputada + reproductor independiente           | Resultado independiente de pausa, velocidad y FPS; futuro transporte fuera del motor |
| Snapshots en lotes, además de eventos                          | Reproductor actual no reconstruye todo el estado exclusivamente desde eventos        |
| Arena interna permanente                                       | Herramienta útil incluso al existir futura pantalla real; sin rediseño prematuro     |
| Arte original provisional y jade/ámbar                         | Preferencia confirmada; roster de amigos y terreno profundo para fase visual futura  |
| Sin nuevos servicios/dependencias                              | No Colyseus, Supabase, economía ni cuentas en esta entrega                           |

La auditoría encontró los 48 archivos nuevos anunciados en P1, sin cambios ajenos detectados ni coincidencias de credenciales en el escaneo. `pnpm check` confirmó 35 pruebas antes de editar. Commit inicial autorizado: `279be4d`; no se configuró remoto ni se hizo push. Evidencia y límites en VALIDATION.md.

Fuentes Phaser consultadas para P2: [Graphics](https://docs.phaser.io/api-documentation/class/gameobjects-graphics) y [ciclo de escenas](https://docs.phaser.io/phaser/concepts/scenes), contrastadas con los tipos instalados de 4.2.1. La lógica de simulación es propia y no depende de física Phaser.

## Decisiones F0-P3

- Base P2 verificada con73 pruebas;33 archivos de cambios coherentes con el hito, escaneo de patrones sin coincidencias de secretos. Commit42f70bd preserva P2. Sin cambios ajenos detectados, remoto o push.
- Configuración f0p3-1 validada y guardada junto a historial; probabilidades propias para costes1–3. Referencia histórica de rachas documentada en ECONOMY_SPEC, sin atribuir tablas propias al TFT actual.
- Interés congelado al iniciar combate; recompensa calculada una vez al resolver. Empate rompe racha. Oro entero máximo999, overflow explícito.
- Oferta reserva una copia al generarse. Compra transfiere reserva; renovación y venta devuelven copias. Fusión mantiene equivalencia1/3/9.
- Venta reembolsa coste íntegro de copias como adaptación local explícita. XP compacta y rival por rondas propios para probar decisiones, no balance final.
- Secuencia/revisión y transacción clonada rechazan acciones repetidas/obsoletas sin efecto. Invariantes de pool, ledger, posición y catálogo en cada transacción.
- RNG tienda/combate separados. Pausa, zoom y selección no participan en reglas económicas.
- Partida local independiente de Arena, con puerto de tablero compartido y componentes originales. CLI21st no disponible; no se instalaron servicios ni se generaron assets externos. Se siguió el criterio de reutilización de21st-ui-build con estilos/primitivas existentes; no se afirma revisión automática21st ejecutada.
- Guardado local verificable mediante replay, sin pago por montaje o recarga. No es antitrampas ni sincronización entre pestañas.
- F0-P4 no iniciado; cuentas, multijugador, objetos, aumentos, carrusel, sinergias y arte definitivo fuera de alcance.

## Decisiones F0-P3.1 — 23 de octubre de 2026

- Auditoría previa: 118 pruebas correctas, 36 archivos P3 coherentes con el hito y escaneo de credenciales sin coincidencias. P3 preservado en `4302eec`, sin remoto ni push.
- 300 ticks normales y 150 de overtime, con 450 como comprobación terminal sin acciones. Misma convención para límites reducidos de test; se ajustan dos fixtures antiguas para incluir sus impactos antes del nuevo límite exclusivo.
- Interpolación entera entre ticks300 y449, multiplicadores al aplicar efectos/carga, sin acumulación en perfiles. Daño de proyectiles se amplifica al impactar, incluso si se lanzó antes del overtime.
- Protocolo3 y reglas f0p3.1-1 explícitos. Contratos v2 históricos preservados; sin migración silenciosa de guardados ni replays. Guardado P3 intacto bajo su clave original.
- double_loss reinicia ambas rachas conceptuales a0 y no paga bonus; no equivale a derrota normal que inicia/acumula racha negativa. Registro de daño identifica a ambos como perdedores.
- Vida mínima100 y daño por tramos de3 rondas más supervivientes ponderados1/2/3; cifras propias configurables. HP mínimo0, sin eliminación global: permite seguir probando. Rival local conserva sus formaciones; no se le inventa economía.
- Vida, oro, XP y racha se liquidan en una sola acción; registros verificables y restore por replay. La UI nunca propone un ganador ni el daño de ronda.
- Indicador Phaser y contador DOM compartidos por ambas vistas; transición calculada desde reloj visual, sin temporizadores que continúen durante pausa. Escenarios sintéticos únicamente en Arena técnica.
- Sin dependencias nuevas, servicios ni F0-P4.

## Decisiones F0-P4 — 23 de octubre de 2026

- Auditoría inicial:161 pruebas correctas, tipos/lint/build/formato correctos;38 archivos pendientes coherentes con P3.1. Preservados en `1079713`, sin remoto ni push.
- HUD de viewport para escritorio, sin ocultar overflow del documento. Registros en diálogo e inspector contextual con scroll interno; tienda y banquillo permanecen fuera de esos paneles.
- Economía compacta abajo a la izquierda para reservar altura al tablero. Solo dos participantes reales del prototipo, ordenados por vida; no se inventa clasificación online.
- Encuadre adaptativo y compresión vertical0,38 exclusivos de Partida. Reutilización de escena/render y geometría lógica; Arena mantiene su cámara/proyección técnica.
- DPR acotado a2; cambios de tamaño/densidad redimensionan el buffer y cámara, no la partida. Drops normalizados al tamaño del render.
- Disponibilidad de compra consultada al core sobre copia; evita replicar la excepción de fusión con banquillo lleno. Pruebas verifican inmutabilidad de saldo, ofertas y RNG.
- Los hijos visuales de casilla no capturan pointer-events: corrige drops horizontales rápidos que terminaban entrando en un span en el último movimiento.
- Skill redesign-existing-projects aplicada al stack existente, conservando jade/ámbar por petición del usuario. Sin dependencias, servicios, ilustraciones o sprites definitivos nuevos.
- Reloj visual preparado mediante propiedad opcional, sin activar preparación30s ni transición5s. F0-P5 queda pendiente.

## Decisiones F0-P4.1

- Auditoría inicial:172 pruebas y check completos correctos. Cambios pendientes pertenecían a P4; Sprites era aporte del usuario. Se conservan sin commit automático, remoto ni push. F0-P5 no iniciado.
- Arte suministrado:16 originales y16 duplicados exactos. Fuentes inmutables, hashes auditados; pipeline reproducible con sharp de desarrollo y derivados locales.
- Catálogo explícito para nuevas partidas; listas antiguas congeladas para no romper RNG/historial. No cambia la tabla económica ni las reglas del combate.
- Contrato universal con slots nulos y resolver visual;3★ usa2★ sin alterar datos. Reproducción por muestreo, no callbacks con efectos mecánicos.
- Impactos3/6 provisionales por inspección del arte; secuencias con varios puñetazos mantienen un solo ataque autoritativo.
- Alpha<=8 se limpia solo en derivados; nearest-neighbor y escala por evolución, apoyo inferior estable. No se generan ilustraciones alternativas.
- Skill animate aplicada al propósito de indicar estados e interrupciones; se mantiene Phaser y el reloj existente por la necesidad específica del juego. Sin biblioteca de motion adicional.
- Vargas y Florin nombran los participantes de prueba a petición del usuario.

## F0-P5 — ciclo, autoridad y recuperación

- Separar el reloj puro/inyectable de su host del navegador y del renderer. Preparación30s y resolución5s por deadlines; comprobar cada intención al recibirla, con partida/fase/revisión.
- Añadir un envoltorio versionado `f0p5-1` sin reescribir reglas económicas/combatientes ni los contratos históricos. Estados not_started/preparation/combat/resolution/finished, pausa solo en desarrollo y bandera de recuperación.
- Retener la primera traza en `RoundAuthority` y liquidar con las mismas funciones económicas. El temporizador de combate nunca paga. Esperar `combat_end` más600ms visuales; una victoria temprana no espera45s.
- Tablero vacío al deadline: derrota por el motor existente. No introducir despliegue automático, regalos ni bloqueo permanente.
- Usar deadlines para planificación y resolución; reproducción limitada a100ms por pulso para no omitir una batalla tras suspensión. No recuperar rondas atrasadas en bucle. El máximo45s sigue siendo tiempo lógico de simulación, no una garantía de pared bajo suspensión.
- Congelar durante el cierre, persistir restante y posición, rebasar origen monotónico al recuperar. Snapshots por diferencias reducen el tamaño del guardado. Fallo de almacenamiento se comunica; caída abrupta puede perder hasta500ms desde el último checkpoint temporal.
- Mantener las claves anteriores. Migrar al continuar, validando el historial histórico; los guardados antiguos sin posición visual reinician el combate pendiente una vez. Un estado histórico ya sin vida y sin combate pendiente se detiene sin nuevo pago.
- Fin local cuando Vargas llega a0, después de pagar la ronda. Florin permanece como oponente de pruebas. Sin clasificación, red, cuentas ni cambios a Overtime.
- Depuración optativa con partida/clave separadas; pausa, avance, duraciones8/2s, repetición desde checkpoint de memoria, recarga e inspección. La partida normal no expone esas ventajas.
- Preservación Git inicial: módulos P4 identificables en `b71448c`; archivos solapados del HUD y P4.1 verificados juntos en `ffa9265`. No se reconstruyó un hito histórico completo artificialmente a partir de archivos solapados. Los32PNG originales/duplicados en Sprites permanecieron fuera de esos commits.
