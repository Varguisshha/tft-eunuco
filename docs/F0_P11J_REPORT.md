# F0-P11J · Iconos originales TFT exclusivamente LOCAL

## Alcance y base

Base exacta: `077748c8bbe7fb337a01a5d558358e84c44ce21e`, verificada antes de modificar. Rama aislada: `codex/f0-p11j-tft-item-icons`, sobre el checkout existente de P11H. Se conserva la mejora de habilidades de 077748c. No se integra trabajo concurrente ni se inicia otra fase.

TFT 18.5 / set 18, catálogo `f0p11h-18.5-1`. Las imágenes pertenecen al cliente Data Dragon 16.21.1. [Matriz completa de 44 correspondencias y recetas](TFT_OFFICIAL_ICON_MAPPING.md); [fuentes, procedencia y límites de uso](TFT_ICON_PROVENANCE.md).

## Resultado de integración

44 iconos encontrados inequívocamente: ocho componentes y 36 objetos. Cero pendientes de identificación. 44 WebP locales lossless en `apps/web/public/assets/items/tft-reference/{components,completed}/`; 726890 bytes. Píxeles RGBA idénticos a los PNG descargados, sin recorte, filtros ni recolor. 43 a 128×128 y Furia del kraken a 64×64 nativos.

Calibrador de Sterak, Guantes de ladrón, Mangual del guerrero y Sable-pistola hextech muestran imagen pero siguen bloqueados. El catálogo, las estadísticas, las recetas, el reparto, la economía, los personajes y las reglas no se modifican. Se comparó el catálogo P11H entero con el baseline y se conservaron los 13 fingerprints históricos de persistencia (`artifacts/p11j/mechanical-invariance.json`).

Se amplía el `ItemIcon` existente: override por iconKey → recurso TFT con identidad exacta → ilustración EUNUCO original → SVG propio. El mismo renderer cubre bandeja vertical, componentes, completos, pendientes, recetas, ranuras del inspector, badges del banquillo y notificaciones existentes. Los pips genéricos de ocupación del canvas no son ilustraciones; se preservan sin crear un segundo renderizador Phaser.

El laboratorio incorpora «TFT · referencia», «EUNUCO · originales», tamaños 32/40/48/64 y simulación de fallo de carga. El selector es global para todas las instancias montadas; no escribe reglas, inventarios ni snapshots. Las 44 ilustraciones EUNUCO y sus hashes permanecen intactos. Las imágenes decorativas conservan etiquetas en sus botones padres y no duplican lectura accesible.

## LOCAL y distribución

El tema TFT solo está habilitado en compilaciones LOCAL/DEV. El manifiesto oficial y sus rutas desaparecen del JavaScript público. El plugin de build retira únicamente la carpeta TFT de la salida pública, preserva los archivos fuente y el build LOCAL. `verify:public` rechaza tanto carpeta como rutas residuales. Ninguna partida descarga assets desde un CDN externo.

El servidor público no se reactiva ni se despliega. No se ejecuta push ni se modifica Supabase remoto. `verify:railway` solo verifica IaC local, sin llamadas de aprovisionamiento.

## Validación visual

Revisión en navegador del inventario lleno (47 elementos, 15 pendientes), componentes y completos, recetas con resultados bloqueados, inspector DOLEA con dos objetos, tooltips por clic/foco, tamaños 32/40/48/64 y sustitución global. La prueba forzada registró 44/44 imágenes EUNUCO cargadas tras fallar las oficiales; el cambio de tema dejó cero imágenes oficiales entre las 83 instancias entonces montadas. Sin huecos ni cambios de datos del tooltip.

Resoluciones medidas: 1280×720, 1440×900, 1920×1080, 2560×1440 y 3840×2160. Cero imágenes rotas en la matriz medida, dos columnas de 44 px, scrollbar oculta y sin scroll vertical de página. Barra actual de 112 px. El estado vacío histórico se revisa por separado, sin migrar su catálogo.

Capturas locales en `artifacts/p11j/` (no publicadas):

