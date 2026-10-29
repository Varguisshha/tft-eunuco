# Recursos de iconos compartidos: LOCAL y producción

El renderer y sus 44 asociaciones son comunes. La selección depende de `__ITEM_ICON_RESOURCES__`, generado por Vite desde un plan de recursos verificado; `__DEVTOOLS__` solo controla las herramientas de desarrollo. No se cambia catálogo, IDs, nombres, recetas, estadísticas, efectos, inventario ni equipamiento.

## Configuración

| Variable de build         | Valores / significado                                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `TFT_ITEM_ICON_ENV`       | `local` o `public`. Por defecto LOCAL en dev y `local-test`; público en producción. `local` está prohibido en builds públicos/remotos.    |
| `TFT_ITEM_ICON_THEME`     | `eunuco`, `tft-reference` o `authorized`. Solo se admiten temas incluidos en el plan.                                                     |
| `TFT_REFERENCE_ART_ROOT`  | Carpeta LOCAL existente con `assets/items/tft-reference/...`; se comprueban los hashes y tamaños fijados. No habilita nada en producción. |
| `TFT_ITEM_ICON_PACK_ID`   | Identificador aprobado en el registro versionado. No sirve como autorización por sí solo.                                                 |
| `TFT_ITEM_ICON_PACK_ROOT` | Carpeta de entrada del paquete aprobado, absoluta o relativa a la raíz del proyecto. Nunca se publica esta ruta en el cliente.            |

Sin paquete adicional, el público contiene los 44 originales pixel art P12G y las 44 imágenes anteriores como fallback. EUNUCO es el tema predeterminado también en LOCAL. LOCAL conserva los 44 oficiales existentes, sin descarga ni actualización de versión. La ausencia de una imagen activa el fallback; bytes locales que no coincidan con su identidad fijada hacen fallar la preparación. Si se usa un worktree saneado sin los binarios, indicar explícitamente `TFT_REFERENCE_ART_ROOT` a la copia privada que ya existe.

`dev:local` mantiene su aislamiento: no carga `.env` online del worktree, utiliza una política LOCAL explícita y solo admite esa raíz de referencias verificada; no hereda paquetes de producción. En el arranque Vite ordinario también se puede usar `TFT_ITEM_ICON_ENV=public` con herramientas DEV presentes, sin habilitar referencias por ello.

## Resolución y fallback

1. Override permitido para la asociación actual (rutas arbitrarias solo en LOCAL).
2. Paquete seleccionado, verificando `iconKey`, ID interno, ID de origen, nombre, clase y receta.
3. Imagen pixel art P12G, seguida de la imagen EUNUCO anterior; se conserva la asociación histórica por ID de origen.
4. Glifo SVG original (iniciales en el renderer Phaser del tablero).

El fallo se procesa por imagen y no altera estado del juego. El removedor mantiene su recurso propio y no forma parte de las 44 asociaciones estándar. Las simulaciones de fallo son exclusivas de la política LOCAL. El manifiesto público efectivo se sirve en `/item-icon-resources.json` y no contiene rutas privadas ni evidencias legales completas.

## Incorporar un paquete cuando exista autorización acreditada

El registro `config/approved-item-icon-packs.json` contiene exclusivamente el paquete original generado `eunuco-neon-rpg-p12g`, con la procedencia y el encargo del propietario documentados. Su revisión artística es del agente, no una aprobación humana independiente. No hay aprobación de redistribución del paquete oficial. Un flag de entorno, un nombre de archivo o una URL pública de origen no sustituyen la revisión de permisos.

