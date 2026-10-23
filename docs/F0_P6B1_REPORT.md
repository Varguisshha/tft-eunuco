# F0-P6B.1 — Estadísticas avanzadas, AD/AP y críticos

23 de octubre de 2026. Implementación exclusiva de F0-P6B.1; F0-P6B.2 no iniciado. Contrato normativo y ejemplos en [ADVANCED_STATS.md](ADVANCED_STATS.md).

## 1. Modelo final de estadísticas

AD conserva `attack`, velocidad conserva `attackSpeedMilli` y alcance conserva `range`. Se añaden `abilityPower`, `critChanceMilli` y `critMultiplierMilli`. Las nuevas partidas de la web utilizan catálogo `f0p6b1` con AP0, probabilidad0 y multiplicador1500. DOLEA mantiene coste2, estadísticas, Volumen Sucio, pasiva/activa, membresías y sprites. No se incorporan personajes.

AP es potencia absoluta utilizada solo por un ratio explícito. AD/AP son independientes de físico/mágico/verdadero. `combatStatsView` y `baseStatsView` alimentan ambos inspectores desde core, con estadísticas efectivas y Overtime, sin fórmulas duplicadas en React.

## 2. Fórmulas de escalado

Potencia: `floor((base*1000 + AD efectivo*ratioAD + AP efectivo*ratioAP)/1000)`, limitada a1 000 000. Ratios enteros fijos o ternas por estrellas, máximo10 000. `amountByStars` admite bases distintas, excluyendo multiplicación adicional `starScaling: stat`. HP/AD conservan las escalas1/1,8/3,24; AP no recibe una multiplicación implícita. Curación y escudo reutilizan el contrato, con sus modificadores y recortes posteriores propios.

Con AD100, AP80 y base10, los diagnósticos producen estos resultados tras defensas100armadura/50RM:

| Caso                           | Potencia | Daño obtenido |
| ------------------------------ | -------: | ------------: |
| Físico con280 % AD             |      290 |           145 |
| Mágico con200 % AP             |      170 |           113 |
| Físico con200 % AP             |      170 |            85 |
| Mágico con280 % AD             |      290 |           193 |
| Físico mixto150 % AD +125 % AP |      260 |           130 |

Los tests comparan estos importes con eventos reales del motor. El contrato anterior de escalado por vida máxima se conserva para Volumen eterno.

## 3. Reglas de críticos

Básicos: variación histórica al inicio, seguida de tirada crítica; bruto y resultado quedan comprometidos en acción/proyectil. Habilidades/pasivas: solo efectos de daño con `canCrit: true`, por objetivo al resolver. Curación y escudo no admiten crítico.

Probabilidad0–1000, multiplicador1000–5000; valor neutral actual1500. Extremos0/100 % no consumen azar extra. Intermedias usan un uint32 del Mulberry32 existente, con comparación proporcional exacta en enteros y cuantización de32bits. Orden: potencia/variación → crítico → Overtime → mitigación → escudo → HP, con suelo y límites documentados por etapa.

Un cambio durante windup no cambia el básico comprometido ni vuelve a tirar. `critical` se transporta hasta `damage`. El renderer muestra «CRÍTICO» en oro usando la cifra de daño existente y su duración previa; no se añaden sonidos ni efectos con consecuencias mecánicas.

## 4. Composición de modificadores

Estadística efectiva = base por estrellas + planos + suelo del porcentaje total de esa misma base; clamp posterior. Porcentajes de fuentes diferentes se suman y no multiplican los planos. AD100 +20 +15 % =135. El cálculo porcentual usa `BigInt` interno para no perder precisión con muchas fuentes; el estado serializado sigue siendo JSON numérico.

Estados identifican fuente, origen (sinergia/activa/pasiva), estadística, modo y duración. Temporales expiran antes de acumular carga del tick de vencimiento. Duración nula indica permanencia en ese combate. `refresh` exige clave estable bajo reglas nuevas y reemplaza la misma fuente/clave; `stack` conserva instancias. Las bases no se reescriben al aplicar efectos. Cada ronda reconstruye las fuentes, evitando acumulación accidental.

