## F0-P6B.4 — actualización vigente

La norma vigente de tienda es retrato dominante, sinergias **abajo a la izquierda sobre el nombre**, coste abajo a la derecha. Sustituye la posición superior histórica de P5.3. Controles comparten marco metálico original; inspector contextual incorpora contadores reales. A ≤800px de altura, participantes permanecen fijos y solo la lista de sinergias se desplaza; avisos quedan fuera. Cinco tamaños de escritorio conservan cinco tarjetas sin scroll de página.

Sistema y criterios completos: [GAME_VISUAL_SYSTEM.md](GAME_VISUAL_SYSTEM.md). Las secciones posteriores se conservan como historial; esta actualización prevalece en presentación.

---

## Ajuste de espacio de arena

El banquillo ahora es una bandeja flotante dentro del campo, sin fila externa. El campo gana 68/86px y la imagen se muestra completa al100%, con escala uniforme. Los nueve destinos permanecen accesibles, el inspector termina antes de la bandeja y el margen de cámara evita que el zoom esconda hexágonos debajo. En móvil los destinos pueden desplazarse horizontalmente. Esta disposición sustituye la fila de banquillo descrita en el historial posterior.

## Actualización F0-P5.3: tienda PC

La presentación vigente del dock sustituye las tarjetas y botones económicos de P5.1: cinco fichas continuas con rasgos provisionales apilados arriba, retrato proporcional, placa inferior nombre izquierdo/coste derecho y marco por coste. GameFrame/GameIcon/GameButton comparten geometría escalonada y estados; onCue prepara audio futuro sin reproducirlo. Bloquear reserva ofertas sin impedir la compra. Detalle y evidencia en [F0_P53_REPORT.md](F0_P53_REPORT.md); tokens en DESIGN.md.

# F0-P5.2 — Mar de Cristal (vigente)

Se conserva la composición de HUD V2. El encuadre uniforme mantiene visibles el cartel de Carrefour y las 56 celdas ampliadas; en formatos anchos admite espacio lateral del color del HUD para evitar recortarlos. Las 56 celdas se calibran sobre asfalto mediante homografía; no se dibuja el antiguo terreno encima. Cuadrícula oculta sin interacción y en combate; selección/arrastre durante preparación revela destinos, ocupación y prohibiciones. Un drop aceptado cierra la selección visual.

Inspector, economía, tienda, banquillo y reloj mantienen dimensiones y comportamiento. Texto superpuesto recibe fondo discreto para contraste. Calibración solo en partidas de desarrollo, nunca en partidas normales. Encadre/zoom priorizan celdas y cabezas sobre los detalles periféricos; inspector no provoca resize. Cinco resoluciones de escritorio sin scroll. Parámetros y límites en [MAR_DE_CRISTAL_CALIBRATION.md](MAR_DE_CRISTAL_CALIBRATION.md).

---

# F0-P5.1 — Game HUD V2 (vigente)

La partida usa cuatro filas: cabecera compacta, campo flexible, banquillo9 y franja de reclutamiento. Canvas ocupa el campo; participantes156px flotan a la izquierda. No existe columna derecha permanente. Economía/XP, tienda5 y renovar/bloquear se agrupan abajo. Se mantiene la identidad jade/ámbar y el arte existente.

La ficha aparece solo al seleccionar propia o rival, también en combate. Vida/maná proceden del snapshot vivo; perfiles, estrellas y habilidades del catálogo/core. Cierra por terreno vacío, botón o Escape; no roba foco al abrir ni bloquea la arena fuera de su rectángulo. Si el foco estaba dentro al cerrar, vuelve al tablero. Apertura140ms/salida120ms con reduced-motion. Arrastre se separa del clic tras5px; Intro conserva colocación propia y permite inspección de rivales/combate.

Encadre local0,32; cámara con margen HUD172/16/16/28px CSS más margen de sprites en mundo. Inspector280px/310px, posición absoluta, scroll interno, sin resize de canvas. A100% cabe la huella completa; zoom115% puede recortar extremos. Nueve plazas compactas pegadas al campo, retratos y estrellas; tarjetas priorizan retratos y estados sin repetir todos los detalles.

