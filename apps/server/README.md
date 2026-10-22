# Servidor reservado

F0-P1 no implementa ni instala un servidor de juego. Esta carpeta reserva el límite futuro para Node.js + Colyseus. No contiene un package.json vacío ni dependencias ficticias.

Cuando se autorice su fase: validar comandos con `@tft/shared`, consumir reglas puras de `@tft/game-core`, resolver identidad/jugador/mitad en el servidor, ejecutar ticks de 100 ms y emitir snapshots/eventos. Supabase quedará detrás de un adaptador de persistencia, nunca importado por game-core. No hay puertos, credenciales ni servicios configurados aquí.
