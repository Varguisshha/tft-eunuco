# Evidencia F0-P7A

- baseline-check.log: 619 tests anteriores, typecheck/lint/build.
- check.log: validación final completa, 644 tests, cliente y servidor.
- network.log: prueba de dos sockets y ronda con tiempos reales.
- public.log: exclusión DEV del build público.
- changed-format.log: formato de archivos nuevos/modificados.
- global-format.log: 67 incidencias preexistentes fuera de esta fase, conservadas.
- browser-vargas.jpg / browser-florin.jpg: primera sesión real, ronda2, clientes independientes.
- browser-vargas-final.jpg / browser-florin-final.jpg: ronda3, HP100/94 y economías18/15. Capturadas tras una actualización HMR; acreditan el estado recibido, no un reloj avanzando en esa captura.
- ready-vargas.jpg / ready-florin.jpg: sesión nueva sobre servidor compilado, dos conexiones listas.

Las capturas de distintos clientes no se tomaron en el mismo milisegundo. Durante la prueba se leyeron por UI contadores idénticos7.6s (preparación),32.3s (combate),9.3s (Overtime) y12.2s (ronda3). La igualdad exacta de traza/eventos/resultado y deadlines se comprueba adicionalmente con sockets reales en network.test.ts. Los PNG/sprites originales no se modificaron.
