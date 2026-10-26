# Estadísticas avanzadas — F0-P6B.1

Reglas `f0p6b1-1`, catálogo de combate `f0p6b1`, coeficientes `PowerScaling.version: 1`. El motor sigue siendo TypeScript puro, con ticks de 100 ms. Las reglas históricas `f0p3.1-1` y `f0p6a-1` conservan su ejecución y sus perfiles.

## Modelo y unidades

Se conservan los nombres existentes: `attack` representa **AD**, `attackSpeedMilli` representa ataques/s × 1000 y `range` el alcance hexagonal. No se añaden alias que puedan discrepar.

| Campo                     | Unidad / límites de entrada                    | Valor añadido a personajes actuales |
| ------------------------- | ---------------------------------------------- | ----------------------------------- |
| `maxHp`                   | Entero, 1–1 000 000                            | El anterior                         |
| `attack`                  | AD absoluto, 0–1 000 000                       | El anterior                         |
| `abilityPower`            | AP absoluto, 0–1 000 000                       | 0                                   |
| `attackSpeedMilli`        | Entero, 1–5000 antes de Overtime               | El anterior                         |
| `armor`, `magicResist`    | Enteros, entrada ±1 000 000; efectivos ±10 000 | Los anteriores                      |
| `critChanceMilli`         | 0–1000; 250 = 25 %                             | 0                                   |
| `critMultiplierMilli`     | 1000–5000; 1500 = 150 % de daño total          | 1500                                |
| `startingMana`, `maxMana` | Enteros, inicial ≤ máximo                      | Los anteriores                      |
| `range`                   | Entero, 1–14 hexágonos                         | El anterior                         |

Los límites y valores nuevos están centralizados en `shared/advanced-stats.ts`. AP es un sumando absoluto, no un multiplicador implícito de todo el daño de habilidades: AP0 es neutral porque ningún efecto lo utiliza sin declarar un ratio.

Los tres campos nuevos y `profile.starLevel` son obligatorios para la nueva versión de reglas. En registros históricos permanecen ausentes; no se rellenan durante el parseo. El inspector usa valores neutrales de presentación sin reescribir el guardado. Se rechazan nuevos campos/efectos bajo reglas antiguas. Solo los modificadores de las estadísticas enumeradas en `ModifiableStatSchema` son ejecutables; maná y alcance conservan su contrato estático actual.

## Potencia y tipo de daño

AD y AP calculan la potencia. El tipo `physical`, `magic` o `true` decide la mitigación posterior de forma independiente.

```text
potencia = min(1 000 000,
  floor((base × 1000 + AD efectivo × ratioAD + AP efectivo × ratioAP) / 1000))
```

Los ratios son enteros en milésimas, 0–10 000. Se suma el numerador antes de redondear una sola vez. Así, base1 + AD3×0,5 + AP3×0,5 = 4, no 3. No hay aritmética aleatoria en este cálculo. Los productos de potencia permanecen dentro del rango entero seguro de JavaScript.

`amount` es la base, y `powerScaling` declara los coeficientes. También existe `amountByStars: [base1,base2,base3]`. Ejemplo genérico, sin incorporar ningún personaje:

```ts
const effect = {
  kind: 'damage',
  target: 'target',
  radius: 0,
  amount: 10,
  amountByStars: [10, 20, 30],
  damageType: 'physical',
  powerScaling: {
    version: 1,
    adRatioMilli: [2800, 4200, 7000],
    apRatioMilli: 0,
  },
  canCrit: false,
} as const;
```

El mismo contrato de potencia sirve para `heal` y `shield`, sin `canCrit`. Se aplica Overtime después del cálculo: multiplicador de curación o escudo, y finalmente recorte por vida máxima o capacidad. Se conserva el contrato anterior `scaling` para porcentajes de vida máxima/ataque de fuente o receptor; no puede mezclarse con `powerScaling` en el mismo efecto.

## Estrellas

`scaledProfile` conserva las escalas existentes de HP y AD: ×1 / ×1,8 / ×3,24 con suelo. Las bonificaciones planas de sinergias se añaden después. AP, probabilidades, multiplicador crítico y velocidad no reciben una escala por estrellas implícita.

Un ratio puede ser fijo o una terna por estrellas; se selecciona mediante `profile.starLevel`. Los efectos modernos con `starScaling: stat` conservan el escalado anterior de su importe base. `amountByStars` no puede coexistir con ese multiplicador. Una base explícita o un ratio seleccionado nunca vuelve a multiplicarse por estrellas al resolver. Las habilidades históricas conservan su escalado anterior de importes planos.

## Críticos y PRNG

