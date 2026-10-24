# Sistema visual de partida — F0-P6B.4

## Dirección y referencias

Escena táctica de PC: carbón, jade profundo y latón envejecido; marcos originales escalonados, placa interior y remates metálicos. Mar de Cristal sigue completo al 100 %, con banquillo y HUD superpuestos. No se ha cambiado el arte original ni la proyección.

Se inspeccionaron imágenes reales de [TFT PC, análisis de tempo de Dignitas](https://dignitas.gg/articles/understanding-how-tempo-changes-the-game) y [Songs of Conquest, GOG](https://www.gog.com/en/news/bsongs_of_conquest_seratil_le_digne_successeur_de_heroes_of_might_and_magic_3_b). Se extrajeron jerarquía de tienda, densidad, profundidad y anclajes; ningún recurso gráfico se copió. Evolución del sistema existente, sin dependencias visuales nuevas.

## Tokens y materiales

Implementación en `apps/web/src/match/hud/visualSystem.css`, sobre los tokens de recruitment.

| Token          | Valor / función                   |
| -------------- | --------------------------------- |
| `--game-ink`   | `#101a18`, carbón                 |
| `--game-metal` | `#263a32`, metal jade             |
| `--game-text`  | `#edf0dc`, texto principal        |
| `--game-muted` | `#bac9ba`, información secundaria |
| `--game-edge`  | `#728878`, borde                  |
| `--game-brass` | `#e8cd83`, progreso y recompensa  |
| `--game-ease`  | `cubic-bezier(.16,1,.3,1)`        |

Space Grotesk para cifras/títulos y DM Sans para lectura; números tabulares. Espaciado compacto 4/8/12/16 px con ajustes ópticos de 2–3 px. Opacidades sobre arena para legibilidad; sin panel permanente adicional. Elevación reservada a inspector/tooltips. Costes conservan tres tonos de marco y número explícito.

## Componentes

- `GameFrame`: SVG original de silueta escalonada, doble línea interior y remates. Se comparte entre tarjetas y controles.
- `GameButton`: acción con icono, coste, disabled, active, foco y confirmación existente. `onCue` conserva extensión futura de sonido; no audio.
- `GameIconButton`: zoom y cierre, nombre accesible y marco común.
- `GameIcon` / `ContentIcon`: iconografía propia de acciones y contenido existente.
- `GameCounter`: lector universal del contrato `CombatCounter` v1; valor, máximo opcional, medidor, umbrales, detalle y ayuda.
- Se reutilizan Shop, UnitInspector, TraitRail y los indicadores existentes como equivalentes de panel/tarjeta/progreso; no se crean envoltorios redundantes.

## Tarjetas y controles

Cinco tarjetas continuas. Arte proporcional dominante; sinergias en la esquina inferior izquierda inmediatamente encima del nombre. Una o dos filas según datos, UPM abreviado; nombres completos en detalles. Franja inferior: nombre izquierdo, moneda propia y precio derecho. DOLEA y VARGAS usan retratos existentes; prototipos mantienen sus recursos y etiqueta provisional.

Estados: disponible, intención/foco, compra/reclutado, saldo insuficiente, fase cerrada y reserva. El aviso superior no tapa las sinergias. Bloqueo conserva ofertas y permite comprar. Hover ilumina el marco sin mover el retrato; pressed desplaza el control discretamente, active señala reserva y disabled mantiene texto legible. Foco visible por borde y subrayado. Confirmaciones de compra/XP/renovación reutilizan el sistema previo, sin duplicar temporizadores.

## Contadores autoritativos

`combatCounters(unit,state)` solo lee el snapshot muestreado. No cuenta animaciones. Campos: versión, ID, nombre, valor, máximo opcional, objetivo visual opcional, fuente, icono, umbrales, hitos, estado, tooltip y detalle. `progressGoal` no es un máximo: Depredador puede mostrar 7 y una barra completa hacia 6 sin mostrar «7/6».

Eliminaciones y lanzamientos se leen de mechanics. Stacks, modificadores y reglas de umbral provienen de definiciones; duraciones de `expiresTick - tick` en décimas de segundo. Resaca muestra 0/5 al consumir y el +20 % restante; puede acumular de nuevo mientras dura el buff. Depredador distingue acumulaciones, eliminaciones atribuidas y miembros 1/1. Los hitos 2/6 señalan efectos en la próxima eliminación, no efectos permanentes inventados. UPM muestra progreso individual real y explica el requisito de seis miembros para cada tercer lanzamiento.

Sobre unidad solo vida/maná/escudo, estado esencial y R/D compactos. Inspector muestra detalle completo antes de la descripción extensa. El lateral conserva membresía y progreso breve; el tooltip identifica progreso por unidad. Nuevos contadores de cargas/ataques requieren una fuente autoritativa explícita en el adaptador; el componente ya admite su representación, sin deducir eventos ni cambiar reglas.

## Escala, anclaje y densidad

Se compararon original, +20 %, +30 % y +40 % con formación igual y captura densa. Se eligió +40 % para los assets reales en Mar de Cristal. DOLEA y VARGAS ya comparten altura corporal normalizada de 64 en el pipeline, por lo que el factor común conserva su relación actual; un futuro personaje deberá calibrarse según su manifiesto, no copiarlo automáticamente.

`BoardScene` aplica el factor; `visualAdapter` conserva su valor legado por defecto para otros consumidores. Perspectiva se multiplica, pies/origen/volteo y orden por profundidad permanecen. `originalHitBounds` invierte el aumento alrededor de los pies: el área de selección previa no crece. Las estrellas no hacen crecer el cuerpo. Barras suben según escala y sombras se ajustan. Proyección, coordenadas, distancias, targeting y A\* intactos.

En 8v8 agrupado existe oclusión natural entre filas; no se separan unidades artificialmente. Se revisaron preparación y combate. Los avisos no seleccionados son breves; el seleccionado conserva detalle. La estela de daño dura 180 ms y usa el último daño real, manteniendo HP actual como verdad; se omite con movimiento reducido.

## Responsive y accesibilidad

Matriz de escritorio 1280×720,1366×768,1440×900,1920×1080,2560×1440: cinco fichas, sin scroll de página. En alturas ≤800 el lateral fija participantes y permite desplazar solo la lista de sinergias; avisos quedan fuera. El inspector tiene desplazamiento propio, cerrado por defecto. Se conserva navegación de tablero por teclado, selección y drag. Preferencia reduced-motion respeta las transiciones existentes y omite la estela nueva; no se afirma una prueba de preferencia del sistema operativo.

## Evidencia y extensión

Capturas locales en `artifacts/p6b4/` (ignoradas por Git): before/after, scale/dense, controles, inspector, consumo, salto y overtime. Informe de alcance y límites en [F0_P6B4_REPORT.md](F0_P6B4_REPORT.md). Para un nuevo personaje: registrar arte con anclaje normalizado, reutilizar componentes, aportar datos reales de sinergias/contadores, calibrar escala con cuatro variantes y validar preparación, combate y densidad. No introducir estado de juego dentro de React o Phaser para producir feedback.
