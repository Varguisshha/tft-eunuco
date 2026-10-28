# F0-P12A-R1 — release pública saneada hasta P11K

## Candidata y reconstrucción

Fuente funcional: P11K `80a28f2980d9c8b072bd255f75bfde79243a3960`. Rama de publicación: `release/p11k-public-safe`, en un worktree nuevo independiente. Ancestro elegido y auditado: `279be4d028286b186986119bb362f84a540d2f50`, primer commit público del juego. El remoto GitHub comprobado es `https://github.com/Varguisshha/tft-eunuco`, público; `main` permanece en `b4e12eee4c28175d4e49d5984a19f5fc5a610bf8` antes de publicar.

Se incorpora la instantánea final saneada mediante un único commit descendiente del ancestro limpio, sin merge ni cherry-pick de P11J/P11K. Se excluyen los 44 binarios TFT y 75 archivos diagnósticos que el `main` posterior ya arrastraba, además de metadatos de desarrollo ignorados. No se reescribe ninguna rama remota ni se cambian los worktrees originales. La genealogía de esta rama es deliberadamente distinta; el SHA fuente queda documentado para trazabilidad.

Las únicas diferencias en archivos comunes con P11K son `.gitignore`, scripts de publicación de `package.json` y la ruta externa de fixtures en el test de procedencia de iconos. Se añaden scripts de auditoría/publicación, dos pruebas del auditor y este procedimiento/informe. Motor, servidor, catálogos y demás UI coinciden byte por byte con P11K.

## Frontera Git, LOCAL y distribución

`verify:release` inspecciona todos los blobs alcanzables: rutas oficiales y hashes de los 44 WebP y sus PNG fuente, incluso renombrados; claves modernas, tokens de gestión, JWT, claves privadas, `.env`, certificados y carpetas diagnósticas/generadas. Ningún valor sensible se imprime. La única excepción estática es el vector inválido exacto del test de rechazo; no se excluye un archivo completo del detector. La auditoría se completa con revisión de procedencia y archivos; no se presenta el detector como prueba universal de ausencia de secretos o imágenes transformadas.

Los 44 iconos originales EUNUCO y los assets compilables se conservan. El build público contiene 44 originales y cero oficiales; el auditor de assets coteja 85 archivos y 13 referencias de texturas. Los 44 oficiales permanecen intactos en LOCAL original y se usan externamente para mantener sin relajar los tests de procedencia binaria. Los packs originales de Excel/sprites/splash arts son fixtures ignoradas de validación, no payload de publicación. La carga Railway se extraerá únicamente del SHA saneado mediante `git archive`.

## Compatibilidad

Se conservan los 34 personajes y sus sinergias, cuatro personajes completos y 30 provisionales sin habilidades personales inventadas, estadísticas, recompensas, odds, pool 30/25/18/10/9, compras/ventas en combate, fusiones, inspector y panel estadístico. Ocho componentes, 36 recetas, **32 objetos habilitados y cuatro bloqueados**; sin cambios de sus efectos. Removedor inicial de uno por jugador real nuevo y política `f0p11k-remover-1`.

Catálogos: combate `f0p11h-1`, objetos `f0p11h-18.5-1`. Fingerprint P11K: `edd6bc4f87fba4e9d4724706c0e66c02cdf97a39a50884cf5f339aa3caf9e23e`. Los 13 históricos coinciden exactamente con P11K. No se reinterpretan snapshots antiguos ni se aplican migraciones nuevas.

## Validación y operación

Estado al preparar este informe: candidata local; pruebas completas en curso. Este apartado se actualizará con resultados efectivos antes de cerrar P12A-R1. No representa autorización para abrir el registro sin invitación ni modificar Auth/SMTP, usuarios o permisos.

La primera batería detectó cinco fallos por fixtures ausentes del checkout limpio: build público requerido por HTTPS, Excel y originales gráficos consumidos por las pruebas de procedencia/importación. Se generó el build y se instalaron solo fixtures ignoradas, sin cambiar tests ni límites; las 18 pruebas dirigidas de Excel/sprites/splash arts pasaron. Se repite la batería completa sobre la candidata.

## Futuras publicaciones

[Procedimiento exacto y controles automáticos](PUBLIC_RELEASE_WORKFLOW.md). Nunca fusionar la genealogía LOCAL con los blobs TFT en esta rama. `pnpm release:push <SHA revisado>` verifica rama, remoto, árbol tracked limpio e historial antes del push y confirma el SHA remoto; publica una sola rama, sin force ni tags. Railway se valida bajo supervisión y se apaga al terminar, manteniendo la imagen para una próxima activación autorizada.
