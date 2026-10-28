# Pool de personajes — referencia congelada

Referencia elegida por el usuario: TFT Set 18 (2026). Verificación: 26-10-2026.
Fuentes comunitarias: [RRTFT, tablas Set 18](https://www.rrtft.com/tables/set18) (declara datos CommunityDragon, parche 18.5) y [TFTFans, guía de pool](https://tftfans.com/guides/tft-champion-pool-size-guide/). Coinciden con la tabla solicitada; no se presenta como documentación oficial de Riot ni se sincroniza automáticamente con futuros parches.

| Coste | Histórico EUNUCO | Nueva versión |
| --- | ---: | ---: |
| 1 | 29 | 30 |
| 2 | 22 | 25 |
| 3 | 18 | 18 |
| 4 | Sin unidades/tabla | 10 |
| 5 | Sin unidades/tabla | 9 |

Versión económica: `tft-set18-pool-1`, campo opcional `poolVersion`. Configuración central: `TFT_POOL_ECONOMY_CONFIG` en `packages/game-data/src/economy.ts`. Catálogo de contenido permanece `f0p8d-florin-1`; fingerprint nuevo `TFT_POOL_CATALOG_HASH` incluye la nueva economía y el fingerprint histórico completo. El esquema exige correspondencia entre versión y tabla.

Cada identidad tiene su propio máximo, compartido por todos los participantes. DOLEA y JARAMILLO son coste 2: 25 cada uno. VARGAS y FLORIN son coste 3: 18 cada uno. No hay personajes jugables de costes 4/5 en esta base: se valida su configuración, sin inventar personajes ni probabilidades. Las probabilidades por nivel siguen teniendo los tres costes actuales.

La integración futura de P10A debe utilizar exclusivamente su catálogo jugable, nunca el registro editorial completo: cuatro jugables y treinta borradores. Esta rama conserva los ocho personajes jugables de la base estable (cuatro reales y cuatro provisionales de pruebas). Los borradores de P10A no se importan ni reciben stock.
