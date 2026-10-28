# Procedencia de iconos TFT · F0-P11J

Integración solicitada expresamente para revisión LOCAL el 28-10-2026. No se ha publicado ni desplegado esta fase.

## Fuente y versión

- [Documentación oficial TFT / Data Dragon](https://developer.riotgames.com/docs/tft): estructura de registros y recursos oficiales.
- [Metadatos es_ES 16.21.1](https://ddragon.leagueoflegends.com/cdn/16.21.1/data/es_ES/tft-item.json): 44 IDs exactos del catálogo `f0p11h-18.5-1`, nombres actuales y rutas `image.full` / `image.group`.
- [Notas oficiales TFT 18.5](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-18-5/): versión de TFT de la referencia congelada del proyecto, set 18; versión de cliente 16.21.1.
- [Documentación de assets de CommunityDragon](https://communitydragon.org/docs/assets): consultada inicialmente para localizar archivos de versiones concretas. El endpoint `/16.21/cdragon/tft/en_us.json` respondió 403. No se evadió esa respuesta ni se importaron imágenes de fuentes alternativas. Data Dragon resolvió las 44 identidades.

El SHA de los metadatos oficiales volvió a coincidir con la referencia P11H: `003afdea52a1b57b7abcf63d7270ff9cd894e07780039cc4e5db09131346bb6c`. No se seleccionó un artefacto, radiante, emblema o versión antigua por parecido.

## Transformación y trazabilidad

`scripts/assets/import-tft-icons.mjs` exige el catálogo y el SHA fijados; comprueba ID/nombre/receta y descarga solo los 44 PNG referidos. Conserva originales de trabajo en `artifacts/p11j/sources/`, fuera de Git. Exporta WebP lossless en dimensiones nativas y compara los píxeles RGBA decodificados de origen y destino. No usa filtros, recortes, recoloreados ni generación de imágenes.

PNG originales: 973468 bytes; WebP entregables: 726890 bytes (25,33 % menos). 43 imágenes de 128×128 y una de 64×64 (Furia del kraken), sin aumento artificial. Se comprueban 44 hashes distintos. Las dos sumas SHA por archivo, dimensiones, ruta, versión, receta e iconKey constan en [la matriz](TFT_OFFICIAL_ICON_MAPPING.md) y en el manifiesto JSON de presentación.

## Propiedad y límites

Las ilustraciones de Teamfight Tactics pertenecen a Riot Games y sus respectivos titulares. Acceder públicamente a Data Dragon **no acredita una licencia ni autorización para redistribuirlas dentro de un juego independiente**. Esta fase no afirma disponer de dicha autorización. No se crea ni publica un paquete independiente de assets. Una futura publicación online exige una revisión específica de derechos y del alcance autorizado.

Los 44 recursos originales EUNUCO de P11H permanecen intactos, con su propio manifiesto/procedencia. En el laboratorio LOCAL, «EUNUCO · originales» sustituye globalmente el tema, sin modificar reglas ni guardados. Overrides por iconKey preceden a los temas; la cadena de recuperación es override → TFT exacto → original EUNUCO → SVG propio.

## Frontera LOCAL / público

Los recursos se sirven como archivos estáticos locales. Ninguna partida solicita imágenes a Riot o CommunityDragon. `__DEVTOOLS__` elimina el manifiesto y las rutas oficiales del JavaScript público; el plugin de build `localItemArtBoundary` elimina la carpeta TFT exclusivamente de la salida de builds públicos. `verify:public` rechaza esa carpeta o cualquier ruta oficial remanente. `build:local` sí conserva los 44 archivos. El directorio `public` del repositorio se conserva para desarrollo LOCAL; no debe subirse directamente a otro hosting eludiendo el build.

Ni Railway ni Supabase remoto se modificaron. No se cambia la disponibilidad competitiva de los cuatro objetos bloqueados.
