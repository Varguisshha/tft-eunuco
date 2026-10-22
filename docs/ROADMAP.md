# Roadmap

## F0-P1 — completado y preservado

Workspace, geometría axial, tablero7×8, preparación, arrastre/selección/teclado/zoom, contratos y sprites provisionales. 35 pruebas originales. Auditoría repetida antes de P2; commit base `279be4d`.

## F0-P2 — completado y preservado

Motor puro determinista, A\*, reservas, targeting, estadísticas/daños, maná, efectos y pasiva inicial, cuatro perfiles ficticios, protocolo v2, reproductor Phaser y controles. Arena interna conservada. Reglas en COMBAT_SPEC.md, protocolo en COMBAT_EVENTS.md y evidencia ejecutada en VALIDATION.md.

## F0-P3 — completado y validado

Economía, pool limitado, tienda5/bloqueo/renovación, banquillo9, movimiento/intercambio, venta, XP/niveles, estrellas, fases, rival determinista y Partida local independiente. Guardado local con replay y Arena preservada. Validación: 118 pruebas correctas (73 anteriores intactas), typecheck/lint/build y recorrido real de cuatro rondas con interés, guardado y Arena de referencia. Evidencia en VALIDATION.md. Hito P2 preservado en `42f70bd`; P3 preservado en `4302eec`.

## F0-P3.1 — completado y validado

Overtime determinista, protocolo3, doble derrota, vida y registro de daño mínimos, guardado versionado e indicadores compartidos. 161 pruebas correctas, typecheck/lint/build/formato y recorrido real de Arena/Partida local completados. Pausa301, victoria357, timeout450, eliminación mutua3 y doble derrota con oro/vida sin duplicación tras recargar. Detalles en VALIDATION.md. Cambios locales sobre el hito P3 `4302eec`.

## Siguiente paso recomendado

Revisar balance de overtime y daño de ronda con partidas locales prolongadas, sin cambiar automáticamente economía ni añadir mecánicas. Acordar un encargo F0-P4 antes de nuevas mecánicas. No se ha iniciado F0-P4.

## Dirección de producto futura

La Arena de pruebas se conserva junto a la Partida local provisional. Su futura evolución artística debe tener tablero protagonista; tienda de cinco personajes; banquillo de nueve; oro/intereses; nivel/XP; etapa/temporizador; clasificación; sinergias activas; panel contextual compacto. Evitar trasladar el aspecto administrativo del inspector al jugador.

Dirección artística: pixel-art retro moderno original, terreno con sombras, volumen e iluminación, animaciones consistentes y VFX modernos integrados. Referencias generales de autobattlers/RPG clásicos, sin copiar identidad ni assets de TFT. Futuro roster inspirado en amigos reales, con arte y nombres originales y producción mediante SPRITE_SPEC; en P3 solo personajes ficticios.

## Fases posteriores sin implementar

Servidor Node/Colyseus, identidad y emparejamientos de cuatro jugadores, recepción ordenada de lotes, buffering/reconexión, economía online, sinergias activas, roster definitivo, cuentas/persistencia Supabase, despliegue y observabilidad. Ninguna dependencia, cuenta o infraestructura nueva se ha instalado en P3. Sin compromisos de calendario.
