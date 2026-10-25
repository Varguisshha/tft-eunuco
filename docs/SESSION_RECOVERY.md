# Recuperación de sesión — operación y validación

## Flujo de uso

Entrar en Multijugador conserva `#multiplayer` como pista de navegación, sin credenciales ni estado competitivo en la URL. Al recargar o reabrir esa dirección, Supabase restaura la sesión, el gateway descubre la pertenencia por UUID y el cliente se une al destino tanto en `starting` como en `in_match`. Volver a cuenta o partida local retira esa pista. Si se abre la raíz sin fragmento, se puede entrar de nuevo en Multijugador para descubrir la misma partida.

El lobby reemplaza el gateway anterior autenticado y desautoriza su callback antes de cerrarlo. Recupera anfitrión, participantes y presencia; en espera una desconexión desmarca Listo, como antes. El permiso interno de creación no se vuelve a consumir ni se crea otro destino. Las invitaciones y el código mantienen sus reglas.

Una ventana sustituida no intenta recuperar automáticamente el control. Cerrar sesión desmonta el multijugador. El abandono no devuelve unidades al pool por sí mismo ni elimina competitivamente al jugador: se conservan las reglas P7C.3. La recuperación automática del cliente se cancela; el servidor sigue resolviendo la partida con la formación existente.

## Contratos

`packages/shared/src/reconnection.ts`: versión `f0p7d1-1`. Las opciones `ResumeRequestSchema` son estrictas `{recoveryVersion}` para sustituir una plaza existente. `resume_accepted`, enviado al sincronizar, incluye partida, participante, conexión, generación, siguiente secuencia de comandos, secuencia espectador, ronda, fase, duelo y revisión. No incluye tokens.

Los mensajes conceptuales de la petición se adaptan a los contratos reales:

| Concepto                  | Implementación                                            |
| ------------------------- | --------------------------------------------------------- |
| resume_match              | joinById autenticado + opciones versionadas               |
| resume_accepted           | Mensaje validado con Zod antes de enviar y al recibir     |
| resume_rejected           | Error de matchmaking/autenticación clasificado por código |
| resync_snapshot           | state_snapshot privado existente y validado               |
| resume_combat             | combat_trace autorizado existente + phaseStart            |
| connection_superseded     | Cierre 4002 y retirada inmediata de autoridad             |
| connection_status_changed | connected público en snapshot/revisión                    |

Se conservan los contratos `NETWORK_VERSION`, `PAIRING_VERSION` y `COMPETITIVE_VERSION` para sus datos existentes. Mensajes entrantes económicos y espectador siguen validándose en runtime. No se añade un RPC que acepte estado recuperado del navegador.

## Reproducibilidad

- `pnpm check`: tipos, lint, tests y builds. Base preservada: 773 pruebas; nuevas pruebas en `reconnection.test.ts`, `recovery-network.test.ts` y `recovery.test.ts`.
- SDK independiente con 2, 3 y 4 clientes: transición, sustitución de pestaña, compra conservada, todos offline, Overtime, resolución, espectador, estado final, usuario ajeno y sesión revocada.
- Verificador Supabase con dobles: email, token expirado, sesión revocada y perfil ajeno, conservados en suite previa. No se declara nueva validación con cuatro cuentas Supabase reales.
- Navegador: entrada de diagnóstico `http://127.0.0.1:4174/diagnostics.html?player=0` (0–3), exclusivamente DEV y loopback. Ejecutar `VITE_GAME_SERVER_URL=http://127.0.0.1:2574 pnpm --filter @tft/web exec vite --host 127.0.0.1 --port 4174` y `pnpm --filter @tft/server exec tsx src/recovery-visual-fixture.ts`.
- El fixture se ejecuta por separado, nunca desde main.ts ni el build público. Reloj controlado en 2576: POST `/advance`, `/tick`; interrupción `/drop`, `/release`; cierre de sesión simulado `/expire`. No son endpoints del servidor normal. El reloj del fixture puede apartarse del tiempo de pared del navegador; recargar inmediatamente antes de capturar restablece la referencia. El servidor normal conserva su reloj monotónico continuo.

Capturas y medidas en `.impeccable/review/p7d1/`; cinco tamaños solicitados sin scroll del documento. La prueba de compra real de navegador conservó DOLEA, oro 8 y preparación 13,5→13,2 s tras recarga. Una serie agotada permitió reintento manual y recuperó finalResults; la recarga durante Overtime mostró tiempo restante positivo; un eliminado conservó puesto y duelo seleccionado tras recarga.

## Límites y fase siguiente

Reiniciar Node borra salas, partidas y pertenencia. Un proceso nuevo no puede reconstruirlas desde Supabase ni desde el guardado local. La aplicación informa sala no disponible al intentar retomar un ID que dejó de existir; sin pertenencia activa, el gateway muestra el menú de salas.

No se han añadido tablas ni migraciones, modificado SMTP, creado cuentas, enviado correos, desplegado ni hecho push en esta fase. El test de sesión caducada visual es un cierre controlado, no una revocación remota real.

Para P7D.2 quedan definidos los límites del futuro almacenamiento: participante estable, generación, estado económico, pool, reloj, trazas, ledger de liquidaciones, selección de espectador y finalResults. Serialización durable, transacciones, restauración tras caída y coordinación entre procesos quedan **sin implementar**.


## F0-P7D.2 — persistencia autoritativa (2026-10-25)

La limitación histórica de estado únicamente en memoria queda superada para partidas privadas configuradas con el repositorio. No se persisten JWT. El gateway reconstruye la relación UUID–lobby–partida; lobbies en espera sin partida siguen siendo efímeros. Registros incompatibles o expirados no se reinterpretan.

Detalle vigente: [arquitectura](PERSISTENCE_ARCHITECTURE.md), [recuperación](MATCH_RECOVERY.md) y [operación](PERSISTENCE_OPERATIONS.md). Esta sección sustituye las limitaciones históricas de persistencia anteriores para el servidor normal.
