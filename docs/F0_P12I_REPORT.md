# F0-P12I — Arenas seleccionables y Cafetería UPM

Implementación exclusivamente LOCAL, 29 de octubre de 2026.

## Base y alcance

Base exacta P12H: `25770e34c86c546dd2cef0954143260cb5ad37ab`. La publicación P12H se verificó en la entrega anterior; no se dedujo del nombre del prompt. Rama aislada: `codex/f0-p12i-selectable-arenas`, sobre la genealogía pública saneada. El SHA final se entrega junto con este informe; se obtiene con `git rev-parse HEAD` en esta rama.

Sin cambios en `packages/game-core`, `packages/game-data`, balance, economía, inventario, habilidades, sprites, splash arts o iconos. Se preservan P12F, P12G y el HUD Festival Pop × Neon Playground. No se incorpora P13 ni ningún worktree ajeno.

## Resultado implementado

- Dos arenas registradas: Mar de Cristal predeterminada y Cafetería UPM — ETSISI.
- Selector con miniaturas en la columna de invitación del lobby. Anfitrión editable; invitados con selección visible y controles deshabilitados. El servidor comprueba permisos y estado, rechaza IDs desconocidos y bloquea cambios después del inicio.
- Cambiar de arena anula todos los estados Listo. Elegir la misma no los anula.
- Registro tipado y metadata compartida; una proyección y cámara específicas para cada fondo. Se conserva el tablero lógico de 56 celdas y un único motor.
- Arena persistida como metadata del lobby de la partida, transmitida por snapshots y recuperada tras reconexión, reinicio y SIGKILL.
- Compatibilidad con documentos anteriores sin ID: Mar por defecto, sin reescribir snapshots ni modificar fingerprints del motor.
- Precarga del fondo seleccionado, miniaturas separadas y fallback de suelo técnico conservando la proyección si falla el fondo.

## Imagen y calibración

Se utilizó el PNG final entregado por el usuario, sin regeneración. Maestro byte idéntico en `art/arenas/cafeteria-upm-etsisi.png`: SHA-256 `5b484c800b04fc69c33d6d1e7fcb8b3858c1c682a0da0b14a650b922927598ba`. El WebP principal de 2.816.008 bytes conserva sus píxeles decodificados; miniatura de 420 píxeles de ancho. No hay dependencias de CDN. El manifiesto registra ambos fondos y los derivados nuevos.

La calibración reserva el asfalto central y mantiene los 336 vértices dentro del perímetro seguro. El encuadre muestra la composición original a 100 %; P12F permite acercar y alejar el mundo al 80–180 % sin escalar el HUD. Véanse `ARENA_SYSTEM.md` y `ARENA_CALIBRATION.md` para contratos, coordenadas y procedimiento de una tercera arena.

## Evidencia funcional y visual

La ronda focalizada pasó **83 pruebas**: registro, maestro/píxeles, geometría y cámara parametrizadas para ambas arenas, sprites DOLEA 1/2/3 estrellas, permisos, sincronización y tres rondas reales con 2, 3 y 4 clientes de Colyseus. Las 28 regresiones PostgreSQL/SIGKILL pasaron en su ejecución separada; los casos de 2/3/4 jugadores ahora comprueban la Cafetería antes y después de la recuperación.

La prueba de paridad restaura dos copias del mismo estado y semilla, representa las dos elecciones visuales y compara exactamente la autoridad y duelos resultantes, incluido el clon impar. No inyecta el ID visual en la simulación.

En navegador real: lobby de tres clientes, invitado sin permiso, reinicio de Listo al cambiar arena, preparación, reconexión, cuatro zooms, selección y arrastre bidireccional banquillo/tablero en Cafetería, proyectiles y animaciones en ambos fondos. La campaña de tres jugadores terminó en la ronda 31 con clones y clasificación definitiva. Mar se comprobó además en una partida de dos clientes. Una segunda partida Cafetería de dos clientes confirmó el combate 7v7 al inicio y el equipamiento real de Lágrima de la diosa en JARAMILLO tras la recompensa de la ronda 3.

Se retiró temporalmente el fondo únicamente del servidor de laboratorio y se recargó el cliente. El tablero provisional conservó la proyección. La prueba reveló que una respuesta HTTP sin imagen decodificable no siempre emite el error de transporte de Phaser; se corrigió el aviso en la inicialización cuando falta la textura. Dos regresiones nuevas, una por arena, comprueban aviso, escena operativa y los 56 polígonos proyectados. La imagen original se restauró byte por byte y se verificó el aviso en navegador.

Capturas locales en `artifacts/p12i/` (no incluidas en Git):

