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