1. Para paquetes de terceros, incorporar una evidencia revisada que permita distribución en producción. La revisión de permisos debe ser humana; la comprobación de hashes solo protege su integridad.
2. Crear un manifiesto versionado con `version: 1`, `id` y exactamente 44 entradas `assets`. Cada entrada declara `iconKey`, `internalId`, `tftId`, `visibleName`, `kind`, `recipe`, `file` (relativo a la carpeta privada), `sha256`, `width`, `height` y `format` (`webp` o `png`). Se rechazan duplicados, cambios de identidad, traversal y symlinks fuera de la raíz.
3. Añadir al registro una entrada con `id`, `scope: "public-production"`, `manifestPath`, `manifestSha256`, `evidencePath` y `evidenceSha256`. Ambos documentos deben estar dentro del proyecto y sus hashes deben coincidir con lo revisado.
4. Preparar los 44 archivos mediante el comando de staging. Este verifica todos los bytes antes de crear un destino nuevo; no acepta un paquete sin aprobación y no reutiliza carpetas anteriores.
5. Configurar `TFT_ITEM_ICON_ENV=public`, `TFT_ITEM_ICON_THEME=authorized`, ID y carpeta. Cambiar también el valor explícito del tema en IaC durante la revisión de esa release: esta entrega deja IaC en `public/eunuco` y no lo aplica remotamente.
6. Construir, auditar y probar los 44 HTTPS, fallback, inventario y autenticación antes de declarar una publicación correcta.

Se puede generar **solo una propuesta de metadatos** del paquete oficial ya fijado, sin copiar imágenes ni aprobarlo:

```sh
node scripts/assets/prepare-icon-pack-manifest.mjs ID NUEVO_MANIFIESTO.json
```

Staging de un paquete previamente aprobado:

```sh
node scripts/assets/stage-approved-icon-pack.mjs ID CARPETA_PRIVADA NUEVA_CARPETA_DE_CONTEXTO/.approved-item-icons
```

El destino debe ser nuevo. El directorio `.approved-item-icons` se ignora en Git; el auditor de historial sigue rechazando los binarios oficiales incluso después de preparar el mecanismo de build. Se conserva la separación entre fuentes públicas y recursos privados aprobados para el artefacto.

## Railway, sin ejecutar despliegues en esta entrega

La IaC existente utiliza Railpack y `pnpm build && pnpm verify:public`. El plugin incorpora únicamente los archivos de un paquete aprobado, con rutas públicas derivadas de su hash: `/assets/items/authorized/ID/SHA.webp` (o `.png`).

P12G ya está incluido en el tema EUNUCO y no necesita staging ni variables adicionales. Para un paquete externo opcional, la carga futura debe partir de un `git archive` del commit revisado en un contexto nuevo; después se añaden exclusivamente los 44 recursos verificados por staging. La CLI instalada dispone de `--no-gitignore` y `--path-as-root`: serían necesarios para incluir la carpeta privada ignorada en ese **contexto acotado y auditado**. No usarlos sobre el checkout de trabajo, que contiene fuentes privadas, dependencias y diagnósticos. Dentro del contexto de build, `TFT_ITEM_ICON_PACK_ROOT=.approved-item-icons` es relativo a su raíz.

No se ha realizado esa carga ni se han configurado variables remotas. Antes de cualquier publicación se deben volver a inspeccionar el proyecto existente, actividad y lease, aprobar el contexto exacto, comprobar que no contiene otros archivos ignorados y supervisar el encendido/apagado del servicio.

## Verificadores

- El plugin y `verify:public` verifican el manifiesto, 44 originales, 44 asociaciones del paquete aprobado, pruebas de aprobación, hashes y ficheros. Un binario oficial renombrado o una entrada extra también se rechazan.
- `verify:release` conserva la prohibición de binarios oficiales y secretos en todo el historial y añade la exclusión de carpetas de staging.
- `verify:railway` verifica IaC offline: un servicio, una réplica, límites existentes y valores de recursos `public/eunuco`. No aprovisiona ni llama al proveedor.
- Las pruebas de paquetes aprobados utilizan exclusivamente imágenes EUNUCO en proyectos temporales con aprobaciones de laboratorio. Esas aprobaciones no se incorporan al registro real ni acreditan permiso para los oficiales.
