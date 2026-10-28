# F0-P7C.1 — Motor de rondas para 2–4 jugadores

25 de octubre de 2026. No se habilita el lobby de tres/cuatro ni se inicia F0-P7C.2.

## 1. Arquitectura de emparejamientos

Módulo puro de emparejamiento separado de la economía y del transporte. AuthoritativeMatch admite capacidad interna 2–4, conserva un pool/reloj y mantiene uno o dos Duel por ronda. MatchRoom publica la proyección y traza autorizadas por socket. El lobby y su fábrica siguen limitados a dos.

## 2. Algoritmo

Enumeración de candidatos; prioridad a rivales menos repetidos y penalización de recencia, con hash determinista para desempates. Para cuatro se completa el ciclo de tres rivales; para tres se antepone la rotación equilibrada de receptor y propietario fantasma. No depende del orden de conexiones ni de Math.random. Cada plan registra puntuación y desempate. [Especificación](MATCHMAKING_2_TO_4.md).

## 3. Fantasma

Copia aislada de una formación real, con estrellas/perfiles/habilidades/sinergias. No es un usuario ni tiene economía, tienda, inventario o copias de pool. El propietario solo cobra/sufre por su combate humano. El receptor usa las reglas normales, incluida doble derrota sin premio de victoria. [Reglas](GHOST_COMBAT.md).

## 4. Combates

Dos simulaciones independientes y deterministas, con IDs y semillas distintas dentro de la ronda. Se calculan síncronamente en Node y se reproducen dentro de la misma fase; no se afirma paralelismo de CPU. Dos equipos por tablero, sin cambiar geometría o simulación.

## 5. Reloj

Preparación30s, simulación hasta45s, cola600ms, resolución5s. El cierre global espera al máximo tick final +cola. Un duelo corto pasa a awaiting_round, sin comprar ni cobrar antes. Ningún ACK de navegador controla las fases. [Coordinación](PARALLEL_COMBATS.md).

## 6. Liquidación individual

Se calculan y validan todos los estados y registros antes de aplicarlos. Cada humano tiene un settlementId estable por ronda/combatId. Repetir pulsos o solicitudes no duplica pagos/daño/XP; no se liquida al fantasma ni dos veces a su propietario. Fórmulas existentes intactas.

## 7. Pool

Cuatro tiendas, economías y banquillos propios con un único pool. externalCopies incluye todos los otros humanos y sus ofertas. Comprar reservas, fusionar, vender y renovar conservan copias. Pruebas incluyen compras concurrentes, agotamiento de DOLEA, fusión de dos estrellas y devolución de nueve copias al vender tres estrellas.

## 8. Contratos

Nuevo `f0p7c1-1` para Pairing/Plan, DuelRecord, PlayerSettlement, RoundSnapshot y DuelMessage, con validación Zod estricta. UUID propio y de rivales, avatar, formación, HP, conexión, rival, estado y posición provisional públicos. Solo economía propia y una traza autorizada por receptor. RNG económico, pool y tiendas/banquillos ajenos ausentes. Protocolo de dos e intenciones económicas conservados.

El acumulador health.north del adaptador económico histórico no representa al rival cambiante y no se publica en la lectura nueva; las vidas reales proceden de cada estado propio. La posición provisional comparte puesto en empates. No hay eliminación ni resultado competitivo final.

## 9. Pruebas automatizadas

Baseline: `pnpm check`, 712 pruebas en 51 archivos, correcto antes de editar. Diagnósticos nuevos: 33 pruebas en tres archivos, correctas. **Comprobación completa final: `pnpm check` correcto, 745 pruebas en 54 archivos, tipos, lint y compilación correctos.** `pnpm verify:public` también correcto. La compilación conserva el aviso previo de bundles grandes; no es un error ni se aborda como refactor ajeno.

`pnpm diagnostics:multiplayer --disableConsoleIntercept` reproduce algoritmo, motor y SDK. Las 712 pruebas anteriores no se modifican ni debilitan. El directorio game-core, catálogo, estadísticas, sinergias y recursos gráficos no cambian.

## 10. Clientes SDK

Tres y cuatro clientes Colyseus independientes contra un servidor temporal en loopback, con UUID ficticios controlados. Se avanzó reloj lógico exclusivamente desde el harness de servidor. No son usuarios Supabase reales ni se han creado cuentas remotas.

| Escenario | Rondas resueltas | Duelo(s) en ronda 1              | Liquidaciones acumuladas | Vida al acabar ronda 3 |
| --------- | ---------------- | -------------------------------- | ------------------------ | ---------------------- |
| Tres      | 3                | Humano + fantasma, ambos tick450 | 9                        | 91 / 91 / 91           |
| Cuatro    | 3                | Dos humanos, ticks38 y450        | 12                       | 98 / 98 / 91 / 91      |

Ambos escenarios llegan a preparación de ronda4. Se verificaron reloj común, compras concurrentes, reserva global, privacidad, rechazo de suplantación/DEV, idempotencia, trazas correctas por destinatario, Overtime, daño, pagos y rotación. [Evidencia JSON con hashes](evidence/F0_P7C1_SDK.json).

## 11. Compatibilidad histórica

Dos jugadores conserva orientación, ID de combate, llamadas al proveedor de semillas, snapshot y traza del protocolo anterior. Se conserva replay de dos; en 3/4 se usa duels y duelFor para evitar publicar una traza global equivocada. Local, Arena técnica, DEV, DOLEA, VARGAS, HUD Neon Playground y Mar de Cristal no se modifican. No hay pantallas nuevas: el diagnóstico es ejecutable mediante tests SDK y evidencia JSON, por lo que no se generan capturas de una interfaz inexistente.

## 12. Limitaciones

Servidor único y estado en memoria. Tres/cuatro disponibles únicamente mediante construcción interna y escenarios controlados; producción/lobby siguen en dos. Los diagnósticos se detienen al primer humano con cero HP, sin eliminación competitiva ni reemparejar sobrevivientes. No hay espectadores, reconexión completa, clasificación final, persistencia ni despliegue. El replay propio revela su resultado futuro al cliente modificado, como antes.

## 13. Git

F0-P7B.2 conservada en commit `6868711` tras repetir y revisar sus 712 pruebas; solo se incluyeron sus 25 archivos. Rama `codex/f0-p7a-authoritative`. F0-P7C.1 queda como cambios revisables en el árbol de trabajo, sin nuevo commit ni push. Se preservan `.21st/`, imágenes y sprites originales ajenos. No se configura remoto.

## 14. Preparación para F0-P7C.2

La siguiente fase podrá conectar lobby3/4 y presentar cada duelo con el protocolo versionado, orientación por side y estado awaiting_round. El motor no impone cambios de balance ni economía. P7C.3 deberá definir eliminación, continuación con roster reducido y puestos finales. Ninguna de esas fases se ha iniciado.
