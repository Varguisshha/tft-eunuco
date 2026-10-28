# F0-P11I · Sinergias, especialización e inspector

Entrega exclusivamente LOCAL sobre P11H `ccc6db13c97963c7035552b12110bfbd315e0aa1`. Rama `codex/f0-p11i-synergy-presentation`, en el worktree existente `/Users/vargas/.codex/worktrees/p11h-item-completion/TFT EUNUCO`. Se conservan los recursos originales no versionados de la fase anterior; no se sobrescribe trabajo concurrente.

## Orden de las sinergias

La ordenación vive solo en presentación (`apps/web/src/match/hud/traitOrder.ts`). Reutiliza el resultado de `analyzeTraits`; no altera perfiles, umbrales, efectos ni orden de ejecución del motor.

1. Primero las filas con activación canónica real y al menos un umbral implementado no reservado.
2. Entre ellas, mayor **nivel alcanzado**. Si se alcanza un escalón pendiente manteniendo el efecto anterior, el texto distingue ambos niveles; el nivel de progreso no se presenta como una bonificación nueva.
3. A nivel equivalente, mayor proporción `miembros / siguiente umbral`. Al máximo, el progreso se considera completo. Se comparan productos enteros cruzados, sin redondeo de porcentajes ni diferencias dependientes del locale.
4. Después las filas con miembros pero sin efecto activo, ordenadas por esa proporción.
5. Al final las filas sin miembros, si otro consumidor decide mostrarlas. El lateral conserva su política de ocultarlas.
6. Todo empate termina en comparación ordinal del ID estable. La entrada no se muta y React conserva las claves por ID.

`pending_effects` nunca obtiene clase/icono de activación ni la etiqueta «Activo». Un escalón alcanzado pendiente dice que no concede una bonificación nueva. Los atributos únicos muestran explícitamente «Atributo único», estado y contador 1/1; las eliminaciones y créditos siguen separados del número de miembros. Se conserva el efecto implementado inferior en progresiones mixtas. Los umbrales reservados no se convierten en activaciones de presentación.

El estado confirmado actualiza las filas sin recarga. El cliente conserva el orden anterior mientras espera ACK/snapshot; al recibir la formación autoritativa vuelve a derivar el orden. La misma derivación se aplica después de restauración/reconexión y sobre la formación congelada de combate. Comprar al banquillo durante combate no altera sus miembros. No se limita la lista a ocho afiliaciones: la referencia de cuatro personajes muestra 13 y las pruebas incluyen 16 filas.

## Rol y daño principal

Contrato descriptivo separado en `packages/game-data/src/character-presentation.ts`: `combatRole`, `primaryDamageType`, tipos concretos de daño, especialización secundaria, etiquetas completas/compactas y explicación. No reemplaza `UnitDefinition.role`, `itemRole` ni ninguna propiedad de simulación o equipamiento. Los registros no se escriben en snapshots; se vuelven a consultar por identidad. El contrato permite futuras recomendaciones, pero esta fase no implementa ninguna.

| Personaje | Rol visible               | Daño principal     | Evidencia del comportamiento actual                                                                                                                                                        |
| --------- | ------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DOLEA     | Tanque                    | Físico             | Volumen eterno concede escudo; Press de banca causa daño físico y aumenta armadura. Su golpe base de habilidad es 100, escalado por estrellas a 180/324.                                   |
| VARGAS    | Asesino                   | Físico             | Blackhaus RPP escala 280/420/700 % AD y causa daño físico. El Depredador habilita saltos condicionados por eliminaciones.                                                                  |
| JARAMILLO | Tirador de apoyo          | Físico             | Cortina de Humo causa 160/240/400 % AD físico y reduce armadura. «Apoyo» describe el debilitamiento, sin atribuir daño mágico.                                                             |
| FLORIN    | Luchador duelista         | Físico y verdadero | Pisotón y básicos iniciales son físicos. El daño verdadero de básicos aparece tras la **segunda vuelta de Mano de Obra**, con ese atributo activo. El tooltip hace explícita la condición. |
| Otros 30  | Especialización pendiente | Sin definir        | Ambos atributos son `null`; no se deducen del aspecto, sprite ni parámetros provisionales de balance.                                                                                      |

