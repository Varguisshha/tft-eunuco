# Contrato de diseño de personaje — F0-P6B.1

## Estadísticas y coeficientes para próximos diseños

La versión `f0p6b1-1` añade AP absoluto, probabilidad crítica y multiplicador crítico explícitos. AD usa `attack`. El diseño debe especificar el tipo de daño por separado de sus ratios AD/AP, los coeficientes fijos o por estrellas y si cada efecto de daño puede criticar. No hay crítico de curación o escudo. Las estadísticas efectivas pertenecen al core; las descripciones no deben prometer un escalado no declarado.

Las nuevas fuentes de velocidad deben declarar modo plano/porcentual, origen, duración y clave de acumulación. Los porcentajes se suman sobre la base por estrellas, antes de Overtime; no componen porcentajes entre sí. El progreso de carga existente se conserva. `duration: null` expresa permanencia durante ese combate; `refresh` requiere clave estable, distinta para efectos independientes. HP/AD mantienen su escala por estrellas y AP no se multiplica implícitamente. [Fórmulas y ejemplos](ADVANCED_STATS.md).

VARGAS sigue siendo un personaje futuro de coste3, pendiente de una fase autorizada. No se añaden su definición, habilidades, sprites ni sinergias. El nombre reservado es **El Depredador**. Los ratios280/420/700 % AD son expresables mediante datos genéricos; esta fase no implementa Copita Perhaps, Blackhaus RPP ni UPM.

Este contrato amplía CHARACTER_INTEGRATION y SPRITE_PIPELINE. No obliga a crear pasiva y activa independientes. Cada personaje nuevo tiene una habilidad principal activa, pasiva o mixta; la identidad visible de una mixta es única.

## Datos que debe entregar el diseño

- ID estable, nombre, coste, rol y una sinergia habitual (segunda opcional).
- Estadísticas base y política explícita de escalado por estrellas.
- Nombre, descripción, icono, tipo y versión de habilidad principal.
- Activa: maná inicial/coste, condiciones, targeting, tiempo, efectos, duración y acumulación.
- Pasiva: desencadenantes tipados, condiciones, objetivos, efectos, límites y cooldown.
- Escalados planos o estadísticos explícitos, criterios de redondeo y comportamiento en Overtime.
- Retrato y manifiesto de sprites por evolución/estado, incluyendo huecos y fallbacks aceptados.

Las descripciones deben explicar los números reales. No prometer invulnerabilidad, golpes, efectos o animaciones que el motor no implemente. Las sinergias aún no diseñadas se presentan como provisionales, sin efectos inventados. El balance de DOLEA/Hortaleza/Llama de Pádel también se marca provisional.

## Incorporación técnica

1. Añadir definición y perfil a una versión nueva del catálogo en game-data; preservar los anteriores.
2. Validar `ChampionAbilitySchema` y perfil. Habilidad solo pasiva: `maxMana=0`, `startingMana=0`; activa/mixta: capacidad e inicial idénticos a su componente activo.
3. Usar operaciones/condiciones ya tipadas. Si falta una operación, extender el contrato/motor con pruebas y versionado, nunca código arbitrario en datos ni ramas por nombre.
4. Incorporar membresías y registro visual; tooltip, tienda e inspector se alimentan de esos datos.
5. Registrar assets mediante el pipeline existente sin alterar originales. Solicitar `ability` aunque todavía resuelva a `attack`; las imágenes no causan daño.
6. Revisar inclusión en pool y precios únicamente en una fase que autorice esos cambios. P6A no cambia cantidades ni probabilidades.
7. Validar determinismo, estrellas, ausencia de acumulación, daños simultáneos/letales, guardado y nueva ronda. Comprobar visualmente ficha, retrato, iconos y fallback.

## Modificaciones posteriores

Separar cambios de presentación (descripción/icono/assets) de cambios de reglas (balance, targeting, triggers). Mantener correspondencia entre descripción y versión de perfil. Los guardados fijan catálogo, reglas y traza; una versión publicada no se reinterpreta con el balance de otra. El icono puede sustituirse detrás del ID visual sin migrar la simulación.

## Primer caso: DOLEA

Coste2, Vanguardia/tanque cuerpo a cuerpo, Hortaleza y Llama de Pádel. Habilidad mixta Volumen Sucio: Volumen eterno (primer cruce bajo50 %, escudo12 % de vida efectiva) y Press de banca (0/70maná, daño físico100/180/324 adyacente, +20armadura4s renovable). Detalles en ABILITY_SYSTEM y TRAIT_SYSTEM. No hay diseños definitivos nuevos para otros amigos.

## Herramientas disponibles desde F0-P6B.2

Un futuro diseño puede declarar stacks, recompensas por eliminación atribuida, sinergia única 1/1, contadores individuales/de equipo, mejora y repetición de cast, salto y ataque inmediato. Debe fijar explícitamente impacto frente a liberación, duración/refresco/consumo, ámbito de contadores, objetivo adicional, maná y permisos de procs, interrupción y presupuesto causal. No usar eventos de animación para resolver acciones.

No se incorpora todavía a VARGAS ni sus sprites, Copita Perhaps, Blackhaus RPP, UPM o **El Depredador**. Sus datos jugables pertenecen a F0-P6B.3. Los diagnósticos actuales son ficticios y no se deben copiar al roster como balance definitivo. Véase [ADVANCED_MECHANICS.md](ADVANCED_MECHANICS.md).
