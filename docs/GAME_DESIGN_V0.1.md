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

## Reglas provisionales del laboratorio

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
| test-m04 | M-04   | Apoyo      | 3     | test-pulse             |

Los IDs de sinergia son etiquetas sin efectos. Activa y pasiva son `null` de forma explícita: pendientes de diseño. No hay vida, daño, alcance, velocidad o balance inventados. Los nombres no representan personas reales.

## Sin decidir

Roster final, habilidades, pasivas, sinergias y umbrales; desempates; selección de objetivos; PRNG; estadísticas; balance; economía; emparejamientos de cuatro jugadores; duración de rondas; identidad y persistencia. Ninguno queda aprobado por este prototipo.