| Evidencia                            | Archivos                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| Selector, ambas opciones y selección | `lobby-mar.png`, `lobby-caf-<tamaño>.png`                                      |
| Preparación, cinco tamaños por arena | `mar-preparation-<tamaño>.png`, `caf-preparation-<tamaño>.png`                 |
| Zoom 80/100/120/180 %                | `mar-zoom-<porcentaje>.png`, `caf-zoom-<porcentaje>.png`                       |
| Arrastre real                        | `caf-drag-to-bench.png`, `caf-drag-from-bench.png`                             |
| Combate y efectos                    | `mar-combat-7v7.png`, `mar-combat.png`, `caf-combat-7v7.png`, `caf-combat.png` |
| Equipamiento y fondo ausente         | `caf-equipment-drop.png`, `caf-background-fallback.png`                        |
| Clon, resolución y final             | `caf-clone.png`, `caf-resolution.png`, `caf-final.png`                         |

Resoluciones comprobadas en lobby y ambas arenas: 1280×720, 1440×900, 1920×1080, 2560×1440 y 3840×2160. Sin scroll vertical de documento. El selector se movió a la columna izquierda para mantener accesibles Listo/Iniciar en 720p. La inspección visual revisó extremos/centro, alineación y el predominio del fondo.

El laboratorio visual es explícitamente loopback, usa usuarios sintéticos y permite alargar preparación/avanzar fases; no modifica el reloj ni las reglas de producción. No crea cuentas ni datos remotos. Los archivos `p12i-lab.html`, `p12iLab.tsx` y `p12i-visual-fixture.ts` no forman parte de las entradas de producción.

## Quality gates

La ejecución conjunta **final**, posterior a la corrección del aviso, pasó **1.849 pruebas en 152 archivos**, cero fallos, en 631,78 s. El único caso omitido es el lifecycle opt-in, ejecutado aparte y aprobado. TypeScript, ESLint y builds públicos de web/servidor correctos. No se relajaron aserciones ni tiempos. Evidencia completa: `artifacts/p12a-r2/p12i-final.log`; la ejecución anterior de 1.847 pruebas se conserva como diagnóstico, no sustituye al gate final.

Rendimiento final: estrés 7v7 en 1.779 ms (límite 5.000 ms), reproducción p95 8,454 ms y p99 10,893 ms (límite p95 16,7 ms). PostgreSQL aislado, HTTPS/WSS, SIGKILL, reconexión, crafting y removedores se ejecutaron dentro del gate, con sus variables opt-in locales habilitadas.

Build LOCAL final, `verify:public` y `verify:railway` pasaron. El build público conserva 44 iconos originales EUNUCO y cero iconos oficiales LOCAL, no incluye el laboratorio P12I y ambos fondos coinciden byte por byte con sus fuentes WebP. El manifiesto distingue el hash del maestro PNG y el del derivado servido. Sus cuatro recursos nuevos se comprobaron contra tamaño/hash. Los 18 fingerprints históricos comprobados permanecen intactos.

`verify:release`, auditoría del árbol/historial y `git diff --check` correctos. No se incorporan los 44 binarios oficiales TFT ni credenciales detectables. Los assets oficiales de otros worktrees LOCAL permanecen intactos. Las capturas, certificados de pruebas, fixtures privados, copias de laboratorio y logs continúan excluidos del historial publicable.

Lifecycle opt-in: una invocación inicial desde el directorio principal se detuvo por `EADDRINUSE` en 4173 antes de iniciar hijos. No se mató ni modificó ese servicio ajeno. En una copia del árbol P12I se remapearon exclusivamente 4173/2567/2559/55440 a 44173/42567/42559/55441; la prueba pasó, incluidas ocupación de puerto, rechazo de parada no autorizada, SIGTERM y liberación de todos los puertos propios. No se cambia el código de producción para acomodar el laboratorio.

## Límites y operación

- La persistencia garantizada corresponde a partidas iniciadas. Las salas en espera siguen siendo efímeras: tras reiniciar hay que crear otra y volver a elegir arena. No se añade almacenamiento remoto para ellas.
- Los contratos nuevos de lobby requieren cliente y servidor actualizados conjuntamente. Se aceptan snapshots históricos del lobby; no se promete interoperabilidad de selección con navegadores que sigan ejecutando JavaScript anterior.
- El zoom 180 % acerca el tablero y puede recortar el fondo o celdas periféricas por diseño; 100 % es el encuadre completo. Las coordenadas y las hitboxes conservan la misma transformación.
- No se ha hecho push ni desplegado. GitHub y Railway no se han modificado en P12I. El último estado Railway verificado en P12H era deployment retirado; no se ha encendido ni consultado de nuevo durante esta fase. Supabase remoto, migraciones, Auth, SMTP y credenciales permanecen fuera del alcance.
