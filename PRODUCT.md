# TFT EUNUCO

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, TypeScript strict, Vite, Phaser 4 estable, pnpm workspaces y Vitest, según encargo.

## Product Purpose

Autobattler original. La fase actual F0-P6B.5-B ofrece una partida local de varias rondas con economía, tienda, banquillo, progresión y combate determinista animado. Conserva la Arena de pruebas interna.

## Operating Context

Desktop-first. 7 × 4 casillas por jugador, 7 × 8 combinadas. Futuras partidas de cuatro jugadores.

## Capabilities and Constraints

Reglas puras separadas de React y Phaser. Servidor autoritativo futuro con ticks de 100 ms. Sin servicios, credenciales ni despliegues. Arte original de DOLEA y VARGAS integrado; las unidades restantes conservan sprites provisionales generados por código. Costes 1–3, una sinergia habitual y otra opcional, activa y pasiva por personaje; contenido definitivo sin definir; perfiles ficticios funcionales en P2.

## Brand Commitments

Pixel-art retro moderno original. Dirección aprobada por el usuario: Festival Pop C × Neon Playground, que sustituye carbón/jade/latón en el HUD de Partida local. Azul noche, marcos azules, lima para acciones, magenta económico, blanco lavanda y oro semántico; geometría vectorial original de videojuego PC y arena Mar de Cristal continua. La decisión explícita prevalece sobre la recomendación Royal Pop y el estado indeciso de informes exploratorios anteriores. No copiar recursos ni personajes de TFT. La fase P2 usó personajes ficticios; el futuro roster podrá inspirarse en amigos con diseños originales.

## Open Decisions

Audiencia detallada, balance definitivo, contenido final y arte definitivo pendientes. Reglas provisionales de combate: docs/COMBAT_SPEC.md; economía local: docs/ECONOMY_SPEC.md.

## Histórico F0-P2

La pantalla se conserva como Arena de pruebas interna permanente; no constituye la dirección artística definitiva. Se añaden controles de combate y efectos funcionales, conservando jade/ámbar, selección y zoom. La futura pantalla de partida será independiente: tablero protagonista con terreno/profundidad, tienda de cinco, banquillo de nueve, economía, nivel/XP, etapa, clasificación, sinergias y panel contextual. Dirección pixel-art retro moderna original y futuro roster inspirado en amigos; sin assets definitivos ni rediseño completo en P2. Véanse docs/GAME_DESIGN_V0.1.md y docs/ROADMAP.md.

## Histórico F0-P3

En P3 se introdujo Partida local como vista independiente de Arena: economía visible arriba, tablero central, contexto compacto, nueve plazas de banquillo y cinco ofertas inferiores. Se reutilizan colores, tipografías y sprites provisionales. Las reglas viven en core, con configuración versionada; no se implementa producción artística definitiva. Arena mantiene su propósito de diagnóstico y duelo controlado.

## Histórico F0-P6B.4

Partida local mantiene arena dominante, nueve plazas y cinco ofertas. Economía y reclutamiento viven abajo; participantes y sinergias, a la izquierda; la ficha contextual se superpone sin redimensionar el campo. Las ofertas muestran retratos dominantes con rasgos abajo a la izquierda, sobre el nombre, y coste abajo a la derecha. Los componentes reutilizables comparten marcos e iconos originales.

DOLEA y VARGAS conservan sus recursos originales. Su representación en combate aumenta un 40% tras comparar 0/20/30/40% con el mismo pie y cuerpos normalizados a 64px; los provisionales permanecen iguales. La escala es exclusivamente visual: no cambia casillas, alcance, simulación, guardado ni límites originales de interacción; las estrellas no aumentan el tamaño.

Los contadores v1 representan datos reales del combate: eliminaciones, lanzamientos naturales, acumulaciones, créditos y pasivas. Incluyen objetivos, umbrales, consumo y efectos cuando existen, sin progreso ficticio. Créditos UPM no añaden miembros a una sinergia. Las herramientas DEV quedan fuera de la interfaz pública.

La pasada de QA comunicada para P6B.4 registra 614 pruebas aprobadas en 41 archivos y capturas de cinco tamaños de escritorio sin scroll de página. Evidencia en `artifacts/p6b4`: `after-{1280,1366,1440,1920,2560}.png`, comparativas `scale-*`, estados densos, bloqueo, controles DEV, consumo de Resaca y salto de Depredador. La corrección del desplazamiento interno de rasgos fue recapturada en combate a720p/768p. La revisión independiente final emitió `ship` sobre sus tres hallazgos: lateral, evidencia de combate y persistencia; todos resueltos. Este veredicto se limita a esas correcciones.

## Estado actual F0-P6B.5-B

La implementación real React/Phaser adopta Festival Pop C × Neon Playground. La autoridad visual aprobada es `design-exploration/f0-p6b5a2/neon-playground/{screen-1920,inspector-1920,components-1920}.png` y su `tokens.json`; el contrato y las adaptaciones justificadas constan en `artifacts/p6b5b/CONTRACT.md`. DESIGN.md y `.impeccable/design.json` describen el sistema implementado; el histórico P6B.4 conserva valor documental, sin gobernar la identidad actual.

La arena domina la escena; clasificación y sinergias quedan a la izquierda, nueve plazas de banquillo sobre cinco retratos de tienda, economía abajo a la izquierda y renovar/bloquear a la derecha. El inspector contextual se superpone y permite scroll interno para estadísticas AD/AP/críticos, habilidades, pasivas, afinidades y contadores reales. Su cierre permanece fuera del contenido desplazable. FestivalPop reutiliza el archivo local Bungee con licencia SIL OFL; DM Sans mantiene lectura de datos. Marcos, diagonales, medallones e iconos reutilizan la geometría original aprobada; el control compacto de ajustes adapta esa familia a 65 × 61.

Se preservan los 56 hexágonos, cámara/proyección, casillas legales, animaciones, selección, arrastre, reglas, economía, probabilidades, temporizadores y guardados. DOLEA/VARGAS mantienen el factor visual 1.4 y sus límites originales; los sprites provisionales y las estrellas no reciben crecimiento. La cámara conserva su reserva sobre el banquillo, aunque el recorte de la ilustración difiera de la composición estática. Compras de una estrella, preparación/rondas automáticas y contadores respetan el estado real; los datos incompatibles de la ilustración no se fuerzan en una partida.

El escenario «Cargar referencia Neon» es una herramienta DEV explícita e independiente: oro 52, nivel 4, XP 4/10, Vargas 100/Florin 88, ronda 3 y reloj fijo 18.4 para comparar. El reloj de partidas normales sigue siendo real. Gating `__DEVTOOLS__`, almacenamiento separado y rechazo de guardados DEV en modo normal conservan el aislamiento público.

El objetivo desktop es no desplazar el documento a 1280 × 720, 1366 × 768, 1440 × 900, 1920 × 1080 y 2560 × 1440; las superficies secundarias admiten scroll interno. La evidencia de capturas, comparación y revisión de esta fase se conserva en `artifacts/p6b5b`; las cifras finales de pruebas y el veredicto corresponden a su validación, no a esta actualización documental. No iniciar F0-P7A automáticamente ni configurar remoto o hacer push.
