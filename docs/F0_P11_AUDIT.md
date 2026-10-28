# F0-P11 · auditoría inicial y estrategia LOCAL

Fecha de trabajo: 27-10-2026 (Europe/Madrid). Sin consultas ni cambios de Railway/Supabase remoto.

| Base o worktree | Estado comprobado localmente | Integración |
| --- | --- | --- |
| Release Railway | Último piloto conocido: código estable `9450d26`, catálogo `f0p8d-florin-1`; apagado por petición posterior | No se asumen publicadas las funciones locales. Sin tocar la release |
| P9B-R2 `9c0d598` | Supervisor LOCAL, proxy, PostgreSQL aislado, separación de credenciales y DEV | Base heredada de esta rama |
| domain-and-champion-pool `b5d93c4` | Economía congelada 30/25/18/10/9 para partidas nuevas, fingerprint propio; costes actuales 1–3 | Conservar registro histórico y tabla para P11 |
| P10A `4e17a21` + cambios sin commit | 34 identidades Excel, 4 jugables, 30 borradores; 16 colectivas y 4 únicas; tarjetas multiafinidad, inspector, galería y nuevos contratos | Copia acotada de cambios locales, sin escribir en su worktree |
| P8D principal `2d622b4` | Reparto de componentes autoritativo | Ya integrado en la base estable |
| Florin `4aa8cef` / integración `8a6850b` | Mecánicas, animaciones y splash arts | Ya integrados en contenido estable |
| P8E `e9f0687` / P8F `10fbc9b` | Inventario con pestañas, interacción autoritativa, estabilización y pruebas | Ya integrados; preservar lógica e historial |
| P9A `c878fcf` / P9A.1 `4e17a21` | Infraestructura remota, retención acotada y recuperación | Mantener sin operar remotamente |

Rama de integración: `codex/f0-p11-local-corrections`, base `b5d93c47548060e75071a7b966206d07770d2347`. Los archivos ajenos y los informes SEC-01/02 preexistentes quedan fuera de los commits P11.

## Evidencia del roster

P10A contiene el manifiesto reproducible de las 544 afiliaciones Si/No y su procedencia por celda. Excel original `/Users/vargas/Downloads/Copia de TFPeru.xlsx`, SHA256 `101728c60d45312cd98776087ba17f3636e798ab2e0265ed0f65b26ece6791eb`. Erik resuelve a JARAMILLO. Los cuatro originales tienen nuevas afiliaciones, sin Llama de Pádel; MUS solo 2/4. Los borradores carecen de coste, estadísticas, habilidad y arte. Es necesario un catálogo adicional para habilitarlos sin reinterpretar P10A.

## Sistemas afectados

- El pool reserva físicamente las cinco ofertas; comprar transfiere la reserva, refrescar devuelve y reserva, fusionar conserva 1/3/9 y eliminar libera una sola vez. Nuevas identidades requieren pruebas de conservación, no cambios oportunistas de odds.
- Objetos: 8 componentes/36 recetas. Referencia estadística anterior `tft-14.1-items.json`, ejecución `f0p8c-1` y reparto `f0p8d-1`. Sus nombres genéricos y efectos no demuestran equivalencia con 18.5. P11B debe contrastar la nueva referencia y registrar otro catálogo.
- `ItemHud` presenta componentes/completos/pendientes mediante pestañas. `itemInteraction` y el core ya procesan combinación/equipamiento; React no crea objetos. No hay removedor.
- Tanto la autoridad como `applyAction` tienen un filtro general de preparación. Venta de banquillo y bloqueo en combate necesitan reglas selectivas en ambos niveles y en el HUD, sin alterar el input congelado del duelo.
- Las trazas incluyen daño, absorción, vida posterior, curación y fuente de objetos. No basta sumar animaciones. P11C debe definir daño efectivo/mitigado/sobrecura y revisar los datos que faltan; la proyección visual debe respetar el tick visible.
- UI: Mar de Cristal, cinco ofertas, banco e inspector existentes; dirección Festival Pop × Neon Playground. Reutilizar componentes y validar las cinco resoluciones solicitadas con scroll interno, no global.

## Entregas secuenciales

A: integrar P10A preservando su estado histórico, registrar 34 jugables con provisionales explícitos por identidad y sin habilidades inventadas; pool actualizado, fallbacks propios, pruebas, capturas y commit.

B: después de A sin bloqueos, congelar la referencia de objetos verificable, implementar sus diferencias en versión nueva, bandeja vertical y removedor autoritativo sin recompensa competitiva gratuita; validar y commit.

C: después de B sin bloqueos, acciones económicas seguras en combate y panel de métricas por unidad procedentes de eventos visibles; validar y commit.

No se publica ninguna entrega. La implementación y las pruebas usan exclusivamente servicios locales.

## Ampliación aceptada durante P11A

Se conserva el trabajo válido. P11B exige equivalencia individual de los 36 objetos con una versión fija: una descripción parecida no basta, y cualquier semántica sin documentación suficiente quedará identificada como diferencia, sin afirmar fidelidad total.

D: preparar registro sin invitación de cuenta, manteniendo confirmación de correo, usuarios válidos, límites y protección automatizada. Solo configuración, migraciones y pruebas locales; los códigos de lobby siguen obligatorios. Ninguna apertura remota.

E (prioritaria): investigar bloqueos banquillo→tablero. Reproducción de recuperación de comandos rechazada/perdida y corrección independiente en `283bde6`; informe `F0_P11E_RECOVERY_REPORT.md`. No demuestra todavía la causa exacta de la incidencia real, cuyo tráfico no está disponible. Completar auditoría de interacción/fases/reconexión y validación integral.

F: consolidar A–E, 2–4 jugadores, persistencia y compatibilidad histórica. Cada fase conserva pruebas, informe y commit local independiente. No push, despliegues ni acceso a Supabase remoto.
