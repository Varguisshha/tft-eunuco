# F0-P12A-R1 — release pública saneada hasta P11K

## Candidata y reconstrucción

Fuente funcional: P11K `80a28f2980d9c8b072bd255f75bfde79243a3960`. Rama de publicación: `release/p11k-public-safe`, en un worktree nuevo independiente. Ancestro elegido y auditado: `279be4d028286b186986119bb362f84a540d2f50`, primer commit público del juego. El remoto GitHub comprobado es `https://github.com/Varguisshha/tft-eunuco`, público; `main` permanece en `b4e12eee4c28175d4e49d5984a19f5fc5a610bf8` antes de publicar.

Se incorpora la instantánea final saneada mediante un único commit descendiente del ancestro limpio, sin merge ni cherry-pick de P11J/P11K. Se excluyen los 44 binarios TFT y 75 archivos diagnósticos que el `main` posterior ya arrastraba, además de metadatos de desarrollo ignorados. No se reescribe ninguna rama remota ni se cambian los worktrees originales. La genealogía de esta rama es deliberadamente distinta; el SHA fuente queda documentado para trazabilidad.

Las únicas diferencias en archivos comunes con P11K son `.gitignore`, scripts de publicación de `package.json` y la ruta externa de fixtures en el test de procedencia de iconos. Se añaden scripts de auditoría/publicación, dos pruebas del auditor y este procedimiento/informe. Motor, servidor, catálogos y demás UI coinciden byte por byte con P11K.

## Frontera Git, LOCAL y distribución

`verify:release` inspecciona todos los blobs alcanzables: rutas oficiales y hashes de los 44 WebP y sus PNG fuente, incluso renombrados; claves modernas, tokens de gestión, JWT, claves privadas, `.env`, certificados y carpetas diagnósticas/generadas. Ningún valor sensible se imprime. La única excepción estática es el vector inválido exacto del test de rechazo; no se excluye un archivo completo del detector. La auditoría se completa con revisión de procedencia y archivos; no se presenta el detector como prueba universal de ausencia de secretos o imágenes transformadas.

Los 44 iconos originales EUNUCO y los assets compilables se conservan. El build público contiene 44 originales y cero oficiales; el auditor de assets coteja 85 archivos y 13 referencias de texturas. Los 44 oficiales permanecen intactos en LOCAL original y se usan externamente para mantener sin relajar los tests de procedencia binaria. Los packs originales de Excel/sprites/splash arts son fixtures ignoradas de validación, no payload de publicación. La futura carga Railway debe extraerse únicamente del SHA saneado mediante `git archive`; no se ha generado ni subido una carga de despliegue en esta operación.

## Compatibilidad

Se conservan los 34 personajes y sus sinergias, cuatro personajes completos y 30 provisionales sin habilidades personales inventadas, estadísticas, recompensas, odds, pool 30/25/18/10/9, compras/ventas en combate, fusiones, inspector y panel estadístico. Ocho componentes, 36 recetas, **32 objetos habilitados y cuatro bloqueados**; sin cambios de sus efectos. Removedor inicial de uno por jugador real nuevo y política `f0p11k-remover-1`.

Catálogos: combate `f0p11h-1`, objetos `f0p11h-18.5-1`. Fingerprint P11K: `edd6bc4f87fba4e9d4724706c0e66c02cdf97a39a50884cf5f339aa3caf9e23e`. Los 13 históricos coinciden exactamente con P11K. No se reinterpretan snapshots antiguos ni se aplican migraciones nuevas.

## Validación: publicación bloqueada

**Estado final: candidata saneada preparada, pero NO publicada ni desplegada.** El gate completo no pasa y no se sustituye por resultados dirigidos. No se ha cambiado código de juego, ninguna prueba anterior, timeout ni umbral para facilitar la publicación.

- TypeScript y ESLint: pasan. Lint repetido después de añadir el comando de push: pasa.
- Builds público, servidor y LOCAL: pasan por separado. `verify:public`, `verify:railway`, auditoría de assets y `git diff --check`: pasan.
- `verify:release`: historial saneado sin coincidencias detectadas de secretos, rutas oficiales, hashes binarios oficiales o diagnósticos. Se repite al cerrar con el commit final del informe.
- Dos pruebas nuevas del auditor: pasan.
- Primer `pnpm check`: 1718 pasan, cinco fallan y una optativa omitida. Los cinco fallos correspondían a fixtures ausentes del checkout limpio: build servido por HTTPS, Excel y originales de sprites/splash arts. Se generó el build y se instalaron solo fixtures ignoradas, conservando los tests. Las 18 pruebas dirigidas de Excel/sprites/splash arts pasaron.
- Segundo `pnpm check`, con PostgreSQL aislado y HTTPS/WSS habilitados: **1720 pasan, tres fallan y una optativa omitida; 129 archivos pasan, tres fallan y uno omitido. Duración 770,38 s.** La optativa es el ciclo de arranque/apagado LOCAL; no se presenta como ejecutada en esta candidata. Las pruebas de removedor P11K, histórico, cuatro jugadores, recetas, roster y demás casos no listados como fallidos pasan en esta ejecución.