Hortaleza y Llama conservan umbrales/valores. Sus bonificaciones avanzadas son estados permanentes previos a inicializar HP, sin escalar por estrellas; el camino histórico conserva su preparación anterior.

## 5. Velocidad de ataque

Primero se componen base, sinergia, pasiva y activa, con límite1–5000. Overtime multiplica la velocidad final de cada tick. El resto de carga se conserva y un cambio de velocidad modifica aportes futuros, sin reprogramar windups ni ataques ya ejecutados. Se mantiene el máximo de una nueva acción por unidad/tick.

Diagnóstico: base1000 +12 % de sinergia +12 % pasiva =1240; con activa+25 % =1490. Al vencer vuelve1240. En Overtime se observó1788 para un estado con1490 y multiplicador1,2. La cadencia fraccionaria de1500 mantiene inicios1,8,15,21,28,35. Un test con aparición/expiración durante carga conserva los valores esperados, sin resetear progreso.

## 6. Versionado de contratos

Reglas `f0p6b1-1`, catálogo `f0p6b1`, coeficientes `PowerScaling.version: 1`. Protocolo3 conserva su estructura con metadatos opcionales aditivos: crítico en acción/proyectil/daño y modo/origen/duración permanente en estados. Campos avanzados y nivel de estrellas son explícitos en entradas nuevas y rechazados bajo reglas históricas.

`CURRENT_COMBAT_PROFILES` y `CURRENT_ECONOMY_CONFIG` mantienen la referencia P6A; las exportaciones `ADVANCED_*` permiten optar por la fase nueva. `ADVANCED_ECONOMY_CONFIG` cambia únicamente el identificador de catálogo, sin cambiar ninguna cifra económica, pool ni probabilidad. Guardados automáticos conservan envoltura y codificación existentes.

## 7. Compatibilidad con reglas antiguas

No se migran reglas de partidas antiguas ni se rellenan sus estadísticas al parsear. Sus catálogos congelados, historial y entradas originales siguen decidiendo el resultado. Nuevos parsers admiten registros anteriores; no se promete que un cliente anterior pueda interpretar las nuevas reglas.

Antes de editar el motor se capturaron referencias SHA256 de27 trazas completas (varias semillas y estrellas, sinergias, Overtime y límites) y2 guardados históricos con sus trazas. La suite comprueba igualdad serializada de eventos, snapshots y PRNG, y reconstruye los guardados por historial. Las referencias se generaron una vez y no se actualizaron para acomodar cambios.

Un test adicional compara DOLEA antiguo y avanzado con valores neutrales: mismos resultados, HP, maná, carga, muertes, escudos y estado RNG. Las diferencias de formato avanzado son intencionadas y versionadas.

## 8. Tests ejecutados y resultados

Auditoría inicial: **332 pruebas en30 archivos**, tipos/lint/build correctos. Final: **427 pruebas en33 archivos**, conservando todos los casos anteriores. Nuevos casos:60 de estadísticas/contratos/combate,29 de referencias históricas y6 de integración web, persistencia y Arena.

Comprobaciones: `pnpm check`, `pnpm format:check`, `git diff --check`. Se mantienen los avisos de bundle grande; ahora el chunk de aplicación también supera500kB, además de Phaser. Es una advertencia, no un fallo; no se afirma optimización de bundle realizada.

En tests nuevos se corrigieron dos entradas de prueba: comprobación del retrato antes de comprar su oferta, y maná0 en una pasiva pura, conforme al contrato existente. No se alteraron tests antiguos ni reglas para hacerlos pasar. La revisión detectó y corrigió la mezcla de perfiles antiguos al editar una formación de diagnóstico avanzado; tiene un caso de regresión propio.

## 9. Validaciones visuales y funcionales