Los básicos de reglas avanzadas pueden criticar. Cada efecto de daño de habilidad/pasiva requiere `canCrit: true` explícito; su ausencia equivale a desactivado. No hay críticos de curación ni escudo.

1. **Básico:** se toma AD efectivo y la variación histórica 95–105 % al comenzar el ataque. Se conserva el consumo original de un uint32 para esa variación. A continuación se resuelve el crítico y se fija el bruto en la acción.
2. **Habilidad:** calcula potencia al resolver cada efecto y objetivo comprometido. Tras los efectos de apoyo del lote, hace su tirada si está autorizada. Orden estable: efectos y objetivos ordenados como en el motor actual. Un área tira por objetivo e impacto de daño.
3. **Tirada:** 0 % no critica y 100 % critica siempre, sin consumir azar adicional. Entre ambos consume exactamente un uint32 del Mulberry32 existente y compara `valor × 1000 < probabilidadMilli × 2^32`. La resolución discreta tiene la cuantización propia de 32 bits; no se usa `Math.random()`.
4. **Importe:** si critica, `min(1 000 000, floor(bruto × multiplicadorMilli / 1000))`. Al impactar se aplica Overtime al bruto, luego armadura/RM según tipo, después escudos y HP. Las fórmulas de mitigación no cambian.
5. **Compromiso:** un cambio posterior de AD/probabilidad/multiplicador no altera un básico ya iniciado. Acción y proyectil conservan `critical`; cancelar no devuelve el azar consumido. Un proyectil no vuelve a tirar al impactar, aunque la fuente haya muerto.

Misma entrada, semilla y reglas producen los mismos críticos. Los valores 0 % de los personajes actuales no consumen números adicionales, de modo que su secuencia histórica de variaciones se conserva. El multiplicador mínimo es 100 % y el máximo 500 %; con 100 % se puede registrar un crítico sin aumentar su importe.

Los eventos `damage` y las acciones/proyectiles avanzados incluyen `critical: boolean`. Los históricos omiten el campo. El renderer solo lee ese dato: añade «CRÍTICO» y utiliza oro en la cifra existente, con su duración anterior de 650 ms. No añade sonido ni decide impactos.

## Fuentes y composición

```text
efectivo = clamp(base por estrellas + suma de planos
                 + floor(base por estrellas × suma de porcentajesMilli / 1000))
```

Los porcentajes se suman entre fuentes y actúan sobre la misma base, sin multiplicarse entre sí ni sobre las bonificaciones planas. Ejemplo: AD100 +20 plano +15 % =135. Dos fuentes de +12 % velocidad sobre base1000 dan1240. El redondeo de la suma porcentual usa `BigInt` internamente para mantener precisión incluso con muchas fuentes; los snapshots siguen conteniendo exclusivamente números JSON.

- Una fuente usa `mode: flat | percent_milli`, `stat`, `amount`, ID y `sourceId`. `origin` distingue `trait`, `active` y `passive`.
- Las bonificaciones de sinergia se materializan como estados permanentes identificables antes de inicializar HP; no modifican el perfil base en reglas avanzadas. El camino histórico sigue preparando su copia como antes para preservar sus trazas.
- Un modificador de habilidad utiliza `duration` en ticks o `null` para durar hasta fin de combate. Los temporales expiran antes de acumular carga del tick de vencimiento. Todos se retiran al morir; cada nuevo combate prepara fuentes desde cero.
- `stacking: refresh` requiere una `key` estable en reglas avanzadas y reemplaza los estados de la misma fuente y clave. Se reinicia duración, sin sumar su importe. Claves distintas representan fuentes distintas; `stack` mantiene instancias separadas. No se debe reutilizar la misma clave para efectos independientes.
- Porcentajes negativos individuales no bajan de −100 %; se suman con el resto y se aplica el límite final de la estadística. Probabilidad usa puntos en milésimas para bonus planos: +250 equivale a +25 puntos porcentuales. Los porcentajes sobre probabilidad usan su base, como las demás estadísticas.
- Al aumentar vida máxima por un modificador se conserva el ajuste de HP por delta existente; al retirarlo se limita HP al máximo efectivo. No es una curación ni altera la mitigación.

## Velocidad y progreso de ataque

Primero se compone y limita la velocidad efectiva a [1,5000]. Overtime es una capa multiplicativa final por tick; con la configuración vigente llega a ×1,75 y con la configuración permitida puede llegar a ×4. El inspector consulta el mismo selector `combatStatsView` del core.

