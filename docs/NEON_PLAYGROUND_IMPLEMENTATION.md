# F0-P6B.5-B — Festival Pop C × Neon Playground

Implementación del diseño aprobado en React/Phaser. Fuente visual: `design-exploration/f0-p6b5a2/neon-playground/`, incluidas pantalla, inspector, componentes y `tokens.json`. Fecha: 24 de octubre de 2026. F0-P7A no se inicia.

## 1. Sistema visual implementado

El HUD sustituye la identidad carbón/jade/latón por Festival Pop C × Neon Playground. Se reconstruyen la composición, placas, marcos, medallones, diagonales, tipografía, capas de profundidad y estados. Mar de Cristal continúa como escena dominante; la clasificación usa Vargas/Florin. Las cinco ofertas y nueve plazas permanecen simultáneas. Royal Pop no se adopta.

## 2. Componentes modificados

`LocalGame`, `Shop`, `Bench`, `UnitInspector`, `PhaseClock`, `TraitRail`, `GameFrame`, `GameButton`, `GameIcon` y `ContentIcon`, junto con navegación y presentación DEV. `neonHud.css` reemplaza los cuatro estilos anteriores de partida y `neonTokens.css` centraliza los colores. `displayLabel` permite rótulos visibles breves sin perder etiquetas accesibles completas. Cierre fijo del inspector, Escape, retorno de foco y reinicio del scroll al cambiar de personaje conservados; datos extensos con scroll interno. Ajustes usa un marco compacto de 65×61; cartas/controles/paneles conservan las cajas vectoriales aprobadas.

## 3. Recursos gráficos y licencias

Se reutilizan los paths originales C de marcos, juntas y glifos, la composición de retratos y todos los recursos originales de personajes/arena. Bungee se copia localmente con su licencia SIL OFL en `apps/web/public/assets/fonts/`; FestivalPop es su alias CSS. DM Sans ya era dependencia del proyecto, con su licencia existente. No se generan personajes ni se modifica el importador de sprites. Los iconos de contenido mantienen IDs, asociación al registro original y fallback; sus glifos de HUD proceden del prototipo aprobado. La variante compacta de marco es vectorial y conserva el vocabulario C.

## 4. Tokens definitivos

64 colores semánticos copiados exactamente de `tokens.json`; ver `neonTokens.css` y el catálogo completo en `DESIGN.md` / `.impeccable/design.json`.

| Papel                     | Color                             |
| ------------------------- | --------------------------------- |
| Noche / canvas            | `#222653` / `#0F1125`             |
| Marco / resalte           | `#5078F5` / `#8EA7F9`             |
| Acción / acento económico | `#C7EF60` / `#F56DC3`             |
| Texto / papel             | `#F4F3FF` / `#C3CEFC`             |
| Oro                       | `#F6C454`                         |
| Coste 1 / 2 / 3           | `#A9B5C7` / `#74E1CD` / `#FFB755` |
| Vida / rival              | `#70E0A3` / `#FFB56F`             |
| Maná / escudo             | `#66C9ED` / `#B4DDF0`             |
| Peligro                   | `#FF817A`                         |

El baño ciruela inferior reutiliza el tratamiento original de la referencia. El reloj urgente tiene un rojo oscuro de contraste sobre papel claro. Son tratamientos documentados, sin mezclar otra paleta. Lima señala acción/intención; magenta remata economía/fase. Los costes y recursos mantienen sus significados.

## 5. Capturas reales

Evidencia en `artifacts/p6b5b/`:

- `before-1920.png`: HUD anterior, capturado antes de editar.
- `final-{1280,1366,1440,1920,2560}.png`: cinco viewports requeridos, documento desde arriba.
- `final-inspector-1920.png`, `inspector-details-1920.png`: VARGAS y contenido desplazado, con cierre visible.
- `components.png`: detalle real de las cinco fichas, economía y controles.
- `dolea-inspector-1920.png`, `fusion-1920.png`: Volumen Sucio y evolución real a dos estrellas.
- `locked-1920.png`, `disabled-1920.png`, `hover-focus-1920.png`: estados funcionales.
- `combat-1920.png`, `combat-counters-1920.png`, `overtime-1920.png`, `dev-1920.png`: comprobaciones de juego.

