# F0-P5.1 — Game HUD V2

Implementado el 23 de octubre de 2026. F0-P6 no iniciado.

## 1. Resultado y distribución

Partida local pasa de tres columnas a un campo continuo. Clasificación compacta de Vargas y Florin superpuesta a la izquierda; ficha derecha solo bajo selección. Banquillo horizontal de nueve posiciones inmediatamente encima de la tienda. Cinco cartas con retrato, nombre, coste y estado; economía/XP a su izquierda y renovar/bloquear a su derecha. Cabecera de 48 px con fase y contador alimentado por F0-P5.

Se conserva la paleta jade/ámbar, el terreno y todos los recursos existentes. No hay fondos ni ilustraciones nuevas. La Arena técnica mantiene su distribución original.

## 2. Archivos

Modificados: `LocalGame.tsx`, `UnitInspector.tsx`, `Shop.tsx`, `Bench.tsx`, `gameHud.css`, `LocalSession.ts`, `boardPort.ts`, `BoardScene.ts`, `viewport.ts` y etiqueta de versión de `App.tsx`. Nuevos: `gameHud.test.ts`, `localViewport.test.ts` y este informe. Documentación de UI, arquitectura, decisiones, roadmap, validación y dirección visual actualizada.

`inspection()` es un modelo de lectura: combina propiedad, definición, estrellas, perfil escalado y snapshot vivo. No despacha comandos. `pointerActivate` separa el clic sobre terreno de la colocación por teclado y solo lo implementa la Partida local.

## 3. Cámara e inspector

Canvas ocupa todo el campo. La cámara reserva 172 px CSS para el rail en escritorio, 16 a la derecha, 16 arriba y 28 abajo; conserva el margen de cabezas de 84 unidades de mundo y 26 para extrusiones. Proyección visual local 0,32, anteriormente 0,38; Arena sigue en 0,64. No cambia geometría axial, pathfinding, ocupación ni reglas. Zoom 85/100/115 % sigue disponible; el acercamiento manual puede recortar extremos, como antes.

Inspector flotante de 280 px (310 en pantallas grandes), limitado a la arena con scroll interno. Vida/maná vivos, ataque, velocidad base, defensas, alcance, coste, estrellas, habilidad, pasiva y afinidades reales. Etiquetas provisionales explícitas. Venta y colocación solo para propias y en preparación válida.

Clic en terreno vacío, botón de cierre o Escape cierran. Cambio directo entre unidades conserva la ficha. No hay backdrop ni trampa de foco; el cierre devuelve el foco al canvas si estaba dentro de la ficha. Intro permite inspeccionar rivales y ambos equipos durante combate. Arrastre se reconoce tras 5 px y no abre la ficha en pointerdown. Entrada de 140 ms, salida de 120 ms, sin movimiento con reduced-motion; el timeout de salida es solo presentación, no un reloj de partida.

## 4. Capturas y comparación

Archivos locales en `artifacts/f0p51/`, ignorados por Git:

- `before-1440.png`: F0-P5, misma semilla 360, partida preparada.
- `after-1280x720.png`, `after-1366x768.png`, `after-1440x900.png`, `after-1920x1080.png`, `after-2560x1440.png`: V2, ficha cerrada.
- `final-1440x900.png`: vista final con DOLEA 2★, ronda 3 y partida de desarrollo pausada.
- `inspector-dolea.png`, `inspector-1280.png`, `combat-dolea.png`, `combat-rival.png`: ficha y combate.
- `mobile-inspector.png`: 390×844, flujo vertical y ficha de una columna.
- `round-transition.png`, `arena-star3.png`, `arena-timeout.png`: ronda y compatibilidad técnica.

| Viewport  | Canvas P5 | Canvas V2 | Área de canvas ganada | Scroll del documento V2 |
| --------- | --------- | --------- | --------------------- | ----------------------- |
| 1280×720  | 888×322   | 1248×390  | +70 %                 | No                      |
| 1366×768  | 974×370   | 1334×438  | +62 %                 | No                      |
| 1440×900  | 988×462   | 1408×570  | +76 %                 | No                      |
| 1920×1080 | 1382×588  | 1872×696  | +60 %                 | No                      |
| 2560×1440 | 2022×948  | 2512×1056 | +38 %                 | No                      |

Medidas DOM reales; tamaño de canvas no equivale a área de terreno. La huella del tablero en la comparación 1440 pasa aproximadamente de 820 a 1050 px de ancho. Medidas anteriores contrastadas con `artifacts/f0p5-viewports.json`; una lectura inmediata de resize de 2560 en la primera pasada devolvió el tamaño previo, por lo que no se utiliza ese dato obsoleto. Capturas nuevas realizadas tras el resize.