Contrato desktop>=1100px: no scroll vertical/horizontal; validado1280×720,1366×768,1440×900,1920×1080,2560×1440. Bajo1100px flujo vertical; inspector permanece superpuesto dentro del campo.390×844 comprobado sin overflow horizontal. Arena técnica conserva su UI.

F0-P5 permanece íntegro: reloj único, preparación30s, combate máximo45s, resolución5s, eliminación y recuperación. Sin cambios económicos, de combate, sprites ni guardados. Véase [informe y evidencia](F0_P51_REPORT.md).

---

## Histórico F0-P4/F0-P5 (sustituido en distribución por V2)

# F0-P4 — Interfaz de partida local

## Composición

La partida usa una cuadrícula que ocupa `100dvh` menos los 42 px de navegación. Tres columnas: participantes locales, tablero flexible e inspector. La zona inferior dispone banquillo de nueve casillas, mensaje de acción y tienda de cinco ofertas; el HUD económico ocupa la esquina inferior izquierda. La secuencia visual y de planificación es **tablero → banquillo → tienda**. No se bloquea el overflow del documento para disimular controles fuera de pantalla.

La cabecera contiene ronda, fase, contador y acciones manuales. Los participantes se ordenan por vida, identificando al jugador jade y a la formación rival ámbar de prueba; no se presentan jugadores online ficticios ni una clasificación multijugador. Las recompensas aparecen en esa columna al resolver. El registro completo de oro/vida está en un diálogo nativo con cierre, Escape y foco modal.

`LocalGame` compone el HUD y los participantes; `Bench` y `Shop` encapsulan banquillo y tienda. `UnitInspector` encapsula ficha, estadísticas, venta, colocación accesible y afinidades descriptivas. `PhaseClock` representa la fase/reproducción. `gameHud.css` contiene estilos bajo `.game-hud`; la navegación compacta solo se activa durante partida. Arena conserva sus componentes, controles, estilos y cámara originales.

## Tablero, cámara y densidad

Se comparte una sola implementación de GameCanvas/BoardScene/CombatRenderer, mediante opciones de presentación. Partida utiliza compresión vertical 0,38, la misma rotación de 30° y las mismas coordenadas/vecinos/ocupación. Arena mantiene compresión 0,64 y su mundo 1000×650 con Scale.FIT.

En Partida, ResizeObserver mide el espacio CSS disponible; Scale.NONE y resize ajustan el render buffer. La densidad se limita a 1–2 para controlar memoria. `matchMedia(resolution)` y resize detectan cambios de DPR sin recrear la simulación. La cámara encuadra los 56 hexágonos, reservando 84 unidades de mundo sobre el terreno para cabezas/barras y 26 bajo el terreno para extrusión. La inversa del puntero convierte desde rectángulo CSS a dimensiones actuales del render y después a mundo/axial. No se multiplica el puntero por DPR dos veces. Zoom 85/100/115% opera sobre ese encuadre; 100% vuelve a mostrar la huella completa. El acercamiento manual puede recortar bordes por diseño.

Canvas absoluto dentro del host evita que su ancho intrínseco ensanche la cuadrícula. La selección/hover nunca restablece el zoom. El HUD de overtime local reside fuera del mundo, en cabecera, para no tapar unidades. Arena conserva su énfasis Phaser y contador DOM.

## Economía y estados

Los saldos, nivel, XP, racha, recompensas, vida y estrellas vienen de MatchState. Ninguna fórmula cambia. `purchaseAvailability` hace una prueba de la transacción existente en game-core, que clona el estado; se memoriza por estado, no por fotograma. Permite la compra con banquillo lleno si el motor confirma una combinación inmediata, y muestra falta de oro/banquillo lleno/espera a preparación en los demás casos. No consume RNG, oro, ofertas ni historial.