Las capturas de estados funcionales se tomaron durante sus recorridos; no todas corresponden a la misma revisión intermedia de acabado. Las tres comparaciones obligatorias y las cinco vistas `final-*` se recapturaron después de las correcciones del revisor.

## 6. Comparación con el prototipo

Se abrió e inspeccionó cada referencia y se midieron las cajas. A 1920×1080, valores CSS en píxeles:

| Región           | Referencia x/y/ancho/alto | Implementación                                |
| ---------------- | ------------------------- | --------------------------------------------- |
| Fase             | 586 / 18 / 650 / 87       | Igual, error de redondeo <0.02px              |
| Banquillo        | 354 / 696 / 1164 / 104    | Igual                                         |
| Economía         | 23 / 805 / 246 / 231      | Igual                                         |
| Cinco ofertas    | 283 / 805 / 1375 / 231    | Igual                                         |
| Controles tienda | 1672 / 805 / 225 / 231    | Igual                                         |
| Inspector        | 1530 / 141 / 360 / 654    | Igual caja de diseño, scroll interno          |
| Arte de arena    | 280 / 66 / 1460 / 821.875 | Aproximadamente 312.34 / 8 / 1395.33 / 785.29 |

Los marcos, tipografía Bungee/DM Sans, colores, medallones, campos diagonales y distribución de cartas se compararon visualmente con los originales. No se presenta una puntuación automática inventada de similitud. Las mediciones de documento/cajas están en `final-audit.json`; muestras de píxeles de fondo en `ground-comparison.json`.

## 7. Desviaciones justificadas

La cámara existente reserva espacio para las casillas bajo el banquillo. Copiar exactamente el montaje estático pondría parte del tablero legal bajo la bandeja; por mandato del usuario no se modifica la cámara, calibración ni proyección. Se conserva la imagen completa y Carrefour visible, con el encuadre medido anterior. Las figuras se colocan en centros legales y conservan escala 1.4, pies, hit bounds, perspectiva y animación, en vez de reproducir posiciones libres del montaje.

La referencia combina preparación18.4s con Iniciar activo, un retrato DOLEA2★ para una compra1★ y contadores avanzados antes del combate. La implementación muestra acciones autorizadas, compras1★ y contadores reales. AD/AP/críticos, resistencias, habilidades y descripciones completas requieren más contenido que el inspector ilustrativo; se conserva su caja y se usa scroll interno permitido.

El fixture `Cargar referencia Neon` permite comparar ronda3, 52 oro, nivel4, XP4/10, vida100/88 y las mismas cinco ofertas. Reserva copias del pool y restaura un snapshot validado. Sus rivales son perfiles reales en una formación diagnóstica aislada; el reloj fijo18.4s está explícitamente identificado. No cambia partidas normales ni sus temporizadores.

## 8. Resultado de pruebas

Base: 614 pruebas/41 archivos. La primera comprobación falló por56 errores de lint en prototipos standalone históricos. Se excluyó exclusivamente `design-exploration/**` del lint de aplicación, manteniendo las reglas y todas las pruebas. Base posterior correcta:614.

Resultado final: **619 pruebas en42 archivos**, tipos, lint y build correctos. Cinco pruebas nuevas comprueban fixture/pool/aislamiento, render y selección de inspector, transacciones, rótulo visible/semántica y rechazo de XP durante combate. `verify:public` confirma ausencia del controlador, panel, comandos y guardado DEV en el bundle público. Persiste el aviso conocido de chunks grandes. Logs inicial/final/público en el directorio de evidencia.

## 9. Validación del HUD