Abrir/cerrar el inspector a 1440 conserva rectángulo de canvas **1408×570 en (16,86)**. A 1280, ficha ocupa (976,122)–(1256,444); banquillo empieza en 476 y tienda termina en 708. No los bloquea.

## 5. Interacciones ejecutadas en navegador

Partida de desarrollo aislada, sin reemplazar el guardado normal:

- Semilla360: compras DOLEA2/4/5, fusión2★, saldo10→4, perfil1080HP/72ATK y retrato de tirantes.
- Arrastre banquillo→tablero; movimiento tablero→tablero sin abrir ficha; retirada tablero→banquillo.
- Compra K-01, intercambio real de plazas1/2 por arrastre, recolocación de DOLEA y venta de K-01: saldo3→4.
- Selección propia y rival, cambio directo de ficha, clic en terreno vacío, botón de cierre, Escape y retorno de foco al tablero.
- Bloqueo de tienda, compra de4XP y renovación: saldo7→3→1; tienda bloqueada conserva ofertas al pasar de ronda.
- Selección de DOLEA y rival durante combate pausado; botones de edición deshabilitados y ficha fuera de banquillo/tienda.
- Recarga real del combate mantiene ronda2,44,8s,oro1,vida100/96 y tienda bloqueada; ficha vuelve cerrada.
- Fin natural de ronda2: victoria,+5oro,saldo6,vida100/92,racha2,nivel4. Resolución visible con contador, seguida automáticamente de ronda3.
- Intro sobre canvas permite inspección durante combate, sin cambiar el estado lógico.

Los intentos de usar `checkbox` para el botón de bloqueo y de pausar Arena después del tick450 caducaron; no se consideran verificaciones exitosas. Se corrigió el selector de bloqueo a button y se observó el resultado final de Arena.

## 6. DOLEA y Arena

PNGs originales, hojas, retratos, manifiestos y pipeline de importación intactos. La suite existente cubre apariencias1/2/3★,8frames de ataque, fallbacks, compras, fusiones, venta y persistencia. En navegador: retrato1★ en tienda,2★ en banquillo/tablero/inspector; Arena3★ muestra1944HP/129ATK con apariencia2★. Escenario DOLEA overtime observado en tick438,1,2s; termina en450 con doble derrota. Repetición y velocidad×2 disponibles. No se hizo una nueva auditoría fotograma a fotograma de los16frames.

## 7. Compatibilidad con F0-P5

Sin modificaciones en game-core, shared, game-data, autoridad, reloj, deadlines, economía, RNG, guardados ni host automático. Misma clave y formato de persistencia. Selección/inspección no se serializan. Las rondas y sus pagos siguen controlados por el coordinador existente. Arena usa el mismo renderer y motor, sin el nuevo puerto de clic local.

## 8. Pruebas

Auditoría inicial `pnpm check`: 227 tests en 22 archivos, typecheck, lint y build correctos. Validación final: **246 tests en 24 archivos**, typecheck, lint, build, `pnpm format:check` y `git diff --check` correctos. Ningún test anterior modificado. 19 nuevas pruebas: 9 de HUD/sesión real y 10 de cámara/densidad. La consulta final de consola del navegador no devolvió errores ni avisos.

HUD: cierre inicial, ofertas/plazas desde estado real, economía y restricciones, selección propia/rival, deselect sin mutación, separación teclado/clic, drops inválidos e intercambios, DOLEA2★/venta, bloqueo/asequibilidad, fases automáticas, guardados, Arena y acceso por teclado durante combate. Cámara: esquinas/cabezas/extrusión dentro de zona segura para cinco tamaños yDPR1/2.

Revisión independiente: dos hallazgos corregidos (teclado en combate y grid heredado en inspector móvil), dictamen final `ship` sobre esos ajustes y evidencias. Detector visual: un aviso por borde inferior de coste de3px en cartas, conservado por el requisito explícito de identificar coste mediante borde/color.

## 9. Límites y mejoras futuras

- Desktop validado en un navegador integrado; sin matriz multinavegador ni dispositivos táctiles reales.
- Bajo1100px se permite scroll vertical.390px comprobado sin desbordamiento horizontal; no se declara soporte móvil completo.
- La ficha puede cubrir parte derecha del terreno mientras está abierta, deliberadamente; se cierra con Escape y nunca cambia el encuadre. El rail queda fuera del área segura de cámara.
- Habilidades, afinidades, balance y terreno siguen provisionales. Futuro: arte definitivo, estados de animación restantes, más participantes reales y accesibilidad táctil.
- Aviso de peso del chunk Phaser preexistente; no se ha silenciado.

## 10. Git

Base `067a1ee`, rama `main`. Al comenzar solo existía `Sprites/` sin seguimiento, aportado por el usuario. No se modificó ni incluyó. Cambios de P5.1 locales y revisables; sin commit nuevo, sin configurar remoto ni push. No se añaden dependencias.
