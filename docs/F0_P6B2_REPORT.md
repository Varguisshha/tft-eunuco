# Informe F0-P6B.2

Fecha: 23 de octubre de 2026. Alcance exclusivo: herramientas genéricas de mecánicas avanzadas. Especificación completa: [ADVANCED_MECHANICS.md](ADVANCED_MECHANICS.md).

## 1. Arquitectura de acumulaciones

Contrato v1 con definición, fuente, propietario/objetivo, señal, condiciones, contador, cap, duración/refresco, consumo y modificadores por acumulación. Las definiciones compilan reglas del ejecutor de pasivas existente. Ciclos de cinco impactos: consume, cura 5% de vida máxima y otorga +20% AS durante 3 s. Los modificadores se retiran al consumir, expirar o morir su fuente.

## 2. Contrato de eliminaciones

Una atribución por víctima, identificada por combate y referencia exacta al daño letal. Responsable/fuente nullable para ambiente; daño directo, proyectiles y periódicos conservan responsabilidad. Orden estable y crédito para simultáneos; no hay recompensas póstumas. No se emite daño duplicado.

## 3. Disparadores

Impacto básico confirmado, lanzamiento, daño efectivo infligido, daño/absorción recibidos, eliminación atribuida, comienzo y expiración. La liberación antigua `attack` mantiene su significado. Se deduplica `attack_hit` por identidad de básico; la animación no produce señales.

## 4. Sinergias únicas

1/1 con miembros desplegados distintos; copias, estrellas y banquillo no inflan membresía. Icono, estado y tooltip reutilizan el lateral existente. El diagnóstico «Marca singular» vive fuera del catálogo definitivo. El progreso de eliminaciones no se suma como miembros.

## 5. Sinergias progresivas

Estadísticas iniciales con dos miembros, curación al lanzar con cuatro y mejora de cada tercer cast con seis. Ámbito individual o compartido por equipo declarado en datos. Se captura el ordinal al emitir cada señal, incluso para casts que empiezan en un mismo tick.

## 6. Mejoras y repeticiones

Potencia y efectos adicionales limitados al cast original. Adicional gratuito con objetivo, permiso de señales, maná y contador explícitos. Un cast cancelado cancela sus repeticiones. Un adicional nunca puede programar otra repetición. El diagnóstico conserva tres lanzamientos contabilizados al resolver su primer adicional gratuito.

## 7. Saltos y ataques encadenados

Selección estable de enemigo y hex adyacente libre; reservas de origen/destino compatibles con pathfinding. Cancelación por stun, muerte, objetivo inválido o final. Retarget adyacente opcional. Básico inmediato único con crítico y Overtime efectivos. Presupuesto de linaje y topes por tick evitan bucles.

## 8. Eventos

Protocolo 3 aditivo bajo reglas `f0p6b2-1`; catálogo `f0p6b2`. Eventos tipados de stacks, impacto confirmado, atribución, mejora, repetición, inicio/fin de salto, básico encadenado, periódico y límites. El laboratorio incluye estos eventos en su lector de traza.

## 9. Pruebas

`pnpm check`: **531 pruebas / 35 archivos**, tipos, lint y build correctos. Se conservan las 427 anteriores y se añaden 104. Cobertura: ganancias/caps/consumos/ciclos/expiración, modificadores/cadencia, proyectiles/cancelaciones/deduplicación, crédito directo/periódico/ambiental/simultáneo, recompensas/cooldown, membresía/contadores, adicionales y cancelación de padre, reservas/aterrizajes/cadenas/límites, serialización, presentación y continuidad automática.

Un timeout de la prueba física antigua de sprites bajo contención se resolvió limitando Vitest a cuatro trabajadores. No se quitaron aserciones ni se amplió su timeout. Build mantiene el aviso previo de chunks grandes.

## 10. Validación visual y funcional

Pruebas realizadas en navegador real, semilla 42, compilación de producción servida en `http://127.0.0.1:4173/`.

