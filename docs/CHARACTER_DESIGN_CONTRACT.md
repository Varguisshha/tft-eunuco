# Contrato de diseño de personaje — F0-P6A

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
