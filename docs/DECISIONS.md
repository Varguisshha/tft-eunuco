# Estado vigente — F0-P7C.2 (25/10/2026)

Se conecta el motor existente al lobby y se limita la adaptación visual a clasificación compacta, rival y espera. Se preservan arte, arena, escala de sprites, economía y algoritmos. La perspectiva norte se invierte exclusivamente en la proyección del cliente. Las posiciones y empates proceden de provisionalPosition del servidor. Las pruebas de navegador usan identidades fixture explícitas en entradas separadas de loopback, nunca cuentas Supabase nuevas ni comandos DEV de producción.

[Informe, evidencias y limitaciones](MULTIPLAYER_4P_INTEGRATION.md). Las restricciones de capacidad dos que figuran debajo pertenecen al histórico y quedan sustituidas por este estado.

---

> **Estado F0-P7C.1 (25/10/2026):** motor de rondas para 2–4, lobby real limitado a dos. [Informe](F0_P7C1_REPORT.md). Los apartados de fases anteriores son históricos.

> **Estado actual F0-P7B.2 (24/10/2026):** salas privadas implementadas; partidas funcionales de dos. [Informe](F0_P7B2_REPORT.md). Los apartados anteriores de fases se conservan como histórico.

> **F0-P7B.1-R (24/10/2026): flujo principal real verificado.** Supabase Free conectado; dos cuentas confirmadas por correo, perfiles/RLS, recuperación y partida Colyseus hasta ronda 2 comprobados. Quedan escenarios adicionales de borde detallados en [SUPABASE_REAL_VALIDATION.md](SUPABASE_REAL_VALIDATION.md). F0-P7B.2 no iniciada.

# Actualización F0-P7B.1

Registro cerrado mediante trigger transaccional en auth.users, consumo de invitación y perfil atómicos. Se evita apertura accidental por olvidar configurar un hook. RLS y permisos por columna; usernames ASCII normalizados. Verificación getUser/getClaims + sesión activa en servidor. PKCE y almacenamiento gestionado por SDK. Sin proyecto configurado: pruebas controladas y E2E externo pendiente.

Ver [AUTH_SYSTEM.md](AUTH_SYSTEM.md), [PLAYER_PROFILES.md](PLAYER_PROFILES.md), [SUPABASE_SETUP.md](SUPABASE_SETUP.md) y [PRIVATE_REGISTRATION.md](PRIVATE_REGISTRATION.md). El contenido anterior se conserva como histórico.

---

# Actualización F0-P7A

F0-P7A: mensajes Colyseus explícitos en lugar de sincronizar el estado interno completo. Reutilizar economía mediante externalCopies calculado por autoridad. Pool y RNG privados; formaciones desplegadas públicas. Resultado precalculado visible en payload. Rotación visual de Florin; simulación canónica única. Loopback y memoria; ninguna cuenta, persistencia, hosting o P7B.

Véase [arquitectura multijugador](MULTIPLAYER_ARCHITECTURE.md), [protocolo](SERVER_PROTOCOL.md) y [partida autoritativa](AUTHORITATIVE_MATCH.md). Las afirmaciones históricas «servidor no implementado» de las secciones inferiores quedan superadas por esta actualización.

---

# F0-P6B.5-B — decisiones vigentes, 24 de octubre de 2026

- Adoptar Festival Pop C × Neon Playground por selección expresa del usuario; sustituir el sistema carbón/jade/latón del HUD y no elegir Royal Pop.
- Reutilizar los 64 tokens, Bungee con licencia, geometría SVG y composición originales aprobados. Reconstruirlos como componentes funcionales, sin ilustraciones nuevas ni sustitución de retratos.
- Mantener autoridad, estadísticas, economía, probabilidades, temporizadores, proyección, casillas, sprites y escala 1.4. La referencia visual no autoriza falsificar un estado de partida.
- Reproducir las cajas principales del HUD a 1920; conservar el encuadre real de cámara necesario para que las casillas no queden bajo el banquillo. Documentar su diferencia objetiva respecto al montaje estático.
- Mostrar información completa de inspector mediante scroll interno con cierre fijo. Mantener barras completas e iconos de vida/maná de la referencia.
- Añadir solo un fixture DEV comparativo, con tiempo fijo explícito, pool validado y almacenamiento aislado. No entra en el build público ni altera las partidas normales.
- Excluir los prototipos históricos del lint de aplicación tras encontrar 56 errores de scripts standalone; no reducir reglas ni omitir pruebas del juego.