Cinco tamaños sin scroll del documento ni imágenes incompletas, con cinco tarjetas y nueve posiciones. Se comprobó legibilidad de nombres, costes y rasgos; apertura/cierre y scroll del inspector; registro; foco y navegación. Se ejecutaron acciones con estados idle/hover/focus/pressed, bloqueo y disabled. Una lectura DOM tras pasar por Renovar confirmó hover/foco y superficie `#CEF078`; pressed tiene su regla funcional y se ejecutó mediante clic, sin afirmar una captura sostenida de cada transición. Movimiento reducido está implementado y revisado en código; no se alteró la preferencia del sistema operativo.

Revisión visual fresca Impeccable: primera disposición `fix`, seis hallazgos concretos corregidos en bloque y recapturados. Fondo inferior, barras completas con iconos, cierre fijo, plus de banquillo, marco de ajustes/nombres accesibles y documentación. Ver `finish-review.md` y el veredicto final `ship` para esas seis correcciones en `finish-verdict.md`. Detector ejecutado una sola vez; líneas inferiores de banquillo y feedback son geometría/estado funcional autorizados, y los avisos de tipografía/paleta se documentan con la nueva autoridad.

## 10. Integridad de DOLEA y VARGAS

Sprites, manifiestos, importación, clips, apariencias y fallback previos intactos. Se conserva el factor visual1.4 aprobado y sus límites originales de interacción. DOLEA muestra Volumen Sucio; una compra completó su fusión2★ y mostró1080HP y arte correspondiente. VARGAS conserva Copita Perhaps, Resaca Controlada y Blackhaus RPP. Durante combate se observó Resaca1/5, +4% de velocidad, AD70 y ataques/s0.832. No se inventan progreso ni eliminaciones.

## 11. Integridad de economía y combate

Recorrido real: XP52→48, renovar48→46, compra con tienda bloqueada46→44 y venta44→47. Oro0 deshabilita compra/XP/renovación. Bloquear no impide comprar. Arrastre tablero→banquillo→casilla legal conservó la formación. Las fusiones pasan por la misma autoridad existente.

Un DEV con tiempo real y duraciones diagnósticas8s/2s avanzó automáticamente hasta ronda5 con liquidación de ronda4. Se observó preparación, combate y resolución, animación, escudos y contadores. Pausa y recuperación tras recarga conservaron ronda5/combat43.7s. Arena técnica ejecutó victoria en Overtime hasta tick357 y permitió revisar el evento real tick300/15s restantes. No se afirma una partida normal completa ni Overtime natural del ciclo local durante esta sesión. Los paquetes de simulación y datos no cambian.

## 12. Estado Git

Trabajo en `codex/f0-p6b5b-neon-implementation`, desde `976a22e`. Los PNG/Sprites y `.21st` ajenos previamente presentes se conservan. Cambios limitados a presentación, fixture/test DEV, licencia, documentación y alcance de lint de prototipos. No se configura remoto ni se hace push. La evidencia seleccionada se conserva con el cambio local; los pasos transitorios de QA no forman parte del producto.

## 13. Limitaciones

Validación real en el navegador integrado de escritorio; no representa una matriz de todos los navegadores/GPU ni una auditoría exhaustiva de rendimiento. Los recursos y animaciones pendientes de personajes siguen siendo los declarados en fases anteriores. Arena técnica conserva su interfaz de laboratorio y colores históricos de tablero para diagnóstico. No hay audio ni funciones online nuevas.

La consola de edición registró fallos transitorios de recarga mientras se escribían módulos; se distingue de la comprobación final desde una recarga limpia, registrada en `console-final.json`. No se declara ausencia de errores durante toda la sesión. La consulta 21st no pudo ejecutarse porque su CLI no está instalada; se reutilizó directamente la fuente visual aprobada, sin generación alojada ni dependencias nuevas.

## 14. Preparación para F0-P7A

Tokens y componentes reutilizables, estados accesibles, evidencia de cinco resoluciones y contrato de ampliación listos. Un nuevo personaje debe aportar su manifiesto y habilidades reales; usar los costes/rasgos/iconos semánticos existentes y validar pies, escala y ficha. Una arena nueva debe conservar el contrato de cámara/proyección y comprobar reservas de espacio. **F0-P7A permanece sin iniciar**; no se añaden personajes, multijugador, objetos ni aumentos.
