# F0-P5.3 — Tienda y controles Game HUD

Implementación local del 23 de octubre de 2026. Rediseño de presentación; motor, economía, reloj, pool y guardados conservan sus reglas. No se ha iniciado F0-P6.

## Referencia y criterio visual

Antes de implementar se inspeccionaron imágenes reales de la interfaz de **TFT PC**, tanto la [actualización oficial de Riot](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/tft-interface-update/) como la captura de escritorio de abril de 2026 en la [guía de Mobalytics](https://mobalytics.gg/tft/guides/tft-beginners-guide). Se tomó la composición funcional: arena dominante, reservas inmediatamente encima, cinco ofertas contiguas y economía alrededor. Los marcos, iconos y recursos de Riot no se copiaron.

La interpretación propia usa metal jade oscuro, marfil y latón, geometría SVG escalonada, remates de píxel y placas inferiores separadas. Las sinergias se colocan arriba conforme al requisito del usuario. Sus nombres e iconos son informativos y aparecen identificados como provisionales; no introducen efectos de combate.

## Componentes y estados

- `GameFrame`: marco escalonado original con contorno, bisel y remates; la geometría de interfaz puede adaptarse a su contenedor, los retratos mantienen proporciones.
- `GameIcon`: oro, experiencia, renovación, bloqueo, afinidades y confirmación originales en SVG.
- `GameButton`: control reutilizable para XP, renovación y bloqueo, con idle, hover, pressed, foco visible, active y disabled. Una acción aceptada dispara un breve pulso. `onCue` ofrece puntos de extensión hover/press/success; no hay audio implementado.
- `Shop`: cinco cartas iguales, uno o dos rasgos apilados arriba, campo de retrato mayoritario y franja inferior con nombre izquierdo y precio derecho. DOLEA utiliza su arte real ya integrado. K-01, V-02, R-03 y M-04 conservan los recursos provisionales existentes.
- Costes 1/2/3: jade, cian y latón con números legibles; el color no es la única señal. Oro insuficiente y fase cerrada llevan texto, la oferta bloqueada muestra candado. Bloquear conserva las ofertas de la siguiente ronda y permite comprar.
- La compra muestra «Reclutado» y el nombre en el hueco resultante. Selección de una oferta se expresa mediante foco/pulsación, sin un estado persistente ficticio: al activarla se ejecuta la compra real.

El dock mide 192 px en escritorio compacto y 212 px a partir de 1700 px. Comparado con P5.2 crece 28/20 px, conservando la arena como elemento dominante. El cartel de Carrefour y la cuadrícula ampliada de P5.2 se mantienen.

## Evidencia visual

Capturas locales en `artifacts/f0p53/`, excluidas de Git:

| Evidencia                        | Archivo                                |
| -------------------------------- | -------------------------------------- |
| Antes real, 1920×1080            | `before-1920-recaptured.png`           |
| Después final, 1920×1080         | `after-1920-final.png`                 |
| Después final, 1440×900          | `after-1440-final.png`                 |
| Después final, 1280×720          | `after-1280-final.png`                 |
| Móvil auxiliar, viewport 390×844 | `after-mobile-final.png`               |
| Hover / pulsación real           | `hover-1920.png`, `pressed-1920.png`   |
| Bloqueo / tienda cerrada         | `locked-1920.png`, `disabled-1920.png` |
| Marco de coste 3                 | `cost3-locked.png`                     |
| Compra DOLEA y oro insuficiente  | `purchase-insufficient-1920.png`       |
| Renovación real                  | `reroll-1920.png`                      |

Las tres resoluciones de escritorio muestran cinco cartas simultáneamente, sin scroll del documento. Nombres, costes, sinergias y DOLEA se comprobaron visualmente. La versión móvil mantiene desplazamiento horizontal interno de cartas y flujo vertical; su captura completa mide 379×1029 por la barra vertical de 11 px. No se presenta como composición de cinco ofertas simultáneas para móvil.

Las capturas iniciales `before-1920.png` y `before-1920-five-offers.png` estaban mal nombradas: realmente son 1440×900. Se sustituyeron como evidencia por una recaptura real de la fuente anterior en copia temporal aislada: Shop/LocalGame de P5.1 más integración vigente de Mar de Cristal de P5.2, mismo seed42 y cinco ofertas. La copia temporal se compiló con sus fuentes locales incluidas tras detectar que el servidor de desarrollo aislado rechazaba sus rutas. No se redimensionó una imagen para fingir una captura de 1920. Las capturas de estados anteriores a la corrección de rótulos conservan el indicador de versión P5.2; las cuatro capturas finales muestran P5.3.

## Comprobaciones funcionales

Navegador real, partida de desarrollo aislada seed42: inicio con 10 oro; bloqueo/desbloqueo; compra de DOLEA por 2 con tienda bloqueada; dos compras de XP por 4, saldo0 y nivel4; confirmación de reclutamiento, unidad en reserva y ofertas/XP/renovación deshabilitadas por falta de oro. Otra partida de prueba confirmó renovación 10→8 y ofertas cambiadas. Hover se comprobó con su estado CSS activo; pulsación con Espacio retenido confirmó `:active` y desplazamiento de 1 px antes de ejecutar la acción al soltar.

El guardado normal no se reemplazó. No se inyectó estado de juego en el navegador. Dos intentos previos alcanzaron la siguiente fase antes de completar la secuencia; se repitieron con acciones agrupadas dentro del plazo, y no se contabilizan los intentos incompletos como éxitos. Consola consultada después del recorrido sin errores ni avisos registrados.

## Revisión y límites

La revisión independiente aceptó la dirección y detectó dos puntos: respaldo de las sinergias de R-03 sobre el sombrero a 1440/1280 y documentación del sistema desactualizada. El primero se corrigió con el tono opaco de cada carta, sin reducir el retrato; las cuatro capturas finales fueron revisadas y aceptadas visualmente. El segundo se resolvió en DESIGN.md y su sidecar. La revisión independiente verificó ambos cierres y emitió `ship`. Formato y `git diff --check` correctos tras la documentación.

El detector se ejecutó una vez: 27 avisos de colores y 13 de tamaños de letra fuera del sistema anterior, todos advisory. Corresponden al rediseño autorizado, que se documenta con sus valores reales. El primer ajuste de layout corrigió el tamaño intrínseco de SVG/imágenes que desbordaba la fila asignada.

Validación final `pnpm check`: typecheck, lint, 273 tests en 26 archivos y build correctos. Se conserva la suite previa; no se añadieron pruebas que reflejen únicamente estilos. Sin auditoría WCAG exhaustiva, pruebas físicas táctiles, matriz multinavegador ni benchmark GPU. El build conserva el aviso existente sobre el tamaño del chunk de Phaser. Originales de arena y personajes intactos; sin dependencias nuevas, remoto, push ni despliegue externo.