Evidencia, alternativas forzadas por restricciones y alcance de verificación: [NEON_PLAYGROUND_IMPLEMENTATION.md](NEON_PLAYGROUND_IMPLEMENTATION.md). Decisiones inferiores conservadas como historial.

---

## F0-P6B.4 — actualización vigente

Se evoluciona el sistema existente sin dependencia visual nueva. Marcos SVG originales, carbón/jade/latón; rasgos de tienda inferiores por requisito explícito. CombatCounter v1 separa progressGoal de max para que Depredador7 no parezca7/6. Escala1.4 se aplica en escena y se preserva contrato legado del adaptador. Lateral desplazable independiente en pantallas bajas evita ocultar controles/feedback. No se versiona combate/guardado porque no cambian reglas.

Sistema y criterios completos: [GAME_VISUAL_SYSTEM.md](GAME_VISUAL_SYSTEM.md). Las secciones posteriores se conservan como historial; esta actualización prevalece en presentación.

---

## F0-P6B.1 — AD/AP y críticos deterministas

- Base verificada:332 pruebas; P6A.1 preservado en `12a1515`. Se excluyen todos los recursos originales, incluida una imagen nueva aportada después. Sin remoto ni push.
- Reglas `f0p6b1-1` y catálogo `f0p6b1` optativos, utilizados por las nuevas partidas de la web. Se preservan las exportaciones P6A para partidas guardadas y diagnósticos históricos; no se migran sus reglas.
- AD conserva `attack`; AP0, crítico0 y multiplicador1500 son valores neutros explícitos del nuevo catálogo. No se cambia el balance de DOLEA ni los provisionales.
- Ratios enteros por estrellas, suma AD/AP antes del suelo y tipo de daño independiente. Solo efectos de daño autorizados pueden criticar. Básicos fijan la tirada al inicio; habilidades por efecto/objetivo al resolver. Extremos de probabilidad sin consumo extra del PRNG.
- Fuentes planas/porcentuales identificadas, porcentajes sobre la base por estrellas y límites posteriores. Sinergias avanzadas dejan la base intacta; Overtime es la última capa de velocidad. El resto de carga y windups comprometidos se conservan.
- Protocolo3 con campos opcionales aditivos, semántica gated por reglas. Guardados sin cambiar envoltura ni codificación.27 trazas y2 guardados capturados antes de editar como referencias inmutables de compatibilidad.
- Inspector reutiliza selectores de core, sin paneles nuevos; «CRÍTICO» en la cifra de daño existente. Diagnósticos separados, sin nuevos personajes. F0-P6B.2 no iniciado. [Informe](F0_P6B1_REPORT.md).

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

## F0-P6B.2 — contratos, autoridad y compatibilidad

- Mantener protocolo 3 con reglas/catálogo nuevos explícitos `f0p6b2-1`/`f0p6b2`; rechazar nuevas operaciones bajo reglas antiguas.
- Reutilizar la cola y runtime de pasivas para stacks y progreso. Reservar prefijo `@` para reglas compiladas.
- Confirmar básicos por identidad de impacto, incluso absorbido; reservar `damage_dealt` para pérdida efectiva de vida.
- Crédito letal único por referencia a evento. Comprometer simultáneos antes de muertes; fuentes muertas reciben crédito pero no recompensas.
- Fijar membresía al comenzar, separar progreso, capturar ordinales de cast al emitir cada señal.
- Repetición gratuita, contadores/señales/maná explícitos, cancelación ligada al padre y prohibición absoluta de repetirse a sí misma.
- Reservar origen/destino de salto, resolver ataques inmediatos después de impactos ordinarios y limitar las ramas causales a ocho pasos, con topes adicionales por tick.
- Aplicar solo presentación contextual y assets existentes. No iniciar F0-P6B.3.

Detalles y limitaciones en [ADVANCED_MECHANICS.md](ADVANCED_MECHANICS.md). Se preservó P6B.1 en `c5cb131` tras verificar 427 pruebas antes de editar.

## Integración F0-P6B.3

