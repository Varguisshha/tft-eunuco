# Espectadores eliminados — F0-P7C.3

Solo una sesión autenticada, conectada y eliminada de la propia partida puede solicitar `spectate_duel`. No existen espectadores externos. `null` entra al modo sin elegir duelo. Una elección concreta debe pertenecer a los duelos de esa partida; match ID, phase ID y secuencia creciente evitan solicitudes cruzadas o tardías.

El espectador ve clasificación pública, ronda y reloj globales, selector con nombres y etiqueta Fantasma, arena y unidades inspeccionables. Se reutilizan Phaser, animaciones, feedback, habilidades, escudos y overtime. La ficha es de lectura. Al cambiar de duelo se descarta el frame anterior y se exige la secuencia de selección nueva; se rechazan frames de otra sesión, ronda, duelo o secuencia antigua.

## Frontera de datos

El eliminado no recibe `combat_trace` completo. Durante combate recibe `spectate_snapshot` a un máximo de un frame por tick (10 Hz), muestreado por el reloj autoritativo. El frame elimina `rngState`; los eventos omiten `combat_start`, que contiene la semilla. Solo incluye el presente y eventos recientes ya ocurridos (más el marcador público de overtime). No contiene trazas futuras, tiendas ajenas, banquillos ajenos, pool ni credenciales. El resultado de un duelo solo aparece cuando su tick final se ha alcanzado; los settlements esperan al cierre global.

La simulación se calcula de antemano en servidor, pero el espectador no recibe ese replay. Puede inferir lo que ve en un combate, como cualquier observador; no se promete impedir deducciones a partir de información pública. Los jugadores vivos conservan el contrato previo de replay de su propio duelo.

`CompetitiveSnapshot` conserva la proyección privada propia, congelada y vaciada de inventario tras eliminarse. No expone las proyecciones privadas de otros. Las formaciones públicas siguen disponibles. El contador local interpolado no gobierna la simulación ni decide qué frames autoriza el servidor.

Limitaciones: transmisión por ticks, sin buffer de reconexión ni recuperación de sesión tras recarga; elección manual en cada ronda; no estadísticas persistentes ni espectadores externos. La sala final se conserva hasta cinco minutos y después se libera.


## F0-P7D.1 — Recuperación autenticada (25/10/2026)

La recuperación mantiene eliminated, finalPosition, spectating, selección de duelo y secuencia de espectador. El handshake devuelve la secuencia vigente para continuar sin reiniciar en cero. No entrega combat_trace a eliminados; sendSpectator publica solo frames alcanzados y eventos permitidos. La recarga no resucita ni modifica pool o puesto. Browser y SDK comprobaron conservar selección tras recarga.

Esta sección sustituye las limitaciones históricas de «sin reconexión». Especificación: [RECONNECTION_SPEC.md](RECONNECTION_SPEC.md). Flujo, contratos y límites: [SESSION_RECOVERY.md](SESSION_RECOVERY.md).
