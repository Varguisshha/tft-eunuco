# Eliminaciones — F0-P7C.3

La autoridad liquida todos los duelos de una ronda como una transacción lógica: calcula y valida los estados de todos los participantes vivos antes de publicarlos. La fórmula de daño no cambia; el ledger conserva HP anterior, daño solicitado, daño aplicado y HP final limitado a cero.

Solo después del cierre global, los participantes con HP cero forman el conjunto de eliminados. Se asignan puestos conjuntamente. `eliminated` es irreversible; `competitiveState` distingue alive/eliminated, `connected` describe conexión y `spectating` la decisión de observar. Un vivo desconectado sigue siendo elegible. Recargar no resucita ni incorpora otra identidad al combate.

Cada ronda utiliza un settlement ID estable. Un pulso repetido no repite daño, ingresos ni eliminación. La liquidación de la ronda en curso conserva sus recompensas ordinarias; no hay premio por eliminarse. Desde la confirmación no hay nuevas liquidaciones, oro, XP, ofertas ni acciones económicas para ese jugador.

`poolReleased` protege la devolución única: tablero y banquillo devuelven las copias equivalentes de cada estrella (1/3/9 en la configuración actual); cada oferta reservada devuelve una copia. Se vacían unidades, tienda y mejoras pendientes. No se genera una venta ni oro. La suma pool + inventarios + reservas sigue siendo constante. La devolución ocurre después del combate, disponible para las ofertas de las siguientes rondas.

La autoridad rechaza acciones de eliminados y comandos posteriores al final, además de validar identidad, sesión, fase, secuencia y payload. El cliente también oculta economía y banquillo, pero no constituye la barrera de seguridad.

Casos: HP exactamente cero, varios eliminados, todos eliminados, doble llamada de cierre, inventario fusionado y participantes desconectados. Véanse `competition.test.ts`, `competition-network.test.ts` y [clasificación](FINAL_STANDINGS.md).
