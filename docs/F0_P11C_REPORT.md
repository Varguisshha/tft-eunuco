# F0-P11C — Economía durante combate y estadísticas

Estado: implementación y validación funcional local completas. Cuatro correcciones visuales iniciales resueltas y dos regresiones cerradas tras la ronda adicional autorizada; SHIP de alcance limitado según F0_P11C_VISUAL_REVIEW.md. Catálogo/reglas `f0p11c-1`, nueva huella de persistencia derivada de P11B y política de economía/estadísticas. P11A/B y catálogos históricos conservan sus reglas.

## Economía autoritativa

Durante combate se admite vender únicamente una unidad propia del banquillo ausente de la entrada congelada del combate. Se devuelven oro, copias y equipo intacto mediante la operación existente; no se fusiona ni modifica la formación que combate. Compras, XP, renovación, movimiento, intercambio y removedor siguen restringidos a preparación.

Bloquear/desbloquear es gratis durante preparación y combate. Conserva las cinco reservas del pool; cada comando sigue comprobando fase, revisión, conexión y secuencia, incluyendo duplicados. Los límites de fase se comprueban al recibir el comando, no solo en el botón. Un combate individual terminado que espera a otros sigue sujeto al reloj global.

## Estadísticas

Las filas de ambos equipos se ordenan por la métrica elegida y después por identificador estable. Daño causado/recibido cuentan solo pérdida real de vida. El daño a escudos y los escudos absorbidos son métricas separadas; absorción se atribuye al portador, no al creador de un escudo cuyo origen no registra el evento. Mitigación incluye defensas y reducciones después de amplificar la fuente. Curación efectiva, excedente e impedida se distinguen. Daño periódico/de objetos son subconjuntos internos del daño causado, no sumandos adicionales.

La contabilidad de cada impacto cumple `solicitado + amplificación defensiva = mitigado + absorbido + vida perdida + exceso letal`. La curación cumple `solicitado = impedido + efectivo + excedente`. Armadura negativa se registra como amplificación, nunca como mitigación negativa. Los eventos nuevos solo se emiten con reglas P11C; versiones antiguas no se reescriben ni inventan métricas ausentes.

El cliente agrega únicamente hasta el instante visible. Espectadores usan exclusivamente los eventos liberados por el servidor y el menor de tick autorizado/tiempo observado. No se calcula una tabla final a partir de eventos futuros de la reproducción. La última tabla terminada se retiene en el estado autoritativo al liquidar la ronda, sin reaplicar daño o recompensas. La tabla conserva identidad, estrellas y propietario de quienes participaron, incluso si una reserva se vende después.

## Interfaz

Control «Combate» con GameButton y panel azul angular cerrado inicialmente. Selector de ocho métricas, barras con cifra/nombre/propietario, desplazamiento interno y cierre explícito/Escape. Se oculta el control cuando hay ficha de unidad. La escala se limita en monitores grandes y conserva arena, tienda de cinco, splash arts y Festival Pop × Neon Playground. Fixture DEV separado «Referencia P11C · combate y estadísticas» con reloj fijo a mitad de combate; no altera partidas reales.

## Pruebas

- `combat/statistics.test.ts`: conservación de daño/escudos/exceso con armadura positiva, cero y negativa; curación; corte temporal y duplicados; cobertura histórica; venta con devolución de equipo y entrada congelada; restricciones de formación y versión.
- `persistence/p11-combat-economy.test.ts`: 2/3/4 jugadores, propiedad, recibos duplicados, reservas, oro, persistencia/restauración, liquidación y conservación del pool.
- `p11CombatUi.test.ts`: disponibilidad de venta/bloqueo frente a edición de formación; panel y métricas limitados al tiempo visible.
- Evidencia visual y métricas: `artifacts/p11/c/`. Revisión independiente en `F0_P11C_VISUAL_REVIEW.md` cuando concluya.

No hay push, publicación, reactivación de Railway ni acceso a Supabase remoto. P11D–F siguen pendientes de sus entregas. Se mantiene la decisión del usuario: TFT 18.5 con seis efectos pendientes explícitos, sin declararlos fieles ni habilitarlos.

Quality gate: 1.569 pruebas aprobadas en 113 archivos, una opt-in omitida; typecheck, lint y builds web/servidor aprobados (`check-c-final.log`). La ejecución anterior tuvo un p95 de 16,84 ms frente al límite de 16,7 en la prueba histórica de reproducción; su repetición aislada pasó con p95 de 7,12 ms y la suite final pasó sin cambiar el umbral.

Consolidación F: se detectó y corrigió la omisión del resumen en PrivatePlayerSchema. El snapshot privado transmite la última tabla terminada solo a su propietario y omite la clave en catálogos anteriores o antes del primer resultado. Las pruebas de 2/3/4 jugadores verifican transmisión, ausencia en fichas públicas y nueva restauración; no se envía una tabla futura.

Cierre visual autorizado: separación botón/panel de 10–17,4 px en cinco resoluciones, primera fila completa a 720p, barras asentadas verificadas contra las cifras (88→100 %, 29→32,95 %, 0→0 %), cierre Escape y retorno de foco comprobados en navegador. Build y verificación de bundle público repetidos tras el último cambio CSS; ambos aprobados.