Decisiones B3: coste3 y estadísticas solicitadas; catálogo/reglas nuevos; condiciones previas a ganancia para kills posteriores2/6; cura sobre HP con recuperación tras daños comprometidos; arte oficialmente nativo2★, listas explícitas1/3→2 sin hojas duplicadas; DEV reserva copias reales y guarda marca irreversible en la sesión normal del coordinador, ledger y auditoría separados. Acceso por compilación local, excluido del paquete público. Se conserva refresh del último efecto y potencia B2. No hay multiplayer, cuentas, objetos, aumentos ni fase posterior. [Personaje](VARGAS_CHARACTER.md) y [controlador](DEVELOPER_MODE.md).

## F0-P7B.2 — Salas privadas

Decisión P7B2: gateway privado por cuenta + LobbyHub único en memoria, independiente de economía. Códigos de ocho caracteres criptográficos; una sala por cuenta; gracia30s; caducidad15min; relevo al primero conectado por orden de entrada. Solo capacidad2 inicia, siempre dos listos; capacidad3/4 anuncia P7C. Permiso efímero de creación y whitelist UUID impiden acceso arbitrario al destino. Plazo25s para transición y callbacks ligados al intento. Snapshot completo versionado en vez de deltas parciales.

Contratos, operación y ciclo: [PRIVATE_LOBBIES.md](PRIVATE_LOBBIES.md). Seguridad y evidencias: [LOBBY_SECURITY.md](LOBBY_SECURITY.md). Transición: [LOBBY_TO_MATCH.md](LOBBY_TO_MATCH.md).

## F0-P7C.1 — Motor de rondas 2–4

Se enumeran candidatos de emparejamiento y se minimiza historial/recencia con desempate estable por semilla. Rotación fantasma prioriza receptor y propietario menos utilizados. Se reutiliza economía sin cambiar fórmulas; el acumulador histórico de contraparte no se publica como vida real. Cálculo síncrono de duelos y reproducción simultánea; no se introducen workers ni se abre lobby3/4.

Detalles: [emparejamientos](MATCHMAKING_2_TO_4.md), [fantasmas](GHOST_COMBAT.md), [duelos paralelos](PARALLEL_COMBATS.md).

## F0-P7C.3 — ciclo competitivo

Se adopta ranking de competición con puestos compartidos y huecos. HP previo y daño efectivo son los únicos desempates; el daño limitado hace al segundo criterio normalmente redundante. No se introduce azar ni orden de identidad. Se eligen frames públicos por tick para espectadores, evitando entregar la traza determinista futura. El resultado se publica una vez y se retiene en snapshots durante la vida limitada de la sala. [Ejemplos](FINAL_STANDINGS.md).

## F0-P7D.1 — Recuperación autenticada (25/10/2026)

Elegida reentrada autenticada por UUID mediante joinById, sin token nativo de reconexión: revalida revocación y permite cerrar/reabrir pestaña. Una generación y un socket propietario por participante; conservar recibos/secuencias y adoptar snapshot antes de recuperar controles. Mantener 25s de transición ante pérdida temporal, sin recrear permisos. Cinco reintentos con backoff acotado; los errores de identidad detienen la serie. Se preservó P7C.3 en a236da6 antes de implementar. La deriva previa de PRODUCT.md se reporta, sin reparación incidental.

Esta sección sustituye las limitaciones históricas de «sin reconexión». Especificación: [RECONNECTION_SPEC.md](RECONNECTION_SPEC.md). Flujo, contratos y límites: [SESSION_RECOVERY.md](SESSION_RECOVERY.md).

## F0-P7D.2 — persistencia autoritativa (2026-10-25)

Persistencia por snapshot completo JSONB versionado + CAS transaccional, sin segundo ledger. Congelar tiempo de caída; preservar trazas canónicas. Retener 1 h activa / 5 min final; rechazar corrupción/incompatibilidad al arrancar. Reintentos acotados, fallo cerrado. Sin infraestructura distribuida.

Detalle vigente: [arquitectura](PERSISTENCE_ARCHITECTURE.md), [recuperación](MATCH_RECOVERY.md) y [operación](PERSISTENCE_OPERATIONS.md). Esta sección sustituye las limitaciones históricas de persistencia anteriores para el servidor normal.

## F0-P6C · JARAMILLO

P6C: catálogo f0p6c y reglas f0p6c-1 separados de f0p6b3; snapshots históricos conservados. Armadura: máximo vigente, empate refresca. FUMÓN una vez por objetivo global, sin recursión. Evolución gráfica desconocida; tres poses autorizadas más recuperación, sin inventar una cuarta. Limpieza generativa documentada como derivado, no idéntica al original.