Tienda: retrato original provisional, ID/nombre, rol, afinidad informativa, coste, copias 1★ y estado. Banquillo: nueve destinos, número, retrato, nombre y estrellas. Los hijos visuales no reciben pointer-events y la casilla no selecciona texto: evita perder drops rápidos al atravesar retrato/texto. Reordenación, intercambio, retirada y colocación envían los mismos comandos atómicos. El core rechaza destinos ilegales y conserva las unidades. Venta en inspector; selección por botón y colocación por teclado disponibles. En combate/resolución las operaciones de preparación quedan deshabilitadas.

Los mensajes de compra, venta, error, fusión y subida de nivel usan el estado de LocalSession. Las afinidades Aleación/Pulso son etiquetas de los IDs ficticios existentes, **sin umbrales ni efectos activos**. Victoria/doble derrota y desglose de daño/recompensa proceden de la liquidación existente.

## Viewports y accesibilidad

Contrato de escritorio desde 1100 px de ancho y alturas de referencia desde 720 px. A 1280×720 y 1366×768 se reducen espacios, retratos y texto secundario; tablero, nueve plazas, cinco ofertas y controles principales siguen visibles. El inspector puede desplazarse internamente para información secundaria o al abrir colocación. Al cerrar esa sección o cambiar selección vuelve arriba. El registro completo también tiene scroll interno. Ninguno amplía el documento.

A 1440×900 se usa densidad intermedia; a 1920×1080 y 2560×1440 aumenta el tablero, manteniendo controles compactos. Bajo 1100 px se permite flujo de documento para ventanas estrechas, sin quitar operaciones. No se declara soporte táctil validado ni ausencia de scroll en móvil.

Botones con nombres accesibles, estados disabled/aria-pressed, foco visible, regiones etiquetadas, meter de vida y progress de XP. Canvas dispone de descripción, flechas/Intro/Escape y alternativa de selectores de columna/fila. El estado de acción usa role=status; el contador no es live-region para evitar anunciar cada tick. Color acompañado por texto para fase, coste, estrellas y errores. Microinteracciones breves; reduced-motion elimina transiciones del HUD. El combate mantiene su reproducción y pausa explícita.

## Contrato preparado para F0-P5

`PhaseClockProps` admite `authoritativeRemainingMs` opcional. Si falta, combate representa `PlaybackFrame.remainingTicks`; preparación/resolución muestran raya y «Avance manual». No hay setInterval, cuenta atrás ficticia ni transiciones automáticas.

P5 podrá alimentar 30 s de preparación, hasta 45 s de combate y aproximadamente 5 s de transición desde una autoridad de ronda. Debe definir pausas, reentrada, restauración y comandos idempotentes antes de conectar esos tiempos. El reloj visual de reproducción no deberá convertirse en autoridad económica. F0-P4 no implementa esa fase.

Guardados y protocolos permanecen f0p3.1-1, misma clave local y replay de validación. No hay migración, nuevas dependencias, servicios ni arte definitivo.

## Extensión F0-P5 — estados y reloj

Se conserva el HUD, cámara y áreas de P4. La cabecera muestra preparada/inicio explícito, preparación30s, combate por reproducción, Overtime, resolución5s o finalizada. Últimos5s: fondo/tono ámbar y «El combate está próximo», sin parpadeo ni movimiento adicional. En modo normal no hay iniciar combate, siguiente ronda, pausa ni velocidad. Solo Iniciar partida y Nueva partida cuando corresponden.

Tienda/banquillo permanecen visibles y cerrados antes del inicio y fuera de preparación; el plazo se valida también en core. Resolución y eliminación usan un panel lateral compacto con resultado/oro/daño/XP/racha y detalle desplegable. Durante esas fases se compactan las tarjetas de participantes para que la recompensa sea legible incluso a1280×720. El tablero nunca queda cubierto por el resultado. Contador/siguiente ronda siguen en la cabecera. Vargas y Florin son los nombres de prueba.

La depuración solo aparece en partidas creadas desde el desplegable técnico del lobby, en un diálogo aparte. El guardado de pruebas no reemplaza el normal. Recuperar conserva el restante y no realiza rondas durante la ausencia. Las cinco resoluciones de escritorio de P4 siguen siendo el criterio; tamaños inferiores mantienen el comportamiento adaptativo anterior.
