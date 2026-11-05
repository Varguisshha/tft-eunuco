# Sánchez · Redoble del Silencio

Implementación local sobre la versión de Edu. Preset `sanchezPolicy: sanchez-ap-1`; las partidas nuevas locales y PublishedMatchRoom lo usan. Se conservan coste 1, membresías UPM/Pardillo y estadísticas provisionales anteriores, excepto alcance 4, AP base 30 y maná 0/70. Rol de objetos caster: el daño principal procede de su habilidad mágica con AP; los básicos son proyectiles físicos que cargan maná. El balance inicial queda marcado como provisional.

## Ausencia de Sangre

Cada cuatro impactos de ataques básicos obtiene +6/9/12 AP hasta el final del combate, con un máximo de cinco activaciones (+30/45/60 AP). No cura ni da escudo, no depende de perder vida y los impactos de habilidad no cuentan. El progreso se reinicia en cada combate.

## Redoble del Silencio

70 maná, preparación de 6 ticks (0,6 s), proyectil al enemigo actual. Daño mágico fijo 140/210/315 +150 % AP; aturdimiento de 8 ticks (0,8 s) al impacto. No tiene crítico intrínseco. Sigue los contratos existentes de interrupción, lanzamiento, resolución, defensas, objetos y repetición; ninguna imagen produce daño.

## Animaciones

Hoja entregada el 5/11/2026. Original y extracción alfa en `Sprites/sanchez`; PNG individuales 256 × 256 en `frames`. Por estrella: 4 idle, 8 poses de ataque, 6 muerte y una nota musical independiente. Ataque y habilidad reutilizan la secuencia corporal; el fotograma 8 libera la nota y mantiene el cuerpo durante el vuelo. El impacto reutiliza la nota a escala mayor. Walk recurre a idle; no se inventó un ciclo de andar. La muerte se detiene en la última pose. Niveles 2 y 3 conservan la caja/batería. Fondo eliminado con la herramienta de imágenes; recortes empaquetados con Sharp.

`pnpm sprites:sanchez` regenera hojas, retratos, manifiesto y hashes. Las fuentes permanecen locales, igual que los paquetes anteriores. El manifiesto incluye alias `provisional-sanchez` para el render de combate histórico. Los guardados previos mantienen sus perfiles y huellas de catálogo. No se ha publicado en Railway.

## Validación

Pruebas por estrellas de daño/AP, orden lanzamiento-impacto, aturdimiento, umbral no letal, escudo y duración, AP permanente, activación única, rol caster, transparencia, número de frames, separación cuerpo/VFX, determinismo y restauración. Regresiones de Edu, habilidades, playback compuesto y persistencia P13U. Tipos, lint y build web/servidor.

Vista local: `/sanchez-lab.html?stars=3&inspect`; acepta `stars=1`, `2` o `3`. Para combate pausado: `&combat&pause&time=500`.
