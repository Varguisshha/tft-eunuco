# Modo Desarrollador — F0-P6B.3

Herramienta local permanente para pruebas. `DevelopmentCommandSchema` vive en el subpath `@tft/shared/development`; el controlador en `@tft/game-core/development`. Ningún comando DEV se incorpora a `MatchAction`, `MatchCommand`, `TimedCommand` ni `MatchCoordinator` público.

## Activación y aislamiento

Vite define `__DEVTOOLS__` durante la compilación: verdadero al servir desarrollo o con el modo explícito `local-test`. La importación dinámica del acceso DEV solo existe en esos casos. `pnpm build` genera `apps/web/dist` sin panel, controlador, esquema de comandos DEV ni clave aislada. `pnpm verify:public` inspecciona los JS públicos. `pnpm build:local` genera `dist-dev`, y `pnpm preview:local` lo sirve en 127.0.0.1:4173. No hay contraseña ni protección basada en una variable de navegador.

Desde «Modo DEV» se crea o recupera una prueba. ID obligatorio `dev-*`, `development.tainted:true` en el estado y `development:true` en la envoltura. El coordinador normal rechaza estados marcados e identidades DEV. Cambiar el booleano de la envoltura no los convierte en partidas normales. Una autoridad remota futura debe seguir usando el protocolo cerrado y autenticar sus propias capacidades; esta fase no implementa servidor, autenticación ni seguridad criptográfica contra guardados fabricados localmente.

Clave normal: `tft-eunuco-local-f0p5-1`. Clave aislada nueva: `tft-eunuco-isolated-dev-f0p6b3`. La clave DEV antigua permanece intacta y no se migra automáticamente. «Volver a normal» recupera la sesión normal anterior en memoria o vuelve al lobby; no copia unidades, oro, vida ni historia DEV. El reloj normal mantiene su comportamiento temporal cuando se reanuda.

## Transacciones

Solicitud tipada `{id, origin:panel|diagnostic|test, expectedRevision, command}`. Un controlador exclusivo valida entrada, modo, fase y revisión; clona la envoltura, aplica sobre un borrador, comprueba invariantes y restaura un coordinador candidato. Solo publica el candidato completo si todo pasa. React no escribe estado de partida.

Cada intento registra ID, origen, huella de solicitud, revisión DEV, resultado y mensaje. ID repetido con la misma solicitud devuelve el resultado anterior; contenido diferente con el mismo ID se rechaza. Las revisiones obsoletas y entradas inválidas quedan auditadas. La revisión/historia normal se conserva para acciones normales; la auditoría DEV es independiente y no puede reproducirse como partida normal. Límite 10 000 entradas; al agotarlo se crea otra prueba desde el acceso, sin eliminar su trazabilidad.

Se guarda la envoltura automática, auditoría y checkpoint de preparación. Las trazas usan la misma codificación por deltas del guardado normal. Revisión DEV o fase nueva se guarda inmediatamente; pulsos sin cambios se limitan a una escritura cada 500 ms. Un fallo de almacenamiento se muestra y conserva ejecución en memoria. La creación se persiste también antes de ejecutar la primera acción.

## Comandos

| Grupo       | Comandos / límites                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Oro         | Añadir +10/+50 o cantidad válida; establecer 0..999; máximo; oro inicial 10. Asiento `development` con conservación de saldo.                                                                     |
| Nivel       | Establecer 2..7; subir un nivel desde UI. Recalcula XP total, capacidad y odds desde tablas existentes. Al bajar retira excedentes al primer hueco de banquillo o rechaza todo si no caben.       |
| XP          | Añadir 0..10 000 con progresión normal o establecer dentro del nivel. En nivel 7 solo se establece 0.                                                                                             |
| Vida        | Establecer 1..100 por bando, restaurar jugador 100 o preparar eliminación con 1. Ajustes separados y ordenados respecto al índice de healthLedger; nunca se falsifican entradas de daño de ronda. |
| Unidades    | Seleccionar cualquier definición actual, estrellas 1/2/3, primer hueco libre de bench o celda axial válida de la mitad propia; fusiona con el ejecutor existente. Retirar devuelve copias.        |
| Formaciones | VARGAS, DOLEA, mixta o vacía. Devuelve las copias de la formación anterior y reserva las nuevas de forma atómica.                                                                                 |
| Reloj       | Pausar/reanudar; avanzar una fase por autoridad, con resolución y recompensa únicas. Duraciones de prueba 8 s/2 s o normales 30 s/5 s. Contrato admite 100..30 000 ms y 100..5000 ms.             |
| Repetición  | Recupera checkpoint de preparación, formación y RNG, reinicia su tiempo completo en pausa. Descarta el futuro de esa rama; conserva auditoría.                                                    |
| Reinicio    | Misma semilla, estado inicial y una identidad DEV nueva; conserva auditoría del controlador.                                                                                                      |

Oro, nivel, XP, vida y unidades solo se editan en preparación o antes de iniciar; también mientras preparación está pausada. Compra/movimiento/venta normales siguen requiriendo un reloj de preparación en marcha. Plegar herramientas deja libres los controles normales de tienda; el overlay abierto ocupa deliberadamente esa zona derecha.

## Pool y ledger

Política DEV: **reserva real**, sin unidades fantasma. Una generación 1/2/3★ resta 1/3/9 copias disponibles. El pool tiene las 18 copias coste 3 normales de VARGAS, y cada oferta sigue reservando 1. Si no hay copias, espacio o capacidad se rechaza todo el borrador. Fusiones conservan copias; retirada o venta devuelve las invertidas. Las formaciones no rellenan artificialmente el pool ni alteran probabilidades.

Invariante por definición: `pool + copias poseídas + ofertas = copias configuradas`. Se conserva para unidades compradas y generadas. Se prueba agotamiento, fusión a 3★, retirada, venta y recuperación. Un ledger de oro DEV sin marca de desarrollo es inválido. Los ajustes de vida reproducen sus balances antes de cada entrada de daño de ronda y después de la última.

## Rondas y recuperación

Los saltos seguros reutilizan el coordinador/autoridad; no asignan fases desde React ni vuelven a liquidar la misma ronda. Repetir recupera también settlements e historial anteriores al combate para iniciar otra rama consistente, sin sumar el premio del futuro descartado. El checkpoint sobrevive al guardado; las acciones DEV permanecen en la auditoría.

En diagnósticos se muestran ID, ronda, fase, semilla, reglas, catálogo, estado del reloj, última liquidación y últimos 8 intentos. El panel flota, se pliega hacia la navegación superior y tiene scroll interno. No reserva columnas ni reduce el canvas.

La recuperación de normal→DEV encontró una carrera de inicialización Phaser. `GameCanvas` ahora comprueba identidad de la escena preparada antes de calibrar o aplicar zoom. La reproducción corregida se comprobó con cuatro recuperaciones y una vuelta Arena→local, sin errores nuevos; no cambió la proyección ni Mar de Cristal.

Validación y límites: [informe de fase](F0_P6B3_REPORT.md).
