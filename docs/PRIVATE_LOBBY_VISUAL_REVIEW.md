# Salas privadas · revisión visual F0-P7B.2

Fecha: 24 de octubre de 2026. Disposición final: **ship**, comunicada por el revisor independiente `impeccable_finish_reviewer_lobbies` tras confirmar la única corrección solicitada, la reserva de espacio de la cabecera a 1280px. La validación final comunicada por el coordinador es `pnpm check`: **712 pruebas aprobadas en 51 archivos**. Este documento registra la extensión implementada; no sustituye el sistema de diseño ni constituye una nueva auditoría completa de accesibilidad.

## Continuidad del sistema existente

La pantalla de entrada a salas y la sala de espera extienden **Festival Pop C × Neon Playground**. Conservan fondo azul noche, texto blanco lavanda, placas azules angulares, acciones lima y la pareja FestivalPop (Bungee local) / DM Sans. La composición prioriza crear, entrar, invitar y preparar al grupo: no introduce una identidad visual alternativa.

Las fuentes revisadas son `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `apps/web/src/network/lobby.css` y `apps/web/src/network/Multiplayer.tsx`. Los colores se consumen mediante las variables `--neon-*` existentes; no se añade una paleta de lobby ni se duplican sus valores en otro catálogo.

- `LobbyButton` reutiliza `GameFrame` y `GameIcon`, además de la base `account-action`. El marco de botón usa un viewBox de 460 × 80; el panel reutiliza `GameFrame` con 620 × 650 y relleno `--neon-surface-primary`.
- Bordes, superficies, textos y estados conservan las familias `border-*`, `surface-*`, `text-*` y `button-*`. La selección de plazas, la acción principal y el estado listo usan lima; el estado listo también se expresa con texto e icono.
- Los SVG originales mantienen biseles, esquinas recortadas y juntas. Los avatares conservan la familia gráfica existente. No se incorporan imágenes externas ni recursos de otro juego.
- FestivalPop identifica titulares, código y botones. DM Sans sostiene explicaciones, nombres, etiquetas y estados. El titular usa `clamp(30px, 3vw, 48px)`; los botones tienen 15px, reducidos a 13px en móvil.

## Composición y adaptación

El contenedor `.lobby-shell` tiene **máximo de 1220px**, centrado. Esto limita el crecimiento en 1920 y 2560px: el espacio sobrante rodea la composición. En escritorio, una columna contiene invitación/código y la otra el panel operativo, con segunda columna de hasta 580px y separación de 70px. A partir del ajuste de 1000px, las columnas mantienen proporción 1 / 1.2 y separación de 30px.

Hasta **680px**, la composición pasa a **una columna**, con márgenes de 16px y separación de 24px. Se oculta el emblema decorativo, se compactan panel, avatares y titulares, el pie se apila y las acciones secundarias pueden saltar de línea. El desplazamiento vertical permite alcanzar todos los controles; el móvil no intenta encajar toda la sala en una sola pantalla. Nombres y código admiten ruptura de línea para evitar desbordamientos.

Para escritorio de altura máxima 800px se reducen márgenes y rellenos. La cabecera reserva 56px a la derecha para separar «Mi cuenta» del control global de ajustes; en móvil reserva 48px y reduce tipografía y separación. La corrección a 1280px fue confirmada por el revisor final. La pantalla utiliza `100dvh` y desplazamiento propio cuando el contenido lo requiere.

## Estados y accesibilidad implementada

Los controles son botones e inputs nativos. Las plazas usan radios con `fieldset`, `legend` y etiquetas; la entrada del código tiene una etiqueta asociada. La lista de participantes expresa anfitrión/invitado, identidad propia, disponibilidad de plaza y estado listo o sin conexión mediante texto, sin depender únicamente del color.

El foco visible está definido en la superficie y en los radios; los botones principales tienen altura mínima de 54px. Los estados bloqueados usan `disabled`, y el motivo para no iniciar se muestra junto a las acciones. Los avisos de conexión, copia y espera usan `role="status"` con `aria-live="polite"`. El código admite selección completa y existe una explicación si falla el portapapeles. `prefers-reduced-motion` elimina la transición de las acciones de cuenta dentro del lobby.

Estas observaciones proceden del código y de la evidencia visual; no equivalen a una certificación WCAG, medición exhaustiva de contraste o prueba completa con lector de pantalla. La captura móvil de controles muestra el acceso al inicio y a las acciones de salida tras desplazar la vista.

## Evidencias de la entrega

Capturas conservadas en `.impeccable/review/p7b2/`:

| Superficie                           | Evidencia                                 |
| ------------------------------------ | ----------------------------------------- |
| Entrada, escritorio compacto         | `menu-1280.png`                           |
| Entrada, escritorio y monitor amplio | `menu-1920.png`, `menu-2560.png`          |
| Entrada, móvil                       | `menu-390.png`                            |
| Sala, escritorio compacto            | `lobby-1280.png`                          |
| Sala, escritorio y monitor amplio    | `lobby-1920.png`, `lobby-2560.png`        |
| Sala, móvil y controles inferiores   | `lobby-390.png`, `lobby-390-controls.png` |
| Capacidad de cuatro plazas           | `four-seats-1920.png`                     |

La interfaz distingue correctamente **partidas de dos** y **salas de hasta cuatro**. Para tres o cuatro plazas, el texto informa de que sus partidas llegarán en F0-P7C; la captura de cuatro plazas acredita la composición de espera, no combate multijugador de cuatro.

## Contexto previo que permanece sin modificar

`PRODUCT.md` sigue describiendo como estado actual F0-P6B.5-B y servidor autoritativo futuro. Ese contexto de producto es anterior a las salas presentes y queda señalado para una actualización explícita posterior. `DESIGN.md` y el sidecar describen principalmente Partida local; sus reglas geométricas del HUD no se trasladan literalmente al lobby.

El lobby ya emplea magenta para foco/selección de texto y oro para avisos, mientras que la narrativa general concentra magenta en economía y oro en moneda/estrellas. Se registra esta diferencia de aplicación sin modificar tokens, narrativa ni implementación. Este informe no renueva `PRODUCT.md`, `DESIGN.md` o `.impeccable/design.json`, ni cambia código.