| Comprobación solicitada      | Evidencia                                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acumulaciones visibles       | `stack-gain.png`; 1/5, AS 1.04                                                                                                                          |
| Consumo en máximo            | `stack-consume.png`; tick 40, 0/5                                                                                                                       |
| Curación y buff temporal     | `stack-bonus-duration.png`; vida 1458/1500, +20% AS, 3.0 s; evento heal en traza                                                                        |
| Atribución de eliminación    | `kill-unique.png`; primera eliminación, tick 5                                                                                                          |
| Bonificación por eliminación | Una marca, AD 105 y escudo 50 en el mismo diagnóstico                                                                                                   |
| Sinergia única 1/1           | `unique-tooltip.png`; membresía y progreso separados                                                                                                    |
| Sinergia progresiva          | `empowered.png`; seis unidades, 6/6 y contador individual                                                                                               |
| Habilidad mejorada           | Tick 17; tercer cast propio, feedback ×1.5                                                                                                              |
| Reejecución controlada       | `repeat.png`; tick 21, adicional resuelto, contador propio 3                                                                                            |
| Salto hacia otro enemigo     | `jump.png`; interpolación y origen lógico reservado                                                                                                     |
| Ataque inmediato             | `chain-final.png`; tick 6, crítico, dos eliminaciones, siguiente objetivo                                                                               |
| Reproducción repetible       | Repetir semilla vuelve a tick 17 con el mismo contador y mejora; comparación completa también en tests                                                  |
| DOLEA                        | `dolea.png`; Volumen eterno, escudo 72, tick 75; arte real conservado                                                                                   |
| Rondas automáticas           | Partida aislada con DOLEA: ronda 3 y dos liquidaciones observadas; recuperación posterior en preparación de ronda 4, con tres liquidaciones conservadas |
| HUD de escritorio sin scroll | Medición DOM a 1920×1080 y matriz de tamaños; ver archivos de evidencia                                                                                 |

Viewport verificado con cinco ofertas y canvas presente: 1920×1080, 1440×900, 1366×768, 1280×720 y 2560×1440. En todos, la altura del documento coincide con la del viewport. Datos en `artifacts/p6b2/viewports.json`. La restauración quedó pausada en ronda 4 con 90 de vida, 21 de oro y tres liquidaciones; no afecta al guardado normal.

Capturas locales en `artifacts/p6b2/` (excluidas de Git): `before.png`, acumulaciones, tooltip, mejora, repetición, salto, DOLEA y HUD. El laboratorio técnico conserva su scroll de documento; no se rediseñó el HUD de partida.

## 11. Compatibilidad histórica

39 trazas completas y tres guardados capturados mantienen sus referencias SHA-256: 27 trazas previas + 12 P6B.1, dos guardados previos + uno P6B.1. Los catálogos antiguos eligen sus reglas originales; los guardados no se migran silenciosamente. DOLEA conserva sus cifras y comportamiento de combate con valores avanzados neutrales. Economía, pool, temporizadores, arte y transformación de Mar de Cristal se preservan.

## 12. Limitaciones

Stacks locales por unidad y reinicio por combate; no hay stacks persistentes o compartidos. Cooldown opera sobre reglas pasivas, sin inventar otro reloj para activas. Una mejora modifica el cast original; los adicionales declaran su propia potencia. El contexto limita cada linaje, no el total de eventos del combate. No hay reanudación de un motor desde un snapshot intermedio aislado: el guardado restaura la traza de reproducción. Assets provisionales existentes para diagnósticos. El bundle mantiene su aviso de tamaño.

## 13. Git

F0-P6B.1 quedó preservada antes de modificar el motor en `c5cb131`, tras 427 pruebas correctas. La entrega P6B.2 está separada de ese punto de referencia. No se configuró remoto ni se hizo push. Los archivos originales no versionados de sprites y arenas permanecen fuera de los cambios de la fase.

## 14. Preparación y punto de parada

El motor puede expresar acumulaciones, eliminaciones, progreso, mejoras, adicionales y saltos mediante contratos. La fase se detiene aquí. **No se incorpora VARGAS, no se importan sus sprites y no se implementan Copita Perhaps, Blackhaus RPP, UPM ni El Depredador. F0-P6B.3 no iniciada.**