`primaryDamageType: mixed` de FLORIN se acompaña de `damageTypes: ['physical', 'true']`; no significa que cause daño mágico. Las pruebas contrastan los efectos y ratios reales, incluida la recuperación de etapa 2 de Mano de Obra.

Los dos atributos tienen iconos SVG originales y etiquetas independientes en inspector, ficha de la Arena y tienda. La tienda reserva una franja superior: el campo del retrato empieza debajo de ella. Se mantienen nombre, coste y afinidades sin solapamiento; las cinco ofertas conservan su estructura. La versión compacta expone la descripción completa por hover/foco y mantiene la interacción táctil/Escape del tooltip P11H. En la lista de selección de la Arena se usa una variante estática para no anidar un objetivo de foco dentro del botón de selección.

## Inspector simplificado

Se elimina el render de `MechanicsStatus` del inspector normal, junto con el contador separado de progreso persistente de Trotamundos. Los cálculos, pasivas, stacks, eliminaciones, créditos, eventos y guardados permanecen intactos. La Arena diagnóstica conserva el bloque de contadores **solo en compilación DEV**.

Las habilidades, descripciones, estado esencial de pasiva, vida/maná, escudos, equipo y estadísticas del personaje se conservan. Las afiliaciones completas pasan a un desplegable cerrado inicialmente: no se pierden sus nombres, iconos, niveles ni detalles, y se reduce el desplazamiento inicial. No se crea un modal ni una capa nueva. La ficha sigue cerrándose con su control persistente; Escape del tooltip no cierra accidentalmente la ficha.

El panel independiente de daño, defensa y curación permanece funcional. Se comprobó con la referencia P11C de estadísticas no nulas: daño causado 165/110/74/56/42 en las filas visibles y las métricas existentes disponibles. La prueba usa esa referencia histórica para aportar valores reales, sin alterar P11H ni recalcular sus reglas.

## Capturas y navegador

Evidencias locales en `artifacts/p11i/`:

- `visual/{before,after}-{preparation,combat}-{1280,1440,1920,2560,3840}.png`: 20 capturas, a 1280×720, 1440×900, 1920×1080, 2560×1440 y 3840×2160.
- El «antes» final se capturó del build LOCAL P11H conservado, servido temporalmente en 4174; hashes del build en `baseline-build-hashes.json`. El «después» usa el código P11I. Se vuelve a seleccionar VARGAS después de empezar combate: las capturas comparan fichas abiertas, no una ficha con una pantalla sin selección.
- `visual/before-metrics.json` y `after-metrics.json`: sin scroll del documento, cinco cartas, inventario 112 px. Progreso de combate presente antes y ausente después.
- Contenido desplazable de combate: 1778→916 px a 720p; 1808→938 px a 1080p. No cambia el tamaño del viewport interno. En preparación a 1080p: 1219→924 px. Las habilidades extensas siguen necesitando scroll interno, especialmente a 720p; no se truncan para aparentar ausencia de scroll.
- `visual/role-*.png`, `ability-*.png`, `interactions.json`: cuatro personajes completos y Peibol, consulta por foco/Escape, afiliaciones completas accesibles, habilidades alcanzables y ausencia del bloque. El inventario conserva rueda, teclado y tooltip único.
- `visual/statistics-{1280,1920}.png`: panel independiente con datos reales.
- `network/multiplayer.json`: salas propias de diagnóstico LOCAL de 2, 3 y 4 jugadores, 250 ms de latencia de salida. Despliegues confirmados y orden sin adelanto optimista. Reconexión sin recarga ejercitada con cuatro jugadores; en 2/3 no se fuerza desconexión en este script. Orden preservado tras recuperación. Cero errores JavaScript registrados.
- `capture.cjs`, `interactions.cjs`, `network.cjs`: reproducción mediante controles existentes; no se añaden comandos de diagnóstico al servidor público.

