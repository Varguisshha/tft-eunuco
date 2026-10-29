# Iconos de objetos: contrato compartido LOCAL / Railway

Fecha: 29 de octubre de 2026.

## Resultado y límite de publicación

La infraestructura admite los mismos 44 identificadores en LOCAL y producción, con selección explícita de recursos, comprobación de identidad y fallback. Los iconos oficiales siguen disponibles exclusivamente en LOCAL. **No hay acreditación de redistribución para incluirlos en Railway**: el registro real de paquetes aprobados está vacío. No se ha hecho push, despliegue, reactivación ni cambio remoto de variables.

Un paquete aprobado futuro puede contener exactamente los bytes oficiales ya fijados, sin cambiarlos ni descargarlos de nuevo. Se seleccionaría como `authorized`; `tft-reference` sigue identificando la revisión privada LOCAL. Ambos pasan por el mismo renderer y contrato de asociaciones.

## Base y Git

- Base pública confirmada con `git ls-remote`: `release/p12d-public-safe`, SHA `2b3030562e2c38e128886fc6d1cbf5a159dbe96f`.
- Rama de candidata saneada: `codex/item-icons-shared-release`.
- Implementación: `ccee7ff0239224280a1ccaa636fbc04c2e38c981`.
- Worktree: `/Users/vargas/.codex/worktrees/item-icons-shared/TFT EUNUCO`.
- Se conserva P12F en su worktree, incluido su cambio documental local preexistente. No se incorpora su gameplay no publicado a esta candidata basada en la última rama pública.
- Ningún cambio en `packages/`, contratos de inventario, recetas, equipamiento, catálogos, nombres, estadísticas, efectos, SQL ni credenciales.

## Causa exacta de la diferencia anterior

Había tres barreras deliberadas:

1. `ItemIcon.tsx` e `itemIconTheme.ts` habilitaban el manifiesto y el tema oficial mediante `__DEVTOOLS__`.
2. `localItemArt.ts` retiraba `assets/items/tft-reference` de la salida pública.
3. `verify:public` y `verify:release` rechazaban respectivamente las rutas/archivos públicos y los binarios oficiales presentes en cualquier blob histórico.

Por tanto, la presencia de imágenes en un worktree LOCAL no las hacía disponibles en Railway. No se atribuye a caché ni a una versión antigua. El servicio está retirado y no sirve ahora un manifiesto operativo que permita otra comparación online.

## Arquitectura nueva

`iconResourcePolicy.ts` define la política de recursos inyectada en `__ITEM_ICON_RESOURCES__`. `__DEVTOOLS__` conserva su función de aislar herramientas de desarrollo, pero no concede permisos sobre imágenes. Una configuración sin recursos opcionales utiliza EUNUCO incluso si DEV está presente; un paquete de producción aprobado funciona con DEV desactivado.

El renderer conserva sus etiquetas accesibles y prueba, por este orden, override permitido, paquete seleccionado con identidad exacta, imagen original y glifo. La identidad comprueba `iconKey`, ID interno, ID de origen, nombre, clase y receta; no selecciona arte por el nombre traducido solamente. El fallback histórico por ID de origen se conserva. Los overrides arbitrarios y la simulación de fallo son locales; producción admite únicamente rutas incluidas en su configuración verificada para esa asociación.

El plugin Vite y el arranque `dev:local` comparten el plan y la entrega de bytes verificados. Las referencias privadas pueden servirse desde `TFT_REFERENCE_ART_ROOT` sin copiarlas al árbol público de fuentes. Si falta una referencia LOCAL, el cliente puede caer a EUNUCO; una referencia con bytes distintos de los fijados provoca un error de integridad.

La configuración incluye `TFT_ITEM_ICON_ENV`, `TFT_ITEM_ICON_THEME`, `TFT_ITEM_ICON_PACK_ID` y `TFT_ITEM_ICON_PACK_ROOT`. Las rutas privadas no se inyectan en el cliente. Se emite `/item-icon-resources.json` para inspeccionar qué recursos permite realmente cada artefacto.

## Paquetes aprobados y assets incluidos

El registro versionado `config/approved-item-icon-packs.json` requiere una identidad de paquete, alcance `public-production`, manifiesto fijado por SHA-256 y evidencia de redistribución fijada por SHA-256. La revisión de permisos es humana; el programa comprueba integridad, no interpreta una licencia.