Mientras la carga sea menor que10 000 y la unidad no esté aturdida, el tick añade `floor(velocidad efectiva × multiplicador de Overtime / 1000)`. Un ataque resta10 000. El resto se conserva. Una bonificación cambia la carga de los ticks siguientes; no rebobina ni reprograma un ataque ya ejecutado ni su windup. No se almacenan ataques adicionales una vez listo, y solo se inicia una nueva acción por unidad/tick. Movimiento, casteo y aturdimiento conservan su comportamiento anterior.

Con base1000, sinergia+12 %, pasiva+12 % y activa+25 % se obtiene1490; al expirar la activa vuelve1240. En Overtime se multiplica el valor que exista en ese tick. Esta política permite futuras acumulaciones definidas como datos; decidir sus cantidades y claves corresponde al diseño de la habilidad autorizada.

## Versionado y guardados

`ADVANCED_ECONOMY_CONFIG` conserva todas las cifras económicas y cambia únicamente el identificador de catálogo a `f0p6b1`. El catálogo contiene los mismos personajes; los tres campos nuevos son neutrales. Las partidas nuevas de la web optan por él. `CURRENT_ECONOMY_CONFIG` y `CURRENT_COMBAT_PROFILES` de P6A se mantienen como referencias históricas, junto con el catálogo anterior.

No se migra una partida antigua a las reglas nuevas. Su configuración y entradas de combate originales deciden los perfiles y la simulación de sus rondas. Los parsers nuevos leen ambos formatos; la envoltura de guardado automático y su codificación por deltas no cambian. Replays se reproducen con su traza original. Un cliente anterior que no conozca las reglas nuevas no debe aceptarlas.

El protocolo se mantiene en3 con metadatos opcionales aditivos; `rulesVersion` distingue su semántica. Se rechazan campos avanzados en una entrada histórica. Se conservaron antes de editar el motor hashes de27 trazas y2 guardados con sus trazas: pruebas de compatibilidad comparan todos los bytes serializados, incluido el PRNG, con esas referencias.

## Diagnósticos y límites

Arena tiene un selector «AD, AP y críticos» con12 escenarios: básicos0/100 %, físico AD, mágico AP, físico AP, mágico AD, mixto, modificadores, velocidad, apoyo, Overtime y DOLEA avanzado. Todos usan semilla42 de referencia y perfiles ficticios fuera de tienda/pool. El selector de eventos salta al primer impacto, crítico, modificador, expiración u Overtime real y pausa la misma traza.

No se implementan VARGAS, sus sprites o habilidades, UPM ni El Depredador. No hay críticos de apoyo, robo de vida, objetos, aumentos, red ni balance definitivo. Evidencia, resultados y limitaciones de navegador: [informe de fase](F0_P6B1_REPORT.md).

## Integración F0-P6B.2

`advancedRules` reconoce también `f0p6b2-1`; las fórmulas, caps y PRNG de P6B.1 permanecen disponibles sin modificación retroactiva. Los modificadores por acumulación se suman como fuentes identificables, con porcentaje sobre la base escalada y retirada al consumir/expirar. No se multiplican estrellas otra vez.

La potencia de un cast mejorado/adicional se aplica después de resolver AD/AP y antes de crítico, Overtime y mitigación. Un básico inmediato de salto calcula AD, variación y crítico una sola vez al aterrizar. Un proyectil conserva su básico comprometido y se confirma al impactar. DOLEA conserva sus estadísticas. [Mecánicas y pruebas](ADVANCED_MECHANICS.md).

## Integración F0-P6B.3

B3 usa HP700/1260/2268 y AD70/126/226 de VARGAS, sin multiplicar otra vez los ratios280/420/700 % AD. AS800milli, AP0, crítico200/1500, defensas25, maná0/70. Un daño crítico autorizado afecta la recuperación por HP real; Blackhaus lo desactiva explícitamente. Sus bonos de AS son porcentajes aditivos de base, con importe/duración por estrella. Recuperación porcentual del daño se calcula después de mitigación, escudo y recorte, y recibe Overtime de curación después. Los campos B3 son rechazados bajo reglas anteriores. [Ejemplos y límites](VARGAS_CHARACTER.md).


## F0-P8A · Componentes y objetos (26/10/2026)

Las estadísticas de equipo se incorporan como `initialItemModifiers` identificados por instancia a la preparación existente. No se cambian mitigación, críticos, bucle ni Overtime. Planos y porcentajes se componen con las fuentes de sinergia según la fórmula existente; Kilómetros sigue preparando el AD base antes de esas fuentes. Un plano de objeto no se escala por estrellas. El inspector de banquillo usa la misma vista efectiva. Las cifras de los componentes definitivos siguen pendientes. Véase [ITEM_SYSTEM](ITEM_SYSTEM.md).