Revisión visual independiente: **ship** sobre las capturas y el código de interacción muestreado. No certifica mecánicas ni red por sí misma. Alcance y conservación del mundo en `P11I_DESIGN_EXTENSION.md`. DESIGN.md y su sidecar permanecen intactos; los desfases documentales anteriores se registran sin repararlos fuera de alcance.

## Pruebas y compatibilidad

Nuevas pruebas: orden real/pendiente, niveles, proporciones exactas, desempates, únicos 1/1 y más de ocho filas; cuatro especializaciones contrastadas y 30 pendientes; confirmación autoritativa, ausencia de adelanto optimista y recuperación autenticada; inspector normal sin progreso con estado lógico conservado, habilidades/equipo/panel estadístico y cinco ofertas.

Se adapta la expectativa histórica del inspector para exigir la ausencia del bloque solicitado, manteniendo en el mismo caso la comprobación del stack lógico. No se elimina la prueba ni la cobertura del componente diagnóstico, ni se cambian límites.

La primera batería completa detectó un defecto en la fixture histórica de SIGKILL: el bucle automático podía iniciar combate de ronda 4 mientras su control de pasos manuales aún estaba en preparación. La observación por fases identificó además una transacción bloqueada que podía completar después de morir el cliente al liberar el bloqueo de PostgreSQL. La rama «antes del commit» termina y verifica la salida de los PIDs observados ejecutando el commit bloqueado en la base de diagnóstico antes de liberar la tabla; así exige rollback real y no confunde un resultado ambiguo con falta de persistencia. Se añade una opción **exclusiva de la fixture** para usar un único conductor de fases en los cuatro escenarios que ya avanzaban por HTTP. Mantiene autenticación/transporte, persistencia, SIGKILL, comparación completa de replays y recompensas, y los mismos límites y aserciones. Los demás escenarios —incluidas las campañas automáticas HTTPS/WSS— conservan el bucle real. No se cambia MatchRoom, DurableMatch ni el reloj de producción.

Las **13 huellas históricas**, incluida P11H, coinciden con la base (`historical-hashes.json`). No se crea un catálogo de combate nuevo para cambios de presentación. Se preservan los 34 personajes, sus habilidades, cifras, sinergias, objetos, recetas, iconos, compras en combate, probabilidades, reparto, economía y persistencia.

Resultados finales:

- `pnpm check`: TypeScript y ESLint sin errores; **125 archivos pasan, 1 omitido; 1677 pruebas pasan y 1 omitida**, 456,37 s. Incluye PostgreSQL aislado y campañas HTTPS/WSS. Builds público y servidor correctos.
- La prueba omitida es el ciclo LOCAL opt-in: ejecutada por separado con `TFT_LOCAL_INTEGRATION=1`, **1/1 pasa**. Comprueba puerto ocupado, inicio y cierre de procesos propios.
- `pnpm build:local`, `pnpm verify:public`, `pnpm verify:railway` y `git diff --check`: correctos. La verificación Railway solo inspecciona configuración local; no contacta ni enciende el servicio.
- Comprobación adicional del paquete público: no contiene la cadena «Progreso de combate».
- Cinco escenarios dirigidos de SIGKILL/ronda 6 pasan tras corregir la fixture; 53 pruebas dirigidas de presentación/interacción ya pasaban. Las pruebas completas incluyen las nuevas coberturas.
- Persiste el aviso del empaquetador sobre chunks superiores a 500 kB. No se modifica el umbral ni se amplía esta fase a optimización de paquetes.

PostgreSQL/HTTPS/WSS usan exclusivamente bases y certificados de diagnóstico locales del worktree; no hay acceso a Supabase remoto. Capturas, métricas y registros se conservan en `artifacts/p11i/`, ignorado por Git como el resto de evidencias locales.

## Estado de entrega

Sin push, publicación o reactivación Railway; sin cambios Supabase remoto. No se inicia otra fase. Los originales no versionados `Sprites/` y `TFPeru/` se conservan fuera del commit. Se entrega en commit local de la rama indicada, con código, pruebas y los tres documentos de P11I. Los artefactos generados y las copias fuente anteriores quedan fuera del commit. F0-P10A y los otros worktrees permanecen intactos.
