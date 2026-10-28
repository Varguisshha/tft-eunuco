# F0-P8D · Informe de cierre

1. **Base y rama:** `b4e12ee` (cierre P8C), rama `codex/f0-p8d-component-drops`. Base: 1180/1180 pruebas con PostgreSQL.
2. **Regla:** nuevas partidas privadas modernas `f0p8d-1`, al liquidar rondas múltiplos de tres. Ronda terminal sin reparto.
3. **Cantidad común:** sorteo exacto 50/50 de dos o tres componentes, idéntico para todos los elegibles.
4. **Tipos individuales:** ocho categorías uniformes con reposición, flujo por UUID y orden canónico; se permiten repeticiones.
5. **Elegibilidad:** supervivientes tras daño/eliminación. Incluye derrotados vivos y desconectados. Excluye eliminados y fantasmas.
6. **Cierre de ronda:** candidatos completos tras resolver combates, disponibles en resolución y preparación siguiente. No cambia temporizadores ni recompensas económicas.
7. **Inventario:** `grantItemInstances`, bandeja 16, excedentes pendientes, propiedad e IDs conservados; no combina automáticamente.
8. **RNG:** semilla dedicada persistente; hash de identidad de reparto y derivaciones separadas de cantidad/tipos con PRNG existente. No consume flujos de tienda, combate o emparejamientos.
9. **Journal:** partida, ronda, versión, cantidad, elegibles, tipos, concesiones, instancias y confirmación. Liquidación y grant idempotentes; restore rechaza journal corrupto, duplicado, ausente u huérfano.
10. **Persistencia:** mismo commit JSONB/CAS y publicación posterior. PostgreSQL aislado real, bloqueo de escritura + SIGKILL antes de commit, corte después de commit, autenticación/reconexión y comparación exacta hasta ronda 6. Sin migraciones SQL.
11. **Ejemplo real:** tabla inferior y [evidencia completa](evidence/p8d-four-player.json), obtenida del servidor de diagnóstico con cuatro clientes autenticados.
12. **Validación:** 1205/1205 pruebas, 79 archivos; 10 pruebas PostgreSQL incluidas, ninguna omitida en la ejecución completa correcta. Typecheck, ESLint, cliente, servidor, `pnpm check`, `pnpm verify:public`. Una repetición solapada con otro checkout tuvo puertos ocupados y ruido de rendimiento; la repetición final sin concurrencia pasó 1205/1205 en 81,24 s. Aviso de tamaño de chunks de Vite preexistente.
13. **Compatibilidad:** catálogos P8A/B/C y hashes históricos preservados; 36 recetas, efectos, personajes y combate sin cambios. Nueva huella P8D acepta compresión de replay existente. Pruebas de economía/pool, DOLEA/VARGAS/JARAMILLO, espectadores, replays, Overtime, sinergias y reloj siguen en la suite completa.
14. **Git y servicios:** commit local de esta fase; sin push ni despliegue. Archivos de usuario no rastreados preservados. No se reinician web4173 ni servidor2567; diagnósticos2582/2583 y PostgreSQL55439.
15. **Preparación P8E:** datos propios `distributions` + `grants` permiten aviso deduplicado por ID, ronda, cantidad, tipos e inventario. Semillas reales y journal global nunca se envían. HUD y presentación final pendientes.

## Ejemplo de cuatro jugadores

Partida `5c67dfb3-7dba-44ca-a652-f3d9899b0203`, semilla de diagnóstico `1366167364`. Identidades de fixture terminadas en 001–004; el JSON conserva UUID, semillas, grants e instancias. Se restauró la misma semilla/identidad y se comparó la ejecución exacta sin interrupción. Esta evidencia es exclusivamente de prueba, no contiene datos de usuarios reales.

Ronda 3: **2** para cada jugador. Ronda 6: **3** para cada jugador.

| Jugador | Ronda 3 | Ronda 6 |
| --- | --- | --- |
| 1 | magic_resist, armor | mana, armor, ap |
| 2 | health, armor | magic_resist, armor, armor |
| 3 | ad, armor | mana, attack_speed, mana |
| 4 | ap, critical | magic_resist, mana, armor |

## Límites explícitos

El modo local de un jugador y el laboratorio antiguo conservan versiones anteriores; se activa la autoridad multijugador moderna. Fixtures permiten cubrir ronda3/6 y cantidades2/3, pero no hay generador público ni panel DEV nuevo. La interfaz definitiva corresponde a P8E.

No se garantiza variedad entre jugadores ni entre rondas; independencia puede producir coincidencias. Al agotar límites de almacenamiento se rechaza y pausa la transacción completa; no se descartan premios. Persistencia conserva las limitaciones de un escritor por partida y tamaño existentes.

[Contrato completo](ITEM_DROP_DESIGN.md).
