# Sistema universal de splash arts

Las ilustraciones son presentación exclusiva del cliente. `apps/web/src/game/splashArtCatalog.ts` contiene el contrato `SplashArt`, la asociación por personaje y `splashArtFor`. No se añaden rutas ni metadatos de imagen a definiciones de combate, snapshots o fingerprints.

Cada entrada tiene `splashArtKey`, URL, posición focal porcentual, encuadre `portrait`, escala, política `cover`, variante `original`, fallback `character-portrait` y procedencia. Sustituir una ilustración no exige tocar habilidades ni estadísticas. Para un personaje futuro: añadir fuente propia, derivado optimizado y entrada de presentación; registrar arte original y focal, verificar retrato de reserva y encaje.

`scripts/sprites/splash.mjs` genera un WebP por personaje (1280 px, calidad 88); conserva el PNG original en TFPeru. Las cinco cartas comparten las mismas URLs, incluidas ofertas repetidas: no se duplica imagen por carta ni por estrella. `SplashArt.tsx` aplica `object-fit`, `object-position` y escala desde metadatos; si falla la carga usa el retrato real de `PixelUnit`. Los personajes de prueba anteriores siguen con su recurso existente. Las imágenes decorativas tienen alt vacío; el botón conserva nombre/coste y su descripción accesible de afinidades.

Se reutilizan `Shop`, `GameFrame`, `ContentIcon`, tokens Neon y todos los estados transaccionales existentes. Imagen protagonista dentro del marco, texto abajo a la izquierda y coste abajo a la derecha. Las tres afinidades de FLORIN caben sin mover el dock, las nueve plazas ni el escenario. Se preservan selección, foco, hover, compra, agotado, bloqueo, falta de oro y cierre de tienda. El tratamiento inferior de contraste usa los tokens existentes; no se alteran originales ni se recortan archivos destructivamente.

Ver `SPLASH_ART_ASSET_MANIFEST.md` y `SPLASH_ART_ASSETS.json` para fuentes y pesos. La atribución **Erik → JARAMILLO** fue confirmada expresamente por el propietario en esta conversación el 26/10/2026; no se dedujo de los nombres.

Validación en Chrome a 1440×900, 1920×1080, 2560×1440 y 3840×2160. Cinco ofertas visibles, cuatro imágenes cargadas, nombres/costes/afinidades legibles, rostros conservados y documento sin scroll global en todos los tamaños. En 4K el HUD conserva el límite de escala aprobado; no se redimensiona arbitrariamente. Evidencia: `artifacts/florin/shop-{1440,1920,2560,3840}.png` y `browser-metrics.json`. También se capturan hover, compra, falta de oro, inspector de FLORIN y fallback provocando un error de descarga.

La búsqueda contextual de 21st se consultó; sus componentes genéricos no mejoraban los componentes propios de videojuego. Se conservaron los primitives existentes. Los detectores de Impeccable y 21st señalaron estilos históricos del HUD fuera del cambio; no detectaron problemas en las reglas añadidas de splash. No se emprendió un rediseño fuera de alcance.

## Diagnósticos entregados

En Arena DEV, «FLORIN · sinergias de prueba» ofrece Ruman Trinity y Perdidos por el Mundo a 1/2/3 miembros. Son afinidades de fixture explícitas, sin alta de otros miembros reales. En Modo DEV, «FLORIN 1★/2★/3★ con objetos» prepara una unidad con tres objetos completos mediante `grantItemInstances` y `applyItemCommand`, conserva UUID de inventario, valida restauración y permite avanzar al combate con el controlador existente. Si el reloj aún no ha iniciado, pulsar Avanzar fase y después Iniciar combate. El inspector muestra los tres objetos por sus etiquetas accesibles del catálogo.


## Consolidación P8D + FLORIN — 2026-10-26

Los cuatro WebP se conservan en la integración; cinco cartas verificadas de 1440 a 3840 px.

Versiones, fingerprints, conflictos, pruebas, capturas y límites: [INTEGRATION_P8D_FLORIN.md](INTEGRATION_P8D_FLORIN.md).
