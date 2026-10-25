# Recuperación de partidas — F0-P7D.2

## Inicio del proceso

Antes de abrir el puerto, el servidor consulta registros no cerrados y no expirados, valida versiones e invariantes y reconstruye salas con el mismo Match UUID. Reconstruye Map/Set, reloj, roster congelado y relación de lobby. Todos los participantes se consideran desconectados hasta autenticarse. Un registro incompatible o corrupto hace fallar el arranque: conservarlo e investigar; nunca inventar copias ni hacer reset.

La sesión Supabase válida permite al gateway descubrir la partida por UUID, entrar en la sala original, sustituir la conexión anterior y recibir solo su perspectiva. No se crean nuevos participantes ni otro match. Si hay varios resultados retenidos del mismo usuario, la relación más recientemente actualizada prevalece para descubrimiento. La lista competitiva original permanece congelada.

Salas aún esperando sin partida: efímeras; se recrean tras reinicio. Salas vinculadas en starting/in_match: persistidas; starting espera sincronización de todo el roster y mantiene el timeout de arranque. Las ready/presencias del lobby se reconstruyen, no sirven como prueba de autenticación.

## Fases

| Estado guardado        | Recuperación                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| Preparación            | Oro, XP, nivel, tiendas/bloqueos, banco, tablero y pool exactos; mismo tiempo restante             |
| Combate / Overtime     | Mismos duelos, semillas y trazas canónicas; mismo tiempo lógico, sin ejecutar otra simulación      |
| Resolución             | Daño, ingresos, rachas y ledger ya aplicados; no se vuelve a liquidar                              |
| Eliminado / espectador | Puesto, liberación de pool, selección de duelo y restricciones restaurados; solo frames alcanzados |
| Final                  | Clasificación definitiva y resultado retenidos, sin pagos adicionales                              |
| Expirado/cerrado       | No se reconstruye; la interfaz indica que la partida no está disponible                            |

## Reloj

Se persisten fase, ronda, duración y tiempo restante; al reconstruir se genera un nuevo origen/deadline monotónico. Se captura una fuente numérica por candidato para no encadenar relojes antiguos ni retroceder entre fases. El apagado no produce rondas, ingresos ni avance de reproducción. Caída abrupta: recuperación del último commit, con posible retroceso temporal de aproximadamente el intervalo de checkpoint (1 s) más latencia. No se pierden acciones ya confirmadas.

La retención usa tiempo real y sí transcurre con el servidor apagado. No confundirla con el reloj competitivo congelado.

## Fallo de almacenamiento

Se conserva el candidato pendiente y su commit UUID exacto; memoria pública permanece en el último estado confirmado y el reloj se pausa. El HUD deshabilita economía y congela reproducción con aviso de servicio temporalmente no disponible. Timeout RPC 5 s. Hasta cinco reintentos con espera exponencial acotada (1/2/4/8/16 s). Al confirmar se recupera el tiempo guardado del candidato, sin consumir la espera en PostgreSQL.

Una respuesta perdida puede significar que SQL sí guardó la operación. Repetir el mismo commit resuelve esta ambigüedad: ni se asume éxito ni se sobrescribe con un rollback destructivo. El cliente puede descubrir una operación persistida cuyo recibo no recibió, sin duplicarla.

Tras agotar reintentos la sala queda pausada: reparar almacenamiento y reiniciar para recuperar desde SQL. No hay bucle infinito ni botón que fuerce una escritura dudosa.

## Cierre ordenado

Se bloquean nuevas mutaciones, se termina la cola existente y se intenta un checkpoint final. Se informa de reinicio y se cierran conexiones. Si el checkpoint falla, se conserva el último commit duradero y se registra un aviso sin secretos; no se marca cerrada una partida por apagar Node. SIGKILL no depende de handlers.

## Retención

Activa/recuperable: hasta una hora desde creación. Finalizada: hasta cinco minutos desde final, limitada por el límite anterior. Cerrada: no recuperable. Expirada es un estado derivado de expires_at. No se prolonga la ventana en cada checkpoint o reinicio. Limpieza explícita de registros expirados hace más de 24 h, máximo 100 por llamada y contador auditable; nunca elimina registros vigentes.