- `gallery-3840-fullpage.jpg` (los 44 simultáneamente), `gallery-1920.jpg`, `gallery-middle-clear.jpg`, `gallery-bottom.jpg`: galería con nombres, recorrida en tramos; los tooltips conservan bloqueos y descripciones.
- `size32.jpg`, `size40.jpg`, `size64.jpg`: tamaños de detalle; 48 px en galería principal.
- `fallback.jpg`: fallo oficial y sustitución por originales.
- `recipes-1920.jpg`: ocho resultados de Espadón, bloqueos conservados.
- `equipped-1920.jpg`: inspector DOLEA, dos objetos y ranura libre.
- `hud-1280.jpg`, `hud-1440.jpg`, `hud-1920.jpg`, `hud-2560.jpg`, `gallery-3840-fullpage.jpg`: matriz responsive; medidas en `visual-metrics.json`.
- `empty-historical.jpg`: bandejas vacías de compatibilidad histórica.

La captura 4K validada es `gallery-3840-fullpage.jpg`: 3840×2160, HUD y 44 iconos con nombres completos simultáneamente visibles. La captura de página completa evita un recorte del capturador de viewport; las tomas preliminares `gallery-3840.jpg` y `hud-3840.jpg` se descartan como evidencia de encuadre. Se revisan además los tramos legibles de Full HD. No quedan pendientes visuales por este motivo.

## Quality gates

`pnpm check`: correcto, 128 archivos / **1696 pruebas pasan**, una optativa omitida en la batería principal; TypeScript, ESLint y builds de cliente/servidor correctos. PostgreSQL de diagnóstico aislado en 55439 y TLS local habilitados. Duración de tests: 600,80 s, Node 24 del entorno del proyecto.

Las cinco pruebas nuevas verifican las 44 identidades y recetas, ficheros/hashes/dimensiones/unicidad, cambio global, overrides/fallback, bloqueos, accesibilidad, inventario y compatibilidad histórica; pasan además las pruebas previas de iconos, tooltips, equipo, reparto, arrastre y combate. No se relaja ningún test previo.

`build:local`, `verify:public`, `verify:railway` y `git diff --check`: correctos. Evidencia de frontera de build: LOCAL 44 oficiales + 44 originales; público 0 oficiales + 44 originales. La prueba optativa `TFT_LOCAL_INTEGRATION=1` pasa por separado: **1/1**, arranque, rechazo de puerto ocupado, control sin credenciales rechazado y cierre de procesos/puertos propios. Su primer intento agotó los 30 s; se confirmó que no quedaba sesión gestionada y la repetición con `caffeinate -i` pasó en 927 ms, sin cambiar el timeout ni sus aserciones. Evidencia: `lifecycle.log`, `lifecycle-retry.log`. No se atribuye causalidad definitiva al reposo del equipo a partir de esta repetición.

## Riesgos y límites

Las imágenes son propiedad de Riot Games y sus titulares; esta integración LOCAL no acredita licencia para distribuirlas en un juego independiente. No hay paquete publicado y la futura publicación online queda fuera del alcance. Debe usarse el build público, que excluye estos assets, y no copiar el directorio fuente `public` directamente a un hosting.

Se conserva la advertencia de tamaño de chunks del cliente. Vite también avisa de una futura incompatibilidad del cargador nativo planificado con el import TypeScript sin extensión del plugin; el cargador actual y ambos builds funcionan. No se silencia el aviso. No se cambian umbrales ni pruebas de combate para ocultarla. Los originales no relacionados en `Sprites/` y `TFPeru/` permanecen sin añadir ni borrar.

## Estado Git y revisión

Entrega guardada mediante commit local en `codex/f0-p11j-tft-item-icons`; no se hace push. Solo incluye presentación web, assets, pipeline, tests y documentación de P11J. Sin cambios en `packages/`, servidor, SQL, configuración remota o credenciales. `Sprites/` y `TFPeru/` preexistentes no se incorporan. LOCAL queda abierto en 127.0.0.1:4173 para revisión, con prueba DEV aislada; no es una reactivación de Railway.