Navegador IAB real en [localhost4173](http://127.0.0.1:4173/). Arena ejecutó los12 diagnósticos con semilla42. Se verificaron crítico básico visible75 frente a50 sin crítico; AD100→135→100 al aplicar/expirar, AP110 permanente; velocidad1,24/1,49; Overtime1,788; apoyo con escudo100; DOLEA en tick75 con281HP/72escudo y estado de pasiva Activada.

Las habilidades físicas/mágicas AD/AP y mixtas se ejecutaron en navegador y se capturaron; la comparación exacta de sus importes procede de los tests, no de estimaciones del sprite. El selector de revisión salta a eventos reales y pausa, sin resimular ni fabricar un impacto.

En una nueva partida de desarrollo se compró DOLEA por2oro, pasó por banquillo y se desplegó. Mar de Cristal, tienda y banquillo mantienen su diseño. El ciclo avanzó naturalmente hasta preparación de ronda3 con liquidaciones1–2; después se pausó. El guardado normal permanece separado. La pasada final recupera la prueba guardada y deja una demostración del crítico en Arena.

| Viewport de partida local | Página                                                  |
| ------------------------- | ------------------------------------------------------- |
| 1280×720                  | Sin scroll de página                                    |
| 1366×768                  | Sin scroll de página                                    |
| 1440×900                  | Sin scroll de página                                    |
| 1920×1080                 | Sin scroll de página                                    |
| 2560×1440                 | Sin scroll de página                                    |
| 390×844                   | Scroll vertical esperado, sin desbordamiento horizontal |

La ficha conserva su scroll interno para estadísticas adicionales. Arena técnica conserva su página de laboratorio larga. Primera revisión visual: crítico, inspector1280 y móvil; confirmación final acotada después de compilar. No se reorganiza el HUD.

Capturas en `artifacts/p6b1/`: `critical.png`, `basic-normal.png`, `modifiers-active.png`, `modifiers-expired.png`, `physical-ad.png`, `magic-ap.png`, `physical-ap.png`, `magic-ad.png`, `mixed.png`, `speed-active.png`, `support.png`, `stats-overtime.png`, `dolea-advanced.png`, `automatic-rounds.png` y `local-*.png`. Medidas en `viewports.json`. Son evidencia local ignorada por Git.

## 10. Limitaciones

- AP es potencia absoluta aditiva; no existe un multiplicador universal implícito de habilidades. Cada efecto debe declarar sus ratios.
- No se añaden críticos de curación/escudo, robo de vida, objetos, aumentos ni nuevas operaciones de targeting.
- Pruebas deterministas e integración local, con revisión manual en IAB. No hay matriz multinavegador, dispositivo táctil físico, auditoría WCAG exhaustiva o medición GPU de56unidades.
- La preferencia de movimiento reducido conserva el tratamiento anterior de cifras; no se añade motion nuevo. No se afirma prueba física de esa preferencia.
- Se conocen los avisos de tamaño de chunks. El transporte multijugador y la autenticación siguen pendientes; no se presenta el guardado local como antitrampas.
- Ningún personaje actual recibe probabilidad crítica positiva. Para observar críticos se usan diagnósticos; asignarla al roster requerirá una fase de balance autorizada.

## 11. Estado Git

F0-P6A.1 validado y preservado en **`12a1515` — `feat: preserve validated F0-P6A.1 passive and shield feedback`**. F0-P6B.1 se entrega como cambios locales revisables sobre esa base, sin commit adicional ni push. No se configura remoto.

Todos los PNG originales y `Sprites/` permanecen intactos y fuera de los cambios. Se detectó además `Personaje pixel art con botella de vodka.png` al comenzar y no se importó ni modificó. No hay cambios de dependencias, imágenes de arena, sprites, fórmulas económicas ni temporizadores.

## 12. Recomendaciones para F0-P6B.2

Antes de incorporar el próximo personaje, acordar sus estadísticas por estrellas, ratios, límites de acumulación, duración, claves de refresh/stack y permiso de crítico por efecto. Utilizar el contrato genérico y añadir escenarios de balance con esas decisiones explícitas.

El nombre futuro correcto es **El Depredador**. VARGAS, Copita Perhaps, Blackhaus RPP, UPM y esa sinergia no están implementados. F0-P6B.2 queda pendiente de una nueva autorización.