Cada paquete declara exactamente 44 asociaciones y archivos con hash, formato y dimensiones. Se rechazan identidades incorrectas, duplicados, archivos alterados, rutas que escapan de la raíz, symlinks externos, evidencias alteradas y ámbitos insuficientes. El build de un paquete de producción incompleto falla; el fallback en ejecución sigue cubriendo errores de carga posteriores.

`prepare-icon-pack-manifest.mjs` genera solo una propuesta de metadatos a partir de las 44 referencias ya fijadas. Se ejecutó hacia un artefacto ignorado: **44 asociaciones, cero imágenes copiadas, aprobación falsa**. No descarga nada. `stage-approved-icon-pack.mjs` solo crea un destino nuevo después de verificar los 44 archivos y su aprobación.

| Artefacto | EUNUCO originales | Oficiales LOCAL | Paquete autorizado real |
| --- | --- | --- | --- |
| Público de la candidata | 44 | 0 | 0 |
| Build LOCAL con la raíz privada fijada | 44 | 44 | 0 |
| Fixture de producción, solo para pruebas | 44 | 0 | 44 imágenes EUNUCO |

El fixture aprobado utiliza exclusivamente arte EUNUCO y un registro temporal separado. No concede aprobación al paquete oficial ni modifica el registro real. Sus pruebas negativas con binarios oficiales renombrados se realizan en carpetas temporales privadas y se eliminan al terminar.

El auditor público verifica hashes, manifiesto, asociaciones y ausencia de binarios oficiales no aprobados, aunque estén renombrados. El auditor de historial mantiene la prohibición de binarios oficiales en Git; también excluye carpetas de staging. Las fuentes oficiales preexistentes no se añaden, borran ni reemplazan.

## Validación funcional y visual

Pruebas focalizadas: **26 correctas** en cuatro archivos, incluyendo los contratos nuevos, las 44 referencias existentes y el flujo histórico P12D.

En navegador real se comprobó un build Vite de producción con DEV desactivado:

- Paquete de prueba aprobado: 44 botones, 44 imágenes `authorized` cargadas.
- Error de los 44 recursos del paquete: 44 imágenes originales cargadas, sin huecos finales.
- Error del paquete y los originales: 44 glifos, con sus 44 nombres accesibles.

En el HUD real LOCAL:

- Galería: 44/44 oficiales cargados; fallo simulado: 44/44 originales cargados.
- Inventario lleno: 47 instancias de imágenes cargadas, incluidos componentes/completos/pendientes. Dos espadones conservan casillas e IDs independientes.
- Tooltip de Espadón: `+10 % AD`; recetas y objetos bloqueados conservan sus descripciones y restricciones.
- DOLEA: equipo 2/3 inicial; se equipa un completo y pasa a 3/3. Se combinan dos componentes por la receta existente con confirmación del inventario.
- Referencia P11K: se consume un removedor, desaparece su instancia y FLORIN pasa de 1/3 a 0/3 objetos. El removedor conserva su recurso propio, fuera de las 44 asociaciones estándar.

Evidencias ignoradas por Git en `artifacts/item-icons/`: `authorized-production.png`, `missing-pack.png`, `missing-all.png`, `local-gallery.png`, `local-fallback.png`, `local-inventory.png`, `local-recipes.png`, `local-equipment.png`, `local-remover-consumed.png`, `browser-production.json` y `browser-local.json`.

La matriz de configuración real rechaza `tft-reference` en producción, LOCAL forzado en build público y un paquete sin aprobación. Un build `private` con configuración pública sintética y sin recursos aprobados se construye con EUNUCO. Esa prueba de compilación no se presenta como una autenticación real de Supabase.

## Compatibilidad y laboratorio

Los **18 fingerprints públicos históricos coinciden exactamente** con P12E. No hay nueva versión de reglas porque solo cambia la presentación y el empaquetado de recursos. El manifiesto de las 44 referencias y el de los originales permanecen sin modificación.

Se trasladan dos correcciones de arnés ya investigadas en P12F, sin cambiar producción ni reducir garantías:

- La prueba SIGKILL del removedor espera el snapshot de preparación confirmado; el primer snapshot puede llegar antes de que el start gate autenticado termine.
- La prueba P12D no presupone que el perdedor de una ronda pierda también la siguiente. Contempla como máximo dos rondas adicionales en su laboratorio, conserva los 5000 ms y exige resultado final, reconexión y recuperación del resultado.

