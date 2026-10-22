# Diseño de juego v0.1

## Confirmado por el encargo

- Autobattler web original, desktop-first, pixel-art retro moderno.
- Tablero hexagonal isométrico, 7 × 4 por jugador y 7 × 8 en el duelo combinado.
- Futuras partidas inicialmente de 4 jugadores.
- Costes de unidad 1, 2 y 3; una sinergia habitual y segunda opcional.
- Habilidad activa y pasiva por personaje.
- Combate automático animado en directo: reposo, desplazamiento, ataque, habilidad y muerte.
- Servidor autoritativo futuro; simulación determinista y tick de 100 ms.
- Arte definitivo a cargo de otro colaborador; esta fase solo usa placeholders originales generados por código.

## Implementado en F0-P1

Preparación local, colocación y selección; movimiento con ratón o teclado; dos mitades; validación de límites, ocupación y propiedad. Panel de identificación y rol, zoom visual, restauración de ejemplo y controles de columna/fila.

## Preparación de la Arena: reglas del laboratorio

No confundir estas decisiones con reglas finales de partida:

| Regla             | Comportamiento provisional                                                               |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Equipos           | Jade (south, filas 4–7) y ámbar (north, 0–3); edición local alternable                   |
| Formación inicial | Cuatro unidades jade; la mitad ámbar empieza vacía                                       |
| Copias            | Ilimitadas por definición hasta agotar las 28 casillas de cada mitad                     |
| Movimiento        | Teletransporte de preparación a cualquier celda libre propia; sin consumo ni pathfinding |
| Casilla ocupada   | Sin swap: arrastre/colocación se rechazan; click sobre otra unidad la selecciona         |
| Costes            | Metadatos visibles; no existe oro ni compra                                              |
| Persistencia      | Solo memoria local; recargar restaura el ejemplo                                         |

## Definiciones ficticias

| ID       | Nombre | Rol        | Coste | Sinergias de prueba    |
| -------- | ------ | ---------- | ----- | ---------------------- |
| test-k01 | K-01   | Vanguardia | 1     | test-alloy             |
| test-v02 | V-02   | Duelista   | 2     | test-pulse             |
| test-r03 | R-03   | Tirador    | 2     | test-alloy, test-pulse |
| test-m04 | M-04   | Mago       | 3     | test-pulse             |

Los IDs de sinergia siguen siendo etiquetas sin efectos. M-04 conserva el identificador de rol interno `support` y el sprite de P1, con etiqueta visible Mago. Los cuatro perfiles son ficticios.

## Implementado en F0-P2

Combate local automático animado; A\*, reservas y búsqueda de enemigos; ataques cuerpo a cuerpo y proyectiles; vida, maná, físico/mágico/verdadero; habilidades con daño de área, curación, escudo, modificadores y stun; una pasiva inicial. Reglas provisionales y valores exactos en [COMBAT_SPEC](COMBAT_SPEC.md). Reproducción con pausa/reanudar, ×1/×2, semilla y tick, repetición y vuelta a la formación previa. Sin economía ni bonus de sinergias.

El duelo de ejemplo coloca los cuatro perfiles en cada equipo. Se puede editar manualmente la formación antes de comenzar. La semilla controla solo la variación del daño básico; el resultado depende también de posiciones, IDs y perfiles. No se pretende simetría perfecta ni balance competitivo con estos datos.

## Decisión de producto: dos pantallas con propósitos diferentes

La Arena de pruebas es una herramienta interna permanente. Conserva información técnica, paneles, coordenadas y controles. Su estética jade/ámbar es provisional y no define la dirección artística final.

La futura pantalla de partida destacará el tablero con más superficie útil, profundidad de terreno, sombras, volumen e iluminación. Tendrá interfaz de videojuego contextual y compacta: tienda de cinco, banquillo de nueve, oro e intereses, nivel y XP, etapa y temporizador, clasificación de jugadores, sinergias activas e inspector de personaje.

Arte futuro pixel-art retro moderno original; personajes inspirados en amigos reales, animaciones consistentes y efectos modernos integrados. Referencias generales de autobattlers tácticos/RPG clásicos, sin recursos ni identidad gráfica protegida de TFT. Estos elementos se registran como dirección futura: no se han implementado ni creado assets definitivos en P2.

## Sin decidir para el producto final

Roster, nombres, habilidades/pasivas definitivas, balance, sinergias/umbrales, economía, emparejamientos de cuatro jugadores, rondas, identidad/persistencia y dirección de producción del arte. Las reglas f0p2-1 permiten probar combate y no aprueban su balance como definitivo.

## Implementado en F0-P3: partida local

Pantalla independiente de Arena con oro, tienda5, banquillo9, XP/niveles2–7, estrellas1–3, venta, rival determinista y varias rondas. Inicio10oro, base2/3/4/5, interés de1 por10 hasta5, victoria1 y rachas configurables. El jugador elige cuándo combatir. Ninguna economía afecta al laboratorio Arena.

Las tablas exactas y adaptaciones respecto a referencias históricas están en ECONOMY_SPEC, SHOP_POOL_SPEC y PROGRESSION_SPEC. Las fases y el guardado están en ROUND_FLOW. La partida sigue abierta tras derrota/empate: no se ha añadido salud global, PvE o condición final. Sin sinergias activas ni personajes reales. Se conserva la dirección artística provisional, con aviso de mejora y estrellas sobre sprites existentes.
