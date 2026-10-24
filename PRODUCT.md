# TFT EUNUCO

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, TypeScript strict, Vite, Phaser 4 estable, pnpm workspaces y Vitest, según encargo.

## Product Purpose

Autobattler original. La fase actual P6B.4 ofrece una partida local de varias rondas con economía, tienda, banquillo, progresión y combate determinista animado. Conserva la Arena de pruebas interna.

## Operating Context

Desktop-first. 7 × 4 casillas por jugador, 7 × 8 combinadas. Futuras partidas de cuatro jugadores.

## Capabilities and Constraints

Reglas puras separadas de React y Phaser. Servidor autoritativo futuro con ticks de 100 ms. Sin servicios, credenciales ni despliegues. Arte original de DOLEA y VARGAS integrado; las unidades restantes conservan sprites provisionales generados por código. Costes 1–3, una sinergia habitual y otra opcional, activa y pasiva por personaje; contenido definitivo sin definir; perfiles ficticios funcionales en P2.

## Brand Commitments

Pixel-art retro moderno original. Dirección confirmada: arena de carbón, jade profundo y latón envejecido, con geometría original de videojuego PC. No copiar recursos ni personajes de TFT. La fase P2 usó personajes ficticios; el futuro roster podrá inspirarse en amigos con diseños originales.

## Open Decisions

Audiencia detallada, balance definitivo, contenido final y arte definitivo pendientes. Reglas provisionales de combate: docs/COMBAT_SPEC.md; economía local: docs/ECONOMY_SPEC.md.

## Histórico F0-P2

La pantalla se conserva como Arena de pruebas interna permanente; no constituye la dirección artística definitiva. Se añaden controles de combate y efectos funcionales, conservando jade/ámbar, selección y zoom. La futura pantalla de partida será independiente: tablero protagonista con terreno/profundidad, tienda de cinco, banquillo de nueve, economía, nivel/XP, etapa, clasificación, sinergias y panel contextual. Dirección pixel-art retro moderna original y futuro roster inspirado en amigos; sin assets definitivos ni rediseño completo en P2. Véanse docs/GAME_DESIGN_V0.1.md y docs/ROADMAP.md.

## Histórico F0-P3

En P3 se introdujo Partida local como vista independiente de Arena: economía visible arriba, tablero central, contexto compacto, nueve plazas de banquillo y cinco ofertas inferiores. Se reutilizan colores, tipografías y sprites provisionales. Las reglas viven en core, con configuración versionada; no se implementa producción artística definitiva. Arena mantiene su propósito de diagnóstico y duelo controlado.

## Estado actual P6B.4

Partida local mantiene arena dominante, nueve plazas y cinco ofertas. Economía y reclutamiento viven abajo; participantes y sinergias, a la izquierda; la ficha contextual se superpone sin redimensionar el campo. Las ofertas muestran retratos dominantes con rasgos abajo a la izquierda, sobre el nombre, y coste abajo a la derecha. Los componentes reutilizables comparten marcos e iconos originales.

DOLEA y VARGAS conservan sus recursos originales. Su representación en combate aumenta un 40% tras comparar 0/20/30/40% con el mismo pie y cuerpos normalizados a 64px; los provisionales permanecen iguales. La escala es exclusivamente visual: no cambia casillas, alcance, simulación, guardado ni límites originales de interacción; las estrellas no aumentan el tamaño.

Los contadores v1 representan datos reales del combate: eliminaciones, lanzamientos naturales, acumulaciones, créditos y pasivas. Incluyen objetivos, umbrales, consumo y efectos cuando existen, sin progreso ficticio. Créditos UPM no añaden miembros a una sinergia. Las herramientas DEV quedan fuera de la interfaz pública.

La pasada de QA comunicada para P6B.4 registra 614 pruebas aprobadas en 41 archivos y capturas de cinco tamaños de escritorio sin scroll de página. Evidencia en `artifacts/p6b4`: `after-{1280,1366,1440,1920,2560}.png`, comparativas `scale-*`, estados densos, bloqueo, controles DEV, consumo de Resaca y salto de Depredador. La corrección del desplazamiento interno de rasgos fue recapturada en combate a720p/768p. La revisión independiente final emitió `ship` sobre sus tres hallazgos: lateral, evidencia de combate y persistencia; todos resueltos. Este veredicto se limita a esas correcciones.
