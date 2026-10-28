# Progresión, banquillo y estrellas — f0p3-1

## XP y despliegue

Inicio **nivel2, XP0**; máximo **7**. Compra4XP por4oro. XP automática **+2 al resolver cada ronda**, salvo en máximo. XP sobrante se conserva al subir nivel; al llegar a7, XP de nivel se fija a0 y no se permiten más compras. `totalXp` registra XP concedida, incluido exceso de la última concesión; no es el medidor de nivel.

| Nivel actual | XP para siguiente | XP acumulada desde nivel2 | Máximo desplegado |
| ------------ | ----------------: | ------------------------: | ----------------: |
| 2            |                 2 |                         0 |                 2 |
| 3            |                 6 |                         2 |                 3 |
| 4            |                10 |                         8 |                 4 |
| 5            |                20 |                        18 |                 5 |
| 6            |                36 |                        38 |                 6 |
| 7            |                 — |                        74 |                 7 |

Progresión local compacta, no tabla oficial de TFT. Límite de unidades desplegadas = nivel. Banquillo de9 independiente. Si un estado importado contiene exceso de despliegue, nunca se eliminan unidades: se bloquea iniciar combate o aumentar despliegue; retirar a banquillo, intercambiar sin aumentar o vender permite corregirlo. Estado con solapamientos o posiciones fuera de límites se rechaza entero.

## Movimiento

Unidad poseída tiene una sola `location`: `bench(slot0..8)` o `board(hex)`. Solo mitad jade (filas4..7 en coordenadas desde0). Comandos en core realizan mover o intercambiar atómicamente. Destino ocupado intercambia ambas ubicaciones, incluidos tablero↔banquillo, tablero↔tablero y reordenación del banquillo. No se pisa ni pierde ninguna copia. Mover al mismo sitio se rechaza sin coste.

UI: arrastre HTML desde banquillo a canvas o a otro slot; arrastre Phaser desde tablero al banquillo y entre hexágonos. Drop externo inválido devuelve visual a su estado. Alternativa: seleccionar unidad, elegir columna/fila y colocar; seleccionar unidad y pulsar slot vacío para retirarla. Teclado del tablero P1 conservado. Operaciones de preparación bloqueadas durante combate/resolución, incluida venta.

## Combinaciones

Compra añade candidato y combina automáticamente en toda la propiedad. Por definición en orden del catálogo, primero grupos de tres1★, después grupos de tres2★; repite hasta agotar grupos. Máximo3★. Nueve copias1★ pueden encadenar hasta una3★. No hay combinación entre definiciones diferentes ni entre estrellas diferentes.

Superviviente: primero unidad desplegada frente a banquillo; dentro de cada grupo, ID en orden de cadenas JS, sin comparación dependiente de idioma. Se conserva ID y ubicación del superviviente; las otras dos se eliminan de propiedad porque sus copias pasan a ese superviviente. Se pueden combinar tablero y banquillo. Varias unidades desplegadas equivalentes se desempatan por ID. El último resultado de mejora alimenta estrellas y aviso animado provisional; no genera daño ni modifica reglas.

| Estrella | Copias | Escala HP/ATK/daño de habilidad/curación/escudo |
| -------- | -----: | ----------------------------------------------: |
| 1★       |      1 |                                  1000/1000 = ×1 |
| 2★       |      3 |                                1800/1000 = ×1,8 |
| 3★       |      9 |                               3240/1000 = ×3,24 |

Escala aplicada al construir el perfil de combate, `floor(base*escala/1000)`, máximo1000000. Incluye cantidades damage/heal/shield de habilidad y pasiva. Armadura, RM, alcance, cadencia, maná, duración, stun y modificadores temporales no escalan. No se cambia el catálogo original ni el motor P2. Ejemplo K-01:520HP/35ATK →936/63 a2★. M-04 a3★:842HP/97ATK. La venta y devolución de copias están en ECONOMY_SPEC y SHOP_POOL_SPEC.

## Rival de pruebas

Formaciones deterministas, sin economía ni IA de compras. Posiciones de columnas2,4 en fila2; después1,5,3,0,6 en fila0 (índices desde0). Todos dentro de ámbar, sin solapamientos.

| Rondas | Formación                    | Estrellas |
| ------ | ---------------------------- | --------: |
| 1–2    | V-02                         |         1 |
| 3–4    | K-01, R-03                   |         1 |
| 5–7    | K-01, V-02, M-04             |         1 |
| 8–11   | K-01, V-02, R-03, M-04       |         2 |
| 12+    | K-01, V-02, R-03, M-04, R-03 |         2 |

Sin bonus ocultos ni oro/XP insertados en el jugador. Configuración explícita y perfiles legales escalados con las mismas reglas. No es un jugador online ni calendario PvE. Rondas ilimitadas por diseño local; `finished` está reservado y no se usa como condición de derrota de partida. No hay salud del jugador, eliminación global o matchmaking en P3.