| Fallo crítico observado | Evidencia exacta |
| --- | --- |
| Recuperación integrada de cuatro jugadores hasta ronda 6, SIGKILL antes/después del commit | `apps/server/src/persistence/crash.test.ts:697`: la sonda no observó el escritor esperando el bloqueo (`blocked=false`). La precondición de esa rama no quedó acreditada. No se deduce pérdida o duplicación de datos de ese resultado |
| Estrés 7 contra 7 con 42 objetos | `packages/game-core/src/items/stabilization.test.ts`: timeout vigente de 5000 ms; duración observada 7327 ms |
| Reproducción visual con equipo completo | `apps/web/src/game/itemPlayback.test.ts:71`: p95 20,172959 ms frente al límite vigente de 16,7 ms |

Se hizo **una repetición dirigida de los tres casos**, sin cambiar código ni límites: tres pasan, 25 casos fuera del filtro omitidos, duración 52,02 s. La reproducción visual registró 240 muestras, p95 7,120458 ms y p99 8,079 ms. Estos resultados muestran intermitencia; no certifican la causa, estabilidad bajo la batería conjunta ni un gate completo correcto. No se atribuye el problema a la máquina, PostgreSQL o el motor sin más evidencia. No se hacen repeticiones hasta obtener un resultado favorable ni se declara la candidata lista para publicación.

Evidencias privadas locales ignoradas: `artifacts/p12a/check-missing-fixtures.log`, `check.log`, `critical-reproduction.log`, `fixtures-restored.log`, `history-audit.json`, `fingerprints.json`, `snapshot-equivalence.json`, builds y verificaciones. Ningún log entra en el commit público.

## Resultado de GitHub, Railway, Auth y consumo

| Elemento | Estado final de esta operación |
| --- | --- |
| Rama candidata | `release/p11k-public-safe`, exclusivamente local |
| Push | **No ejecutado**, condicionado al gate funcional completo |
| Commit remoto publicado | Ninguno en P12A-R1; `main` observado permanece en `b4e12eee4c28175d4e49d5984a19f5fc5a610bf8` |
| Historial de la candidata | Ancestro limpio inicial + instantánea saneada y documentación; no incluye genealogía P11J/P11K |
| Release/build/deployment Railway | No creado ni modificado |
| Servicio | No reactivado por esta operación; estado actual del proveedor no revalidado al detenerse antes del push |
| Dominio objetivo | `https://tfteunuco.up.railway.app/`, sin cambios |
| Readiness/HTTPS/WSS remotos | No comprobados en esta fase; TLS/WSS locales sí forman parte del segundo gate |
| Auth / claves modernas / SEC-02 / RLS / migraciones / lease remotos | No revalidados aún; scripts de preflight preparados exclusivamente como artefactos locales, no ejecutados. No se recuperan credenciales antiguas |
| Registro | No se activa registro abierto ni se modifica la configuración remota; no se crean usuarios ni se envían correos |
| Partidas, lobbies y backups remotos | No consultados ni modificados; preflight y copia acotada pendientes antes del despliegue |
| Recursos y consumo | Sin contratación, aumento de límites ni cómputo Railway iniciado. Consumo actual no consultado; no se afirma coste cero |
| Rollback | No necesario: no hubo mutación remota. Una futura reversión deberá aceptar fingerprints persistidos y mantener el fence |

## Limitaciones y siguiente paso

La exclusión de assets e historial está resuelta para esta candidata, pero **la validación funcional conjunta sigue bloqueada**. Se aplica la condición de parada de P12A-R1 antes del push. Hay que investigar los fallos intermitentes del harness SIGKILL y de los presupuestos temporales, sin ampliar umbrales ni cambiar mecánicas, y obtener después un gate completo válido. Cualquier corrección de juego se tratará explícitamente, no se ocultará dentro de la publicación.

Solo después procederían push del SHA revisado, revalidación remota de seguridad/partidas/lease/backups/recursos, carga del archivo Git exacto, comprobación HTTPS/WSS/Auth/assets y parada supervisada. El registro online sin invitación sigue fuera de esta autorización de cambios remotos. No se certifica una sesión humana multijugador remota en esta fase.

## Futuras publicaciones

[Procedimiento exacto y controles automáticos](PUBLIC_RELEASE_WORKFLOW.md). Nunca fusionar la genealogía LOCAL con los blobs TFT en esta rama. `pnpm release:push <SHA revisado>` verifica rama, remoto, árbol tracked limpio e historial antes del push y confirma el SHA remoto; publica una sola rama, sin force ni tags. Railway se valida bajo supervisión y se apaga al terminar, manteniendo la imagen para una próxima activación autorizada.