El primer intento de gate se interrumpió tras medir p95 17,19 ms frente a 16,7 ms. El muestreo independiente registró un proceso de conversión de vídeo ajeno con aproximadamente 740 % de CPU. Se respetó la preferencia del usuario de esperar a que terminara, sin enviar señales a ese proceso. La repetición completa se inicia después de 15 segundos sin procesos `ffmpeg`, con prevención de suspensión limitada al proceso de validación y sin alterar umbrales.

## Gates completos

Resultado definitivo sobre el commit de implementación `ccee7ff0239224280a1ccaa636fbc04c2e38c981`:

| Comprobación | Resultado |
| --- | --- |
| `pnpm check` (TypeScript, ESLint, suite y build público/servidor) | Correcto |
| Suite completa | 1794 pruebas aprobadas; 143 archivos aprobados; 1 prueba/archivo opt-in omitido; 592,11 s |
| Estrés integrado 7v7 | Correcto; 1635,22 ms totales; límite conservado de 5000 ms |
| Reproducción visual completa | p95 7,38 ms; p99 9,32 ms; límite conservado de 16,7 ms |
| `pnpm build:local` | Correcto; 44 referencias oficiales verificadas |
| `pnpm verify:public` | Correcto; 44 originales, 0 autorizados, 0 oficiales LOCAL |
| `pnpm verify:release` | Correcto; 1108 blobs, cero fallos en historial/secretos/assets |
| `pnpm verify:railway` | Correcto; sin aplicación remota |
| `git diff --check` | Correcto |

El único opt-in omitido es el ciclo completo del runner LOCAL (`scripts/local/lifecycle.test.mjs`). Necesita disponer del puerto 4173, ocupado por el servidor de revisión preexistente; no se ha interrumpido ese servicio para ejecutar una prueba opcional. El runner sí se cubre con pruebas del middleware y las verificaciones reales de Vite descritas arriba. No se presenta ese opt-in como ejecutado.

Permanecen avisos de Vite sobre tamaño de chunks y extensiones de importación para un futuro cargador nativo; no son fallos de esta entrega. La evidencia final se conserva en `artifacts/p12a-r2/item-icons-final.log`, `artifacts/item-icons/validation-stages.json` y `artifacts/item-icons/final-metrics.json`. Se retiró únicamente el enlace temporal de fixtures creado en esta candidata; los originales privados permanecen intactos.

## GitHub, Railway y Supabase

GitHub continúa en la rama pública `release/p12d-public-safe`, SHA `2b3030562e2c38e128886fc6d1cbf5a159dbe96f`. La candidata de iconos no se ha enviado al remoto.

Consulta de Railway exclusivamente de lectura: último deployment `a9bb6c57-117c-447d-bcee-4c4b51326f3e`, `REMOVED`, cero deployments activos; `/readyz` devuelve 404 con el servicio apagado. No hay deployment de esta candidata, comprobación HTTPS de iconos oficiales online ni prueba de acceso de cuentas reales durante esta entrega.

La IaC se prepara offline con `TFT_ITEM_ICON_ENV=public` y `TFT_ITEM_ICON_THEME=eunuco`, conservando proyecto, servicio, réplica y límites. No se aplica al proveedor. Supabase, Auth, SMTP, RLS, migraciones, credenciales, partidas y lobbies remotos permanecen sin tocar.

## Activación futura

El procedimiento completo se documenta en `docs/ITEM_ICON_RESOURCE_PACKS.md`. Antes de publicar los oficiales hacen falta evidencia de redistribución suficiente, aprobación del manifiesto exacto y revisión de la nueva release/contexto. Las variables por sí solas no los habilitan.

La carga futura partirá de un `git archive` del commit revisado y añadirá exclusivamente los 44 archivos verificados. La CLI instalada admite `--no-gitignore` y `--path-as-root`; su uso queda limitado a ese contexto nuevo y auditado, nunca al checkout que contiene referencias privadas y diagnósticos. Solo después corresponderían la publicación del mismo commit, HTTPS/44 hashes, navegador, Auth, persistencia y apagado supervisado.

**Estado:** infraestructura preparada; publicación de los oficiales bloqueada por ausencia de acreditación de redistribución. No se declara que la iconografía oficial esté funcionando en Railway.
