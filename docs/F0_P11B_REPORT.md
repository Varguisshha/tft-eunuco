# F0-P11B · objetos 18.5, bandeja vertical y removedor

Entrega LOCAL, sin publicación. Mantiene A (`1bf38cf`) y todos los catálogos históricos. Contenido/reglas nuevos `f0p11b-1`, equipo `f0p11b-18.5-1`, fingerprint independiente de persistencia.

## Alcance aprobado y verificación

El usuario confirmó mantener **TFT 18.5 con pendientes explícitos** después de detectar insuficiencias de las fuentes públicas. Se revisaron las 36 recetas individualmente contra los registros específicos DA del set 18: coinciden todas. Se registran 8 componentes, 30 completos ejecutables según especificación reconstruida y **6 completos bloqueados** por falta de evidencia. No se afirma fidelidad completa de los 36.

Pendientes: Calibrador de Sterak, Guantes de ladrón, Mangual del guerrero, Sable-pistola hextech, Mejora roja y Verdugo de gigantes. Los nombres exactos localizados y sus motivos están en `F0_P11B_ITEM_VERIFICATION.md` y en su manifiesto JSON. Intentar fabricar/equipar un pendiente falla sin consumir recursos. No se usa una aproximación silenciosa.

Se aplican los cambios oficiales 18.2, 18.4 y 18.5 del 27 de octubre sobre la base congelada. El importador conserva hashes y verifica las 36 combinaciones nativas; no extrae gráficos. Nombres/descripciones configurables en `packages/game-data/src/tft185-presentation.json`; los iconos siguen siendo los originales propios y sustituibles. Esto no constituye una conclusión jurídica sobre todos los usos de nombres.

## Ejecución

Operaciones genéricas y deterministas: regeneración con acarreo entero, multiplicadores de todas las fuentes, condiciones por rol, Precisión y fuentes adicionales, acumulaciones por tiempo/ataque, cambios de AD/AP/omnivampirismo según vida, maná por crítico y curación a aliado. Se preservan las habilidades personales sin crítico y las reglas propias de overtime; esas diferencias de anfitrión están declaradas. Se conserva el comportamiento histórico de los objetos P8C/P8D.

Chispa iónica utiliza el maná realmente pagado, también cero para lanzamientos adicionales gratuitos; nunca sustituye ese coste por la capacidad máxima. La prioridad de Capa de fuego solar usa enemigos no quemados y sorteo independiente determinista sin sesgo de módulo. La fórmula de vida porcentual nueva incluye los aumentos planos y suma sus porcentajes, sin reinterpretar versiones anteriores.

## Interfaz y removedor

La partida nueva sustituye las pestañas por una bandeja compacta vertical izquierda. Agrupa cantidades, mantiene selección, detalla efectos/ingredientes/estado, admite desplazamiento interno, clic y arrastre. La cabecera de detalle permanece accesible al recorrer recetas y explica qué ingrediente falta o por qué está bloqueada una combinación. No hay tres secciones visibles.

Se verifican arrastre componente→inventario, componente→unidad, segundo componente→unidad con componente y equipamiento completo mediante la misma autoridad. El cliente espera confirmación, no crea ni consume instancias.

El removedor comprueba propiedad, fase, instancia y equipo; devuelve objetos completos sin descomponerlos a bolsa o pendientes y registra el consumo una sola vez. Fallos, duplicados y combate no consumen. Solo el fixture DEV emite uno. La propuesta competitiva no implementada está separada en `F0_P11B_REMOVER_PROPOSAL.md`.

## Evidencia y pruebas

- `packages/game-core/src/items/tft185.test.ts`: cada una de las 36 recetas y pruebas adicionales de disparadores, estadísticas, duraciones, rechazos y conservación. Los seis rechazos no cuentan como prueba del efecto pendiente.
- Autoridad con 2–4 participantes: combinación, aislamiento entre propietarios, consumo, persistencia, restauración y reparto de ronda 3; diario del removedor preservado.
- UI: sin pestañas, cantidades, selección/aplicación del removedor y cinco ofertas. Capacidad llena devuelve equipo a pendientes intacto.
- Quality gate final aprobado: typecheck, lint, 1.559 pruebas en 110 archivos y ambos builds; 1 opt-in omitida en la suite general. Registro `artifacts/p11/audit/check-b-final.log`. `verify:public`, `verify:railway` locales y lifecycle opt-in aprobados. El aviso de bundles Vite grandes ya existía.
- Capturas `artifacts/p11/b/hud-{1280,1440,1920,2560,3840}.png`: cinco ofertas, cero scroll global, cero pestañas y cero botones anidados, separación de 12 px entre clasificación y objetos.
- `equipped-craft.png`, `removed.png`, `bag-craft.png`, `recipes-scrolled-1280.png`, `recipes-bottom-1280.png`. Chromium valida arrastre real y consumo único a 1920; clic alternativo, ingredientes faltantes y cierre tras scroll a 1280. Cero errores de navegador. Revisión visual independiente: SHIP tras corregir recetas y cierre.

No se ha hecho push ni tocado Railway, Supabase remoto, usuarios o partidas reales. P11C–F continúan en sus entregas; esta fase no promete resolver sus requisitos.
